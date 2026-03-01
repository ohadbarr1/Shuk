"use client";

import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { api } from "@/lib/api";
import { SkeletonChart } from "@/components/ui/Skeleton";

interface Props {
  symbol: string;
}

interface DataPoint {
  year: string;
  revenue: number | null;
  net_income: number | null;
}

const ILS_B = 1_000_000_000;

function fmtB(value: number) {
  return `₪${(value / ILS_B).toFixed(1)}B`;
}

export function RevenueChart({ symbol }: Props) {
  const [data, setData] = useState<DataPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.companies.financials(symbol).then((rows) => {
      setData(
        rows.map((r) => ({
          year: String(r.year),
          revenue: r.revenue,
          net_income: r.net_income,
        }))
      );
    }).finally(() => setLoading(false));
  }, [symbol]);

  if (loading) return <SkeletonChart />;
  if (!data.length) return (
    <div className="h-48 flex flex-col items-center justify-center gap-2 text-gray-600">
      <svg className="w-8 h-8 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
      <span className="text-sm">אין נתונים</span>
    </div>
  );

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: 10 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
        <XAxis dataKey="year" tick={{ fontSize: 11, fill: "#9ca3af" }} />
        <YAxis tickFormatter={fmtB} tick={{ fontSize: 11, fill: "#9ca3af" }} width={60} />
        <Tooltip
          formatter={(v: number) => fmtB(v)}
          contentStyle={{ background: "#111827", border: "1px solid #374151", borderRadius: 8 }}
          labelStyle={{ color: "#f9fafb" }}
        />
        <Legend wrapperStyle={{ fontSize: 12, color: "#9ca3af" }} />
        <Bar dataKey="revenue" name="הכנסות" fill="#3b82f6" radius={[3, 3, 0, 0]} />
        <Bar dataKey="net_income" name="רווח נקי" fill="#10b981" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
