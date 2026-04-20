"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { CalendarClock, Pencil, Plus, Trash, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/empty-state";
import { Money } from "@/components/money";
import { formatMoney } from "@/lib/money";
import { shortDate } from "@/lib/dates";
import type { PlanFunding } from "@/lib/advisor/types";

interface ClientPlan {
  id: string;
  name: string;
  targetAmountPaise: number;
  savedAmountPaise: number;
  targetDate: string;
  priority: number;
  categoryId: string | null;
  notes: string | null;
  status: string;
}

export function PlansClient({
  plans,
  categories,
  funding,
}: {
  plans: ClientPlan[];
  categories: { id: string; name: string }[];
  funding: PlanFunding[];
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<ClientPlan | null>(null);

  const fundingById = Object.fromEntries(funding.map((f) => [f.planId, f]));

  async function remove(id: string) {
    if (!confirm("Delete this plan?")) return;
    await fetch(`/api/plans/${id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Future plans</h1>
          <p className="text-sm text-muted-foreground">
            Goa trips, laptops, festivals — we compute what to save each month.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-3.5 w-3.5" /> New plan
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create a future plan</DialogTitle>
              <DialogDescription>Set a target amount and date. We'll do the math.</DialogDescription>
            </DialogHeader>
            <PlanForm categories={categories} onDone={() => setOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      {plans.length === 0 ? (
        <EmptyState
          icon="🎯"
          title="No plans yet"
          body="Create plans like a Goa trip, festival budget, or new phone. We'll suggest a monthly contribution."
          action={
            <Button onClick={() => setOpen(true)}>
              <Plus className="h-3.5 w-3.5" /> Create first plan
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {plans.map((p) => {
            const pct = Math.min(100, (p.savedAmountPaise / p.targetAmountPaise) * 100);
            const f = fundingById[p.id];
            return (
              <Card key={p.id} className="card-hover">
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <CardTitle className="text-base">{p.name}</CardTitle>
                      <CardDescription className="flex items-center gap-2">
                        <CalendarClock className="h-3.5 w-3.5" /> by {shortDate(p.targetDate)}
                        <Badge variant="outline" className="text-[10px]">
                          Priority {p.priority}
                        </Badge>
                        <Badge
                          variant={p.status === "ACTIVE" ? "default" : "secondary"}
                          className="text-[10px]"
                        >
                          {p.status}
                        </Badge>
                      </CardDescription>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={() => setEditing(p)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-destructive"
                        onClick={() => remove(p.id)}
                      >
                        <Trash className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Progress
                    value={pct}
                    indicatorClassName={pct >= 100 ? "bg-success" : "bg-primary"}
                  />
                  <div className="flex items-center justify-between text-sm">
                    <Money paise={p.savedAmountPaise} withDecimals={false} />
                    <span className="text-muted-foreground">
                      of {formatMoney(p.targetAmountPaise, { withDecimals: false })}
                    </span>
                  </div>
                  {p.notes && <p className="text-xs text-muted-foreground">{p.notes}</p>}
                  {f && (
                    <div
                      className={`rounded-md border p-3 text-xs ${
                        f.feasible
                          ? "border-primary/30 bg-primary/5 text-primary"
                          : "border-warning/30 bg-warning/5 text-warning"
                      }`}
                    >
                      <div className="flex items-center gap-2 font-medium">
                        <TrendingUp className="h-3.5 w-3.5" />
                        {f.feasible
                          ? `Save ${formatMoney(f.monthlyContributionPaise, { withDecimals: false })}/month`
                          : `Needs ${formatMoney(f.monthlyContributionPaise, { withDecimals: false })}/month`}
                      </div>
                      <p className="mt-1 text-muted-foreground">{f.reason}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit plan</DialogTitle>
          </DialogHeader>
          {editing && (
            <PlanForm
              categories={categories}
              initial={editing}
              onDone={() => setEditing(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PlanForm({
  categories,
  initial,
  onDone,
}: {
  categories: { id: string; name: string }[];
  initial?: ClientPlan;
  onDone: () => void;
}) {
  const router = useRouter();
  const [name, setName] = React.useState(initial?.name ?? "");
  const [targetAmount, setTargetAmount] = React.useState(
    initial ? String(initial.targetAmountPaise / 100) : "",
  );
  const [savedAmount, setSavedAmount] = React.useState(
    initial ? String(initial.savedAmountPaise / 100) : "0",
  );
  const [targetDate, setTargetDate] = React.useState(
    initial ? format(new Date(initial.targetDate), "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd"),
  );
  const [priority, setPriority] = React.useState(String(initial?.priority ?? 3));
  const [status, setStatus] = React.useState(initial?.status ?? "ACTIVE");
  const [categoryId, setCategoryId] = React.useState(initial?.categoryId ?? "");
  const [notes, setNotes] = React.useState(initial?.notes ?? "");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const amt = Number(targetAmount);
    if (!name.trim()) return setError("Name is required.");
    if (!Number.isFinite(amt) || amt <= 0) return setError("Target amount must be positive.");
    setBusy(true);
    const payload = {
      name: name.trim(),
      targetAmount: amt,
      savedAmount: Number(savedAmount) || 0,
      targetDate,
      priority: Number(priority),
      categoryId: categoryId || null,
      notes: notes || null,
      status,
    };
    const res = await fetch(initial ? `/api/plans/${initial.id}` : "/api/plans", {
      method: initial ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setBusy(false);
    if (!res.ok) {
      setError("Failed to save plan.");
      return;
    }
    router.refresh();
    onDone();
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="p-name">Name</Label>
        <Input id="p-name" required value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="p-target">Target amount</Label>
          <Input
            id="p-target"
            type="number"
            min="0"
            step="0.01"
            required
            value={targetAmount}
            onChange={(e) => setTargetAmount(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="p-saved">Already saved</Label>
          <Input
            id="p-saved"
            type="number"
            min="0"
            value={savedAmount}
            onChange={(e) => setSavedAmount(e.target.value)}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="p-date">Target date</Label>
          <Input
            id="p-date"
            type="date"
            required
            value={targetDate}
            onChange={(e) => setTargetDate(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Priority (1 high, 5 low)</Label>
          <Select value={priority} onValueChange={setPriority}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[1, 2, 3, 4, 5].map((n) => (
                <SelectItem key={n} value={String(n)}>
                  {n}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Linked category</Label>
          <Select value={categoryId} onValueChange={setCategoryId}>
            <SelectTrigger>
              <SelectValue placeholder="Optional" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Status</Label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ACTIVE">Active</SelectItem>
              <SelectItem value="PAUSED">Paused</SelectItem>
              <SelectItem value="DONE">Done</SelectItem>
              <SelectItem value="ABANDONED">Abandoned</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="p-notes">Notes</Label>
        <Textarea id="p-notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <DialogFooter>
        <Button type="submit" disabled={busy}>
          {busy ? "Saving..." : initial ? "Save changes" : "Create plan"}
        </Button>
      </DialogFooter>
    </form>
  );
}
