import { weightedTrend } from "./categoryAverages";
import type { MonthlyTotals } from "./types";

/**
 * Forecasting: next-month projections from recent history.
 *
 * Deterministic & transparent:
 *   - Take up to the last 3 calendar months that have **any** income or expense.
 *     (Trailing empty months are ignored so sparse imports don’t drag averages to zero.)
 *   - For each category, compute weighted average of those months (w=1,2,3).
 *   - Also compute plain average. Use the max of (avg, weighted) as a
 *     conservative forecast — expenses have an upward bias from inflation.
 *   - Income forecast = average of income across those same months.
 *
 * No ML, no external APIs.
 */
export function forecastNextMonth(
  history: MonthlyTotals[],
  currentMonth: MonthlyTotals,
): {
  projectedExpense: number;
  projectedIncome: number;
  projectedSavings: number;
  byCategory: Record<string, number>;
} {
  const full = [...history, currentMonth];
  const active = full.filter((m) => m.income > 0 || m.expense > 0);
  const recent = active.slice(-3);
  if (!recent.length) {
    return {
      projectedExpense: 0,
      projectedIncome: 0,
      projectedSavings: 0,
      byCategory: {},
    };
  }

  const incomes = recent.map((r) => r.income);
  const avgIncome = Math.round(incomes.reduce((a, b) => a + b, 0) / incomes.length);

  const slugs = new Set<string>();
  for (const m of recent) for (const k of Object.keys(m.byCategory)) slugs.add(k);

  const byCategory: Record<string, number> = {};
  let projectedExpense = 0;
  for (const slug of slugs) {
    const values = recent.map((r) => r.byCategory[slug] ?? 0);
    const avg = Math.round(values.reduce((a, b) => a + b, 0) / values.length);
    const weighted = weightedTrend(values);
    const projected = Math.max(avg, weighted);
    byCategory[slug] = projected;
    projectedExpense += projected;
  }

  const projectedSavings = Math.max(0, avgIncome - projectedExpense);

  return {
    projectedExpense,
    projectedIncome: avgIncome,
    projectedSavings,
    byCategory,
  };
}

/**
 * Recurring-bill forecast — sum of active recurring bills for next month.
 * Weekly is multiplied by ~4.33 (52/12) for a typical month.
 * Quarterly / yearly are prorated to monthly-equivalent.
 */
export function recurringMonthlyImpact(
  bills: Array<{ amountPaise: number; frequency: string; active: boolean; type: string }>,
): { expense: number; income: number } {
  let expense = 0;
  let income = 0;
  for (const b of bills) {
    if (!b.active) continue;
    const mult =
      b.frequency === "WEEKLY"
        ? 52 / 12
        : b.frequency === "QUARTERLY"
          ? 1 / 3
          : b.frequency === "YEARLY"
            ? 1 / 12
            : 1;
    const monthly = Math.round(b.amountPaise * mult);
    if (b.type === "INCOME") income += monthly;
    else expense += monthly;
  }
  return { expense, income };
}
