"use client";
import * as React from "react";
import { ResponsiveContainer } from "recharts";

export function ChartContainer({
  children,
  height = 260,
  className,
}: {
  children: React.ReactElement;
  height?: number;
  className?: string;
}) {
  return (
    <div className={className} style={{ width: "100%", height }}>
      <ResponsiveContainer width="100%" height="100%">
        {children}
      </ResponsiveContainer>
    </div>
  );
}
