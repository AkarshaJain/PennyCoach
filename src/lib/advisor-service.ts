import { periodMonth, lastNMonths } from "./dates";
import { getMonthlyTotals } from "./aggregates";
import { prisma } from "./db";
import { ensureUserBootstrap } from "./profile";
import { runAdvisor } from "./advisor";
import type { AdvisorInput, AdvisorOutput } from "./advisor/types";
import { pickAdviceLedgerMonth } from "./advice-ledger";

/**
 * Fetches all inputs from the DB and runs the advisor. Pure IO + pure compute split.
 */
export async function getAdvisorSnapshot(opts?: { now?: Date }): Promise<{
  advisor: AdvisorOutput;
  inputs: AdvisorInput;
}> {
  const { user, profile } = await ensureUserBootstrap();
  const now = opts?.now ?? new Date();
  const currentPeriod = periodMonth(now);
  const historyPeriods = lastNMonths(6, now).filter(
    (p) => p.getTime() < currentPeriod.getTime(),
  );

  const [historyTotals, [currentTotals], plans, bills, categories] = await Promise.all([
    getMonthlyTotals(user.id, historyPeriods),
    getMonthlyTotals(user.id, [currentPeriod]),
    prisma.futurePlan.findMany({ where: { userId: user.id } }),
    prisma.recurringBill.findMany({ where: { userId: user.id } }),
    prisma.category.findMany({ where: { userId: user.id } }),
  ]);
  const budgets = await prisma.budget.findMany({
    where: { userId: user.id, periodMonth: currentPeriod },
    include: { category: true },
  });

  const categoryKinds: Record<string, "FIXED" | "VARIABLE" | "SAVINGS" | "INCOME"> = {};
  for (const c of categories) {
    categoryKinds[c.slug] = c.kind as "FIXED" | "VARIABLE" | "SAVINGS" | "INCOME";
  }

  const input: AdvisorInput = {
    profile: {
      monthlyIncome: profile.monthlyIncome,
      savingsTargetPct: profile.savingsTargetPct,
      emergencyFundTargetMos: profile.emergencyFundTargetMos,
      emergencyFundCurrent: profile.emergencyFundCurrent,
      salaryCycle: profile.salaryCycle as "MONTHLY" | "WEEKLY" | "IRREGULAR",
      currency: profile.currency,
      locale: profile.locale,
    },
    currentMonth: currentTotals,
    history: historyTotals,
    budgets: budgets.map((b) => ({
      categorySlug: b.category.slug,
      amountPaise: b.amountPaise,
    })),
    plans: plans
      .filter((p) => p.status === "ACTIVE")
      .map((p) => ({
        id: p.id,
        name: p.name,
        priority: p.priority,
        targetAmountPaise: p.targetAmountPaise,
        savedAmountPaise: p.savedAmountPaise,
        targetDate: p.targetDate,
        status: p.status,
      })),
    recurringBills: bills.map((b) => ({
      id: b.id,
      name: b.name,
      amountPaise: b.amountPaise,
      frequency: b.frequency as "WEEKLY" | "MONTHLY" | "QUARTERLY" | "YEARLY",
      active: b.active,
      type: b.type as "EXPENSE" | "INCOME",
    })),
    categoryKinds,
    now,
  };

  const adviceLedger = pickAdviceLedgerMonth(currentTotals, historyTotals);
  const advisor = runAdvisor({
    ...input,
    currentMonth: adviceLedger,
  });
  return { advisor, inputs: input };
}
