"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

interface Initial {
  name: string;
  currency: string;
  locale: string;
  monthlyIncome: number;
  salaryCycle: string;
  savingsTargetPct: number;
  emergencyFundTargetMos: number;
  emergencyFundCurrent: number;
  fixedExpensesNote: string;
}

const CURRENCY_SYMBOL: Record<string, string> = {
  USD: "$",
  INR: "₹",
  EUR: "€",
  GBP: "£",
  CAD: "CA$",
  AUD: "A$",
};

export function SettingsClient({ initial }: { initial: Initial }) {
  const router = useRouter();
  const [state, setState] = React.useState(initial);
  const [saving, setSaving] = React.useState(false);
  const [notice, setNotice] = React.useState<string | null>(null);
  const [seeding, setSeeding] = React.useState(false);
  const [wiping, setWiping] = React.useState<null | "demo" | "transactions" | "all">(null);

  const symbol = CURRENCY_SYMBOL[state.currency] ?? state.currency;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setNotice(null);
    const res = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: state.name || null,
        currency: state.currency,
        locale: state.locale,
        monthlyIncome: Number(state.monthlyIncome),
        salaryCycle: state.salaryCycle,
        savingsTargetPct: Number(state.savingsTargetPct),
        emergencyFundTargetMos: Number(state.emergencyFundTargetMos),
        emergencyFundCurrent: Number(state.emergencyFundCurrent),
        fixedExpensesNote: state.fixedExpensesNote || null,
      }),
    });
    setSaving(false);
    setNotice(res.ok ? "Saved." : "Failed to save.");
    if (res.ok) router.refresh();
  }

  async function seedDemo(replace: boolean) {
    const prompt = replace
      ? "Replace all of your real data (transactions, budgets, goals, plans, bills) with the US demo set?\n\nThis cannot be undone."
      : "Load the US demo data set? Your real data will be kept untouched — demo entries are tagged separately and can be cleared any time.";
    if (!confirm(prompt)) return;
    setSeeding(true);
    const res = await fetch("/api/seed", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ confirm: "demo", replace }),
    });
    setSeeding(false);
    setNotice(res.ok ? "Demo data loaded." : "Failed to load demo data.");
    if (res.ok) router.refresh();
  }

  async function wipe(scope: "demo" | "transactions" | "all") {
    const labelFor = {
      demo: "all DEMO data (your real data is kept)",
      transactions: "ALL your transactions",
      all: "EVERYTHING (transactions, budgets, goals, plans, bills)",
    }[scope];
    if (!confirm(`Permanently delete ${labelFor}? This cannot be undone.`)) return;
    setWiping(scope);
    const res = await fetch("/api/seed", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scope, confirm: "delete" }),
    });
    setWiping(null);
    setNotice(res.ok ? "Data cleared." : "Failed to clear data.");
    if (res.ok) router.refresh();
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Your profile powers the advisor. Keep these values accurate for best guidance.
        </p>
      </div>

      <form onSubmit={save} className="space-y-5">
        <Card>
          <CardHeader>
            <CardTitle>You</CardTitle>
            <CardDescription>Personal &amp; display preferences.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Display name</Label>
              <Input
                value={state.name}
                onChange={(e) => setState({ ...state, name: e.target.value })}
                placeholder="You"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Currency</Label>
              <Select
                value={state.currency}
                onValueChange={(v) => setState({ ...state, currency: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD — $</SelectItem>
                  <SelectItem value="EUR">EUR — €</SelectItem>
                  <SelectItem value="GBP">GBP — £</SelectItem>
                  <SelectItem value="CAD">CAD — CA$</SelectItem>
                  <SelectItem value="AUD">AUD — A$</SelectItem>
                  <SelectItem value="INR">INR — ₹</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Locale</Label>
              <Select value={state.locale} onValueChange={(v) => setState({ ...state, locale: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en-US">English (US)</SelectItem>
                  <SelectItem value="en-GB">English (UK)</SelectItem>
                  <SelectItem value="en-CA">English (Canada)</SelectItem>
                  <SelectItem value="en-AU">English (Australia)</SelectItem>
                  <SelectItem value="en-IN">English (India)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Income</CardTitle>
            <CardDescription>Used by the advisor for safe-spend and savings targets.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Monthly take-home ({symbol})</Label>
              <Input
                type="number"
                min="0"
                value={state.monthlyIncome}
                onChange={(e) =>
                  setState({ ...state, monthlyIncome: Number(e.target.value) })
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>Paycheck cycle</Label>
              <Select
                value={state.salaryCycle}
                onValueChange={(v) => setState({ ...state, salaryCycle: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MONTHLY">Monthly</SelectItem>
                  <SelectItem value="WEEKLY">Weekly / bi-weekly</SelectItem>
                  <SelectItem value="IRREGULAR">Irregular / self-employed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Savings &amp; safety</CardTitle>
            <CardDescription>Targets the advisor uses to evaluate your month.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3">
            <div className="space-y-1.5">
              <Label>Savings target (%)</Label>
              <Input
                type="number"
                min="0"
                max="90"
                value={state.savingsTargetPct}
                onChange={(e) =>
                  setState({ ...state, savingsTargetPct: Number(e.target.value) })
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>Emergency fund target (months)</Label>
              <Input
                type="number"
                min="0"
                max="24"
                value={state.emergencyFundTargetMos}
                onChange={(e) =>
                  setState({ ...state, emergencyFundTargetMos: Number(e.target.value) })
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>Current emergency fund ({symbol})</Label>
              <Input
                type="number"
                min="0"
                value={state.emergencyFundCurrent}
                onChange={(e) =>
                  setState({ ...state, emergencyFundCurrent: Number(e.target.value) })
                }
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
            <CardDescription>Anything the coach should remember, e.g. &quot;rent hike in June.&quot;</CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              rows={3}
              value={state.fixedExpensesNote}
              onChange={(e) => setState({ ...state, fixedExpensesNote: e.target.value })}
            />
          </CardContent>
        </Card>

        {notice && (
          <p className="rounded-md border bg-muted/40 p-3 text-sm text-muted-foreground">{notice}</p>
        )}

        <div className="flex flex-wrap justify-between gap-2">
          <Button type="submit" disabled={saving}>
            {saving ? "Saving..." : "Save settings"}
          </Button>
        </div>
      </form>

      <Card>
        <CardHeader>
          <CardTitle>Demo data</CardTitle>
          <CardDescription>
            Load 6 months of realistic US sample transactions plus matching budgets, recurring
            bills, savings goals and future plans so every page has something to explore. Demo
            entries are <strong>tagged separately</strong> from your real data — you can add them,
            try the app, then remove them without touching anything you entered or imported.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={() => seedDemo(false)} disabled={seeding}>
            {seeding ? "Loading demo…" : "Load US demo data"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => wipe("demo")}
            disabled={wiping !== null}
          >
            {wiping === "demo" ? "Clearing demo…" : "Clear demo data only"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => seedDemo(true)}
            disabled={seeding}
          >
            Replace my data with demo
          </Button>
        </CardContent>
      </Card>

      <Card className="border-destructive/40">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Trash2 className="h-4 w-4 text-destructive" /> Danger zone
          </CardTitle>
          <CardDescription>
            Permanently wipe data from this account. Useful if you want to start fresh before
            importing a bank statement.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => wipe("transactions")}
            disabled={wiping !== null}
          >
            {wiping === "transactions" ? "Clearing…" : "Clear all transactions"}
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={() => wipe("all")}
            disabled={wiping !== null}
          >
            {wiping === "all" ? "Clearing…" : "Clear everything"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="h-4 w-4 text-warning" /> Important
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 text-sm text-muted-foreground">
          <p>
            Penny Coach is a simple budgeting app. It doesn&apos;t call any paid API and does not
            send your data anywhere outside the database you configure.
          </p>
          <Badge variant="outline" className="w-fit">
            Not a substitute for professional financial advice.
          </Badge>
        </CardContent>
      </Card>
    </div>
  );
}
