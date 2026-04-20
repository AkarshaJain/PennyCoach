import { prisma } from "@/lib/db";
import { ensureUserBootstrap } from "@/lib/profile";
import { getAdvisorSnapshot } from "@/lib/advisor-service";
import { PlansClient } from "./client";

export const dynamic = "force-dynamic";

export default async function PlansPage() {
  const { user } = await ensureUserBootstrap();
  const [plans, categories, snapshot] = await Promise.all([
    prisma.futurePlan.findMany({
      where: { userId: user.id },
      orderBy: [{ status: "asc" }, { priority: "asc" }, { targetDate: "asc" }],
    }),
    prisma.category.findMany({
      where: { userId: user.id },
      orderBy: [{ kind: "asc" }, { sortOrder: "asc" }],
    }),
    getAdvisorSnapshot(),
  ]);

  return (
    <PlansClient
      plans={plans.map((p) => ({
        id: p.id,
        name: p.name,
        targetAmountPaise: p.targetAmountPaise,
        savedAmountPaise: p.savedAmountPaise,
        targetDate: p.targetDate.toISOString(),
        priority: p.priority,
        categoryId: p.categoryId,
        notes: p.notes,
        status: p.status,
      }))}
      categories={categories.map((c) => ({ id: c.id, name: c.name }))}
      funding={snapshot.advisor.planFunding}
    />
  );
}
