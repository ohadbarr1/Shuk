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
    { label: "שווי שוק", value: formatILS(company.market_cap_ils, true) },
    { label: "P/E", value: formatNumber(metrics.pe_ratio) },
    { label: "EV/EBITDA", value: formatNumber(metrics.ev_to_ebitda) },
    { label: "תשואת FCF", value: formatPct(metrics.fcf_yield) },
    { label: "מרווח נקי", value: formatPct(metrics.net_margin) },
    { label: "ROIC", value: formatPct(metrics.roic) },
    { label: "CAGR הכנסות 5Y", value: formatPct(metrics.revenue_cagr_5y) },
    { label: "תשואת דיבידנד", value: formatPct(metrics.trailing_dividend_yield) },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-baseline gap-3">
          <h1 className="text-3xl font-bold text-white">{company.name_he}</h1>
          <span className="text-lg text-gray-400 font-mono">{company.symbol}</span>
        </div>
        {company.sector && (
          <p className="text-gray-500 mt-1">{company.sector} · {company.industry}</p>
        )}
        {company.description_he && (
          <p className="text-gray-400 mt-3 max-w-2xl leading-relaxed">{company.description_he}</p>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        {summaryCards.map((card) => (
          <div
            key={card.label}
            className="bg-gray-900 border border-gray-800 rounded-lg p-4"
          >
            <p className="text-xs text-gray-500 mb-1">{card.label}</p>
            <p className="text-xl font-semibold text-white">{card.value}</p>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-5">
          <h2 className="text-sm font-medium text-gray-400 mb-4">הכנסות vs. רווח נקי (10Y)</h2>
          <RevenueChart symbol={symbol} />
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-5">
          <h2 className="text-sm font-medium text-gray-400 mb-4">מרווחים לאורך זמן</h2>
          <MarginsChart symbol={symbol} />
        </div>
      </div>

      {/* DCF link */}
      <div className="bg-gray-900 border border-gray-700 rounded-lg p-6 flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-white">מחשבון DCF</h3>
          <p className="text-sm text-gray-400 mt-1">חשב שווי פנימי עם הנחות מותאמות אישית</p>
        </div>
        <a
          href={`/dcf/${symbol}`}
          className="px-5 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium transition-colors"
        >
          פתח DCF
        </a>
      </div>
    </div>
  );
}
