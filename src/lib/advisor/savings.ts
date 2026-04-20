import { defaultFmt } from "./fmt";
import type { Recommendation } from "./types";

/**
 * Savings recommendation engine.
 * - Given current income & target savings %, compute target for this month.
 * - Compare to projected actual savings; if below target, recommend an increase.
 * - Always bounded: won't recommend saving more than (income - fixed) because that
 *   would be mathematically impossible.
 */
export function computeTargetSavings(incomePaise: number, savingsTargetPct: number): number {
  const pct = Math.max(0, Math.min(90, savingsTargetPct)) / 100;
  return Math.round(incomePaise * pct);
}

export function savingsRateRecommendation(input: {
  incomePaise: number;
  expensePaise: number;
  savingsTargetPct: number;
  fixedExpensePaise: number;
  fmt?: (n: number) => string;
}): Recommendation | null {
  const { incomePaise, expensePaise, savingsTargetPct, fixedExpensePaise } = input;
  const fmt = input.fmt ?? defaultFmt;
  if (incomePaise <= 0) return null;

  const actualSavings = incomePaise - expensePaise;
  const targetSavings = computeTargetSavings(incomePaise, savingsTargetPct);
  const gap = targetSavings - actualSavings;
  if (gap <= 0) return null;

  const mathematicallyPossible = incomePaise - fixedExpensePaise;
  const realisticTarget = Math.min(targetSavings, Math.max(0, mathematicallyPossible));

  return {
    id: "savings-rate",
    kind: "SAVE",
    severity: gap > incomePaise * 0.15 ? "HIGH" : "MEDIUM",
    title: `You're ${fmt(gap)} away from your savings target`,
    body: `Your target is to save ${savingsTargetPct}% of income (${fmt(targetSavings)}). Current projected savings is ${fmt(actualSavings)}.`,
    reasoning: [
      `Monthly income: ${fmt(incomePaise)}`,
      `Total expenses so far: ${fmt(expensePaise)}`,
      `Target savings @ ${savingsTargetPct}%: ${fmt(targetSavings)}`,
      `Gap to target: ${fmt(gap)}`,
      realisticTarget < targetSavings
        ? `Because your fixed expenses are ${fmt(fixedExpensePaise)}, the max you can save this month is about ${fmt(mathematicallyPossible)}.`
        : "Trim variable categories that are trending high — groceries, dining, shopping — to close the gap.",
    ],
    payload: { gap, targetSavings, actualSavings },
    action: { label: "Review budgets", href: "/budgets" },
  };
}

/**
 * Emergency fund advice. If current buffer < (X months of avg monthly expense) we
 * recommend it before aggressive discretionary spend. Returns null if already met.
 */
export function emergencyFundRecommendation(input: {
  currentPaise: number;
  targetMonths: number;
  avgMonthlyExpensePaise: number;
  fmt?: (n: number) => string;
}): Recommendation | null {
  const { currentPaise, targetMonths, avgMonthlyExpensePaise } = input;
  const fmt = input.fmt ?? defaultFmt;
  if (targetMonths <= 0 || avgMonthlyExpensePaise <= 0) return null;
  const target = avgMonthlyExpensePaise * targetMonths;
  if (currentPaise >= target) {
    return {
      id: "emergency-fund-ok",
      kind: "POSITIVE",
      severity: "LOW",
      title: `Your emergency fund covers ~${targetMonths} months. Great work.`,
      body: "You have a healthy safety net. Keep it in a liquid, high-yield savings account so it keeps earning while staying accessible.",
      reasoning: [
        `Current emergency fund: ${fmt(currentPaise)}`,
        `Target (${targetMonths} months of avg expense): ${fmt(target)}`,
      ],
    };
  }
  const shortfall = target - currentPaise;
  const monthsToFill = Math.ceil(shortfall / Math.max(avgMonthlyExpensePaise * 0.1, 1));
  return {
    id: "emergency-fund",
    kind: "PLAN",
    severity: currentPaise < avgMonthlyExpensePaise ? "HIGH" : "MEDIUM",
    title: "Build your emergency fund first",
    body: `Aim to cover ${targetMonths} months of essential expenses (${fmt(target)}) before aggressive discretionary spending.`,
    reasoning: [
      `Average monthly expense: ${fmt(avgMonthlyExpensePaise)}`,
      `Target (${targetMonths} × expense): ${fmt(target)}`,
      `Current buffer: ${fmt(currentPaise)}`,
      `Shortfall: ${fmt(shortfall)}`,
      `Saving ~10% of monthly expense (${fmt(Math.round(avgMonthlyExpensePaise * 0.1))}) would close this in about ${monthsToFill} months.`,
    ],
    payload: { target, shortfall },
    action: { label: "Open Goals", href: "/goals" },
  };
}
