import { NextRequest } from "next/server";
import { addDays, addMonths, startOfMonth } from "date-fns";
import { prisma } from "@/lib/db";
import { ensureUserBootstrap } from "@/lib/profile";
import { httpError, httpOk } from "@/lib/api";
import { rupeesToPaise } from "@/lib/money";

// All demo-seeded bills / goals / plans carry this prefix in their name so
// `DELETE /api/seed { scope: "demo" }` can isolate and remove them without
// touching anything the user created by hand.
const DEMO_PREFIX = "Demo · ";

// Budgets don't have a name field, so we key demo budgets by
// (categorySlug, last-N-months). These slugs are also the ones the seed
// loader writes budgets for, so clearing uses the same list.
const DEMO_BUDGET_SLUGS = [
  "rent",
  "groceries",
  "dining-out",
  "takeout",
  "coffee",
  "fuel",
  "subscriptions",
  "entertainment",
  "shopping",
] as const;
// Wide enough that clearing "a few months later" still catches all seeded rows.
const DEMO_BUDGET_MONTHS = 6;

/**
 * Loads ~6 months of realistic US-style demo transactions for the current
 * user as an **isolated import batch** tagged `kind = "DEMO"`.
 *
 * The user's real (manual + imported) data is never touched. If a previous
 * demo batch already exists it is replaced, so the user always sees one
 * coherent demo set.
 *
 * Accepted bodies:
 *   { confirm: "demo" }             → load demo alongside real data (default)
 *   { confirm: "demo", replace: true } → also wipe the user's real data first
 *
 * The explicit `confirm` requirement prevents accidental loads.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  // Backwards compatibility: older callers sent { confirm: "replace" }.
  const confirm = body?.confirm;
  const replace = body?.replace === true || confirm === "replace";
  if (confirm !== "demo" && confirm !== "replace") {
    return httpError(
      "Send { confirm: 'demo' } to load demo data, or { confirm: 'demo', replace: true } to also wipe real data first.",
      400,
    );
  }

  const { user } = await ensureUserBootstrap();

  if (replace) {
    // Destructive path: only used when the user ticks "replace my data".
    await prisma.transaction.deleteMany({ where: { userId: user.id } });
    await prisma.importBatch.deleteMany({ where: { userId: user.id } });
    await prisma.budget.deleteMany({ where: { userId: user.id } });
    await prisma.futurePlan.deleteMany({ where: { userId: user.id } });
    await prisma.recurringBill.deleteMany({ where: { userId: user.id } });
    await prisma.goal.deleteMany({ where: { userId: user.id } });
  } else {
    // Non-destructive path: clear any previous DEMO data (transactions,
    // batches, AND demo-tagged budgets/bills/plans/goals) so re-running
    // "Load demo data" always produces one coherent demo set.
    await clearDemoArtifacts(user.id);
  }

  const batch = await prisma.importBatch.create({
    data: {
      userId: user.id,
      kind: "DEMO",
      label: "Demo data (US sample)",
      source: "Penny Coach demo",
      filename: null,
      rowCount: 0,
      status: "ACTIVE",
    },
  });

  const categories = await prisma.category.findMany({ where: { userId: user.id } });
  const cat = (slug: string) => categories.find((c) => c.slug === slug)?.id ?? null;

  const today = new Date();
  const months = 6;
  type Row = {
    userId: string;
    categoryId: string | null;
    type: "EXPENSE" | "INCOME";
    amountPaise: number;
    date: Date;
    note?: string;
    merchant?: string;
    paymentMethod?: string;
    importBatchId: string;
  };
  const rows: Row[] = [];

  for (let m = months - 1; m >= 0; m--) {
    const ms = startOfMonth(addMonths(today, -m));
    // Bi-weekly paychecks
    rows.push({
      userId: user.id,
      categoryId: cat("salary"),
      type: "INCOME",
      amountPaise: rupeesToPaise(2_750),
      date: addDays(ms, 0),
      note: "Paycheck (demo)",
      merchant: "Acme Inc",
      paymentMethod: "ACH",
      importBatchId: batch.id,
    });
    rows.push({
      userId: user.id,
      categoryId: cat("salary"),
      type: "INCOME",
      amountPaise: rupeesToPaise(2_750),
      date: addDays(ms, 14),
      note: "Paycheck (demo)",
      merchant: "Acme Inc",
      paymentMethod: "ACH",
      importBatchId: batch.id,
    });
    rows.push({
      userId: user.id,
      categoryId: cat("rent"),
      type: "EXPENSE",
      amountPaise: rupeesToPaise(1_800),
      date: addDays(ms, 1),
      note: "Rent (demo)",
      merchant: "Greystar",
      paymentMethod: "ACH",
      importBatchId: batch.id,
    });
    rows.push({
      userId: user.id,
      categoryId: cat("auto-loan"),
      type: "EXPENSE",
      amountPaise: rupeesToPaise(395),
      date: addDays(ms, 6),
      note: "Auto loan (demo)",
      merchant: "Toyota Financial",
      paymentMethod: "AUTOPAY",
      importBatchId: batch.id,
    });
    rows.push({
      userId: user.id,
      categoryId: cat("health-insurance"),
      type: "EXPENSE",
      amountPaise: rupeesToPaise(220),
      date: addDays(ms, 2),
      note: "Health insurance premium (demo)",
      merchant: "Blue Cross",
      paymentMethod: "AUTOPAY",
      importBatchId: batch.id,
    });
    rows.push({
      userId: user.id,
      categoryId: cat("internet"),
      type: "EXPENSE",
      amountPaise: rupeesToPaise(65),
      date: addDays(ms, 10),
      note: "Xfinity (demo)",
      merchant: "Xfinity",
      paymentMethod: "AUTOPAY",
      importBatchId: batch.id,
    });
    rows.push({
      userId: user.id,
      categoryId: cat("retirement"),
      type: "EXPENSE",
      amountPaise: rupeesToPaise(300),
      date: addDays(ms, 2),
      note: "401(k) contribution (demo)",
      merchant: "Fidelity",
      paymentMethod: "ACH",
      importBatchId: batch.id,
    });
    rows.push({
      userId: user.id,
      categoryId: cat("investments"),
      type: "EXPENSE",
      amountPaise: rupeesToPaise(400),
      date: addDays(ms, 5),
      note: "Vanguard VTI (demo)",
      merchant: "Vanguard",
      paymentMethod: "ACH",
      importBatchId: batch.id,
    });
    for (let w = 0; w < 4; w++) {
      rows.push({
        userId: user.id,
        categoryId: cat("groceries"),
        type: "EXPENSE",
        amountPaise: rupeesToPaise(85 + Math.random() * 70),
        date: addDays(ms, 3 + w * 7),
        paymentMethod: "CREDIT_CARD",
        merchant: ["Trader Joe's", "Whole Foods", "Walmart", "Costco"][w % 4],
        note: "Groceries (demo)",
        importBatchId: batch.id,
      });
    }
    const deliveries = 4 + Math.floor(Math.random() * 4) + (m === 0 ? 4 : 0);
    for (let i = 0; i < deliveries; i++) {
      rows.push({
        userId: user.id,
        categoryId: cat("takeout"),
        type: "EXPENSE",
        amountPaise: rupeesToPaise(14 + Math.random() * 22),
        date: addDays(ms, Math.floor(Math.random() * 28)),
        paymentMethod: "CREDIT_CARD",
        merchant: "DoorDash",
        note: "Dinner delivery (demo)",
        importBatchId: batch.id,
      });
    }
    for (let i = 0; i < 3; i++) {
      rows.push({
        userId: user.id,
        categoryId: cat("fuel"),
        type: "EXPENSE",
        amountPaise: rupeesToPaise(35 + Math.random() * 20),
        date: addDays(ms, 5 + i * 8),
        paymentMethod: "CREDIT_CARD",
        merchant: "Shell",
        note: "Gas (demo)",
        importBatchId: batch.id,
      });
    }
    for (let i = 0; i < 5; i++) {
      rows.push({
        userId: user.id,
        categoryId: cat("coffee"),
        type: "EXPENSE",
        amountPaise: rupeesToPaise(4 + Math.random() * 4),
        date: addDays(ms, Math.floor(Math.random() * 28)),
        paymentMethod: "CREDIT_CARD",
        merchant: "Starbucks",
        note: "Coffee (demo)",
        importBatchId: batch.id,
      });
    }
    rows.push({
      userId: user.id,
      categoryId: cat("subscriptions"),
      type: "EXPENSE",
      amountPaise: rupeesToPaise(15.99),
      date: addDays(ms, 7),
      paymentMethod: "CREDIT_CARD",
      merchant: "Netflix",
      note: "Netflix (demo)",
      importBatchId: batch.id,
    });
    rows.push({
      userId: user.id,
      categoryId: cat("subscriptions"),
      type: "EXPENSE",
      amountPaise: rupeesToPaise(10.99),
      date: addDays(ms, 12),
      paymentMethod: "CREDIT_CARD",
      merchant: "Spotify",
      note: "Spotify (demo)",
      importBatchId: batch.id,
    });
  }

  for (let i = 0; i < rows.length; i += 200) {
    await prisma.transaction.createMany({ data: rows.slice(i, i + 200) });
  }
  await prisma.importBatch.update({
    where: { id: batch.id },
    data: { rowCount: rows.length },
  });

  // ---- Budgets (last 3 months for the categories that actually see spending).
  // Slugs here MUST stay in DEMO_BUDGET_SLUGS so clearDemoArtifacts can
  // delete them cleanly.
  const budgetTargets: Array<{ slug: string; amount: number }> = [
    { slug: "rent", amount: 1_800 },
    { slug: "groceries", amount: 500 },
    { slug: "dining-out", amount: 200 },
    { slug: "takeout", amount: 120 },
    { slug: "coffee", amount: 40 },
    { slug: "fuel", amount: 180 },
    { slug: "subscriptions", amount: 40 },
    { slug: "entertainment", amount: 120 },
    { slug: "shopping", amount: 200 },
  ];
  const budgetRows: Array<{
    userId: string;
    categoryId: string;
    periodMonth: Date;
    amountPaise: number;
  }> = [];
  for (let m = 2; m >= 0; m--) {
    const period = startOfMonth(addMonths(today, -m));
    for (const b of budgetTargets) {
      const cid = cat(b.slug);
      if (!cid) continue;
      budgetRows.push({
        userId: user.id,
        categoryId: cid,
        periodMonth: period,
        amountPaise: rupeesToPaise(b.amount),
      });
    }
  }
  if (budgetRows.length > 0) {
    await Promise.all(
      budgetRows.map((b) =>
        prisma.budget.upsert({
          where: {
            userId_categoryId_periodMonth: {
              userId: b.userId,
              categoryId: b.categoryId,
              periodMonth: b.periodMonth,
            },
          },
          update: { amountPaise: b.amountPaise },
          create: b,
        }),
      ),
    );
  }

  // ---- Recurring bills (all prefixed so demo-only clear can find them) ----
  const nextMonth = startOfMonth(addMonths(today, 1));
  const bills: Array<{
    name: string;
    categorySlug: string | null;
    amount: number;
    dayOfMonth: number;
    autoPay: boolean;
  }> = [
    { name: "Rent", categorySlug: "rent", amount: 1_800, dayOfMonth: 1, autoPay: true },
    { name: "Auto loan (Toyota Financial)", categorySlug: "auto-loan", amount: 395, dayOfMonth: 6, autoPay: true },
    { name: "Health insurance (Blue Cross)", categorySlug: "health-insurance", amount: 220, dayOfMonth: 2, autoPay: true },
    { name: "Xfinity internet", categorySlug: "internet", amount: 65, dayOfMonth: 10, autoPay: true },
    { name: "Netflix", categorySlug: "subscriptions", amount: 15.99, dayOfMonth: 7, autoPay: true },
    { name: "Spotify", categorySlug: "subscriptions", amount: 10.99, dayOfMonth: 12, autoPay: true },
  ];
  await Promise.all(
    bills.map((b) =>
      prisma.recurringBill.create({
        data: {
          userId: user.id,
          name: `${DEMO_PREFIX}${b.name}`,
          categoryId: b.categorySlug ? cat(b.categorySlug) : null,
          amountPaise: rupeesToPaise(b.amount),
          frequency: "MONTHLY",
          dayOfMonth: b.dayOfMonth,
          nextDueDate: addDays(nextMonth, Math.max(0, b.dayOfMonth - 1)),
          type: "EXPENSE",
          autoPay: b.autoPay,
          active: true,
        },
      }),
    ),
  );

  // ---- Goals (long-term savings targets) ----
  await prisma.goal.createMany({
    data: [
      {
        userId: user.id,
        name: `${DEMO_PREFIX}Emergency fund (6 months)`,
        targetAmountPaise: rupeesToPaise(18_000),
        savedAmountPaise: rupeesToPaise(4_200),
        targetDate: addMonths(today, 18),
        notes: "Cover 6 months of essential expenses.",
        status: "ACTIVE",
      },
      {
        userId: user.id,
        name: `${DEMO_PREFIX}Roth IRA (annual max)`,
        targetAmountPaise: rupeesToPaise(7_000),
        savedAmountPaise: rupeesToPaise(2_100),
        targetDate: addMonths(startOfMonth(new Date(today.getFullYear() + 1, 0, 1)), 3),
        notes: "Auto-contribute to hit the IRS annual limit.",
        status: "ACTIVE",
      },
    ],
  });

  // ---- Future plans (mid-term purchases) ----
  await prisma.futurePlan.createMany({
    data: [
      {
        userId: user.id,
        name: `${DEMO_PREFIX}Summer trip to Yellowstone`,
        targetAmountPaise: rupeesToPaise(3_200),
        savedAmountPaise: rupeesToPaise(450),
        targetDate: addMonths(today, 7),
        priority: 3,
        categoryId: cat("travel"),
        notes: "Flights + lodging + rental car.",
        status: "ACTIVE",
      },
      {
        userId: user.id,
        name: `${DEMO_PREFIX}New laptop (M-series MacBook)`,
        targetAmountPaise: rupeesToPaise(2_400),
        savedAmountPaise: rupeesToPaise(600),
        targetDate: addMonths(today, 5),
        priority: 2,
        categoryId: cat("shopping"),
        notes: "Replace work laptop.",
        status: "ACTIVE",
      },
      {
        userId: user.id,
        name: `${DEMO_PREFIX}Down payment (starter)`,
        targetAmountPaise: rupeesToPaise(35_000),
        savedAmountPaise: rupeesToPaise(7_500),
        targetDate: addMonths(today, 36),
        priority: 1,
        categoryId: null,
        notes: "Aim for 10% on a ~$350k condo.",
        status: "ACTIVE",
      },
    ],
  });

  // ---- Profile: only seed sensible defaults if the user hasn't filled theirs in ----
  const profile = await prisma.financialProfile.findUnique({ where: { userId: user.id } });
  if (profile && profile.monthlyIncome === 0) {
    await prisma.financialProfile.update({
      where: { userId: user.id },
      data: {
        monthlyIncome: rupeesToPaise(5_500),
        savingsTargetPct: 20,
        emergencyFundTargetMos: 6,
        emergencyFundCurrent: rupeesToPaise(4_200),
      },
    });
  }

  return httpOk({
    ok: true,
    inserted: rows.length,
    batchId: batch.id,
    budgets: budgetRows.length,
    bills: bills.length,
    goals: 2,
    plans: 3,
  });
}

/**
 * Remove everything the demo loader created:
 *   - transactions tagged to a DEMO ImportBatch (and the batches)
 *   - budgets that sit inside one of those demo batches' months
 *     (we key off `Demo · ` name prefix for budgets indirectly — budgets
 *      don't have names, so we just delete any budget whose category had
 *      a demo transaction. Simpler: delete all demo-prefixed bills/goals/plans
 *      and ALL budgets created at seed time we track by month+category.)
 *
 * In practice: we delete demo transactions & their batches, and
 * bills/goals/plans whose `name` starts with the `DEMO_PREFIX`.
 * Budgets are left as-is because the user may have customized them; they're
 * cheap to overwrite by re-loading demo data.
 */
async function clearDemoArtifacts(userId: string): Promise<{
  transactions: number;
  bills: number;
  goals: number;
  plans: number;
  budgets: number;
}> {
  const demoBatches = await prisma.importBatch.findMany({
    where: { userId, kind: "DEMO" },
    select: { id: true },
  });
  const ids = demoBatches.map((b) => b.id);
  const tx = await prisma.transaction.deleteMany({
    where: { userId, importBatchId: { in: ids } },
  });
  await prisma.importBatch.deleteMany({ where: { userId, id: { in: ids } } });

  const bills = await prisma.recurringBill.deleteMany({
    where: { userId, name: { startsWith: DEMO_PREFIX } },
  });
  const goals = await prisma.goal.deleteMany({
    where: { userId, name: { startsWith: DEMO_PREFIX } },
  });
  const plans = await prisma.futurePlan.deleteMany({
    where: { userId, name: { startsWith: DEMO_PREFIX } },
  });

  // Budgets don't have a name, so we match on the known demo (slug, month)
  // grid. We look up the category ids for DEMO_BUDGET_SLUGS, then delete
  // budgets on those categories for the last DEMO_BUDGET_MONTHS months.
  const today = new Date();
  const cutoff = startOfMonth(addMonths(today, -(DEMO_BUDGET_MONTHS - 1)));
  const demoCategories = await prisma.category.findMany({
    where: { userId, slug: { in: [...DEMO_BUDGET_SLUGS] } },
    select: { id: true },
  });
  const demoCategoryIds = demoCategories.map((c) => c.id);
  const budgets = demoCategoryIds.length
    ? await prisma.budget.deleteMany({
        where: {
          userId,
          categoryId: { in: demoCategoryIds },
          periodMonth: { gte: cutoff },
        },
      })
    : { count: 0 };

  return {
    transactions: tx.count,
    bills: bills.count,
    goals: goals.count,
    plans: plans.count,
    budgets: budgets.count,
  };
}

/**
 * DELETE /api/seed
 *
 * Accepts:
 *   { scope: "demo",         confirm: "delete" } → removes only demo data
 *   { scope: "transactions", confirm: "delete" } → removes ALL transactions + budgets
 *   { scope: "all",          confirm: "delete" } → wipes transactions, budgets,
 *                                                 plans, goals and bills
 *
 * Categories, the profile and recommendations are always preserved.
 */
export async function DELETE(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const scope = body?.scope;
  if (body?.confirm !== "delete" || !["demo", "transactions", "all"].includes(scope)) {
    return httpError(
      "Pass { scope: 'demo' | 'transactions' | 'all', confirm: 'delete' } to wipe data.",
      400,
    );
  }
  const { user } = await ensureUserBootstrap();

  if (scope === "demo") {
    const cleared = await clearDemoArtifacts(user.id);
    return httpOk({ ok: true, scope, ...cleared });
  }

  await prisma.recommendation.deleteMany({ where: { userId: user.id } });
  await prisma.notification.deleteMany({ where: { userId: user.id } });
  await prisma.monthlySnapshot.deleteMany({ where: { userId: user.id } });
  await prisma.transaction.deleteMany({ where: { userId: user.id } });
  await prisma.importBatch.deleteMany({ where: { userId: user.id } });
  await prisma.budget.deleteMany({ where: { userId: user.id } });

  if (scope === "all") {
    await prisma.futurePlan.deleteMany({ where: { userId: user.id } });
    await prisma.recurringBill.deleteMany({ where: { userId: user.id } });
    await prisma.goal.deleteMany({ where: { userId: user.id } });
  }

  return httpOk({ ok: true, scope });
}
