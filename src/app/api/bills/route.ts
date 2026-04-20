import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { ensureUserBootstrap } from "@/lib/profile";
import { httpOk, parseJson } from "@/lib/api";
import { recurringBillSchema } from "@/lib/validation";
import { rupeesToPaise } from "@/lib/money";

export async function GET() {
  const { user } = await ensureUserBootstrap();
  const bills = await prisma.recurringBill.findMany({
    where: { userId: user.id },
    include: { category: true },
    orderBy: [{ active: "desc" }, { nextDueDate: "asc" }],
  });
  return httpOk(bills);
}

export async function POST(req: NextRequest) {
  const { user } = await ensureUserBootstrap();
  const parsed = await parseJson(req, recurringBillSchema);
  if (!parsed.ok) return parsed.error;
  const b = parsed.data;
  const created = await prisma.recurringBill.create({
    data: {
      userId: user.id,
      name: b.name,
      categoryId: b.categoryId ?? null,
      amountPaise: rupeesToPaise(b.amount),
      frequency: b.frequency,
      dayOfMonth: b.dayOfMonth ?? null,
      nextDueDate: new Date(b.nextDueDate),
      type: b.type,
      autoPay: b.autoPay,
      active: b.active,
      notes: b.notes ?? null,
    },
  });
  return httpOk(created, { status: 201 });
}
