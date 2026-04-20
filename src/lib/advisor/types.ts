/**
 * Shared types for the deterministic advisor engine.
 *
 * Everything works in **paise** (integer). Pure functions — no IO.
 * Each recommendation includes the math/reasoning so the UI can show
 * users *why* they're getting each tip.
 */

export type RecommendationKind =
  | "SAVE"
  | "CAP"
  | "WARN"
  | "PLAN"
  | "INSIGHT"
  | "POSITIVE";

export type Severity = "LOW" | "MEDIUM" | "HIGH";

export interface Recommendation {
  id: string;
  kind: RecommendationKind;
  severity: Severity;
  title: string;
  body: string;
  /** Math / inputs used to derive this tip, shown to the user. */
  reasoning: string[];
  /** Optional CTA hint. */
  action?: { label: string; href: string };
  /** Optional structured payload for UI (e.g. category slug). */
  payload?: Record<string, unknown>;
}

export interface MonthlyTotals {
  period: Date;
  income: number;
  expense: number;
  fixedExpense: number;
  variableExpense: number;
  savings: number;
  byCategory: Record<string, number>; // slug -> paise
}

export interface AdvisorInput {
  profile: {
    monthlyIncome: number; // minor units
    savingsTargetPct: number; // 0-90
    emergencyFundTargetMos: number;
    emergencyFundCurrent: number; // minor units
    salaryCycle: "MONTHLY" | "WEEKLY" | "IRREGULAR";
    currency?: string; // e.g. "USD", "INR". Defaults to USD if missing.
    locale?: string; // e.g. "en-US", "en-IN". Defaults to en-US if missing.
  };
  currentMonth: MonthlyTotals;
  history: MonthlyTotals[]; // oldest first, EXCLUDES current month
  budgets: Array<{ categorySlug: string; amountPaise: number }>;
  plans: Array<{
    id: string;
    name: string;
    priority: number;
    targetAmountPaise: number;
    savedAmountPaise: number;
    targetDate: Date;
    status: string;
  }>;
  recurringBills: Array<{
    id: string;
    name: string;
    amountPaise: number;
    frequency: "WEEKLY" | "MONTHLY" | "QUARTERLY" | "YEARLY";
    active: boolean;
    type: "EXPENSE" | "INCOME";
  }>;
  categoryKinds: Record<string, "FIXED" | "VARIABLE" | "SAVINGS" | "INCOME">;
  now?: Date;
}

export interface CategoryAverage {
  slug: string;
  avg: number;
  stdev: number;
  max: number;
  months: number;
}

export interface AdvisorOutput {
  recommendations: Recommendation[];
  scores: {
    budgetHealth: number; // 0-100
    savingsRate: number; // percentage of income saved
    fixedRatio: number; // fixed / income %
    affordabilityScore: number; // 0-100
  };
  safeDiscretionaryPaise: number;
  suggestedMonthlySavingPaise: number;
  planFunding: PlanFunding[];
  anomalies: Anomaly[];
  averages: CategoryAverage[];
  forecastNextMonth: {
    projectedExpense: number;
    projectedIncome: number;
    projectedSavings: number;
    byCategory: Record<string, number>;
  };
}

export interface Anomaly {
  slug: string;
  currentPaise: number;
  avgPaise: number;
  delta: number;
  deltaPct: number;
  severity: Severity;
}

export interface PlanFunding {
  planId: string;
  name: string;
  monthlyContributionPaise: number;
  monthsToTarget: number;
  feasible: boolean;
  reason: string;
  shortfallPaise: number;
}
