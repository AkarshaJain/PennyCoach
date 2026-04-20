"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Money } from "@/components/money";
import { EmptyState } from "@/components/empty-state";
import { formatMoney } from "@/lib/money";
import { monthLabel } from "@/lib/dates";

interface Row {
  id: string;
  slug: string;
  name: string;
  kind: string;
  color: string | null;
  budgetPaise: number;
  spentPaise: number;
  avgPaise: number;
  suggestedPaise: number;
}

export function BudgetsClient({
  rows,
  period,
}: {
  rows: Row[];
  period: string;
  nextPeriod: string;
}) {
  const router = useRouter();
  const [values, setValues] = React.useState<Record<string, string>>(() =>
    Object.fromEntries(rows.map((r) => [r.id, r.budgetPaise ? (r.budgetPaise / 100).toFixed(0) : ""])),
  );
  const [saving, setSaving] = React.useState(false);
  const [notice, setNotice] = React.useState<string | null>(null);

  function setRow(id: string, v: string) {
    setValues((prev) => ({ ...prev, [id]: v }));
  }

  function applySuggestions() {
    setValues((prev) => {
      const out = { ...prev };
      for (const r of rows) {
        if (r.kind === "VARIABLE" && r.suggestedPaise > 0) {
          out[r.id] = (r.suggestedPaise / 100).toFixed(0);
        }
      }
      return out;
    });
    setNotice("Applied auto-suggested budgets. Review and save.");
  }

  async function saveAll() {
    setSaving(true);
    const items = Object.entries(values).map(([categoryId, v]) => ({
      categoryId,
      amount: Number(v) || 0,
    }));
    const res = await fetch("/api/budgets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ periodMonth: period, items }),
    });
    setSaving(false);
    if (res.ok) {
      setNotice("Budgets saved.");
      router.refresh();
    } else {
      setNotice("Something went wrong saving budgets.");
    }
  }

  const totalBudget = rows.reduce(
    (s, r) => s + (Number(values[r.id]) * 100 || 0),
    0,
  );
  const totalSpent = rows.reduce((s, r) => s + r.spentPaise, 0);
  const variableRows = rows.filter((r) => r.kind === "VARIABLE");

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Budgets</h1>
          <p className="text-sm text-muted-foreground">
            {monthLabel(period, "MMMM yyyy")} · Budget {formatMoney(totalBudget, { compact: true })} · Spent {formatMoney(totalSpent, { compact: true })}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={applySuggestions}>
            <Sparkles className="h-3.5 w-3.5" /> Auto-suggest
          </Button>
          <Button onClick={saveAll} disabled={saving}>
            {saving ? "Saving..." : "Save budgets"}
          </Button>
        </div>
      </div>

      {notice && (
        <p className="rounded-md border bg-muted/40 p-3 text-sm text-muted-foreground">
          {notice}
        </p>
      )}

      {variableRows.length === 0 ? (
        <EmptyState
          icon="🧮"
          title="No variable categories yet"
          body="Add some expenses so we can suggest sensible budgets based on your history."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {variableRows.map((r) => {
            const budget = Number(values[r.id]) * 100 || 0;
            const pct = budget > 0 ? Math.min(100, (r.spentPaise / budget) * 100) : 0;
            const over = budget > 0 && r.spentPaise > budget;
            return (
              <Card key={r.id} className="card-hover">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="flex items-center gap-2 text-sm">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ background: r.color ?? "#64748b" }}
                      />
                      {r.name}
                    </CardTitle>
                    {over && <Badge variant="destructive">Over budget</Badge>}
                  </div>
                  <CardDescription>
                    Avg: {formatMoney(r.avgPaise, { compact: true })} · Suggest: {formatMoney(r.suggestedPaise, { compact: true })}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-end gap-2">
                    <div className="flex-1 space-y-1">
                      <label className="text-xs text-muted-foreground">Monthly budget</label>
                      <Input
                        type="number"
                        min={0}
                        value={values[r.id] ?? ""}
                        onChange={(e) => setRow(r.id, e.target.value)}
                        placeholder="0"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setRow(r.id, (r.suggestedPaise / 100).toFixed(0))}
                    >
                      Use {formatMoney(r.suggestedPaise, { compact: true, withDecimals: false })}
                    </Button>
                  </div>
                  <Progress
                    value={pct}
                    indicatorClassName={
                      over ? "bg-destructive" : pct > 80 ? "bg-warning" : "bg-primary"
                    }
                  />
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">
                      Spent <Money paise={r.spentPaise} withDecimals={false} /> of{" "}
                      {formatMoney(budget, { withDecimals: false })}
                    </span>
                    <span
                      className={
                        over
                          ? "text-destructive"
                          : pct > 80
                            ? "text-warning"
                            : "text-muted-foreground"
                      }
                    >
                      {budget > 0
                        ? `${Math.max(0, (budget - r.spentPaise) / 100).toFixed(0)} left`
                        : "No budget set"}
                    </span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Wallet className="h-4 w-4" /> Fixed & savings commitments
          </CardTitle>
          <CardDescription>
            Fixed expenses and savings contributions aren't budgeted — they're tracked by their category kind.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm md:grid-cols-2">
          {rows.filter((r) => r.kind !== "VARIABLE").map((r) => (
            <div key={r.id} className="flex items-center justify-between rounded-md border p-3">
              <div className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ background: r.color ?? "#64748b" }}
                />
                <span>{r.name}</span>
                <Badge variant="secondary" className="text-[10px]">
                  {r.kind}
                </Badge>
              </div>
              <Money paise={r.spentPaise} withDecimals={false} className="text-muted-foreground" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
