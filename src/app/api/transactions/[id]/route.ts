import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { ensureUserBootstrap } from "@/lib/profile";
import { httpError, httpOk, parseJson } from "@/lib/api";
import { transactionSchema } from "@/lib/validation";
import { rupeesToPaise } from "@/lib/money";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { user } = await ensureUserBootstrap();
  const parsed = await parseJson(req, transactionSchema.partial());
  if (!parsed.ok) return parsed.error;
  const existing = await prisma.transaction.findFirst({
    where: { id: params.id, userId: user.id },
  });
  if (!existing) return httpError("Transaction not found", 404);
  const updated = await prisma.transaction.update({
    where: { id: params.id },
    data: {
      type: parsed.data.type,
      amountPaise: parsed.data.amount != null ? rupeesToPaise(parsed.data.amount) : undefined,
      date: parsed.data.date ? new Date(parsed.data.date) : undefined,
      categoryId: parsed.data.categoryId ?? undefined,
      note: parsed.data.note ?? undefined,
      merchant: parsed.data.merchant ?? undefined,
      paymentMethod: parsed.data.paymentMethod ?? undefined,
      isRecurring: parsed.data.isRecurring ?? undefined,
    },
  });
  return httpOk(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const { user } = await ensureUserBootstrap();
  const existing = await prisma.transaction.findFirst({
    where: { id: params.id, userId: user.id },
  });
  if (!existing) return httpError("Transaction not found", 404);
  await prisma.transaction.delete({ where: { id: params.id } });
  return httpOk({ ok: true });
}
