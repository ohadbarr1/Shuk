"use client";

import { useState } from "react";
import { api, type Company } from "@/lib/api";
import { formatILS } from "@/lib/format";

export default function HomePage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Company[]>([]);
  const [loading, setLoading] = useState(false);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    try {
      const companies = await api.companies.list({ q: query, limit: 10 });
      setResults(companies);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-20">
      <h1 className="text-4xl font-bold mb-2 text-center">
        מחקר מניות בורסה תל אביב
      </h1>
      <p className="text-gray-400 text-center mb-10">
        ניתוח פונדמנטלי, DCF, ומכפילים לכל המניות בת״א
      </p>

      <form onSubmit={handleSearch} className="flex gap-2 mb-8">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="חפש מניה — שם או סימול..."
          className="flex-1 rounded-lg bg-gray-900 border border-gray-700 px-4 py-3
                     text-white placeholder-gray-500 focus:outline-none focus:border-brand-500"
        />
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-3 rounded-lg bg-brand-600 hover:bg-brand-500
                     text-white font-medium transition-colors disabled:opacity-50"
        >
          {loading ? "מחפש..." : "חפש"}
        </button>
      </form>

      {results.length > 0 && (
        <ul className="space-y-2">
          {results.map((c) => (
            <li key={c.symbol}>
              <a
                href={`/company/${c.symbol}`}
                className="flex items-center justify-between p-4 rounded-lg bg-gray-900
                           border border-gray-800 hover:border-brand-500 transition-colors"
              >
                <div>
                  <span className="font-semibold text-white">{c.name_he}</span>
                  <span className="mr-3 text-sm text-gray-400">{c.symbol}</span>
                  {c.sector && (
                    <span className="text-xs text-gray-500">• {c.sector}</span>
                  )}
                </div>
                {c.market_cap_ils && (
                  <span className="text-sm text-gray-400">
                    {formatILS(c.market_cap_ils, true)}
                  </span>
                )}
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
