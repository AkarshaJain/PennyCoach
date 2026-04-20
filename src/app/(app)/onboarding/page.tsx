import { OnboardingClient } from "./client";
import { ensureUserBootstrap } from "@/lib/profile";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const { user, profile } = await ensureUserBootstrap();
  return (
    <OnboardingClient
      initial={{
        name: user.name ?? "",
        monthlyIncome: profile.monthlyIncome ? profile.monthlyIncome / 100 : 0,
        salaryCycle: profile.salaryCycle,
        savingsTargetPct: profile.savingsTargetPct,
        emergencyFundTargetMos: profile.emergencyFundTargetMos,
        emergencyFundCurrent: profile.emergencyFundCurrent / 100,
      }}
    />
  );
}
