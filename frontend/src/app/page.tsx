"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { api, type Company } from "@/lib/api";
import { formatILS } from "@/lib/format";
import { Skeleton } from "@/components/ui/Skeleton";

const SECTOR_ICONS: Record<string, string> = {
  טכנולוגיה: "💻",
  בריאות:    "💊",
  פיננסים:   "🏦",
  תעשייה:    "⚙️",
  תקשורת:    "📡",
  חומרים:    "⚗️",
};

export default function HomePage() {
  const [query, setQuery]           = useState("");
  const [results, setResults]       = useState<Company[]>([]);
  const [searching, setSearching]   = useState(false);
  const [featured, setFeatured]     = useState<Company[]>([]);
  const [loadingFeatured, setLoadingFeatured] = useState(true);

  // Load all companies on mount for the featured grid
  useEffect(() => {
    api.companies.list({ limit: 8 })
      .then(setFeatured)
      .finally(() => setLoadingFeatured(false));
  }, []);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    try {
      setResults(await api.companies.list({ q: query, limit: 10 }));
    } finally {
      setSearching(false);
    }
  }

  const showResults = query.trim().length > 0;

  return (
    <div className="min-h-screen">
      {/* ── Hero ── */}
      <section className="relative overflow-hidden px-4 pt-16 pb-12 sm:pt-24 sm:pb-16 text-center">
        {/* Background glow */}
        <div className="pointer-events-none absolute inset-0 flex items-start justify-center">
          <div className="w-[600px] h-[300px] bg-brand-600/10 blur-3xl rounded-full -translate-y-1/2" />
        </div>

        <div className="relative max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-900/50 border border-brand-800/50 text-brand-300 text-xs font-medium mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-pulse" />
            מחקר פונדמנטלי · בורסה תל אביב
          </div>

          <h1 className="text-3xl sm:text-5xl font-bold leading-tight mb-4">
            <span className="gradient-text">Shuk.io</span>
            <br />
            <span className="text-white">מחקר מניות לשוק הישראלי</span>
          </h1>

          <p className="text-gray-400 text-sm sm:text-base max-w-lg mx-auto mb-8">
            ניתוח פונדמנטלי מעמיק, מחשבון DCF, מכפילים, ומסנן מניות — לכל ניירות הערך בת״א
          </p>

          {/* Stats row */}
          <div className="flex items-center justify-center gap-6 text-xs text-gray-500 mb-10">
            {[
              ["8", "חברות"],
              ["5", "שנות נתונים"],
              ["DCF", "מובנה"],
              ["100%", "חינמי"],
            ].map(([val, lbl]) => (
              <div key={lbl} className="text-center">
                <div className="text-white font-bold text-sm">{val}</div>
                <div>{lbl}</div>
              </div>
            ))}
          </div>

          {/* Search */}
          <form onSubmit={handleSearch} className="flex gap-2 max-w-lg mx-auto">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="חפש מניה — שם או סימול..."
              className="flex-1 rounded-xl bg-gray-900 border border-gray-700 px-4 py-3
                         text-white placeholder-gray-500 focus:outline-none focus:border-brand-500
                         text-sm transition-colors"
            />
            <button
              type="submit"
              disabled={searching}
              className="px-5 py-3 rounded-xl bg-brand-600 hover:bg-brand-500
                         text-white font-medium text-sm transition-colors disabled:opacity-50 whitespace-nowrap"
            >
              {searching ? "מחפש..." : "חפש"}
            </button>
          </form>
        </div>
      </section>

      {/* ── Search results ── */}
      {showResults && results.length > 0 && (
        <section className="max-w-2xl mx-auto px-4 pb-8">
          <p className="text-xs text-gray-500 mb-3 px-1">{results.length} תוצאות</p>
          <ul className="space-y-2">
            {results.map((c) => (
              <li key={c.symbol}>
                <Link
                  href={`/company/${c.symbol}`}
                  className="flex items-center justify-between p-4 rounded-xl bg-gray-900
                             border border-gray-800 hover:border-brand-500 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{SECTOR_ICONS[c.sector ?? ""] ?? "📈"}</span>
                    <div>
                      <span className="font-semibold text-white group-hover:text-brand-300 transition-colors">
                        {c.name_he}
                      </span>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs font-mono text-brand-400">{c.symbol}</span>
                        {c.sector && <span className="text-xs text-gray-500">· {c.sector}</span>}
                      </div>
                    </div>
                  </div>
                  {c.market_cap_ils && (
                    <span className="text-sm text-gray-400 shrink-0">
                      {formatILS(c.market_cap_ils, true)}
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {showResults && !searching && results.length === 0 && (
        <div className="max-w-2xl mx-auto px-4 pb-8 text-center text-gray-600 text-sm">
          לא נמצאו תוצאות עבור &ldquo;{query}&rdquo;
        </div>
      )}

      {/* ── Featured companies ── */}
      {!showResults && (
        <section className="max-w-6xl mx-auto px-4 pb-16">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-base font-semibold text-gray-300">כל החברות</h2>
            <Link href="/screener" className="text-xs text-brand-400 hover:text-brand-300 transition-colors">
              סורק מניות ←
            </Link>
          </div>

          {loadingFeatured ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-3">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-3 w-20" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {featured.map((c) => (
                <Link
                  key={c.symbol}
                  href={`/company/${c.symbol}`}
                  className="group bg-gray-900 border border-gray-800 rounded-xl p-4
                             hover:border-brand-600 hover:bg-gray-900/80 transition-all"
                >
                  <div className="flex items-start justify-between mb-3">
                    <span className="text-2xl">{SECTOR_ICONS[c.sector ?? ""] ?? "📈"}</span>
                    <span className="text-xs font-mono text-brand-400 bg-brand-900/30 px-2 py-0.5 rounded">
                      {c.symbol}
                    </span>
                  </div>
                  <h3 className="font-semibold text-white text-sm group-hover:text-brand-300 transition-colors leading-snug mb-1">
                    {c.name_he}
                  </h3>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-gray-500">{c.sector}</span>
                    {c.market_cap_ils && (
                      <span className="text-xs text-gray-400">{formatILS(c.market_cap_ils, true)}</span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
