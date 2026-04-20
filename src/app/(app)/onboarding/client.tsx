"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { ArrowRight, Check, PiggyBank, Plus, Trash } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Initial {
  name: string;
  monthlyIncome: number;
  salaryCycle: string;
  savingsTargetPct: number;
  emergencyFundTargetMos: number;
  emergencyFundCurrent: number;
}

interface PlanDraft {
  name: string;
  targetAmount: string;
  targetDate: string;
  priority: string;
}

export function OnboardingClient({ initial }: { initial: Initial }) {
  const router = useRouter();
  const [step, setStep] = React.useState(1);
  const [state, setState] = React.useState(initial);
  const [plans, setPlans] = React.useState<PlanDraft[]>([]);
  const [seedDemo, setSeedDemo] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  function addPlan() {
    setPlans((p) => [
      ...p,
      {
        name: "",
        targetAmount: "",
        targetDate: format(new Date(new Date().setMonth(new Date().getMonth() + 6)), "yyyy-MM-dd"),
        priority: "3",
      },
    ]);
  }

  async function finish() {
    setError(null);
    if (state.monthlyIncome <= 0) {
      setError("Please enter your monthly take-home income.");
      return;
    }
    setBusy(true);
    const res = await fetch("/api/onboarding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: state.name || null,
        currency: "USD",
        locale: "en-US",
        monthlyIncome: state.monthlyIncome,
        salaryCycle: state.salaryCycle,
        savingsTargetPct: state.savingsTargetPct,
        emergencyFundTargetMos: state.emergencyFundTargetMos,
        emergencyFundCurrent: state.emergencyFundCurrent,
        seedDemo,
        initialPlans: plans
          .filter((p) => p.name && Number(p.targetAmount) > 0)
          .map((p) => ({
            name: p.name,
            targetAmount: Number(p.targetAmount),
            targetDate: p.targetDate,
            priority: Number(p.priority),
          })),
      }),
    });
    if (!res.ok) {
      setBusy(false);
      setError("Could not save onboarding — please try again.");
      return;
    }
    if (seedDemo) {
      await fetch("/api/seed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: "demo" }),
      });
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <PiggyBank className="h-4 w-4 text-primary" />
          Step {step} of 3
        </div>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          {step === 1 && "A little about your income"}
          {step === 2 && "Savings & safety net"}
          {step === 3 && "Any upcoming plans?"}
        </h1>
        <p className="text-sm text-muted-foreground">
          We use this to give you explainable, math-backed recommendations every month.
        </p>
      </div>

      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Basics</CardTitle>
            <CardDescription>Just the essentials. Edit anytime in Settings.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2 space-y-1.5">
              <Label>Your name (optional)</Label>
              <Input
                value={state.name}
                onChange={(e) => setState({ ...state, name: e.target.value })}
                placeholder="You"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Monthly take-home ($)</Label>
              <Input
                type="number"
                min="0"
                required
                value={state.monthlyIncome}
                onChange={(e) =>
                  setState({ ...state, monthlyIncome: Number(e.target.value) })
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>Salary cycle</Label>
              <Select
                value={state.salaryCycle}
                onValueChange={(v) => setState({ ...state, salaryCycle: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MONTHLY">Monthly</SelectItem>
                  <SelectItem value="WEEKLY">Weekly</SelectItem>
                  <SelectItem value="IRREGULAR">Irregular</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Savings targets</CardTitle>
            <CardDescription>A 20% savings target + 6-month emergency fund is a healthy starting point.</CardDescription>
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
              <Label>Current emergency fund ($)</Label>
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
      )}

      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Future plans</CardTitle>
            <CardDescription>Add a few plans like &quot;NYC weekend&quot;, &quot;new MacBook&quot;, or &quot;holiday gifts&quot; — we&apos;ll work out the monthly saving.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {plans.map((p, i) => (
              <div key={i} className="grid gap-3 rounded-md border p-3 md:grid-cols-4">
                <Input
                  placeholder="Plan name"
                  value={p.name}
                  onChange={(e) =>
                    setPlans((arr) => arr.map((x, j) => (i === j ? { ...x, name: e.target.value } : x)))
                  }
                />
                <Input
                  type="number"
                  min="0"
                  placeholder="Target ($)"
                  value={p.targetAmount}
                  onChange={(e) =>
                    setPlans((arr) =>
                      arr.map((x, j) => (i === j ? { ...x, targetAmount: e.target.value } : x)),
                    )
                  }
                />
                <Input
                  type="date"
                  value={p.targetDate}
                  onChange={(e) =>
                    setPlans((arr) =>
                      arr.map((x, j) => (i === j ? { ...x, targetDate: e.target.value } : x)),
                    )
                  }
                />
                <div className="flex items-center gap-2">
                  <Select
                    value={p.priority}
                    onValueChange={(v) =>
                      setPlans((arr) => arr.map((x, j) => (i === j ? { ...x, priority: v } : x)))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4, 5].map((n) => (
                        <SelectItem key={n} value={String(n)}>
                          Priority {n}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="text-destructive"
                    onClick={() => setPlans((arr) => arr.filter((_, j) => j !== i))}
                  >
                    <Trash className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
            <Button type="button" variant="outline" onClick={addPlan}>
              <Plus className="h-3.5 w-3.5" /> Add plan
            </Button>

            <div className="mt-2 flex items-start gap-2 rounded-md border bg-muted/40 p-3">
              <input
                type="checkbox"
                id="seed"
                className="mt-1"
                checked={seedDemo}
                onChange={(e) => setSeedDemo(e.target.checked)}
              />
              <label htmlFor="seed" className="text-sm">
                <span className="font-medium">Also load US demo data</span>
                <span className="block text-xs text-muted-foreground">
                  Optional. Adds 6 months of realistic US sample transactions <em>alongside</em>
                  {" "}your real data so you can try the app. Demo entries are tagged separately
                  and can be cleared any time from Settings → Demo data → Clear demo data only.
                </span>
              </label>
            </div>
          </CardContent>
        </Card>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex justify-between">
        <Button
          variant="ghost"
          onClick={() => setStep((s) => Math.max(1, s - 1))}
          disabled={step === 1 || busy}
        >
          Back
        </Button>
        {step < 3 ? (
          <Button onClick={() => setStep((s) => s + 1)}>
            Next <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        ) : (
          <Button onClick={finish} disabled={busy}>
            {busy ? "Finishing..." : (
              <>
                Finish <Check className="h-3.5 w-3.5" />
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
