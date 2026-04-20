import { PrismaClient } from "@prisma/client";
import { addDays, addMonths, startOfMonth } from "date-fns";
import { DEFAULT_CATEGORIES } from "../src/lib/categories";

/**
 * Opt-in US-style demo seed for Penny Coach.
 *
 * ⚠️  This script wipes ALL existing data and replaces it with a realistic
 * 6-month US personal-finance demo. Only run it when you WANT to explore
 * the app with fake data. For real usage, just start the app — it creates
 * an empty profile and you add your own transactions / import from your bank.
 */

const prisma = new PrismaClient();

function cents(dollars: number): number {
  return Math.round(dollars * 100);
}

function daysAgo(n: number): Date {
  return addDays(new Date(), -n);
}

async function main() {
  console.log("Seeding Penny Coach US demo data…");

  // Wipe existing — this is a single-user tracker.
  await prisma.recommendation.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.monthlySnapshot.deleteMany();
  await prisma.transactionTag.deleteMany();
  await prisma.tag.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.budget.deleteMany();
  await prisma.futurePlan.deleteMany();
  await prisma.recurringBill.deleteMany();
  await prisma.goal.deleteMany();
  await prisma.category.deleteMany();
  await prisma.financialProfile.deleteMany();
  await prisma.user.deleteMany();

  const user = await prisma.user.create({
    data: {
      name: "Alex",
      email: "demo@penny-coach.local",
      profile: {
        create: {
          currency: "USD",
          locale: "en-US",
          monthlyIncome: cents(5_500),
          salaryCycle: "MONTHLY",
          savingsTargetPct: 20,
          emergencyFundTargetMos: 6,
          emergencyFundCurrent: cents(4_200),
          onboardedAt: new Date(),
        },
      },
    },
  });

  const catBySlug: Record<string, string> = {};
  for (const c of DEFAULT_CATEGORIES) {
    const row = await prisma.category.create({
      data: {
        userId: user.id,
        slug: c.slug,
        name: c.name,
        kind: c.kind,
        icon: c.icon,
        color: c.color,
        isDefault: true,
        sortOrder: c.sortOrder,
      },
    });
    catBySlug[c.slug] = row.id;
  }

  // ---- Recurring bills (US-style) ----
  await prisma.recurringBill.create({
    data: {
      userId: user.id,
      categoryId: catBySlug["rent"],
      name: "Apartment rent",
      amountPaise: cents(1_800),
      frequency: "MONTHLY",
      dayOfMonth: 1,
      nextDueDate: addDays(startOfMonth(addMonths(new Date(), 1)), 0),
      type: "EXPENSE",
      autoPay: true,
      active: true,
      notes: "Greystar Apartments — ACH on the 1st",
    },
  });
  await prisma.recurringBill.create({
    data: {
      userId: user.id,
      categoryId: catBySlug["auto-loan"],
      name: "Toyota loan",
      amountPaise: cents(395),
      frequency: "MONTHLY",
      dayOfMonth: 7,
      nextDueDate: addDays(startOfMonth(addMonths(new Date(), 1)), 6),
      type: "EXPENSE",
      autoPay: true,
      active: true,
    },
  });
  await prisma.recurringBill.create({
    data: {
      userId: user.id,
      categoryId: catBySlug["internet"],
      name: "Xfinity Internet",
      amountPaise: cents(79.99),
      frequency: "MONTHLY",
      dayOfMonth: 15,
      nextDueDate: addDays(startOfMonth(addMonths(new Date(), 1)), 14),
      type: "EXPENSE",
      autoPay: true,
      active: true,
    },
  });
  await prisma.recurringBill.create({
    data: {
      userId: user.id,
      categoryId: catBySlug["phone"],
      name: "T-Mobile",
      amountPaise: cents(65),
      frequency: "MONTHLY",
      dayOfMonth: 20,
      nextDueDate: addDays(startOfMonth(addMonths(new Date(), 1)), 19),
      type: "EXPENSE",
      autoPay: true,
      active: true,
    },
  });
  await prisma.recurringBill.create({
    data: {
      userId: user.id,
      categoryId: catBySlug["subscriptions"],
      name: "Netflix + Spotify + iCloud",
      amountPaise: cents(32.97),
      frequency: "MONTHLY",
      dayOfMonth: 10,
      nextDueDate: addDays(startOfMonth(addMonths(new Date(), 1)), 9),
      type: "EXPENSE",
      autoPay: true,
      active: true,
    },
  });
  await prisma.recurringBill.create({
    data: {
      userId: user.id,
      categoryId: catBySlug["insurance"],
      name: "Auto insurance (GEICO)",
      amountPaise: cents(132),
      frequency: "MONTHLY",
      dayOfMonth: 3,
      nextDueDate: addDays(startOfMonth(addMonths(new Date(), 1)), 2),
      type: "EXPENSE",
      autoPay: true,
      active: true,
    },
  });
  await prisma.recurringBill.create({
    data: {
      userId: user.id,
      categoryId: catBySlug["gym"],
      name: "Planet Fitness",
      amountPaise: cents(24.99),
      frequency: "MONTHLY",
      dayOfMonth: 18,
      nextDueDate: addDays(startOfMonth(addMonths(new Date(), 1)), 17),
      type: "EXPENSE",
      autoPay: true,
      active: true,
    },
  });

  // ---- Future plans ----
  await prisma.futurePlan.create({
    data: {
      userId: user.id,
      name: "Weekend in NYC",
      targetAmountPaise: cents(1_200),
      savedAmountPaise: cents(250),
      targetDate: addMonths(new Date(), 4),
      priority: 2,
      categoryId: catBySlug["travel"],
      status: "ACTIVE",
      notes: "3 nights — flights + hotel",
    },
  });
  await prisma.futurePlan.create({
    data: {
      userId: user.id,
      name: "New MacBook",
      targetAmountPaise: cents(2_500),
      savedAmountPaise: cents(400),
      targetDate: addMonths(new Date(), 9),
      priority: 3,
      categoryId: catBySlug["shopping"],
      status: "ACTIVE",
    },
  });
  await prisma.futurePlan.create({
    data: {
      userId: user.id,
      name: "Holiday gifts",
      targetAmountPaise: cents(600),
      savedAmountPaise: cents(50),
      targetDate: addMonths(new Date(), 6),
      priority: 3,
      categoryId: catBySlug["gifts"],
      status: "ACTIVE",
    },
  });
  await prisma.futurePlan.create({
    data: {
      userId: user.id,
      name: "Annual renters insurance",
      targetAmountPaise: cents(240),
      savedAmountPaise: cents(60),
      targetDate: addMonths(new Date(), 5),
      priority: 1,
      categoryId: catBySlug["insurance"],
      status: "ACTIVE",
      notes: "Sinking fund — ~$20/month",
    },
  });

  // ---- Goals ----
  await prisma.goal.create({
    data: {
      userId: user.id,
      name: "Emergency fund (6 months)",
      targetAmountPaise: cents(20_000),
      savedAmountPaise: cents(4_200),
      targetDate: addMonths(new Date(), 18),
      status: "ACTIVE",
      notes: "Keep in a high-yield savings account (Ally / Marcus).",
    },
  });
  await prisma.goal.create({
    data: {
      userId: user.id,
      name: "Down payment — house",
      targetAmountPaise: cents(60_000),
      savedAmountPaise: cents(9_500),
      targetDate: addMonths(new Date(), 36),
      status: "ACTIVE",
    },
  });

  // ---- Seed ~6 months of transactions with realistic US patterns ----
  const today = new Date();
  const months = 6;
  // Every demo transaction is stamped with the same ImportBatch so the app
  // UI clearly shows them as "DEMO" and they can be removed via
  // Settings → Demo data → Clear demo data only without touching real data.
  const demoBatch = await prisma.importBatch.create({
    data: {
      userId: user.id,
      kind: "DEMO",
      label: "Demo data (US sample)",
      source: "Penny Coach demo seed",
      rowCount: 0,
      status: "ACTIVE",
    },
  });

  const txns: {
    userId: string;
    categoryId: string;
    type: "EXPENSE" | "INCOME";
    amountPaise: number;
    date: Date;
    note?: string;
    merchant?: string;
    paymentMethod?: string;
    isRecurring?: boolean;
    importBatchId?: string;
  }[] = [];

  for (let m = months - 1; m >= 0; m--) {
    const monthStart = startOfMonth(addMonths(today, -m));

    // Bi-weekly paychecks
    txns.push({
      userId: user.id,
      categoryId: catBySlug["salary"],
      type: "INCOME",
      amountPaise: cents(2_750),
      date: addDays(monthStart, 0),
      note: "Paycheck",
      merchant: "Acme Inc",
      paymentMethod: "ACH",
    });
    txns.push({
      userId: user.id,
      categoryId: catBySlug["salary"],
      type: "INCOME",
      amountPaise: cents(2_750),
      date: addDays(monthStart, 14),
      note: "Paycheck",
      merchant: "Acme Inc",
      paymentMethod: "ACH",
    });

    if (m % 2 === 0) {
      txns.push({
        userId: user.id,
        categoryId: catBySlug["freelance"],
        type: "INCOME",
        amountPaise: cents(300 + Math.random() * 250),
        date: addDays(monthStart, 12),
        note: "Design side project",
        paymentMethod: "ACH",
      });
    }

    // Rent
    txns.push({
      userId: user.id,
      categoryId: catBySlug["rent"],
      type: "EXPENSE",
      amountPaise: cents(1_800),
      date: addDays(monthStart, 1),
      note: "Monthly rent",
      merchant: "Greystar Apartments",
      paymentMethod: "ACH",
      isRecurring: true,
    });
    // Auto loan
    txns.push({
      userId: user.id,
      categoryId: catBySlug["auto-loan"],
      type: "EXPENSE",
      amountPaise: cents(395),
      date: addDays(monthStart, 6),
      merchant: "Toyota Financial",
      paymentMethod: "AUTOPAY",
      isRecurring: true,
    });
    // Auto insurance
    txns.push({
      userId: user.id,
      categoryId: catBySlug["insurance"],
      type: "EXPENSE",
      amountPaise: cents(132),
      date: addDays(monthStart, 2),
      merchant: "GEICO",
      paymentMethod: "AUTOPAY",
      isRecurring: true,
    });
    // Utilities
    txns.push({
      userId: user.id,
      categoryId: catBySlug["electricity"],
      type: "EXPENSE",
      amountPaise: cents(68 + Math.random() * 40),
      date: addDays(monthStart, 8),
      paymentMethod: "AUTOPAY",
      merchant: "Duke Energy",
    });
    txns.push({
      userId: user.id,
      categoryId: catBySlug["internet"],
      type: "EXPENSE",
      amountPaise: cents(79.99),
      date: addDays(monthStart, 14),
      paymentMethod: "AUTOPAY",
      merchant: "Xfinity",
      isRecurring: true,
    });
    txns.push({
      userId: user.id,
      categoryId: catBySlug["phone"],
      type: "EXPENSE",
      amountPaise: cents(65),
      date: addDays(monthStart, 19),
      paymentMethod: "AUTOPAY",
      merchant: "T-Mobile",
      isRecurring: true,
    });
    txns.push({
      userId: user.id,
      categoryId: catBySlug["subscriptions"],
      type: "EXPENSE",
      amountPaise: cents(32.97),
      date: addDays(monthStart, 9),
      paymentMethod: "CREDIT_CARD",
      note: "Streaming bundle",
      isRecurring: true,
    });
    txns.push({
      userId: user.id,
      categoryId: catBySlug["gym"],
      type: "EXPENSE",
      amountPaise: cents(24.99),
      date: addDays(monthStart, 17),
      merchant: "Planet Fitness",
      paymentMethod: "AUTOPAY",
      isRecurring: true,
    });

    // Groceries — weekly
    for (let w = 0; w < 4; w++) {
      const merchant = ["Trader Joe's", "Whole Foods", "Walmart", "Costco"][w % 4];
      txns.push({
        userId: user.id,
        categoryId: catBySlug["groceries"],
        type: "EXPENSE",
        amountPaise: cents(85 + Math.random() * 70),
        date: addDays(monthStart, 3 + w * 7),
        paymentMethod: "CREDIT_CARD",
        merchant,
      });
    }

    // Takeout / Delivery (current month spikes)
    const deliveries = 4 + Math.floor(Math.random() * 4) + (m === 0 ? 5 : 0);
    for (let i = 0; i < deliveries; i++) {
      const merchant = ["DoorDash - Chipotle", "Uber Eats - Thai", "DoorDash - Shake Shack", "Grubhub - Sushi"][
        Math.floor(Math.random() * 4)
      ];
      txns.push({
        userId: user.id,
        categoryId: catBySlug["takeout"],
        type: "EXPENSE",
        amountPaise: cents(14 + Math.random() * 22),
        date: addDays(monthStart, Math.floor(Math.random() * 28)),
        paymentMethod: "CREDIT_CARD",
        merchant,
      });
    }

    // Dining out
    for (let i = 0; i < 2 + Math.floor(Math.random() * 3); i++) {
      txns.push({
        userId: user.id,
        categoryId: catBySlug["dining-out"],
        type: "EXPENSE",
        amountPaise: cents(22 + Math.random() * 40),
        date: addDays(monthStart, 5 + Math.floor(Math.random() * 22)),
        paymentMethod: "CREDIT_CARD",
        merchant: ["Olive Garden", "Cheesecake Factory", "Local Bistro", "Chipotle"][
          Math.floor(Math.random() * 4)
        ],
      });
    }

    // Coffee (Starbucks habit)
    for (let i = 0; i < 6 + Math.floor(Math.random() * 4); i++) {
      txns.push({
        userId: user.id,
        categoryId: catBySlug["coffee"],
        type: "EXPENSE",
        amountPaise: cents(4.5 + Math.random() * 3),
        date: addDays(monthStart, Math.floor(Math.random() * 28)),
        paymentMethod: "DEBIT_CARD",
        merchant: Math.random() > 0.3 ? "Starbucks" : "Local Coffee",
      });
    }

    // Gas
    for (let i = 0; i < 3 + Math.floor(Math.random() * 2); i++) {
      txns.push({
        userId: user.id,
        categoryId: catBySlug["fuel"],
        type: "EXPENSE",
        amountPaise: cents(35 + Math.random() * 20),
        date: addDays(monthStart, 2 + Math.floor(Math.random() * 26)),
        paymentMethod: "CREDIT_CARD",
        merchant: ["Shell", "Costco Gas", "BP", "Chevron"][Math.floor(Math.random() * 4)],
      });
    }

    // Rideshare
    for (let i = 0; i < 2 + Math.floor(Math.random() * 3); i++) {
      txns.push({
        userId: user.id,
        categoryId: catBySlug["rideshare"],
        type: "EXPENSE",
        amountPaise: cents(8 + Math.random() * 25),
        date: addDays(monthStart, Math.floor(Math.random() * 28)),
        paymentMethod: "CREDIT_CARD",
        merchant: Math.random() > 0.5 ? "Uber" : "Lyft",
      });
    }

    // Shopping (current month spike)
    const shoppingCount = m === 0 ? 3 : 1;
    for (let i = 0; i < shoppingCount; i++) {
      txns.push({
        userId: user.id,
        categoryId: catBySlug["shopping"],
        type: "EXPENSE",
        amountPaise: cents(25 + Math.random() * 180),
        date: addDays(monthStart, 10 + Math.floor(Math.random() * 18)),
        paymentMethod: "CREDIT_CARD",
        merchant: ["Amazon", "Target", "Best Buy", "Macy's"][Math.floor(Math.random() * 4)],
      });
    }

    // Medical occasionally
    if (m % 3 === 0) {
      txns.push({
        userId: user.id,
        categoryId: catBySlug["medical"],
        type: "EXPENSE",
        amountPaise: cents(20 + Math.random() * 80),
        date: addDays(monthStart, 12),
        paymentMethod: "CREDIT_CARD",
        merchant: "CVS Pharmacy",
      });
    }

    // Investments — automated contribution
    txns.push({
      userId: user.id,
      categoryId: catBySlug["investments"],
      type: "EXPENSE",
      amountPaise: cents(400),
      date: addDays(monthStart, 5),
      paymentMethod: "ACH",
      note: "Vanguard VTI",
      merchant: "Vanguard",
    });
    txns.push({
      userId: user.id,
      categoryId: catBySlug["retirement"],
      type: "EXPENSE",
      amountPaise: cents(550),
      date: addDays(monthStart, 0),
      paymentMethod: "AUTOPAY",
      note: "401(k) contribution",
    });

    // Household occasionally
    if (Math.random() > 0.4) {
      txns.push({
        userId: user.id,
        categoryId: catBySlug["household"],
        type: "EXPENSE",
        amountPaise: cents(15 + Math.random() * 60),
        date: addDays(monthStart, 7 + Math.floor(Math.random() * 15)),
        paymentMethod: "CREDIT_CARD",
        merchant: ["Target", "IKEA", "Home Depot"][Math.floor(Math.random() * 3)],
      });
    }
  }

  // Tag every row with the demo import batch for clean isolation.
  for (const t of txns) {
    t.importBatchId = demoBatch.id;
  }

  const batchSize = 200;
  for (let i = 0; i < txns.length; i += batchSize) {
    await prisma.transaction.createMany({ data: txns.slice(i, i + batchSize) });
  }
  await prisma.importBatch.update({
    where: { id: demoBatch.id },
    data: { rowCount: txns.length },
  });

  const currentMonthStart = startOfMonth(today);
  const budgetTargets: Record<string, number> = {
    groceries: 500,
    takeout: 180,
    "dining-out": 200,
    coffee: 60,
    fuel: 180,
    rideshare: 80,
    shopping: 200,
    "personal-care": 60,
    subscriptions: 40,
  };
  for (const [slug, dollars] of Object.entries(budgetTargets)) {
    const catId = catBySlug[slug];
    if (!catId) continue;
    await prisma.budget.create({
      data: {
        userId: user.id,
        categoryId: catId,
        periodMonth: currentMonthStart,
        amountPaise: cents(dollars),
      },
    });
  }

  console.log(
    `✓ Seeded user ${user.email} with ${txns.length} transactions, budgets, plans, goals & recurring bills.`,
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
