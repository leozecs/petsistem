"use client";

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

export type FinanceChartPoint = {
  month: string;
  revenueCents: number;
  expenseCents: number;
  profitCents: number;
};

function formatBRL(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export function FinanceChart({ data }: { data: FinanceChartPoint[] }) {
  const summary = data
    .map(
      (point) =>
        `${point.month}: faturamento ${formatBRL(point.revenueCents)}, despesas ${formatBRL(point.expenseCents)}, lucro ${formatBRL(point.profitCents)}`,
    )
    .join(". ");

  return (
    <div className="h-64 w-full sm:h-80" role="img" aria-label={summary}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" vertical={false} />
          <XAxis
            dataKey="month"
            tick={{ fill: "#71717a", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tickFormatter={(value) => `R$ ${Math.round(Number(value) / 100)}`}
            tick={{ fill: "#71717a", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={64}
          />
          <Tooltip formatter={(value) => formatBRL(Number(value))} />
          <Legend />
          <Line type="monotone" dataKey="revenueCents" name="Faturamento" stroke="#059669" strokeWidth={2.5} dot={{ r: 3 }} />
          <Line type="monotone" dataKey="expenseCents" name="Despesas" stroke="#e11d48" strokeWidth={2.5} dot={{ r: 3 }} />
          <Line type="monotone" dataKey="profitCents" name="Lucro" stroke="#2563eb" strokeWidth={2.5} dot={{ r: 3 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
