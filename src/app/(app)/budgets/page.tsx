import { addMonths } from "date-fns";
import { prisma } from "@/lib/db";
import { ensureUserBootstrap } from "@/lib/profile";
import { lastNMonths, periodMonth } from "@/lib/dates";
import { getMonthlyTotals } from "@/lib/aggregates";
import { categoryAverages } from "@/lib/advisor/categoryAverages";
import { suggestBudgets } from "@/lib/advisor/budgetSuggestion";
import { BudgetsClient } from "./client";

export const dynamic = "force-dynamic";

export default async function BudgetsPage() {
  const { user } = await ensureUserBootstrap();
  const now = new Date();
  const currentPeriod = periodMonth(now);
  const historyPeriods = lastNMonths(6, now).filter((p) => p.getTime() < currentPeriod.getTime());

  const [categories, budgets, historyTotals, [currentTotals]] = await Promise.all([
    prisma.category.findMany({
      where: { userId: user.id, kind: { in: ["VARIABLE", "FIXED", "SAVINGS"] } },
      orderBy: [{ kind: "asc" }, { sortOrder: "asc" }],
    }),
    prisma.budget.findMany({
      where: { userId: user.id, periodMonth: currentPeriod },
      include: { category: true },
    }),
    getMonthlyTotals(user.id, historyPeriods),
    getMonthlyTotals(user.id, [currentPeriod]),
  ]);

  const averages = categoryAverages(historyTotals);
  const suggestions = suggestBudgets(averages);

  const rows = categories.map((c) => {
    const budget = budgets.find((b) => b.categoryId === c.id);
    const spent = currentTotals.byCategory[c.slug] ?? 0;
    const avg = averages.find((a) => a.slug === c.slug)?.avg ?? 0;
    const suggestion = suggestions[c.slug] ?? Math.round(avg * 1.1);
    return {
      id: c.id,
      slug: c.slug,
      name: c.name,
      kind: c.kind,
      color: c.color,
      budgetPaise: budget?.amountPaise ?? 0,
      spentPaise: spent,
      avgPaise: avg,
      suggestedPaise: suggestion,
    };
  });

  return (
    <BudgetsClient
      rows={rows}
      period={currentPeriod.toISOString()}
      nextPeriod={periodMonth(addMonths(now, 1)).toISOString()}
    />
  );
}
