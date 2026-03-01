"use client";

import { useState } from "react";
import { api, type ScreenerFilters, type ScreenerItem } from "@/lib/api";
import { ScreenerTable } from "@/components/screener/ScreenerTable";

export default function ScreenerPage() {
  const [filters, setFilters] = useState<ScreenerFilters>({});
  const [results, setResults] = useState<ScreenerItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  async function handleRun() {
    setLoading(true);
    setSearched(true);
    try {
      const items = await api.screener(filters);
      setResults(items);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">סורק מניות</h1>

      {/* Filter bar */}
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-5 mb-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          <FilterInput
            label="P/E מקסימלי"
            type="number"
            placeholder="למשל: 25"
            onChange={(v) => setFilters((f) => ({ ...f, pe_max: v ? Number(v) : undefined }))}
          />
          <FilterInput
            label="מרווח נקי מינ׳ %"
            type="number"
            placeholder="למשל: 10"
            onChange={(v) =>
              setFilters((f) => ({
                ...f,
                net_margin_min: v ? Number(v) / 100 : undefined,
              }))
            }
          />
          <FilterInput
            label="CAGR הכנסות מינ׳ %"
            type="number"
            placeholder="למשל: 10"
            onChange={(v) =>
              setFilters((f) => ({
                ...f,
                revenue_cagr_min: v ? Number(v) / 100 : undefined,
              }))
            }
          />
          <FilterInput
            label="תשואת דיבידנד מינ׳ %"
            type="number"
            placeholder="למשל: 3"
            onChange={(v) =>
              setFilters((f) => ({
                ...f,
                dividend_yield_min: v ? Number(v) / 100 : undefined,
              }))
            }
          />
        </div>
        <div className="mt-4 flex justify-end">
          <button
            onClick={handleRun}
            disabled={loading}
            className="px-6 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-white
                       font-medium text-sm transition-colors disabled:opacity-50"
          >
            {loading ? "מסנן..." : "הרץ סינון"}
          </button>
        </div>
      </div>

      {searched && <ScreenerTable items={results} loading={loading} />}
    </div>
  );
}

function FilterInput({
  label,
  type,
  placeholder,
  onChange,
}: {
  label: string;
  type: string;
  placeholder: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="block text-xs text-gray-400 mb-1">{label}</label>
      <input
        type={type}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded bg-gray-800 border border-gray-700 px-3 py-2 text-sm
                   text-white placeholder-gray-600 focus:outline-none focus:border-brand-500"
      />
    </div>
  );
}
