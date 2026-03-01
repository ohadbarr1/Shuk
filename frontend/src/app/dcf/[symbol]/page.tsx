import { api } from "@/lib/api";
import { DCFWidget } from "@/components/dcf/DCFWidget";
import { formatILS } from "@/lib/format";
import Link from "next/link";

interface Props {
  params: { symbol: string };
}

export default async function DCFPage({ params }: Props) {
  const symbol = params.symbol.toUpperCase();

  const [company, financials, prices] = await Promise.all([
    api.companies.get(symbol),
    api.companies.financials(symbol),
    api.companies.prices(symbol).catch(() => []),
  ]);

  const latest = financials.at(-1);
  const baseFCF = latest?.free_cash_flow ?? 0;
  const totalDebt = latest?.total_debt ?? 0;
  const cash = latest?.cash_and_equivalents ?? 0;
  const netDebt = totalDebt - cash;

  // Rough shares outstanding: market_cap / latest price
  const latestPrice = prices.at(-1)?.close_price
    ? Number(prices.at(-1)!.close_price)
    : null;
  const sharesOutstanding =
    company.market_cap_ils && latestPrice
      ? Math.round(company.market_cap_ils / latestPrice)
      : 1_000_000;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
        <Link href={`/company/${symbol}`} className="hover:text-white transition-colors">
          {company.name_he}
        </Link>
        <span>/</span>
        <span className="text-gray-300">DCF</span>
      </div>

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">
          מחשבון DCF — {company.name_he}
        </h1>
        <p className="text-gray-400 mt-1 text-sm">
          חשב שווי פנימי של המניה על בסיס תזרים מזומנים חופשי מהוון
        </p>
      </div>

      {/* Context cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        <CtxCard label="שווי שוק" value={formatILS(company.market_cap_ils, true)} />
        <CtxCard label="FCF אחרון" value={formatILS(baseFCF, true)} />
        <CtxCard label="חוב נטו" value={formatILS(netDebt, true)} />
        <CtxCard label="מחיר מניה" value={latestPrice ? formatILS(latestPrice) : "—"} />
      </div>

      <DCFWidget
        symbol={symbol}
        baseFCF={baseFCF}
        sharesOutstanding={sharesOutstanding}
        netDebt={netDebt}
        currentPrice={latestPrice}
      />
    </div>
  );
}

function CtxCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className="text-lg font-semibold text-white">{value}</p>
    </div>
  );
}
