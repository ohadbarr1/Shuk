"use client";

import { useEffect, useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
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
  gross_margin: number | null;
  operating_margin: number | null;
  net_margin: number | null;
}

function fmtPct(v: number) {
  return `${(v * 100).toFixed(1)}%`;
}

export function MarginsChart({ symbol }: Props) {
  const [data, setData] = useState<DataPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.companies.financials(symbol).then((rows) => {
      setData(
        rows.map((r) => ({
          year: String(r.year),
          gross_margin: r.gross_margin,
          operating_margin: r.operating_margin,
          net_margin: r.net_margin,
        }))
      );
    }).finally(() => setLoading(false));
  }, [symbol]);

  if (loading) return <SkeletonChart />;
  if (!data.length) return (
    <div className="h-48 flex flex-col items-center justify-center gap-2 text-gray-600">
      <svg className="w-8 h-8 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
      </svg>
      <span className="text-sm">אין נתונים</span>
    </div>
  );

  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: 10 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
        <XAxis dataKey="year" tick={{ fontSize: 11, fill: "#9ca3af" }} />
        <YAxis tickFormatter={fmtPct} tick={{ fontSize: 11, fill: "#9ca3af" }} width={50} />
        <Tooltip
          formatter={(v: number) => fmtPct(v)}
          contentStyle={{ background: "#111827", border: "1px solid #374151", borderRadius: 8 }}
          labelStyle={{ color: "#f9fafb" }}
        />
        <Legend wrapperStyle={{ fontSize: 12, color: "#9ca3af" }} />
        <Line dataKey="gross_margin" name="מרווח גולמי" stroke="#3b82f6" dot={false} strokeWidth={2} />
        <Line dataKey="operating_margin" name="מרווח תפעולי" stroke="#f59e0b" dot={false} strokeWidth={2} />
        <Line dataKey="net_margin" name="מרווח נקי" stroke="#10b981" dot={false} strokeWidth={2} />
      </LineChart>
    </ResponsiveContainer>
  );
}
