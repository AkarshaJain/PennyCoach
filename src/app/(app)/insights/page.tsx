import Link from "next/link";
import { ChevronRight, Info } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Money } from "@/components/money";
import { EmptyState } from "@/components/empty-state";
import { RecommendationCard } from "@/components/advisor/recommendation-card";
import { ScoreRing } from "@/components/score-ring";
import { getAdvisorSnapshot } from "@/lib/advisor-service";
import { ensureUserBootstrap } from "@/lib/profile";
import { formatMoney } from "@/lib/money";

export const dynamic = "force-dynamic";

export default async function InsightsPage() {
  const { profile } = await ensureUserBootstrap();
  const { advisor, inputs } = await getAdvisorSnapshot();
  const mOpts = { currency: profile.currency, locale: profile.locale };
  const hasData =
    inputs.currentMonth.expense > 0 ||
    inputs.currentMonth.income > 0 ||
    inputs.history.some((h) => h.expense > 0 || h.income > 0);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Advisor</h1>
          <p className="text-sm text-muted-foreground">
            Explainable, rule-based tips tailored to your income, history and plans.
          </p>
        </div>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/reports">
            See reports <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </Button>
      </div>

      {!hasData && (
        <EmptyState
          icon="🧭"
          title="Add some transactions to unlock advice"
          body="The advisor uses your own history to give tips. Add a few entries, import a bank statement, or load US demo data from Settings."
          action={
            <div className="flex flex-wrap gap-2">
              <Button asChild>
                <Link href="/transactions?new=1">Add transaction</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/import">Import from bank</Link>
              </Button>
            </div>
          }
        />
      )}

      <div className="grid gap-4 lg:grid-cols-4">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Scores</CardTitle>
            <CardDescription>How your finances look this month.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center justify-around gap-4">
            <ScoreRing value={advisor.scores.budgetHealth} label="Health" />
            <ScoreRing value={advisor.scores.savingsRate} label="Save %" suffix="%" />
            <ScoreRing
              value={Math.min(100, advisor.scores.fixedRatio)}
              label="Fixed %"
              suffix="%"
            />
            <ScoreRing value={advisor.scores.affordabilityScore} label="Afford" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Safe to spend</CardTitle>
            <CardDescription>After fixed, savings, plans.</CardDescription>
          </CardHeader>
          <CardContent>
            <Money paise={advisor.safeDiscretionaryPaise} className="text-2xl font-semibold" {...mOpts} />
            <p className="mt-2 text-xs text-muted-foreground">
              Suggested monthly saving:{" "}
              <span className="font-medium text-foreground">
                {formatMoney(advisor.suggestedMonthlySavingPaise, { ...mOpts, withDecimals: false })}
              </span>
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recommendations</CardTitle>
          <CardDescription>
            Click "Why this?" on any tip to see the calculations used. No AI, no guessing.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          {advisor.recommendations.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No pressing advice — keep doing what you're doing.
            </p>
          ) : (
            advisor.recommendations.map((r) => <RecommendationCard key={r.id} rec={r} />)
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Forecast for next month</CardTitle>
          <CardDescription>
            Conservative projection using max(trailing average, weighted trend).
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          <div className="rounded-md border p-4">
            <p className="text-xs uppercase text-muted-foreground">Projected income</p>
            <Money paise={advisor.forecastNextMonth.projectedIncome} className="text-xl font-semibold" {...mOpts} />
          </div>
          <div className="rounded-md border p-4">
            <p className="text-xs uppercase text-muted-foreground">Projected expense</p>
            <Money paise={advisor.forecastNextMonth.projectedExpense} className="text-xl font-semibold" {...mOpts} />
          </div>
          <div className="rounded-md border p-4">
            <p className="text-xs uppercase text-muted-foreground">Projected savings</p>
            <Money paise={advisor.forecastNextMonth.projectedSavings} className="text-xl font-semibold" {...mOpts} />
          </div>
        </CardContent>
      </Card>

      {advisor.anomalies.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Anomalies detected</CardTitle>
            <CardDescription>Categories clearly above your trailing average.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2 md:grid-cols-2">
            {advisor.anomalies.map((a) => (
              <div
                key={a.slug}
                className="flex items-center justify-between rounded-md border p-3 text-sm"
              >
                <div>
                  <p className="font-medium capitalize">{a.slug.replace(/-/g, " ")}</p>
                  <p className="text-xs text-muted-foreground">
                    Avg {formatMoney(a.avgPaise, { ...mOpts, withDecimals: false })} → now{" "}
                    {formatMoney(a.currentPaise, { ...mOpts, withDecimals: false })}
                  </p>
                </div>
                <Badge
                  variant={
                    a.severity === "HIGH" ? "destructive" : a.severity === "MEDIUM" ? "warning" : "secondary"
                  }
                >
                  +{a.deltaPct.toFixed(0)}%
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <Info className="h-4 w-4" /> Disclaimer
          </CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-muted-foreground">
          Penny Coach provides educational budgeting guidance based on your own data and transparent
          rules. It is not investment, tax or legal advice, and is not a replacement for professional
          financial advice. Talk to a CFP® or financial advisor for personalized investment decisions.
        </CardContent>
      </Card>
    </div>
  );
}
