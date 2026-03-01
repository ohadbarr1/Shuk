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

  if (loading) return <div className="h-48 flex items-center justify-center text-gray-500 text-sm">טוען...</div>;
  if (!data.length) return <div className="h-48 flex items-center justify-center text-gray-600 text-sm">נתונים יתווספו לאחר הרצת הפייפליין</div>;

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
