import { describe, expect, it } from "vitest";
import { addMonths } from "date-fns";
import { runAdvisor } from "./index";
import { categoryAverages, weightedTrend } from "./categoryAverages";
import { detectAnomalies } from "./anomaly";
import { computePlanFunding } from "./plans";
import { computeTargetSavings, savingsRateRecommendation } from "./savings";
import { fixedRatioRecommendation, safeDiscretionarySpend } from "./cashflow";
import { forecastNextMonth, recurringMonthlyImpact } from "./forecasting";
import { suggestBudgets } from "./budgetSuggestion";
import { pickAdviceLedgerMonth } from "../advice-ledger";
import type { AdvisorInput, MonthlyTotals } from "./types";

function mt(overrides: Partial<MonthlyTotals> & { period: Date }): MonthlyTotals {
  return {
    period: overrides.period,
    income: overrides.income ?? 0,
    expense: overrides.expense ?? 0,
    fixedExpense: overrides.fixedExpense ?? 0,
    variableExpense: overrides.variableExpense ?? 0,
    savings: overrides.savings ?? 0,
    byCategory: overrides.byCategory ?? {},
  };
}

const P = (major: number) => major * 100; // major units to minor units (cents)

describe("cashflow.safeDiscretionarySpend", () => {
  it("returns 0 when over-committed", () => {
    expect(
      safeDiscretionarySpend({
        income: P(5_000),
        fixedExpense: P(4_000),
        targetSavingsPaise: P(1_500),
        committedPlanContributionsPaise: P(500),
      }),
    ).toBe(0);
  });

  it("returns available cash otherwise", () => {
    expect(
      safeDiscretionarySpend({
        income: P(8_000),
        fixedExpense: P(3_000),
        targetSavingsPaise: P(1_600),
        committedPlanContributionsPaise: P(400),
      }),
    ).toBe(P(3_000));
  });
});

describe("cashflow.fixedRatioRecommendation", () => {
  it("flags HIGH severity above 70%", () => {
    const rec = fixedRatioRecommendation(P(5_000), P(3_800));
    expect(rec?.severity).toBe("HIGH");
  });
  it("flags MEDIUM between 55-70%", () => {
    const rec = fixedRatioRecommendation(P(5_000), P(3_000));
    expect(rec?.severity).toBe("MEDIUM");
  });
  it("stays silent when below 55%", () => {
    const rec = fixedRatioRecommendation(P(5_000), P(2_000));
    expect(rec).toBeNull();
  });
  it("returns null on zero income", () => {
    expect(fixedRatioRecommendation(0, 0)).toBeNull();
  });
  it("uses the injected formatter so currency is configurable", () => {
    const usd = fixedRatioRecommendation(P(5_000), P(3_800));
    const inr = fixedRatioRecommendation(
      P(5_000),
      P(3_800),
      (n) => `₹${(n / 100).toFixed(0)}`,
    );
    expect(usd?.reasoning.join(" ")).toMatch(/\$/);
    expect(inr?.reasoning.join(" ")).toMatch(/₹/);
  });
});

describe("savings", () => {
  it("computes target savings capped 0-90%", () => {
    expect(computeTargetSavings(P(5_000), 20)).toBe(P(1_000));
    expect(computeTargetSavings(P(5_000), 999)).toBe(P(4_500));
    expect(computeTargetSavings(P(5_000), -10)).toBe(0);
  });

  it("savings rate rec fires when under target", () => {
    const rec = savingsRateRecommendation({
      incomePaise: P(5_000),
      expensePaise: P(4_800),
      savingsTargetPct: 20,
      fixedExpensePaise: P(2_000),
    });
    expect(rec).not.toBeNull();
    expect(rec?.body).toMatch(/\d+/);
  });

  it("savings rate rec is null when meeting target", () => {
    const rec = savingsRateRecommendation({
      incomePaise: P(5_000),
      expensePaise: P(3_500),
      savingsTargetPct: 20,
      fixedExpensePaise: P(1_500),
    });
    expect(rec).toBeNull();
  });
});

describe("category averages & trend", () => {
  it("averages are correct", () => {
    const history = [
      mt({ period: new Date(), byCategory: { groceries: 5000 } }),
      mt({ period: new Date(), byCategory: { groceries: 7000 } }),
      mt({ period: new Date(), byCategory: { groceries: 9000 } }),
    ];
    const avgs = categoryAverages(history);
    expect(avgs[0].avg).toBe(7000);
    expect(avgs[0].slug).toBe("groceries");
    expect(avgs[0].months).toBe(3);
  });

  it("weightedTrend biases to recent values", () => {
    expect(weightedTrend([100, 200, 300])).toBe(Math.round((100 + 400 + 900) / 6));
  });
});

describe("anomaly detector", () => {
  it("flags categories well above average", () => {
    const averages = [
      { slug: "takeout", avg: P(400), stdev: P(50), max: P(500), months: 3 },
    ];
    const current = mt({
      period: new Date(),
      byCategory: { takeout: P(800) },
    });
    const out = detectAnomalies(current, averages);
    expect(out[0].severity).toBe("HIGH");
    expect(out[0].deltaPct).toBeGreaterThanOrEqual(50);
  });

  it("ignores small deltas", () => {
    const averages = [
      { slug: "groceries", avg: P(500), stdev: P(50), max: P(550), months: 3 },
    ];
    const current = mt({
      period: new Date(),
      byCategory: { groceries: P(510) },
    });
    expect(detectAnomalies(current, averages)).toEqual([]);
  });

  it("requires ≥ 2 months of history to flag", () => {
    const averages = [
      { slug: "fuel", avg: P(500), stdev: P(0), max: P(500), months: 1 },
    ];
    const current = mt({
      period: new Date(),
      byCategory: { fuel: P(2_000) },
    });
    expect(detectAnomalies(current, averages)).toEqual([]);
  });
});

describe("plan funding", () => {
  it("computes monthly contribution correctly", () => {
    const now = new Date("2026-01-15");
    const input: AdvisorInput = {
      profile: {
        monthlyIncome: P(5_000),
        savingsTargetPct: 20,
        emergencyFundTargetMos: 6,
        emergencyFundCurrent: 0,
        salaryCycle: "MONTHLY",
      },
      currentMonth: mt({ period: now }),
      history: [],
      budgets: [],
      plans: [
        {
          id: "p1",
          name: "Laptop",
          priority: 2,
          targetAmountPaise: P(1_800),
          savedAmountPaise: P(600),
          targetDate: addMonths(now, 6),
          status: "ACTIVE",
        },
      ],
      recurringBills: [],
      categoryKinds: {},
      now,
    };
    const funding = computePlanFunding(input, P(2_000));
    expect(funding).toHaveLength(1);
    // 1,200 / 6 = 200
    expect(funding[0].monthlyContributionPaise).toBe(P(200));
    expect(funding[0].feasible).toBe(true);
  });

  it("marks infeasible when budget is tight", () => {
    const now = new Date("2026-01-15");
    const input: AdvisorInput = {
      profile: {
        monthlyIncome: P(5_000),
        savingsTargetPct: 20,
        emergencyFundTargetMos: 6,
        emergencyFundCurrent: 0,
        salaryCycle: "MONTHLY",
      },
      currentMonth: mt({ period: now }),
      history: [],
      budgets: [],
      plans: [
        {
          id: "p1",
          name: "Big plan",
          priority: 2,
          targetAmountPaise: P(10_000),
          savedAmountPaise: 0,
          targetDate: addMonths(now, 2),
          status: "ACTIVE",
        },
      ],
      recurringBills: [],
      categoryKinds: {},
      now,
    };
    const funding = computePlanFunding(input, P(1_000));
    expect(funding[0].feasible).toBe(false);
    expect(funding[0].shortfallPaise).toBeGreaterThan(0);
  });
});

describe("pickAdviceLedgerMonth", () => {
  it("keeps calendar month when it has activity", () => {
    const cal = mt({ period: new Date("2026-04-01"), income: P(100), expense: P(40) });
    const feb = mt({ period: new Date("2026-02-01"), income: P(999), expense: P(1) });
    expect(pickAdviceLedgerMonth(cal, [feb])).toBe(cal);
  });

  it("falls back to the latest prior month with any activity", () => {
    const cal = mt({ period: new Date("2026-04-01"), income: 0, expense: 0 });
    const feb = mt({ period: new Date("2026-02-01"), income: P(3_270), expense: P(1_000) });
    const hist = [mt({ period: new Date("2026-01-01"), income: 0, expense: 0 }), feb];
    expect(pickAdviceLedgerMonth(cal, hist)).toBe(feb);
  });
});

describe("forecasting", () => {
  it("forecasts using max(avg, weighted)", () => {
    const history: MonthlyTotals[] = [
      mt({ period: new Date(), income: P(5_000), expense: P(3_000), byCategory: { groceries: P(500) } }),
      mt({ period: new Date(), income: P(5_000), expense: P(3_200), byCategory: { groceries: P(600) } }),
    ];
    const current = mt({
      period: new Date(),
      income: P(5_000),
      expense: P(3_500),
      byCategory: { groceries: P(700) },
    });
    const f = forecastNextMonth(history, current);
    expect(f.projectedIncome).toBe(P(5_000));
    expect(f.byCategory.groceries).toBeGreaterThanOrEqual(P(600));
  });

  it("ignores trailing empty months when averaging income", () => {
    const history: MonthlyTotals[] = [
      mt({ period: new Date("2026-01-01"), income: 0, expense: 0, byCategory: {} }),
      mt({
        period: new Date("2026-02-01"),
        income: P(3_270),
        expense: P(1_000),
        byCategory: { groceries: P(500) },
      }),
    ];
    const current = mt({
      period: new Date("2026-03-01"),
      income: 0,
      expense: 0,
      byCategory: {},
    });
    const f = forecastNextMonth(history, current);
    expect(f.projectedIncome).toBe(P(3_270));
  });

  it("recurring monthly impact normalises frequencies", () => {
    const impact = recurringMonthlyImpact([
      { amountPaise: P(100), frequency: "MONTHLY", active: true, type: "EXPENSE" },
      { amountPaise: P(1200), frequency: "YEARLY", active: true, type: "EXPENSE" },
      { amountPaise: P(30), frequency: "WEEKLY", active: true, type: "EXPENSE" },
      { amountPaise: P(999), frequency: "MONTHLY", active: false, type: "EXPENSE" },
    ]);
    expect(impact.expense).toBe(
      P(100) + Math.round(P(1200) / 12) + Math.round(P(30) * (52 / 12)),
    );
  });
});

describe("budget suggestion", () => {
  it("suggests rounded budgets with variance buffer", () => {
    const avgs = [
      { slug: "groceries", avg: 520_00, stdev: 80_00, max: 650_00, months: 3 },
    ];
    const suggestions = suggestBudgets(avgs);
    expect(suggestions.groceries).toBeGreaterThan(520_00);
    // rounded to 50 major-unit multiples (5000 minor)
    expect(suggestions.groceries % 5000).toBe(0);
  });
});

describe("runAdvisor integration", () => {
  it("returns recommendations, scores and forecast", () => {
    const now = new Date("2026-04-15");
    const history: MonthlyTotals[] = [
      mt({
        period: new Date("2026-01-01"),
        income: P(5_500),
        expense: P(3_800),
        fixedExpense: P(2_500),
        variableExpense: P(1_300),
        savings: P(1_700),
        byCategory: { takeout: P(150), groceries: P(400), rent: P(1_800) },
      }),
      mt({
        period: new Date("2026-02-01"),
        income: P(5_500),
        expense: P(3_900),
        fixedExpense: P(2_500),
        variableExpense: P(1_400),
        savings: P(1_600),
        byCategory: { takeout: P(180), groceries: P(420), rent: P(1_800) },
      }),
      mt({
        period: new Date("2026-03-01"),
        income: P(5_500),
        expense: P(3_850),
        fixedExpense: P(2_500),
        variableExpense: P(1_350),
        savings: P(1_650),
        byCategory: { takeout: P(170), groceries: P(410), rent: P(1_800) },
      }),
    ];
    const current: MonthlyTotals = mt({
      period: new Date("2026-04-01"),
      income: P(5_500),
      expense: P(4_400),
      fixedExpense: P(2_500),
      variableExpense: P(1_900),
      savings: P(1_100),
      byCategory: { takeout: P(500), groceries: P(430), rent: P(1_800) },
    });
    const out = runAdvisor({
      profile: {
        monthlyIncome: P(5_500),
        savingsTargetPct: 25,
        emergencyFundTargetMos: 6,
        emergencyFundCurrent: P(5_000),
        salaryCycle: "MONTHLY",
        currency: "USD",
        locale: "en-US",
      },
      currentMonth: current,
      history,
      budgets: [],
      plans: [],
      recurringBills: [],
      categoryKinds: { takeout: "VARIABLE", groceries: "VARIABLE", rent: "FIXED" },
      now,
    });

    expect(out.scores.budgetHealth).toBeGreaterThanOrEqual(0);
    expect(out.scores.savingsRate).toBeCloseTo(((5_500 - 4_400) / 5_500) * 100, 1);
    // takeout tripled → anomaly must be in recommendations
    const foodAnomaly = out.recommendations.find((r) => r.id === "anomaly-takeout");
    expect(foodAnomaly).toBeDefined();
    // Recommendation text should use $ (USD) not ₹
    expect(foodAnomaly?.body).toMatch(/\$/);
    expect(out.forecastNextMonth.projectedIncome).toBe(P(5_500));
    expect(out.safeDiscretionaryPaise).toBeGreaterThanOrEqual(0);
  });
});
