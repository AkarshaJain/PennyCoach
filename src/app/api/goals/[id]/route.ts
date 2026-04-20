import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { ensureUserBootstrap } from "@/lib/profile";
import { httpError, httpOk, parseJson } from "@/lib/api";
import { goalSchema } from "@/lib/validation";
import { rupeesToPaise } from "@/lib/money";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { user } = await ensureUserBootstrap();
  const parsed = await parseJson(req, goalSchema.partial());
  if (!parsed.ok) return parsed.error;
  const existing = await prisma.goal.findFirst({ where: { id: params.id, userId: user.id } });
  if (!existing) return httpError("Goal not found", 404);
  const updated = await prisma.goal.update({
    where: { id: params.id },
    data: {
      name: parsed.data.name,
      targetAmountPaise:
        parsed.data.targetAmount != null ? rupeesToPaise(parsed.data.targetAmount) : undefined,
      savedAmountPaise:
        parsed.data.savedAmount != null ? rupeesToPaise(parsed.data.savedAmount) : undefined,
      targetDate: parsed.data.targetDate ? new Date(parsed.data.targetDate) : undefined,
      notes: parsed.data.notes ?? undefined,
      status: parsed.data.status,
    },
  });
  return httpOk(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const { user } = await ensureUserBootstrap();
  const existing = await prisma.goal.findFirst({ where: { id: params.id, userId: user.id } });
  if (!existing) return httpError("Goal not found", 404);
  await prisma.goal.delete({ where: { id: params.id } });
  return httpOk({ ok: true });
}
