import { differenceInCalendarMonths } from "date-fns";
import { defaultFmt } from "./fmt";
import type { AdvisorInput, PlanFunding, Recommendation } from "./types";

/**
 * Future plan funding calculator.
 *
 * For each ACTIVE plan:
 *   - months = max(1, months between now and targetDate)
 *   - monthlyContribution = (target - saved) / months
 *
 * Then we check whether the sum of monthly contributions fits inside
 * (income - fixedExpense - targetSavings). If not, we prioritise by
 * (priority asc, targetDate asc) and mark the overflow as infeasible
 * with a clear reason.
 */
export function computePlanFunding(
  input: AdvisorInput,
  availableForPlansPaise: number,
  fmt: (n: number) => string = defaultFmt,
): PlanFunding[] {
  const now = input.now ?? new Date();
  const plans = input.plans.filter((p) => p.status === "ACTIVE");

  const raw = plans.map((p) => {
    const months = Math.max(1, differenceInCalendarMonths(p.targetDate, now));
    const remaining = Math.max(0, p.targetAmountPaise - p.savedAmountPaise);
    const monthly = Math.ceil(remaining / months);
    return { plan: p, months, monthly, remaining };
  });

  raw.sort((a, b) => {
    if (a.plan.priority !== b.plan.priority) return a.plan.priority - b.plan.priority;
    return a.plan.targetDate.getTime() - b.plan.targetDate.getTime();
  });

  let remainingBudget = Math.max(0, availableForPlansPaise);
  const out: PlanFunding[] = [];
  for (const { plan, months, monthly, remaining } of raw) {
    const allocated = Math.min(monthly, remainingBudget);
    const feasible = allocated >= monthly;
    const shortfall = Math.max(0, monthly - allocated);
    remainingBudget -= allocated;

    let reason: string;
    if (remaining === 0) reason = "Target already reached. Marking plan as done would be wise.";
    else if (feasible)
      reason = `Setting aside ${fmt(monthly)}/month reaches ${fmt(plan.targetAmountPaise)} by target date.`;
    else if (allocated === 0)
      reason = `No monthly cash available after fixed expenses + savings target. Consider extending the target date or increasing income.`;
    else
      reason = `Only ${fmt(allocated)}/month fits your cash flow, but you need ${fmt(monthly)}. Shortfall of ${fmt(shortfall)}/month — push the date or raise contribution.`;

    out.push({
      planId: plan.id,
      name: plan.name,
      monthlyContributionPaise: monthly,
      monthsToTarget: months,
      feasible,
      reason,
      shortfallPaise: shortfall,
    });
  }
  return out;
}

export function planRecommendations(
  fundings: PlanFunding[],
  fmt: (n: number) => string = defaultFmt,
): Recommendation[] {
  const out: Recommendation[] = [];
  for (const f of fundings) {
    if (f.feasible && f.monthlyContributionPaise > 0) {
      out.push({
        id: `plan-${f.planId}`,
        kind: "PLAN",
        severity: "LOW",
        title: `${f.name}: save ${fmt(f.monthlyContributionPaise)}/month`,
        body: f.reason,
        reasoning: [
          `Months to target: ${f.monthsToTarget}`,
          `Required monthly contribution: ${fmt(f.monthlyContributionPaise)}`,
          "Treat this as a sinking fund so the money is ready when you need it.",
        ],
        payload: { planId: f.planId, monthly: f.monthlyContributionPaise },
        action: { label: "View plans", href: "/plans" },
      });
    } else if (!f.feasible) {
      out.push({
        id: `plan-${f.planId}-infeasible`,
        kind: "WARN",
        severity: "MEDIUM",
        title: `${f.name} is under-funded this month`,
        body: f.reason,
        reasoning: [
          `Monthly contribution needed: ${fmt(f.monthlyContributionPaise)}`,
          `Shortfall: ${fmt(f.shortfallPaise)}`,
          "Options: extend the target date, raise income, or trim other plans.",
        ],
        payload: { planId: f.planId, shortfall: f.shortfallPaise },
        action: { label: "Adjust plan", href: "/plans" },
      });
    }
  }
  return out;
}
