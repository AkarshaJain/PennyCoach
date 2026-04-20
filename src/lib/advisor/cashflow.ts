import { defaultFmt } from "./fmt";
import type { MonthlyTotals, Recommendation, Severity } from "./types";

/**
 * Monthly cash flow calculator.
 * All inputs in minor units. Deterministic.
 */
export function cashFlow(totals: MonthlyTotals): {
  net: number;
  savingsRate: number;
  fixedRatio: number;
  variableRatio: number;
} {
  const net = totals.income - totals.expense;
  const savingsRate = totals.income > 0 ? net / totals.income : 0;
  const fixedRatio = totals.income > 0 ? totals.fixedExpense / totals.income : 0;
  const variableRatio = totals.income > 0 ? totals.variableExpense / totals.income : 0;
  return {
    net,
    savingsRate: round2(savingsRate * 100),
    fixedRatio: round2(fixedRatio * 100),
    variableRatio: round2(variableRatio * 100),
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Safe discretionary spend = income - fixed - (target savings) - committed plan contributions.
 * Never returns negative; returns 0 and a warning when the budget is already strained.
 */
export function safeDiscretionarySpend(input: {
  income: number;
  fixedExpense: number;
  targetSavingsPaise: number;
  committedPlanContributionsPaise: number;
}): number {
  const { income, fixedExpense, targetSavingsPaise, committedPlanContributionsPaise } = input;
  const available = income - fixedExpense - targetSavingsPaise - committedPlanContributionsPaise;
  return Math.max(0, Math.round(available));
}

/**
 * Recommendation: high fixed-ratio warning. 55% is a widely-used safe threshold for
 * "needs" in the 50/30/20 rule; we flag between 55-70% as MEDIUM, > 70% as HIGH.
 */
export function fixedRatioRecommendation(
  income: number,
  fixed: number,
  fmt: (n: number) => string = defaultFmt,
): Recommendation | null {
  if (income <= 0) return null;
  const ratio = fixed / income;
  if (ratio < 0.55) return null;
  const severity: Severity = ratio >= 0.7 ? "HIGH" : "MEDIUM";
  return {
    id: "fixed-ratio",
    kind: "WARN",
    severity,
    title: severity === "HIGH" ? "Fixed expenses are too high" : "Fixed expenses are on the higher side",
    body:
      severity === "HIGH"
        ? "Your rent/mortgage, loans, insurance and other fixed commitments are consuming a large share of your income. This leaves little room for savings or unexpected expenses."
        : "Your fixed commitments are eating into your financial flexibility. Keeping this under 55% of income (the 50/30/20 rule) gives you more room to save and handle surprises.",
    reasoning: [
      `Fixed expenses this month: ${fmt(fixed)}`,
      `Monthly income: ${fmt(income)}`,
      `Ratio = ${(ratio * 100).toFixed(1)}% of income (target: under 55%)`,
      "Consider refinancing loans, shopping insurance, or cancelling unused subscriptions.",
    ],
  };
}
