"use client";
import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Download, Filter, Pencil, Plus, Search, Trash } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Badge } from "@/components/ui/badge";
import { Money } from "@/components/money";
import { EmptyState } from "@/components/empty-state";
import {
  TransactionForm,
  type Category,
  type TransactionFormProps,
} from "@/components/forms/transaction-form";
import { shortDate, monthLabel } from "@/lib/dates";
import { prettyPaymentMethod } from "@/lib/validation";
import { format } from "date-fns";

interface ClientTxn {
  id: string;
  type: "EXPENSE" | "INCOME" | "TRANSFER";
  amountPaise: number;
  date: string;
  categoryId: string | null;
  categoryName: string;
  categoryColor: string | null;
  note: string | null;
  merchant: string | null;
  paymentMethod: string | null;
  isRecurring: boolean;
}

interface Props {
  initialTxns: ClientTxn[];
  categories: Category[];
}

export function TransactionsClient({ initialTxns, categories }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = React.useState("");
  const [type, setType] = React.useState<string>("ALL");
  const [categoryId, setCategoryId] = React.useState<string>("ALL");
  const [month, setMonth] = React.useState<string>("ALL");
  const [openNew, setOpenNew] = React.useState(false);
  const [editing, setEditing] = React.useState<ClientTxn | null>(null);

  React.useEffect(() => {
    if (searchParams.get("new") === "1") setOpenNew(true);
  }, [searchParams]);

  const months = React.useMemo(() => {
    const set = new Set<string>();
    for (const t of initialTxns) set.add(monthLabel(t.date, "yyyy-MM"));
    return Array.from(set).sort().reverse();
  }, [initialTxns]);

  const filtered = initialTxns.filter((t) => {
    if (type !== "ALL" && t.type !== type) return false;
    if (categoryId !== "ALL" && t.categoryId !== categoryId) return false;
    if (month !== "ALL" && monthLabel(t.date, "yyyy-MM") !== month) return false;
    if (query) {
      const q = query.toLowerCase();
      if (
        !(t.merchant ?? "").toLowerCase().includes(q) &&
        !(t.note ?? "").toLowerCase().includes(q) &&
        !t.categoryName.toLowerCase().includes(q)
      )
        return false;
    }
    return true;
  });

  const income = filtered.filter((t) => t.type === "INCOME").reduce((s, t) => s + t.amountPaise, 0);
  const expense = filtered.filter((t) => t.type === "EXPENSE").reduce((s, t) => s + t.amountPaise, 0);

  async function handleDelete(id: string) {
    if (!confirm("Delete this transaction? This cannot be undone.")) return;
    await fetch(`/api/transactions/${id}`, { method: "DELETE" });
    router.refresh();
  }

  const editInitial: TransactionFormProps["initial"] | undefined = editing
    ? {
        id: editing.id,
        type: editing.type,
        amount: editing.amountPaise / 100,
        date: format(new Date(editing.date), "yyyy-MM-dd"),
        categoryId: editing.categoryId,
        note: editing.note,
        merchant: editing.merchant,
        paymentMethod: editing.paymentMethod,
        isRecurring: editing.isRecurring,
      }
    : undefined;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Transactions</h1>
          <p className="text-sm text-muted-foreground">
            {filtered.length} of {initialTxns.length} · Income {" "}
            <Money paise={income} withDecimals={false} className="text-success" /> · Spend {" "}
            <Money paise={expense} withDecimals={false} className="text-destructive" />
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" asChild>
            <a href={`/api/export`} target="_blank" rel="noreferrer">
              <Download className="h-3.5 w-3.5" /> Export CSV
            </a>
          </Button>
          <Dialog open={openNew} onOpenChange={setOpenNew}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-3.5 w-3.5" /> Add transaction
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add transaction</DialogTitle>
                <DialogDescription>Log an expense or income in seconds.</DialogDescription>
              </DialogHeader>
              <TransactionForm categories={categories} onDone={() => setOpenNew(false)} />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardContent className="grid gap-3 p-4 md:grid-cols-4">
          <div className="relative md:col-span-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search merchant, note, or category"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All types</SelectItem>
              <SelectItem value="EXPENSE">Expense</SelectItem>
              <SelectItem value="INCOME">Income</SelectItem>
            </SelectContent>
          </Select>
          <Select value={categoryId} onValueChange={setCategoryId}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All categories</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={month} onValueChange={setMonth}>
            <SelectTrigger>
              <Filter className="h-3.5 w-3.5" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All months</SelectItem>
              {months.map((m) => (
                <SelectItem key={m} value={m}>
                  {monthLabel(new Date(m + "-01"), "MMM yyyy")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {filtered.length === 0 ? (
        <EmptyState
          icon="🧾"
          title="No transactions match"
          body="Try clearing filters, or add your first entry."
          action={
            <Button onClick={() => setOpenNew(true)}>
              <Plus className="h-3.5 w-3.5" /> Add transaction
            </Button>
          }
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <ul className="divide-y">
              {filtered.map((t) => (
                <li key={t.id} className="flex items-center gap-3 px-4 py-3 text-sm">
                  <div
                    className="h-9 w-9 shrink-0 rounded-full"
                    style={{ background: (t.categoryColor ?? "#94a3b8") + "25" }}
                  >
                    <div
                      className="h-9 w-9 rounded-full bg-transparent text-center text-[11px] font-semibold uppercase leading-9"
                      style={{ color: t.categoryColor ?? "#475569" }}
                    >
                      {t.categoryName.slice(0, 2)}
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1">
                      <span className="truncate font-medium">
                        {t.merchant ?? t.note ?? t.categoryName}
                      </span>
                      <Badge variant="secondary" className="text-[10px]">
                        {t.categoryName}
                      </Badge>
                      {t.isRecurring && (
                        <Badge variant="outline" className="text-[10px]">
                          Recurring
                        </Badge>
                      )}
                    </div>
                    <p className="truncate text-xs text-muted-foreground">
                      {shortDate(t.date)} · {prettyPaymentMethod(t.paymentMethod)}
                      {t.note ? ` · ${t.note}` : ""}
                    </p>
                  </div>
                  <Money
                    paise={t.type === "EXPENSE" ? -t.amountPaise : t.amountPaise}
                    colored
                    className="font-semibold"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setEditing(t)}
                    aria-label="Edit"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive"
                    onClick={() => handleDelete(t.id)}
                    aria-label="Delete"
                  >
                    <Trash className="h-3.5 w-3.5" />
                  </Button>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit transaction</DialogTitle>
          </DialogHeader>
          {editInitial && (
            <TransactionForm
              categories={categories}
              initial={editInitial}
              onDone={() => setEditing(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
