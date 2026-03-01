import Link from "next/link";
import { api } from "@/lib/api";
import { formatILS, formatPct, formatNumber } from "@/lib/format";
import { RevenueChart } from "@/components/charts/RevenueChart";
import { MarginsChart } from "@/components/charts/MarginsChart";

interface Props {
  params: { symbol: string };
}

export default async function CompanyPage({ params }: Props) {
  const symbol = params.symbol.toUpperCase();

  const [company, metrics] = await Promise.all([
    api.companies.get(symbol),
    api.companies.metrics(symbol),
  ]);

  const summaryCards = [
    { label: "שווי שוק",        value: formatILS(company.market_cap_ils, true), highlight: false },
    { label: "P/E",              value: formatNumber(metrics.pe_ratio),           highlight: false },
    { label: "EV/EBITDA",        value: formatNumber(metrics.ev_to_ebitda),       highlight: false },
    { label: "תשואת FCF",        value: formatPct(metrics.fcf_yield),             highlight: metrics.fcf_yield != null && metrics.fcf_yield > 0.05 },
    { label: "מרווח נקי",       value: formatPct(metrics.net_margin),            highlight: metrics.net_margin != null && metrics.net_margin > 0.15 },
    { label: "ROIC",             value: formatPct(metrics.roic),                  highlight: metrics.roic != null && metrics.roic > 0.15 },
    { label: "CAGR הכנסות 5Y",  value: formatPct(metrics.revenue_cagr_5y),       highlight: metrics.revenue_cagr_5y != null && metrics.revenue_cagr_5y > 0.1 },
    { label: "תשואת דיבידנד",   value: formatPct(metrics.trailing_dividend_yield), highlight: false },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 sm:py-10">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-gray-600 mb-5">
        <Link href="/" className="hover:text-gray-400 transition-colors">בית</Link>
        <span>/</span>
        <span className="text-gray-400">{company.name_he}</span>
      </div>

      {/* Header */}
      <div className="mb-6">
        <div className="flex flex-wrap items-baseline gap-2 sm:gap-3">
          <h1 className="text-2xl sm:text-3xl font-bold text-white">{company.name_he}</h1>
          <span className="text-base sm:text-lg text-gray-400 font-mono bg-gray-900 px-2 py-0.5 rounded">
            {company.symbol}
          </span>
        </div>
        {company.sector && (
          <p className="text-gray-500 text-sm mt-1">{company.sector} · {company.industry}</p>
        )}
        {company.description_he && (
          <p className="text-gray-400 text-sm mt-3 max-w-2xl leading-relaxed">{company.description_he}</p>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mb-8">
        {summaryCards.map((card) => (
          <div
            key={card.label}
            className={`bg-gray-900 border rounded-xl p-3 sm:p-4 transition-colors ${
              card.highlight ? "border-emerald-800/60" : "border-gray-800"
            }`}
          >
            <p className="text-xs text-gray-500 mb-1">{card.label}</p>
            <p className={`text-lg sm:text-xl font-semibold ${card.highlight ? "text-emerald-400" : "text-white"}`}>
              {card.value}
            </p>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 sm:p-5">
          <h2 className="text-sm font-medium text-gray-400 mb-4">הכנסות vs. רווח נקי</h2>
          <RevenueChart symbol={symbol} />
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 sm:p-5">
          <h2 className="text-sm font-medium text-gray-400 mb-4">מרווחים לאורך זמן</h2>
          <MarginsChart symbol={symbol} />
        </div>
      </div>

      {/* DCF CTA */}
      <div className="bg-gradient-to-l from-brand-900/30 to-gray-900 border border-brand-800/40 rounded-xl p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="font-semibold text-white">מחשבון DCF</h3>
          <p className="text-sm text-gray-400 mt-1">חשב שווי פנימי של {company.name_he} עם הנחות מותאמות אישית</p>
        </div>
        <Link
          href={`/dcf/${symbol}`}
          className="shrink-0 px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium transition-colors"
        >
          פתח DCF ←
        </Link>
      </div>
    </div>
  );
}
