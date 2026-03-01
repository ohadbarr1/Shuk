"use client";

import Link from "next/link";
import type { ScreenerItem } from "@/lib/api";
import { formatILS, formatPct, formatNumber } from "@/lib/format";
import { Skeleton } from "@/components/ui/Skeleton";

interface Props {
  items: ScreenerItem[];
  loading: boolean;
}

const COLUMNS = [
  { key: "symbol",         label: "סימול",      align: "right" as const },
  { key: "name_he",        label: "שם",          align: "right" as const },
  { key: "sector",         label: "סקטור",       align: "right" as const },
  { key: "market_cap_ils", label: "שווי שוק",    align: "left"  as const },
  { key: "pe_ratio",       label: "P/E",          align: "left"  as const },
  { key: "net_margin",     label: "מרווח נקי",   align: "left"  as const },
  { key: "revenue_cagr_5y",label: "CAGR 5Y",     align: "left"  as const },
  { key: "dividend_yield", label: "תשואת דיב׳",  align: "left"  as const },
];

function formatCell(key: string, item: ScreenerItem): string {
  const v = item[key as keyof ScreenerItem];
  if (v == null) return "—";
  if (key === "market_cap_ils") return formatILS(Number(v), true);
  if (key === "net_margin" || key === "revenue_cagr_5y" || key === "dividend_yield")
    return formatPct(Number(v));
  if (key === "pe_ratio") return formatNumber(Number(v), 1);
  return String(v);
}

export function ScreenerTable({ items, loading }: Props) {
  if (loading) {
    return (
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-24" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[...Array(3)].map((_, j) => <Skeleton key={j} className="h-3 w-full" />)}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!items.length) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-gray-600">
        <svg className="w-10 h-10 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z" />
        </svg>
        <p className="text-sm">לא נמצאו תוצאות — שנה את הסינון</p>
      </div>
    );
  }

  return (
    <div>
      {/* ── Mobile: card list ── */}
      <div className="md:hidden space-y-3">
        {items.map((item) => (
          <Link
            key={item.symbol}
            href={`/company/${item.symbol}`}
            className="block bg-gray-900 border border-gray-800 rounded-xl p-4
                       hover:border-brand-600 transition-colors"
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <span className="font-semibold text-white text-sm">{item.name_he}</span>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs font-mono text-brand-400">{item.symbol}</span>
                  {item.sector && <span className="text-xs text-gray-500">· {item.sector}</span>}
                </div>
              </div>
              {item.market_cap_ils && (
                <span className="text-xs text-gray-400 shrink-0">
                  {formatILS(item.market_cap_ils, true)}
                </span>
              )}
            </div>
            <div className="grid grid-cols-3 gap-x-4 gap-y-2 text-xs">
              {[
                { label: "P/E",        val: formatCell("pe_ratio", item) },
                { label: "מרווח נקי", val: formatCell("net_margin", item) },
                { label: "CAGR 5Y",   val: formatCell("revenue_cagr_5y", item) },
              ].map(({ label, val }) => (
                <div key={label}>
                  <div className="text-gray-500 mb-0.5">{label}</div>
                  <div className="text-gray-200 font-medium">{val}</div>
                </div>
              ))}
            </div>
          </Link>
        ))}
      </div>

      {/* ── Desktop: table ── */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-gray-800">
              {COLUMNS.map((col) => (
                <th
                  key={col.key}
                  className={`px-4 py-3 text-xs font-medium text-gray-400 text-${col.align}`}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr
                key={item.symbol}
                className="border-b border-gray-900 hover:bg-gray-900/60 transition-colors"
              >
                {COLUMNS.map((col) => (
                  <td
                    key={col.key}
                    className={`px-4 py-3 text-${col.align} ${
                      col.key === "symbol"   ? "font-mono text-brand-400" :
                      col.key === "name_he"  ? "text-white" : "text-gray-300"
                    }`}
                  >
                    {col.key === "symbol" ? (
                      <Link href={`/company/${item.symbol}`} className="hover:underline">
                        {item.symbol}
                      </Link>
                    ) : (
                      formatCell(col.key, item)
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-gray-600 mt-3 px-1">{items.length} תוצאות</p>
    </div>
  );
}
