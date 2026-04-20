import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { ensureUserBootstrap } from "@/lib/profile";
import { httpOk, parseJson } from "@/lib/api";
import { profileSchema } from "@/lib/validation";
import { rupeesToPaise } from "@/lib/money";

export async function GET() {
  const { user, profile } = await ensureUserBootstrap();
  return httpOk({ user, profile });
}

export async function PATCH(req: NextRequest) {
  const { user } = await ensureUserBootstrap();
  const parsed = await parseJson(req, profileSchema.partial());
  if (!parsed.ok) return parsed.error;
  const p = parsed.data;
  if (p.name != null) {
    await prisma.user.update({ where: { id: user.id }, data: { name: p.name } });
  }
  const profile = await prisma.financialProfile.update({
    where: { userId: user.id },
    data: {
      currency: p.currency,
      locale: p.locale,
      monthlyIncome: p.monthlyIncome != null ? rupeesToPaise(p.monthlyIncome) : undefined,
      salaryCycle: p.salaryCycle,
      savingsTargetPct: p.savingsTargetPct,
      emergencyFundTargetMos: p.emergencyFundTargetMos,
      emergencyFundCurrent:
        p.emergencyFundCurrent != null ? rupeesToPaise(p.emergencyFundCurrent) : undefined,
      fixedExpensesNote: p.fixedExpensesNote ?? undefined,
    },
  });
  return httpOk(profile);
}
