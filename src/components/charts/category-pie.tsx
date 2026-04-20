"use client";
import { Cell, Legend, Pie, PieChart, Tooltip } from "recharts";
import { ChartContainer } from "./chart-container";
import { formatMoney } from "@/lib/money";

interface Slice {
  name: string;
  value: number; // paise
  color?: string;
}

const PALETTE = [
  "#10b981",
  "#6366f1",
  "#f59e0b",
  "#ef4444",
  "#0ea5e9",
  "#a855f7",
  "#14b8a6",
  "#f43f5e",
  "#84cc16",
  "#f97316",
  "#06b6d4",
  "#8b5cf6",
];

export function CategoryPie({ data }: { data: Slice[] }) {
  if (!data.length)
    return (
      <div className="flex h-[260px] items-center justify-center text-sm text-muted-foreground">
        No expense data yet.
      </div>
    );
  const items = data.map((d, i) => ({ ...d, color: d.color ?? PALETTE[i % PALETTE.length] }));
  return (
    <ChartContainer height={260}>
      <PieChart>
        <Pie
          data={items}
          dataKey="value"
          nameKey="name"
          innerRadius={60}
          outerRadius={100}
          paddingAngle={2}
        >
          {items.map((entry) => (
            <Cell key={entry.name} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{ borderRadius: 8, fontSize: 12 }}
          formatter={(v: number) => formatMoney(v)}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
      </PieChart>
    </ChartContainer>
  );
}
