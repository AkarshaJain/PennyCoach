import { cashFlow, fixedRatioRecommendation, safeDiscretionarySpend } from "./cashflow";
import { categoryAverages } from "./categoryAverages";
import { anomalyRecommendations, detectAnomalies } from "./anomaly";
import {
  computeTargetSavings,
  emergencyFundRecommendation,
  savingsRateRecommendation,
} from "./savings";
import { computePlanFunding, planRecommendations } from "./plans";
import { forecastNextMonth, recurringMonthlyImpact } from "./forecasting";
import { makeFmt } from "./fmt";
import type {
  AdvisorInput,
  AdvisorOutput,
  MonthlyTotals,
  Recommendation,
} from "./types";

/**
 * Run the full advisor pipeline. This is pure — no IO. It produces:
 *  - a list of explainable recommendations
 *  - scores (budget health, savings rate, fixed ratio, affordability)
 *  - safe discretionary spend estimate
 *  - plan funding breakdown
 *  - anomalies & category averages
 *  - forecast for next month
 */
export function runAdvisor(input: AdvisorInput): AdvisorOutput {
  const current = input.currentMonth;
  const history = input.history;
  const cf = cashFlow(current);
  const fmt = makeFmt({
    currency: input.profile.currency ?? "USD",
    locale: input.profile.locale ?? "en-US",
  });

  const avgMonthlyExpense = history.length
    ? Math.round(
        history.reduce((a, b) => a + b.expense, 0) / history.length,
      )
    : current.expense;

  const targetSavingsPaise = computeTargetSavings(
    input.profile.monthlyIncome,
    input.profile.savingsTargetPct,
  );

  const recurring = recurringMonthlyImpact(input.recurringBills);

  const availableForPlans = Math.max(
    0,
    input.profile.monthlyIncome - current.fixedExpense - targetSavingsPaise,
  );

  const planFunding = computePlanFunding(input, availableForPlans, fmt);
  const committedPlans = planFunding
    .filter((p) => p.feasible)
    .reduce((a, b) => a + b.monthlyContributionPaise, 0);

  const safeDiscretionaryPaise = safeDiscretionarySpend({
    income: input.profile.monthlyIncome,
    fixedExpense: current.fixedExpense,
    targetSavingsPaise,
    committedPlanContributionsPaise: committedPlans,
  });

  const averages = categoryAverages(history);
  const anomalies = detectAnomalies(current, averages);

  const recs: Recommendation[] = [];

  // 1) Fixed ratio warning
  const fx = fixedRatioRecommendation(input.profile.monthlyIncome, current.fixedExpense, fmt);
  if (fx) recs.push(fx);

  // 2) Savings rate
  const savingsRec = savingsRateRecommendation({
    incomePaise: input.profile.monthlyIncome,
    expensePaise: current.expense,
    savingsTargetPct: input.profile.savingsTargetPct,
    fixedExpensePaise: current.fixedExpense,
    fmt,
  });
  if (savingsRec) recs.push(savingsRec);

  // 3) Emergency fund
  const efRec = emergencyFundRecommendation({
    currentPaise: input.profile.emergencyFundCurrent,
    targetMonths: input.profile.emergencyFundTargetMos,
    avgMonthlyExpensePaise: avgMonthlyExpense,
    fmt,
  });
  if (efRec) recs.push(efRec);

  // 4) Category anomalies
  recs.push(...anomalyRecommendations(anomalies, fmt));

  // 5) Plans
  recs.push(...planRecommendations(planFunding, fmt));

  // 6) Safe discretionary — positive message if things look healthy
  if (
    input.profile.monthlyIncome > 0 &&
    current.expense < input.profile.monthlyIncome &&
    cf.savingsRate >= input.profile.savingsTargetPct &&
    recs.every((r) => r.severity !== "HIGH")
  ) {
    recs.push({
      id: "healthy",
      kind: "POSITIVE",
      severity: "LOW",
      title: "Your finances look healthy this month",
      body: `You're tracking above your ${input.profile.savingsTargetPct}% savings target. Safe to spend up to ${fmt(safeDiscretionaryPaise)} on variable categories without derailing goals.`,
      reasoning: [
        `Income: ${fmt(input.profile.monthlyIncome)}`,
        `Fixed expenses: ${fmt(current.fixedExpense)}`,
        `Target savings: ${fmt(targetSavingsPaise)}`,
        `Committed plan savings: ${fmt(committedPlans)}`,
        `Safe discretionary balance: ${fmt(safeDiscretionaryPaise)}`,
      ],
    });
  }

  // 7) Recurring bills note if they dominate fixed expense
  if (recurring.expense > input.profile.monthlyIncome * 0.4) {
    recs.push({
      id: "recurring-heavy",
      kind: "INSIGHT",
      severity: "MEDIUM",
      title: "Recurring bills are a big share of your income",
      body: `Subscriptions, loans and fixed bills add up to ${fmt(recurring.expense)} per month — over 40% of income. A quick audit often finds 1-2 items to cancel or downgrade.`,
      reasoning: [
        `Active recurring bills total: ${fmt(recurring.expense)}/mo`,
        `Income: ${fmt(input.profile.monthlyIncome)}`,
        `Share: ${((recurring.expense / input.profile.monthlyIncome) * 100).toFixed(0)}%`,
      ],
      action: { label: "Audit bills", href: "/bills" },
    });
  }

  const forecastNextMonthResult = forecastNextMonth(history, current);

  const scores = computeScores({
    cf,
    savingsTargetPct: input.profile.savingsTargetPct,
    fixedRatio: cf.fixedRatio,
    anomaliesCount: anomalies.length,
    planInfeasible: planFunding.filter((p) => !p.feasible).length,
    income: input.profile.monthlyIncome,
  });

  const order = { HIGH: 0, MEDIUM: 1, LOW: 2 } as const;
  const kindOrder = { WARN: 0, SAVE: 1, CAP: 2, PLAN: 3, INSIGHT: 4, POSITIVE: 5 } as const;
  recs.sort((a, b) => {
    const sa = order[a.severity] - order[b.severity];
    if (sa !== 0) return sa;
    return kindOrder[a.kind] - kindOrder[b.kind];
  });

  return {
    recommendations: recs,
    scores,
    safeDiscretionaryPaise,
    suggestedMonthlySavingPaise: targetSavingsPaise,
    planFunding,
    anomalies,
    averages,
    forecastNextMonth: forecastNextMonthResult,
  };
}

function computeScores(input: {
  cf: { savingsRate: number; fixedRatio: number };
  savingsTargetPct: number;
  fixedRatio: number;
  anomaliesCount: number;
  planInfeasible: number;
  income: number;
}): AdvisorOutput["scores"] {
  const { cf, savingsTargetPct, anomaliesCount, planInfeasible, income } = input;
  let health = 100;
  if (income <= 0) health = 0;
  else {
    const srGap = Math.max(0, savingsTargetPct - cf.savingsRate);
    health -= srGap * 2;
    if (cf.fixedRatio > 55) health -= (cf.fixedRatio - 55) * 1.5;
    health -= anomaliesCount * 5;
    health -= planInfeasible * 4;
  }
  health = Math.round(Math.max(0, Math.min(100, health)));

  const affordability = Math.round(
    Math.max(0, Math.min(100, 100 - Math.max(0, cf.fixedRatio - 50) * 2 - anomaliesCount * 3)),
  );

  return {
    budgetHealth: health,
    savingsRate: cf.savingsRate,
    fixedRatio: cf.fixedRatio,
    affordabilityScore: affordability,
  };
}

export type { AdvisorInput, AdvisorOutput, MonthlyTotals };
