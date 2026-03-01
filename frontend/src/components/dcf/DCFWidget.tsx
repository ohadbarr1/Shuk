"use client";

import { useState, useCallback } from "react";
import { api, type DCFResponse } from "@/lib/api";
import { formatILS, formatPct, formatNumber } from "@/lib/format";

interface Props {
  symbol: string;
  baseFCF: number;
  sharesOutstanding: number;
  netDebt: number;
  currentPrice: number | null;
}

export function DCFWidget({ symbol, baseFCF, sharesOutstanding, netDebt, currentPrice }: Props) {
  const [discountRate, setDiscountRate] = useState(10);
  const [terminalGrowth, setTerminalGrowth] = useState(3);
  const [terminalMultiple, setTerminalMultiple] = useState(15);
  const [useMultiple, setUseMultiple] = useState(true);
  const [growthY1, setGrowthY1] = useState(15);
  const [growthY2, setGrowthY2] = useState(12);
  const [growthY3, setGrowthY3] = useState(10);
  const [growthY4, setGrowthY4] = useState(8);
  const [growthY5, setGrowthY5] = useState(6);
  const [result, setResult] = useState<DCFResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runDCF = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.companies.dcf(symbol, {
        base_fcf: baseFCF,
        growth_rates: [growthY1, growthY2, growthY3, growthY4, growthY5].map((g) => g / 100),
        terminal_growth: terminalGrowth / 100,
        discount_rate: discountRate / 100,
        terminal_multiple: useMultiple ? terminalMultiple : null,
        shares_outstanding: sharesOutstanding,
        net_debt: netDebt,
        current_price: currentPrice,
      });
      setResult(res);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [symbol, baseFCF, sharesOutstanding, netDebt, currentPrice, discountRate, terminalGrowth,
      terminalMultiple, useMultiple, growthY1, growthY2, growthY3, growthY4, growthY5]);

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
      <h2 className="text-lg font-semibold mb-5">מחשבון DCF</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-5">
        <Slider label="שיעור היוון (WACC)" value={discountRate} min={5} max={20} step={0.5}
          unit="%" onChange={setDiscountRate} />
        <Slider label="שנה 1 — צמיחת FCF" value={growthY1} min={-20} max={50} step={1}
          unit="%" onChange={setGrowthY1} />
        <Slider label="שנה 2" value={growthY2} min={-20} max={50} step={1}
          unit="%" onChange={setGrowthY2} />
        <Slider label="שנה 3" value={growthY3} min={-20} max={50} step={1}
          unit="%" onChange={setGrowthY3} />
        <Slider label="שנה 4" value={growthY4} min={-20} max={50} step={1}
          unit="%" onChange={setGrowthY4} />
        <Slider label="שנה 5" value={growthY5} min={-20} max={50} step={1}
          unit="%" onChange={setGrowthY5} />

        {useMultiple ? (
          <Slider label="מכפיל טרמינלי (exit)" value={terminalMultiple} min={5} max={30} step={1}
            unit="x" onChange={setTerminalMultiple} />
        ) : (
          <Slider label="צמיחה טרמינלית" value={terminalGrowth} min={0} max={5} step={0.25}
            unit="%" onChange={setTerminalGrowth} />
        )}
      </div>

      <div className="flex items-center gap-3 mb-5 text-sm">
        <button
          onClick={() => setUseMultiple((v) => !v)}
          className="px-3 py-1 rounded border border-gray-700 text-gray-400 hover:border-brand-500
                     hover:text-white transition-colors"
        >
          {useMultiple ? "עבור ל-Gordon Growth" : "עבור למכפיל טרמינלי"}
        </button>
      </div>

      <button
        onClick={runDCF}
        disabled={loading}
        className="w-full py-3 rounded-lg bg-brand-600 hover:bg-brand-500 text-white
                   font-medium transition-colors disabled:opacity-50"
      >
        {loading ? "מחשב..." : "חשב שווי פנימי"}
      </button>

      {error && <p className="mt-3 text-red-400 text-sm">{error}</p>}

      {result && (
        <div className="mt-6 space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <ResultCard label="שווי פנימי למניה" value={formatILS(result.intrinsic_value_per_share)} />
            <ResultCard
              label="פוטנציאל עלייה"
              value={result.upside_pct != null ? formatPct(result.upside_pct) : "—"}
              highlight={result.upside_pct != null && result.upside_pct > 0 ? "green" : "red"}
            />
            <ResultCard label="שווי טרמינלי" value={formatILS(result.terminal_value, true)} />
          </div>

          {/* Sensitivity table */}
          {result.sensitivity.length > 0 && (
            <div>
              <p className="text-xs text-gray-500 mb-2">טבלת רגישות — שווי למניה (₪)</p>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-center border-collapse">
                  <thead>
                    <tr>
                      <th className="p-1 text-gray-500 text-right">WACC</th>
                      {[...new Set(result.sensitivity.map((r) => r.terminal_multiple))].map((m) => (
                        <th key={String(m)} className="p-1 text-gray-400">{m != null ? `${m}x` : "GGM"}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[...new Set(result.sensitivity.map((r) => r.discount_rate))].map((dr) => (
                      <tr key={dr}>
                        <td className="p-1 text-gray-400 text-right">{(dr * 100).toFixed(1)}%</td>
                        {result.sensitivity
                          .filter((r) => r.discount_rate === dr)
                          .map((r) => (
                            <td key={String(r.terminal_multiple)} className="p-1 text-gray-300">
                              {formatNumber(r.intrinsic_value_per_share, 0)}
                            </td>
                          ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Slider({
  label, value, min, max, step, unit, onChange,
}: {
  label: string; value: number; min: number; max: number; step: number; unit: string;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="flex justify-between text-xs text-gray-400 mb-1">
        <span>{label}</span>
        <span className="font-mono text-white">{value}{unit}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-brand-500"
      />
    </div>
  );
}

function ResultCard({ label, value, highlight }: { label: string; value: string; highlight?: "green" | "red" }) {
  const color = highlight === "green" ? "text-emerald-400" : highlight === "red" ? "text-red-400" : "text-white";
  return (
    <div className="bg-gray-800 rounded-lg p-3 text-center">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className={`text-lg font-semibold ${color}`}>{value}</p>
    </div>
  );
}
