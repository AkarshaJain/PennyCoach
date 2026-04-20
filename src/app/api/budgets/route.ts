import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { ensureUserBootstrap } from "@/lib/profile";
import { httpError, httpOk, parseJson } from "@/lib/api";
import { budgetBulkSchema, budgetSchema } from "@/lib/validation";
import { rupeesToPaise } from "@/lib/money";
import { periodMonth } from "@/lib/dates";

export async function GET(req: NextRequest) {
  const { user } = await ensureUserBootstrap();
  const { searchParams } = new URL(req.url);
  const period = searchParams.get("period");
  const budgets = await prisma.budget.findMany({
    where: {
      userId: user.id,
      periodMonth: period ? periodMonth(period) : undefined,
    },
    include: { category: true },
    orderBy: { category: { sortOrder: "asc" } },
  });
  return httpOk(budgets);
}

export async function POST(req: NextRequest) {
  const { user } = await ensureUserBootstrap();
  // Support two shapes: single budget or bulk upsert.
  const body = await req.text();
  let parsedBulk;
  try {
    parsedBulk = budgetBulkSchema.safeParse(JSON.parse(body));
  } catch {
    return httpError("Invalid JSON");
  }
  if (parsedBulk.success) {
    const pm = periodMonth(parsedBulk.data.periodMonth);
    const ops = parsedBulk.data.items.map(async (it) => {
      if (it.amount <= 0) {
        // delete a budget if amount is 0
        await prisma.budget.deleteMany({
          where: { userId: user.id, categoryId: it.categoryId, periodMonth: pm },
        });
        return null;
      }
      return prisma.budget.upsert({
        where: {
          userId_categoryId_periodMonth: {
            userId: user.id,
            categoryId: it.categoryId,
            periodMonth: pm,
          },
        },
        create: {
          userId: user.id,
          categoryId: it.categoryId,
          periodMonth: pm,
          amountPaise: rupeesToPaise(it.amount),
        },
        update: { amountPaise: rupeesToPaise(it.amount) },
      });
    });
    await Promise.all(ops);
    return httpOk({ ok: true });
  }

  // Fallback to single create
  const parsed = budgetSchema.safeParse(JSON.parse(body));
  if (!parsed.success) {
    return httpError("Invalid input");
  }
  const pm = periodMonth(parsed.data.periodMonth);
  const saved = await prisma.budget.upsert({
    where: {
      userId_categoryId_periodMonth: {
        userId: user.id,
        categoryId: parsed.data.categoryId,
        periodMonth: pm,
      },
    },
    create: {
      userId: user.id,
      categoryId: parsed.data.categoryId,
      periodMonth: pm,
      amountPaise: rupeesToPaise(parsed.data.amount),
    },
    update: { amountPaise: rupeesToPaise(parsed.data.amount) },
  });
  return httpOk(saved);
}
