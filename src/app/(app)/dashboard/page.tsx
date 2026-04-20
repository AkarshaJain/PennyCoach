import Link from "next/link";
import { ArrowUpRight, Coins, FileUp, PiggyBank, Sparkles, Wallet } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatTile } from "@/components/stat-tile";
import { Money } from "@/components/money";
import { EmptyState } from "@/components/empty-state";
import { CashflowChart } from "@/components/charts/cashflow-chart";
import { CategoryPie } from "@/components/charts/category-pie";
import { RecommendationCard } from "@/components/advisor/recommendation-card";
import { ScoreRing } from "@/components/score-ring";
import { getAdvisorSnapshot } from "@/lib/advisor-service";
import { prisma } from "@/lib/db";
import { ensureUserBootstrap } from "@/lib/profile";
import { lastNMonths, monthLabel } from "@/lib/dates";
import { getMonthlyTotals } from "@/lib/aggregates";
import { formatMoney } from "@/lib/money";
import { prettyPaymentMethod as prettyMethod } from "@/lib/validation";

function moneyOpts(profile: { currency: string; locale: string }) {
  return { currency: profile.currency, locale: profile.locale };
}

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const { user, profile } = await ensureUserBootstrap();
  const { advisor, inputs } = await getAdvisorSnapshot();

  const months = lastNMonths(6);
  const totals = await getMonthlyTotals(user.id, months);
  const categories = await prisma.category.findMany({ where: { userId: user.id } });
  const categoryBySlug = Object.fromEntries(categories.map((c) => [c.slug, c]));

  const current = inputs.currentMonth;
  const prev = totals[totals.length - 2];
  const incomeDeltaPct =
    prev && prev.income > 0 ? ((current.income - prev.income) / prev.income) * 100 : 0;
  const expenseDeltaPct =
    prev && prev.expense > 0 ? ((current.expense - prev.expense) / prev.expense) * 100 : 0;

  const topCategories = Object.entries(current.byCategory)
    .map(([slug, paise]) => ({
      slug,
      name: categoryBySlug[slug]?.name ?? slug,
      value: paise,
      color: categoryBySlug[slug]?.color ?? undefined,
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);

  const recentTxns = await prisma.transaction.findMany({
    where: { userId: user.id },
    include: { category: true },
    orderBy: { date: "desc" },
    take: 6,
  });

  const cashflowData = totals.map((t) => ({
    period: t.period.toISOString(),
    income: t.income,
    expense: t.expense,
    savings: t.savings,
  }));

  const emptyData = totals.every((t) => t.income === 0 && t.expense === 0);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            {monthLabel(new Date(), "MMMM yyyy")} · Hi {user.name ?? "there"}
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">Your money, at a glance</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild>
            <Link href="/transactions?new=1">+ Quick add</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/insights">
              Open advisor <Sparkles className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      </div>

      {emptyData && (
        <EmptyState
          icon="✨"
          title="Let's get you started"
          body="Add your first transaction manually, import the CSV or QFX file from your bank, or finish profile setup — no demo data is loaded unless you ask for it."
          action={
            <div className="flex flex-wrap gap-2">
              <Button asChild>
                <Link href="/onboarding">Finish setup</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/import">
                  <FileUp className="mr-1 h-3.5 w-3.5" /> Import from bank
                </Link>
              </Button>
              <Button asChild variant="ghost">
                <Link href="/transactions?new=1">+ Add transaction</Link>
              </Button>
            </div>
          }
        />
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="This month income"
          value={<Money paise={current.income} currency={profile.currency} locale={profile.locale} />}
          hint={`vs ${formatMoney(prev?.income ?? 0, { compact: true, ...moneyOpts(profile) })} last month`}
          trend={
            prev
              ? {
                  value: `${incomeDeltaPct >= 0 ? "+" : ""}${incomeDeltaPct.toFixed(1)}%`,
                  positive: incomeDeltaPct >= 0,
                }
              : undefined
          }
          icon={<Coins className="h-4 w-4" />}
        />
        <StatTile
          label="This month spend"
          value={<Money paise={current.expense} currency={profile.currency} locale={profile.locale} />}
          hint={`vs ${formatMoney(prev?.expense ?? 0, { compact: true, ...moneyOpts(profile) })} last month`}
          trend={
            prev
              ? {
                  value: `${expenseDeltaPct >= 0 ? "+" : ""}${expenseDeltaPct.toFixed(1)}%`,
                  positive: expenseDeltaPct <= 0,
                }
              : undefined
          }
          icon={<Wallet className="h-4 w-4" />}
        />
        <StatTile
          label="Projected savings"
          value={<Money paise={Math.max(0, current.income - current.expense)} currency={profile.currency} locale={profile.locale} />}
          hint={`Target ${formatMoney(advisor.suggestedMonthlySavingPaise, { ...moneyOpts(profile), withDecimals: false })} @ ${profile.savingsTargetPct}%`}
          icon={<PiggyBank className="h-4 w-4" />}
        />
        <StatTile
          label="Safe to spend (discretionary)"
          value={<Money paise={advisor.safeDiscretionaryPaise} currency={profile.currency} locale={profile.locale} />}
          hint="After fixed, savings & plans"
          icon={<Sparkles className="h-4 w-4" />}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Cash flow · last 6 months</CardTitle>
                <CardDescription>Income, expense and savings trend.</CardDescription>
              </div>
              <Badge variant="secondary" className="hidden sm:inline-flex">
                {monthLabel(totals[0].period, "MMM")} – {monthLabel(totals[totals.length - 1].period, "MMM yyyy")}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <CashflowChart data={cashflowData} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Budget health</CardTitle>
            <CardDescription>Composite score based on your savings rate, fixed ratio & anomalies.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center justify-around gap-4">
            <ScoreRing value={advisor.scores.budgetHealth} label="Health" />
            <ScoreRing value={advisor.scores.savingsRate} label="Save %" suffix="%" />
            <ScoreRing
              value={100 - Math.min(100, advisor.scores.fixedRatio)}
              label="Flex %"
              suffix="%"
            />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Where your money went</CardTitle>
            <CardDescription>Category breakdown for {monthLabel(new Date())}.</CardDescription>
          </CardHeader>
          <CardContent>
            <CategoryPie data={topCategories} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Top spending categories</CardTitle>
            <CardDescription>This month.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {topCategories.length === 0 && (
              <p className="text-sm text-muted-foreground">No expenses logged yet.</p>
            )}
            {topCategories.slice(0, 6).map((c) => (
              <div key={c.slug} className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-sm">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ background: c.color ?? "#64748b" }}
                  />
                  <span>{c.name}</span>
                </div>
                <Money paise={c.value} className="text-sm" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Your coach this month</CardTitle>
                <CardDescription>
                  Deterministic recommendations based on your own history. Click "Why this?" to see the math.
                </CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/insights">
                  See all <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {advisor.recommendations.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Not enough data yet — add a few transactions so the coach can study your patterns.
              </p>
            ) : (
              advisor.recommendations.slice(0, 3).map((r) => <RecommendationCard key={r.id} rec={r} />)
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent transactions</CardTitle>
            <CardDescription>Last 6 entries.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentTxns.length === 0 && (
              <p className="text-sm text-muted-foreground">No transactions yet.</p>
            )}
            {recentTxns.map((t) => (
              <div key={t.id} className="flex items-start justify-between gap-3 text-sm">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-medium">
                      {t.merchant ?? t.note ?? t.category?.name ?? "Transaction"}
                    </span>
                    <Badge variant="secondary" className="shrink-0 text-[10px]">
                      {t.category?.name ?? "Other"}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {monthLabel(t.date, "MMM d")} · {prettyMethod(t.paymentMethod)}
                  </p>
                </div>
                <Money
                  paise={t.type === "EXPENSE" ? -t.amountPaise : t.amountPaise}
                  colored
                  currency={profile.currency}
                  locale={profile.locale}
                  className="text-sm"
                />
              </div>
            ))}
            <Button variant="outline" size="sm" asChild className="mt-2 w-full">
              <Link href="/transactions">View all</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
