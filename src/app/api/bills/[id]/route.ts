import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { ensureUserBootstrap } from "@/lib/profile";
import { httpError, httpOk, parseJson } from "@/lib/api";
import { recurringBillSchema } from "@/lib/validation";
import { rupeesToPaise } from "@/lib/money";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { user } = await ensureUserBootstrap();
  const parsed = await parseJson(req, recurringBillSchema.partial());
  if (!parsed.ok) return parsed.error;
  const existing = await prisma.recurringBill.findFirst({
    where: { id: params.id, userId: user.id },
  });
  if (!existing) return httpError("Bill not found", 404);
  const updated = await prisma.recurringBill.update({
    where: { id: params.id },
    data: {
      name: parsed.data.name,
      categoryId: parsed.data.categoryId ?? undefined,
      amountPaise: parsed.data.amount != null ? rupeesToPaise(parsed.data.amount) : undefined,
      frequency: parsed.data.frequency,
      dayOfMonth: parsed.data.dayOfMonth ?? undefined,
      nextDueDate: parsed.data.nextDueDate ? new Date(parsed.data.nextDueDate) : undefined,
      type: parsed.data.type,
      autoPay: parsed.data.autoPay,
      active: parsed.data.active,
      notes: parsed.data.notes ?? undefined,
    },
  });
  return httpOk(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const { user } = await ensureUserBootstrap();
  const existing = await prisma.recurringBill.findFirst({
    where: { id: params.id, userId: user.id },
  });
  if (!existing) return httpError("Bill not found", 404);
  await prisma.recurringBill.delete({ where: { id: params.id } });
  return httpOk({ ok: true });
}
