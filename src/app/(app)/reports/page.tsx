import Link from "next/link";
import { Download } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Money } from "@/components/money";
import { CashflowChart } from "@/components/charts/cashflow-chart";
import { CategoryBar } from "@/components/charts/category-bar";
import { CategoryPie } from "@/components/charts/category-pie";
import { ensureUserBootstrap } from "@/lib/profile";
import { getMonthlyTotals } from "@/lib/aggregates";
import { lastNMonths, monthLabel } from "@/lib/dates";
import { prisma } from "@/lib/db";
import { formatMoney, safePct } from "@/lib/money";
import type { MonthlyTotals } from "@/lib/advisor/types";

export const dynamic = "force-dynamic";

function lastActiveMonthIndex(totals: MonthlyTotals[]): number {
  for (let i = totals.length - 1; i >= 0; i--) {
    if (totals[i].income > 0 || totals[i].expense > 0) return i;
  }
  return -1;
}

function previousActiveIndex(totals: MonthlyTotals[], beforeIdx: number): number {
  for (let i = beforeIdx - 1; i >= 0; i--) {
    if (totals[i].income > 0 || totals[i].expense > 0) return i;
  }
  return -1;
}

export default async function ReportsPage() {
  const { user, profile } = await ensureUserBootstrap();
  const mOpts = { currency: profile.currency, locale: profile.locale };
  const months = lastNMonths(6);
  const [totals, categories] = await Promise.all([
    getMonthlyTotals(user.id, months),
    prisma.category.findMany({ where: { userId: user.id } }),
  ]);
  const byId = Object.fromEntries(categories.map((c) => [c.slug, c]));

  const calendarCurrent = totals[totals.length - 1];
  const activeIdx = lastActiveMonthIndex(totals);
  const latestActive = activeIdx >= 0 ? totals[activeIdx] : calendarCurrent;
  const useCalendarForHighlight =
    calendarCurrent.income > 0 || calendarCurrent.expense > 0;
  const highlight = useCalendarForHighlight ? calendarCurrent : latestActive;
  const highlightIdx = useCalendarForHighlight ? totals.length - 1 : activeIdx;
  const prevActiveIdx =
    highlightIdx >= 0 ? previousActiveIndex(totals, highlightIdx) : -1;
  const highlightPrev = prevActiveIdx >= 0 ? totals[prevActiveIdx] : null;

  // Aggregate across all months for bar chart
  const totalBySlug: Record<string, number> = {};
  for (const m of totals) {
    for (const [slug, v] of Object.entries(m.byCategory)) {
      totalBySlug[slug] = (totalBySlug[slug] ?? 0) + v;
    }
  }
  const bars = Object.entries(totalBySlug)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([slug, v]) => ({ name: byId[slug]?.name ?? slug, value: v }));

  const highlightPie = Object.entries(highlight.byCategory)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([slug, v]) => ({
      name: byId[slug]?.name ?? slug,
      value: v,
      color: byId[slug]?.color ?? undefined,
    }));

  const savingsRate = safePct(highlight.income - highlight.expense, highlight.income);

  // Top merchants
  const topMerchants = await prisma.transaction.groupBy({
    by: ["merchant"],
    where: {
      userId: user.id,
      type: "EXPENSE",
      merchant: { not: null },
      date: { gte: months[0] },
    },
    _sum: { amountPaise: true },
    orderBy: { _sum: { amountPaise: "desc" } },
    take: 8,
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Reports</h1>
          <p className="text-sm text-muted-foreground">
            {monthLabel(months[0], "MMM")} – {monthLabel(months[months.length - 1], "MMM yyyy")} · Deep-dive on your money.
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/api/export" target="_blank">
            <Download className="h-3.5 w-3.5" /> Export transactions CSV
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Income (6 mo)</CardTitle>
          </CardHeader>
          <CardContent>
            <Money paise={totals.reduce((s, t) => s + t.income, 0)} className="text-xl font-semibold" {...mOpts} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Expense (6 mo)</CardTitle>
          </CardHeader>
          <CardContent>
            <Money paise={totals.reduce((s, t) => s + t.expense, 0)} className="text-xl font-semibold" {...mOpts} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">
              Savings rate ({monthLabel(highlight.period, "MMM yyyy")})
            </CardTitle>
            <CardDescription className="text-xs">
              {!useCalendarForHighlight && activeIdx >= 0
                ? `No activity in ${monthLabel(calendarCurrent.period, "MMM yyyy")} — using ${monthLabel(highlight.period, "MMM yyyy")}.`
                : "Income minus spend (savings transfers excluded from spend)."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <span className="text-xl font-semibold">{savingsRate}%</span>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Month over month</CardTitle>
            <CardDescription className="text-xs">
              {highlightPrev
                ? `${monthLabel(highlight.period, "MMM yyyy")} vs ${monthLabel(highlightPrev.period, "MMM yyyy")}`
                : "Compare consecutive months that have data."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {highlightPrev ? (
              <div className="text-sm">
                <p>
                  Income:{" "}
                  <Money paise={highlight.income} withDecimals={false} {...mOpts} /> vs{" "}
                  <Money paise={highlightPrev.income} withDecimals={false} {...mOpts} />
                </p>
                <p>
                  Expense:{" "}
                  <Money paise={highlight.expense} withDecimals={false} {...mOpts} /> vs{" "}
                  <Money paise={highlightPrev.expense} withDecimals={false} {...mOpts} />
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Need another month with activity to compare.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Cash flow</CardTitle>
          <CardDescription>Income, expense, and savings over time.</CardDescription>
        </CardHeader>
        <CardContent>
          <CashflowChart
            data={totals.map((t) => ({
              period: t.period.toISOString(),
              income: t.income,
              expense: t.expense,
              savings: t.savings,
            }))}
          />
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Category breakdown ({monthLabel(highlight.period, "MMM yyyy")})</CardTitle>
            <CardDescription>
              {!useCalendarForHighlight
                ? "Same month as the savings rate card above."
                : "Where your money went this calendar month."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CategoryPie data={highlightPie} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Top 10 categories (6 months)</CardTitle>
            <CardDescription>Rolling total spend per category.</CardDescription>
          </CardHeader>
          <CardContent>
            <CategoryBar data={bars} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Top merchants</CardTitle>
          <CardDescription>Who&apos;s getting the biggest share of your spend.</CardDescription>
        </CardHeader>
        <CardContent>
          {topMerchants.length === 0 ? (
            <p className="text-sm text-muted-foreground">No merchant data yet.</p>
          ) : (
            <ul className="divide-y">
              {topMerchants.map((m) => (
                <li key={m.merchant} className="flex items-center justify-between py-2 text-sm">
                  <div className="flex items-center gap-2">
                    <span>{m.merchant}</span>
                    <Badge variant="secondary" className="text-[10px]">
                      {formatMoney(m._sum.amountPaise ?? 0, { ...mOpts, compact: true })}
                    </Badge>
                  </div>
                  <Money paise={m._sum.amountPaise ?? 0} className="text-muted-foreground" {...mOpts} />
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
