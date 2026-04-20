"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
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
import { Switch } from "@/components/ui/switch";
import { DialogFooter } from "@/components/ui/dialog";

export interface Category {
  id: string;
  name: string;
  slug: string;
  kind: string;
}

export interface TransactionFormProps {
  categories: Category[];
  initial?: {
    id?: string;
    type: "EXPENSE" | "INCOME" | "TRANSFER";
    amount: number;
    date: string;
    categoryId?: string | null;
    note?: string | null;
    merchant?: string | null;
    paymentMethod?: string | null;
    isRecurring?: boolean;
  };
  onDone?: () => void;
}

export function TransactionForm({ categories, initial, onDone }: TransactionFormProps) {
  const router = useRouter();
  const [type, setType] = React.useState<"EXPENSE" | "INCOME" | "TRANSFER">(initial?.type ?? "EXPENSE");
  const [amount, setAmount] = React.useState<string>(initial ? String(initial.amount) : "");
  const [date, setDate] = React.useState<string>(initial?.date ?? format(new Date(), "yyyy-MM-dd"));
  const [categoryId, setCategoryId] = React.useState<string>(initial?.categoryId ?? "");
  const [merchant, setMerchant] = React.useState<string>(initial?.merchant ?? "");
  const [note, setNote] = React.useState<string>(initial?.note ?? "");
  const [paymentMethod, setPaymentMethod] = React.useState<string>(initial?.paymentMethod ?? "DEBIT_CARD");
  const [isRecurring, setIsRecurring] = React.useState<boolean>(initial?.isRecurring ?? false);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const filteredCategories = categories.filter((c) =>
    type === "INCOME" ? c.kind === "INCOME" : c.kind !== "INCOME",
  );

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      setError("Amount must be greater than zero.");
      return;
    }
    if (!categoryId && type !== "TRANSFER") {
      setError("Please pick a category.");
      return;
    }
    setBusy(true);
    const payload = {
      type,
      amount: amt,
      date,
      categoryId: categoryId || null,
      note: note || null,
      merchant: merchant || null,
      paymentMethod,
      isRecurring,
    };
    const res = await fetch(
      initial?.id ? `/api/transactions/${initial.id}` : "/api/transactions",
      {
        method: initial?.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );
    setBusy(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Failed to save transaction.");
      return;
    }
    router.refresh();
    onDone?.();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Type</Label>
          <Select value={type} onValueChange={(v) => setType(v as "EXPENSE" | "INCOME" | "TRANSFER")}>
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
          <Label htmlFor="amount">Amount</Label>
          <Input
            id="amount"
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            required
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="date">Date</Label>
          <Input
            id="date"
            type="date"
            required
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Category</Label>
          <Select value={categoryId} onValueChange={setCategoryId}>
            <SelectTrigger>
              <SelectValue placeholder="Pick a category" />
            </SelectTrigger>
            <SelectContent>
              {filteredCategories.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="merchant">Merchant / Payee</Label>
          <Input
            id="merchant"
            value={merchant}
            onChange={(e) => setMerchant(e.target.value)}
            placeholder="e.g. Trader Joe's, Uber"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Payment method</Label>
          <Select value={paymentMethod} onValueChange={setPaymentMethod}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="DEBIT_CARD">Debit card</SelectItem>
              <SelectItem value="CREDIT_CARD">Credit card</SelectItem>
              <SelectItem value="CASH">Cash</SelectItem>
              <SelectItem value="CHECK">Check</SelectItem>
              <SelectItem value="ACH">ACH / Bank transfer</SelectItem>
              <SelectItem value="AUTOPAY">Autopay</SelectItem>
              <SelectItem value="ZELLE">Zelle</SelectItem>
              <SelectItem value="VENMO">Venmo</SelectItem>
              <SelectItem value="PAYPAL">PayPal</SelectItem>
              <SelectItem value="APPLE_PAY">Apple Pay</SelectItem>
              <SelectItem value="GOOGLE_PAY">Google Pay</SelectItem>
              <SelectItem value="OTHER">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="note">Note</Label>
        <Textarea
          id="note"
          rows={2}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Optional"
        />
      </div>

      <div className="flex items-center justify-between rounded-md border p-3">
        <div>
          <Label htmlFor="recurring">Recurring</Label>
          <p className="text-xs text-muted-foreground">Mark this as a recurring monthly entry.</p>
        </div>
        <Switch id="recurring" checked={isRecurring} onCheckedChange={setIsRecurring} />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <DialogFooter>
        <Button type="submit" disabled={busy}>
          {busy ? "Saving..." : initial?.id ? "Save changes" : "Add transaction"}
        </Button>
      </DialogFooter>
    </form>
  );
}
