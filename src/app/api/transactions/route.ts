import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { ensureUserBootstrap } from "@/lib/profile";
import { httpError, httpOk, parseJson } from "@/lib/api";
import { transactionSchema } from "@/lib/validation";
import { rupeesToPaise } from "@/lib/money";

export async function GET(req: NextRequest) {
  const { user } = await ensureUserBootstrap();
  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const categoryId = searchParams.get("categoryId");
  const type = searchParams.get("type");
  const q = searchParams.get("q");
  const take = Math.min(500, Number(searchParams.get("take") ?? 200));

  const txns = await prisma.transaction.findMany({
    where: {
      userId: user.id,
      date: {
        gte: from ? new Date(from) : undefined,
        lte: to ? new Date(to) : undefined,
      },
      categoryId: categoryId ?? undefined,
      type: type ?? undefined,
      OR: q
        ? [
            { note: { contains: q } },
            { merchant: { contains: q } },
          ]
        : undefined,
    },
    include: { category: true, tags: { include: { tag: true } } },
    orderBy: { date: "desc" },
    take,
  });
  return httpOk(txns);
}

export async function POST(req: NextRequest) {
  const { user } = await ensureUserBootstrap();
  const parsed = await parseJson(req, transactionSchema);
  if (!parsed.ok) return parsed.error;
  const input = parsed.data;

  if (input.categoryId) {
    const cat = await prisma.category.findFirst({
      where: { id: input.categoryId, userId: user.id },
    });
    if (!cat) return httpError("Category not found", 404);
  }

  const created = await prisma.transaction.create({
    data: {
      userId: user.id,
      type: input.type,
      amountPaise: rupeesToPaise(input.amount),
      date: new Date(input.date),
      categoryId: input.categoryId ?? null,
      note: input.note ?? null,
      merchant: input.merchant ?? null,
      paymentMethod: input.paymentMethod ?? null,
      isRecurring: input.isRecurring ?? false,
    },
  });

  if (input.tags && input.tags.length) {
    for (const name of input.tags) {
      const tag = await prisma.tag.upsert({
        where: { userId_name: { userId: user.id, name } },
        update: {},
        create: { userId: user.id, name },
      });
      await prisma.transactionTag.create({
        data: { transactionId: created.id, tagId: tag.id },
      });
    }
  }

  return httpOk(created, { status: 201 });
}
