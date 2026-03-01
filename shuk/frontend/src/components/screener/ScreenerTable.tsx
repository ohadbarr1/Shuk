"use client";

import type { ScreenerItem } from "@/lib/api";
import { formatILS, formatPct, formatNumber } from "@/lib/format";

interface Props {
  items: ScreenerItem[];
  loading: boolean;
}

const COLUMNS = [
  { key: "symbol", label: "סימול", align: "right" as const },
  { key: "name_he", label: "שם", align: "right" as const },
  { key: "sector", label: "סקטור", align: "right" as const },
  { key: "market_cap_ils", label: "שווי שוק", align: "left" as const },
  { key: "pe_ratio", label: "P/E", align: "left" as const },
  { key: "net_margin", label: "מרווח נקי", align: "left" as const },
  { key: "revenue_cagr_5y", label: "CAGR 5Y", align: "left" as const },
  { key: "dividend_yield", label: "תשואת דיב׳", align: "left" as const },
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
      <div className="flex items-center justify-center py-16 text-gray-500">
        מסנן...
      </div>
    );
  }

  if (!items.length) {
    return (
      <div className="flex items-center justify-center py-16 text-gray-600">
        לא נמצאו תוצאות עבור הסינון הנבחר
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
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
              className="border-b border-gray-900 hover:bg-gray-900 transition-colors"
            >
              {COLUMNS.map((col) => (
                <td
                  key={col.key}
                  className={`px-4 py-3 text-${col.align} ${
                    col.key === "symbol"
                      ? "font-mono text-brand-400"
                      : col.key === "name_he"
                      ? "text-white"
                      : "text-gray-300"
                  }`}
                >
                  {col.key === "symbol" ? (
                    <a href={`/company/${item.symbol}`} className="hover:underline">
                      {item.symbol}
                    </a>
                  ) : (
                    formatCell(col.key, item)
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-xs text-gray-600 mt-3 px-4">{items.length} תוצאות</p>
    </div>
  );
}
