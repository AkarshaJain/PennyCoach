import { ensureUserBootstrap } from "@/lib/profile";
import { SettingsClient } from "./client";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const { user, profile } = await ensureUserBootstrap();
  return (
    <SettingsClient
      initial={{
        name: user.name ?? "",
        currency: profile.currency,
        locale: profile.locale,
        monthlyIncome: profile.monthlyIncome / 100,
        salaryCycle: profile.salaryCycle,
        savingsTargetPct: profile.savingsTargetPct,
        emergencyFundTargetMos: profile.emergencyFundTargetMos,
        emergencyFundCurrent: profile.emergencyFundCurrent / 100,
        fixedExpensesNote: profile.fixedExpensesNote ?? "",
      }}
    />
  );
}
