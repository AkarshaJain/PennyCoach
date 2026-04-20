"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { Pencil, Plus, Target, Trash } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
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
import { EmptyState } from "@/components/empty-state";
import { Money } from "@/components/money";
import { formatMoney } from "@/lib/money";
import { shortDate } from "@/lib/dates";

interface ClientGoal {
  id: string;
  name: string;
  targetAmountPaise: number;
  savedAmountPaise: number;
  targetDate: string | null;
  notes: string | null;
  status: string;
}

export function GoalsClient({ goals }: { goals: ClientGoal[] }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<ClientGoal | null>(null);

  async function remove(id: string) {
    if (!confirm("Delete this goal?")) return;
    await fetch(`/api/goals/${id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Goals</h1>
          <p className="text-sm text-muted-foreground">
            Long-term savings targets — emergency fund, home down-payment, retirement.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-3.5 w-3.5" /> New goal
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New goal</DialogTitle>
            </DialogHeader>
            <GoalForm onDone={() => setOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      {goals.length === 0 ? (
        <EmptyState
          icon="🎯"
          title="No goals yet"
          body="Start with an emergency fund goal (6 months of expenses is a great target)."
          action={
            <Button onClick={() => setOpen(true)}>
              <Plus className="h-3.5 w-3.5" /> Create first goal
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {goals.map((g) => {
            const pct = Math.min(100, (g.savedAmountPaise / g.targetAmountPaise) * 100);
            return (
              <Card key={g.id} className="card-hover">
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <CardTitle className="flex items-center gap-2 text-base">
                        <Target className="h-4 w-4 text-primary" /> {g.name}
                      </CardTitle>
                      {g.targetDate && (
                        <CardDescription>by {shortDate(g.targetDate)}</CardDescription>
                      )}
                    </div>
                    <Badge variant={g.status === "ACTIVE" ? "default" : "secondary"}>
                      {g.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Progress
                    value={pct}
                    indicatorClassName={pct >= 100 ? "bg-success" : "bg-primary"}
                  />
                  <div className="flex items-center justify-between text-sm">
                    <Money paise={g.savedAmountPaise} withDecimals={false} />
                    <span className="text-muted-foreground">
                      of {formatMoney(g.targetAmountPaise, { withDecimals: false })}
                    </span>
                  </div>
                  {g.notes && <p className="text-xs text-muted-foreground">{g.notes}</p>}
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditing(g)}
                      className="flex-1"
                    >
                      <Pencil className="h-3.5 w-3.5" /> Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive"
                      onClick={() => remove(g.id)}
                    >
                      <Trash className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit goal</DialogTitle>
          </DialogHeader>
          {editing && <GoalForm initial={editing} onDone={() => setEditing(null)} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function GoalForm({ initial, onDone }: { initial?: ClientGoal; onDone: () => void }) {
  const router = useRouter();
  const [name, setName] = React.useState(initial?.name ?? "");
  const [targetAmount, setTargetAmount] = React.useState(
    initial ? String(initial.targetAmountPaise / 100) : "",
  );
  const [savedAmount, setSavedAmount] = React.useState(
    initial ? String(initial.savedAmountPaise / 100) : "0",
  );
  const [targetDate, setTargetDate] = React.useState(
    initial?.targetDate ? format(new Date(initial.targetDate), "yyyy-MM-dd") : "",
  );
  const [status, setStatus] = React.useState(initial?.status ?? "ACTIVE");
  const [notes, setNotes] = React.useState(initial?.notes ?? "");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const amt = Number(targetAmount);
    if (!name.trim()) return setError("Name required.");
    if (!Number.isFinite(amt) || amt <= 0) return setError("Target must be positive.");
    setBusy(true);
    const payload = {
      name,
      targetAmount: amt,
      savedAmount: Number(savedAmount) || 0,
      targetDate: targetDate || null,
      status,
      notes: notes || null,
    };
    const res = await fetch(initial ? `/api/goals/${initial.id}` : "/api/goals", {
      method: initial ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setBusy(false);
    if (!res.ok) return setError("Failed to save goal.");
    router.refresh();
    onDone();
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="g-name">Name</Label>
        <Input id="g-name" required value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="g-target">Target</Label>
          <Input
            id="g-target"
            type="number"
            min="0"
            required
            value={targetAmount}
            onChange={(e) => setTargetAmount(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="g-saved">Saved</Label>
          <Input
            id="g-saved"
            type="number"
            min="0"
            value={savedAmount}
            onChange={(e) => setSavedAmount(e.target.value)}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="g-date">Target date (optional)</Label>
          <Input
            id="g-date"
            type="date"
            value={targetDate}
            onChange={(e) => setTargetDate(e.target.value)}
          />
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
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="g-notes">Notes</Label>
        <Textarea id="g-notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <DialogFooter>
        <Button type="submit" disabled={busy}>
          {busy ? "Saving..." : initial ? "Save changes" : "Create goal"}
        </Button>
      </DialogFooter>
    </form>
  );
}
