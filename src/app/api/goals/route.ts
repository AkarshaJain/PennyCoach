import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { ensureUserBootstrap } from "@/lib/profile";
import { httpOk, parseJson } from "@/lib/api";
import { goalSchema } from "@/lib/validation";
import { rupeesToPaise } from "@/lib/money";

export async function GET() {
  const { user } = await ensureUserBootstrap();
  const goals = await prisma.goal.findMany({
    where: { userId: user.id },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });
  return httpOk(goals);
}

export async function POST(req: NextRequest) {
  const { user } = await ensureUserBootstrap();
  const parsed = await parseJson(req, goalSchema);
  if (!parsed.ok) return parsed.error;
  const g = parsed.data;
  const created = await prisma.goal.create({
    data: {
      userId: user.id,
      name: g.name,
      targetAmountPaise: rupeesToPaise(g.targetAmount),
      savedAmountPaise: rupeesToPaise(g.savedAmount ?? 0),
      targetDate: g.targetDate ? new Date(g.targetDate) : null,
      notes: g.notes ?? null,
      status: g.status,
    },
  });
  return httpOk(created, { status: 201 });
}
