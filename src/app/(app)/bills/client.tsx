"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { AlertCircle, Check, CalendarClock, Pencil, Plus, Trash } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
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
import { shortDate, daysUntil } from "@/lib/dates";
import { recurringMonthlyImpact } from "@/lib/advisor/forecasting";

interface ClientBill {
  id: string;
  name: string;
  categoryId: string | null;
  categoryName: string | null;
  amountPaise: number;
  frequency: string;
  nextDueDate: string;
  type: string;
  autoPay: boolean;
  active: boolean;
  notes: string | null;
}

export function BillsClient({
  bills,
  categories,
}: {
  bills: ClientBill[];
  categories: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<ClientBill | null>(null);

  async function remove(id: string) {
    if (!confirm("Delete this bill?")) return;
    await fetch(`/api/bills/${id}`, { method: "DELETE" });
    router.refresh();
  }

  const impact = recurringMonthlyImpact(
    bills.map((b) => ({
      amountPaise: b.amountPaise,
      frequency: b.frequency,
      active: b.active,
      type: b.type,
    })),
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Recurring bills</h1>
          <p className="text-sm text-muted-foreground">
            Monthly equivalents: <Money paise={impact.expense} withDecimals={false} className="text-destructive" /> outflow ·{" "}
            <Money paise={impact.income} withDecimals={false} className="text-success" /> inflow
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-3.5 w-3.5" /> Add bill
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add recurring bill</DialogTitle>
            </DialogHeader>
            <BillForm categories={categories} onDone={() => setOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      {bills.length === 0 ? (
        <EmptyState
          icon="📅"
          title="No recurring bills yet"
          body="Add rent, EMIs, subscriptions, school fees, insurance — we'll forecast their impact."
          action={
            <Button onClick={() => setOpen(true)}>
              <Plus className="h-3.5 w-3.5" /> Add first bill
            </Button>
          }
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {bills.map((b) => {
            const d = daysUntil(b.nextDueDate);
            const soon = d >= 0 && d <= 7;
            const overdue = d < 0 && b.active;
            return (
              <Card key={b.id} className="card-hover">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <CardTitle className="flex items-center gap-2 text-base">
                        {b.autoPay ? (
                          <Check className="h-4 w-4 text-success" />
                        ) : (
                          <CalendarClock className="h-4 w-4" />
                        )}
                        {b.name}
                      </CardTitle>
                      <CardDescription>
                        {b.categoryName ?? "Uncategorised"} · {b.frequency.toLowerCase()}
                      </CardDescription>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={() => setEditing(b)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-destructive"
                        onClick={() => remove(b.id)}
                      >
                        <Trash className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div>
                      <Money paise={b.amountPaise} className="text-lg font-semibold" />
                      <p className="text-xs text-muted-foreground">
                        Next due {shortDate(b.nextDueDate)}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      {!b.active && <Badge variant="secondary">Paused</Badge>}
                      {b.active && overdue && (
                        <Badge variant="destructive" className="flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" /> Overdue
                        </Badge>
                      )}
                      {b.active && soon && !overdue && (
                        <Badge variant="warning">Due in {d}d</Badge>
                      )}
                      {b.active && d > 7 && (
                        <Badge variant="secondary">Due in {d}d</Badge>
                      )}
                      {b.autoPay && <Badge variant="outline">Autopay</Badge>}
                    </div>
                  </div>
                  {b.notes && (
                    <p className="mt-2 text-xs text-muted-foreground">{b.notes}</p>
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
            <DialogTitle>Edit bill</DialogTitle>
          </DialogHeader>
          {editing && (
            <BillForm categories={categories} initial={editing} onDone={() => setEditing(null)} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function BillForm({
  categories,
  initial,
  onDone,
}: {
  categories: { id: string; name: string }[];
  initial?: ClientBill;
  onDone: () => void;
}) {
  const router = useRouter();
  const [name, setName] = React.useState(initial?.name ?? "");
  const [amount, setAmount] = React.useState(initial ? String(initial.amountPaise / 100) : "");
  const [categoryId, setCategoryId] = React.useState(initial?.categoryId ?? "");
  const [frequency, setFrequency] = React.useState(initial?.frequency ?? "MONTHLY");
  const [type, setType] = React.useState(initial?.type ?? "EXPENSE");
  const [nextDueDate, setNextDueDate] = React.useState(
    initial ? format(new Date(initial.nextDueDate), "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd"),
  );
  const [autoPay, setAutoPay] = React.useState(initial?.autoPay ?? false);
  const [active, setActive] = React.useState(initial?.active ?? true);
  const [notes, setNotes] = React.useState(initial?.notes ?? "");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const amt = Number(amount);
    if (!name.trim()) return setError("Name required.");
    if (!Number.isFinite(amt) || amt <= 0) return setError("Amount must be positive.");
    setBusy(true);
    const payload = {
      name,
      amount: amt,
      categoryId: categoryId || null,
      frequency,
      type,
      nextDueDate,
      autoPay,
      active,
      notes: notes || null,
    };
    const res = await fetch(initial ? `/api/bills/${initial.id}` : "/api/bills", {
      method: initial ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setBusy(false);
    if (!res.ok) return setError("Failed to save bill.");
    router.refresh();
    onDone();
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2 space-y-1.5">
          <Label>Name</Label>
          <Input required value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Amount</Label>
          <Input
            type="number"
            min="0"
            step="0.01"
            required
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Type</Label>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="EXPENSE">Expense</SelectItem>
              <SelectItem value="INCOME">Income</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Category</Label>
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
          <Label>Frequency</Label>
          <Select value={frequency} onValueChange={setFrequency}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="WEEKLY">Weekly</SelectItem>
              <SelectItem value="MONTHLY">Monthly</SelectItem>
              <SelectItem value="QUARTERLY">Quarterly</SelectItem>
              <SelectItem value="YEARLY">Yearly</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="col-span-2 space-y-1.5">
          <Label>Next due date</Label>
          <Input
            type="date"
            required
            value={nextDueDate}
            onChange={(e) => setNextDueDate(e.target.value)}
          />
        </div>
      </div>
      <div className="flex items-center justify-between rounded-md border p-3">
        <div>
          <Label>Autopay</Label>
          <p className="text-xs text-muted-foreground">Is this bill on autopay?</p>
        </div>
        <Switch checked={autoPay} onCheckedChange={setAutoPay} />
      </div>
      <div className="flex items-center justify-between rounded-md border p-3">
        <div>
          <Label>Active</Label>
          <p className="text-xs text-muted-foreground">Pause to temporarily ignore in forecasts.</p>
        </div>
        <Switch checked={active} onCheckedChange={setActive} />
      </div>
      <div className="space-y-1.5">
        <Label>Notes</Label>
        <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <DialogFooter>
        <Button type="submit" disabled={busy}>
          {busy ? "Saving..." : initial ? "Save changes" : "Add bill"}
        </Button>
      </DialogFooter>
    </form>
  );
}
