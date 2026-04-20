"use client";
import { Bar, BarChart, CartesianGrid, Tooltip, XAxis, YAxis } from "recharts";
import { ChartContainer } from "./chart-container";
import { formatMoney } from "@/lib/money";

export function CategoryBar({ data }: { data: { name: string; value: number }[] }) {
  if (!data.length)
    return (
      <div className="flex h-[220px] items-center justify-center text-sm text-muted-foreground">
        Add transactions to see your categories.
      </div>
    );
  const rows = data.map((d) => ({ ...d, rupees: d.value / 100 }));
  return (
    <ChartContainer height={Math.max(220, data.length * 32)}>
      <BarChart data={rows} layout="vertical" margin={{ top: 8, left: 0, right: 16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.25} horizontal={false} />
        <XAxis
          type="number"
          fontSize={12}
          tickFormatter={(v) => formatMoney(v * 100, { compact: true, withDecimals: false })}
        />
        <YAxis type="category" dataKey="name" fontSize={12} width={110} />
        <Tooltip
          contentStyle={{ borderRadius: 8, fontSize: 12 }}
          formatter={(v: number) => formatMoney(v * 100)}
        />
        <Bar dataKey="rupees" fill="hsl(var(--primary))" radius={[0, 6, 6, 0]} />
      </BarChart>
    </ChartContainer>
  );
}
