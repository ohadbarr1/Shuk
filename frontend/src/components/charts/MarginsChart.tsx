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

  if (loading) return <div className="h-48 flex items-center justify-center text-gray-500 text-sm">טוען...</div>;
  if (!data.length) return <div className="h-48 flex items-center justify-center text-gray-600 text-sm">נתונים יתווספו לאחר הרצת הפייפליין</div>;

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
