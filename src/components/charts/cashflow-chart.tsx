"use client";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChartContainer } from "./chart-container";
import { formatMoney } from "@/lib/money";
import { monthLabel } from "@/lib/dates";

interface Row {
  period: string; // ISO
  income: number;
  expense: number;
  savings: number;
}

export function CashflowChart({ data }: { data: Row[] }) {
  const rows = data.map((r) => ({
    month: monthLabel(r.period, "MMM"),
    income: r.income / 100,
    expense: r.expense / 100,
    savings: Math.max(0, r.savings / 100),
  }));
  return (
    <ChartContainer height={260}>
      <AreaChart data={rows} margin={{ top: 10, left: 0, right: 10, bottom: 0 }}>
        <defs>
          <linearGradient id="cfIncome" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10b981" stopOpacity={0.45} />
            <stop offset="100%" stopColor="#10b981" stopOpacity={0.05} />
          </linearGradient>
          <linearGradient id="cfExpense" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ef4444" stopOpacity={0.4} />
            <stop offset="100%" stopColor="#ef4444" stopOpacity={0.05} />
          </linearGradient>
          <linearGradient id="cfSavings" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6366f1" stopOpacity={0.35} />
            <stop offset="100%" stopColor="#6366f1" stopOpacity={0.05} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.3} />
        <XAxis dataKey="month" fontSize={12} tickLine={false} />
        <YAxis
          fontSize={12}
          tickFormatter={(v) => formatMoney(v * 100, { compact: true, withDecimals: false })}
          tickLine={false}
          width={58}
        />
        <Tooltip
          contentStyle={{ borderRadius: 8, fontSize: 12 }}
          formatter={(v: number) => formatMoney(v * 100)}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Area type="monotone" dataKey="income" stroke="#10b981" strokeWidth={2} fill="url(#cfIncome)" />
        <Area type="monotone" dataKey="expense" stroke="#ef4444" strokeWidth={2} fill="url(#cfExpense)" />
        <Area type="monotone" dataKey="savings" stroke="#6366f1" strokeWidth={2} fill="url(#cfSavings)" />
      </AreaChart>
    </ChartContainer>
  );
}
