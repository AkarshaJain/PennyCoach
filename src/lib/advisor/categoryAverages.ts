import type { CategoryAverage, MonthlyTotals } from "./types";

/**
 * Compute rolling average & stdev per category from the last N months of history.
 * History is oldest->newest, each month includes byCategory[slug] = paise.
 */
export function categoryAverages(history: MonthlyTotals[]): CategoryAverage[] {
  if (!history.length) return [];
  const slugs = new Set<string>();
  for (const m of history) for (const s of Object.keys(m.byCategory)) slugs.add(s);

  const out: CategoryAverage[] = [];
  for (const slug of slugs) {
    const values = history.map((m) => m.byCategory[slug] ?? 0);
    const avg = mean(values);
    out.push({
      slug,
      avg: Math.round(avg),
      stdev: Math.round(stdev(values, avg)),
      max: Math.max(...values, 0),
      months: values.length,
    });
  }
  return out.sort((a, b) => b.avg - a.avg);
}

function mean(xs: number[]): number {
  if (!xs.length) return 0;
  let s = 0;
  for (const x of xs) s += x;
  return s / xs.length;
}

function stdev(xs: number[], m: number): number {
  if (xs.length < 2) return 0;
  let s = 0;
  for (const x of xs) s += (x - m) ** 2;
  return Math.sqrt(s / (xs.length - 1));
}

/**
 * Very simple exponential-ish trend: weighted average with the most recent months
 * weighted more heavily. No external ML, fully deterministic and explainable.
 * Weights: for n months, last month = n, second to last = n-1, ... oldest = 1.
 */
export function weightedTrend(values: number[]): number {
  if (!values.length) return 0;
  let num = 0;
  let den = 0;
  for (let i = 0; i < values.length; i++) {
    const w = i + 1;
    num += values[i] * w;
    den += w;
  }
  return Math.round(num / den);
}
