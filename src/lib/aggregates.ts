import { periodMonth } from "./dates";
import { prisma } from "./db";
import { classifyCategory } from "./advisor/classify";
import type { MonthlyTotals } from "./advisor/types";

/**
 * Compute monthly totals for a user over a specific period window.
 *
 * `periods` must be ordered oldest->newest periodMonth (UTC 00:00 first-of-month).
 * Returns an array with the same length & order as `periods`, zero-filled if no
 * transactions exist for a given month.
 */
export async function getMonthlyTotals(
  userId: string,
  periods: Date[],
): Promise<MonthlyTotals[]> {
  if (periods.length === 0) return [];
  const start = periods[0];
  const end = new Date(Date.UTC(periods[periods.length - 1].getUTCFullYear(), periods[periods.length - 1].getUTCMonth() + 1, 1));

  const txns = await prisma.transaction.findMany({
    where: {
      userId,
      date: { gte: start, lt: end },
    },
    include: { category: true },
  });

  // Initialise map keyed by period iso timestamp
  const map = new Map<string, MonthlyTotals>();
  for (const p of periods) {
    map.set(p.toISOString(), {
      period: p,
      income: 0,
      expense: 0,
      fixedExpense: 0,
      variableExpense: 0,
      savings: 0,
      byCategory: {},
    });
  }

  for (const t of txns) {
    const pm = periodMonth(t.date);
    const key = pm.toISOString();
    const bucket = map.get(key);
    if (!bucket) continue;
    const slug = t.category?.slug ?? "other";
    if (t.type === "INCOME") {
      bucket.income += t.amountPaise;
    } else if (t.type === "EXPENSE") {
      bucket.expense += t.amountPaise;
      const kind = t.category?.kind ?? classifyCategory(slug);
      if (kind === "FIXED") bucket.fixedExpense += t.amountPaise;
      else if (kind === "SAVINGS") {
        // "spend" into savings category is a transfer to savings
        bucket.savings += t.amountPaise;
        bucket.expense -= t.amountPaise; // don't double-count
      } else bucket.variableExpense += t.amountPaise;
      bucket.byCategory[slug] = (bucket.byCategory[slug] ?? 0) + t.amountPaise;
    }
  }

  // savings = income - expense (if not already accounted)
  for (const m of map.values()) {
    m.savings = Math.max(m.savings, m.income - m.expense);
  }

  return periods.map((p) => map.get(p.toISOString())!);
}
