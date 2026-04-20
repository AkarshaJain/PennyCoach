import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { ensureUserBootstrap } from "@/lib/profile";
import { httpOk, parseJson } from "@/lib/api";
import { onboardingSchema } from "@/lib/validation";
import { rupeesToPaise } from "@/lib/money";

export async function POST(req: NextRequest) {
  const { user } = await ensureUserBootstrap();
  const parsed = await parseJson(req, onboardingSchema);
  if (!parsed.ok) return parsed.error;
  const p = parsed.data;

  await prisma.financialProfile.update({
    where: { userId: user.id },
    data: {
      currency: p.currency,
      locale: p.locale,
      monthlyIncome: rupeesToPaise(p.monthlyIncome),
      salaryCycle: p.salaryCycle,
      savingsTargetPct: p.savingsTargetPct,
      emergencyFundTargetMos: p.emergencyFundTargetMos,
      emergencyFundCurrent: rupeesToPaise(p.emergencyFundCurrent ?? 0),
      fixedExpensesNote: p.fixedExpensesNote ?? null,
      onboardedAt: new Date(),
    },
  });

  if (p.name) {
    await prisma.user.update({ where: { id: user.id }, data: { name: p.name } });
  }

  if (p.initialPlans && p.initialPlans.length) {
    await prisma.futurePlan.createMany({
      data: p.initialPlans.map((pl) => ({
        userId: user.id,
        name: pl.name,
        targetAmountPaise: rupeesToPaise(pl.targetAmount),
        savedAmountPaise: 0,
        targetDate: new Date(pl.targetDate),
        priority: pl.priority,
        status: "ACTIVE",
      })),
    });
  }

  return httpOk({ ok: true });
}
