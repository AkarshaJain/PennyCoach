import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { ensureUserBootstrap } from "@/lib/profile";
import { httpOk, parseJson } from "@/lib/api";
import { futurePlanSchema } from "@/lib/validation";
import { rupeesToPaise } from "@/lib/money";

export async function GET() {
  const { user } = await ensureUserBootstrap();
  const plans = await prisma.futurePlan.findMany({
    where: { userId: user.id },
    include: { category: true },
    orderBy: [{ status: "asc" }, { priority: "asc" }, { targetDate: "asc" }],
  });
  return httpOk(plans);
}

export async function POST(req: NextRequest) {
  const { user } = await ensureUserBootstrap();
  const parsed = await parseJson(req, futurePlanSchema);
  if (!parsed.ok) return parsed.error;
  const p = parsed.data;
  const created = await prisma.futurePlan.create({
    data: {
      userId: user.id,
      name: p.name,
      targetAmountPaise: rupeesToPaise(p.targetAmount),
      savedAmountPaise: rupeesToPaise(p.savedAmount ?? 0),
      targetDate: new Date(p.targetDate),
      priority: p.priority,
      categoryId: p.categoryId ?? null,
      notes: p.notes ?? null,
      status: p.status,
    },
  });
  return httpOk(created, { status: 201 });
}
