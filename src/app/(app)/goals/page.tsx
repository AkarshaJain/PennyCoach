import { prisma } from "@/lib/db";
import { ensureUserBootstrap } from "@/lib/profile";
import { GoalsClient } from "./client";

export const dynamic = "force-dynamic";

export default async function GoalsPage() {
  const { user } = await ensureUserBootstrap();
  const goals = await prisma.goal.findMany({
    where: { userId: user.id },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });
  return (
    <GoalsClient
      goals={goals.map((g) => ({
        id: g.id,
        name: g.name,
        targetAmountPaise: g.targetAmountPaise,
        savedAmountPaise: g.savedAmountPaise,
        targetDate: g.targetDate?.toISOString() ?? null,
        notes: g.notes,
        status: g.status,
      }))}
    />
  );
}
