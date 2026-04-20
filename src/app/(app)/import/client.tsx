"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, FileUp, Info, Trash2, Upload, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatMoney } from "@/lib/money";
import { shortDate } from "@/lib/dates";
import { PAYMENT_METHODS, prettyPaymentMethod } from "@/lib/validation";

interface Category {
  id: string;
  slug: string;
  name: string;
  kind: string;
}

interface PreviewRow {
  externalId: string | null;
  date: string;
  amount: number;
  type: "EXPENSE" | "INCOME";
  merchant: string | null;
  note: string | null;
  paymentMethod: string | null;
  suggestedCategorySlug: string | null;
  suggestedCategoryId: string | null;
  duplicate: boolean;
}

interface PreviewResponse {
  source: string;
  filename: string;
  details: string[];
  rows: PreviewRow[];
  totalRows: number;
  duplicates: number;
  autoCategorised: number;
}

interface RowDraft {
  include: boolean;
  row: PreviewRow;
  categorySlug: string | null;
  paymentMethod: string | null;
}

interface Props {
  categories: Category[];
  currency: string;
  locale: string;
  recentBatches: {
    batchId: string;
    kind: string;
    count: number;
    skipped: number;
    when: string;
    label: string;
    source: string;
  }[];
}

export function ImportClient({ categories, currency, locale, recentBatches }: Props) {
  const router = useRouter();
  const [dragOver, setDragOver] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [preview, setPreview] = React.useState<PreviewResponse | null>(null);
  const [drafts, setDrafts] = React.useState<RowDraft[]>([]);
  const [batchName, setBatchName] = React.useState("");
  const [sourceLabel, setSourceLabel] = React.useState("");
  const [committing, setCommitting] = React.useState(false);
  const [result, setResult] = React.useState<
    | { ok: true; inserted: number; skipped: number; batchId: string }
    | null
  >(null);

  const money = React.useCallback(
    (major: number, type: "EXPENSE" | "INCOME" = "EXPENSE") => {
      const sign = type === "EXPENSE" ? -1 : 1;
      return formatMoney(Math.round(major * 100) * sign, {
        currency,
        locale,
        withDecimals: true,
      });
    },
    [currency, locale],
  );

  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const slugToCat = React.useMemo(
    () => Object.fromEntries(categories.map((c) => [c.slug, c])),
    [categories],
  );

  async function handleFile(file: File) {
    setLoading(true);
    setError(null);
    setResult(null);
    setPreview(null);
    setDrafts([]);
    try {
      const form = new FormData();
      form.set("file", file);
      const res = await fetch("/api/import/preview", {
        method: "POST",
        body: form,
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body?.error ?? "Failed to parse file");
        return;
      }
      const p = body as PreviewResponse;
      setPreview(p);
      setBatchName(file.name.replace(/\.[^.]+$/, ""));
      setSourceLabel(p.source);
      setDrafts(
        p.rows.map((r) => ({
          include: !r.duplicate,
          row: r,
          categorySlug: r.suggestedCategorySlug,
          paymentMethod: r.paymentMethod,
        })),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setLoading(false);
    }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  }

  function updateDraft(idx: number, patch: Partial<RowDraft>) {
    setDrafts((prev) => prev.map((d, i) => (i === idx ? { ...d, ...patch } : d)));
  }

  function toggleAll(include: boolean) {
    setDrafts((prev) => prev.map((d) => ({ ...d, include: include && !d.row.duplicate })));
  }

  async function commit() {
    if (!preview) return;
    setCommitting(true);
    setError(null);
    try {
      const rows = drafts
        .filter((d) => d.include)
        .map((d) => ({
          externalId: d.row.externalId,
          type: d.row.type,
          amount: d.row.amount,
          date: d.row.date,
          merchant: d.row.merchant,
          note: d.row.note,
          paymentMethod: d.paymentMethod,
          categorySlug: d.categorySlug,
        }));
      if (rows.length === 0) {
        setError("Select at least one row to import");
        setCommitting(false);
        return;
      }
      const res = await fetch("/api/import/commit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          batchName: batchName || "Imported batch",
          sourceLabel: sourceLabel || preview.source,
          rows,
        }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body?.error ?? "Failed to commit import");
        setCommitting(false);
        return;
      }
      setResult({
        ok: true,
        inserted: body.inserted,
        skipped: body.skipped,
        batchId: body.batchId,
      });
      setPreview(null);
      setDrafts([]);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Commit failed");
    } finally {
      setCommitting(false);
    }
  }

  async function undoBatch(batchId: string) {
    if (!confirm("Remove all transactions from this import? Cannot be undone.")) return;
    const res = await fetch(`/api/import/commit?batchId=${encodeURIComponent(batchId)}`, {
      method: "DELETE",
    });
    if (res.ok) router.refresh();
  }

  const selectedCount = drafts.filter((d) => d.include).length;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Import from your bank</h1>
        <p className="text-sm text-muted-foreground">
          Download a CSV or QFX file from your bank&apos;s online portal (most US banks support
          this for free) and drop it here. No API keys, no third-party aggregator, your data stays
          in your database.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Upload statement</CardTitle>
          <CardDescription>
            Supports Chase, Bank of America, Capital One, Amex, Wells Fargo, Discover, Citi, Mint
            CSV exports, plus generic CSV and OFX/QFX.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            className={`flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-10 text-center transition-colors ${
              dragOver ? "border-primary bg-primary/5" : "border-muted-foreground/30"
            }`}
          >
            <Upload className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm">
              Drop a <code className="rounded bg-muted px-1">.csv</code>,{" "}
              <code className="rounded bg-muted px-1">.ofx</code>,{" "}
              <code className="rounded bg-muted px-1">.qfx</code> or{" "}
              <code className="rounded bg-muted px-1">.qif</code> file here
            </p>
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={loading}
            >
              <FileUp className="mr-1 h-3.5 w-3.5" /> {loading ? "Parsing…" : "Choose file"}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept=".csv,.ofx,.qfx,.qif,text/csv,text/plain,application/x-ofx"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
                e.currentTarget.value = "";
              }}
            />
            <p className="text-xs text-muted-foreground">
              Max 4&nbsp;MB · parsed locally in your server, not shared anywhere
            </p>
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
              <XCircle className="h-4 w-4" /> {error}
            </div>
          )}

          {result && (
            <div className="flex items-center justify-between gap-2 rounded-md border border-success/40 bg-success/5 p-3 text-sm text-success">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Imported {result.inserted} transactions
                {result.skipped > 0 ? ` (${result.skipped} skipped as duplicates)` : ""}.
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => undoBatch(result.batchId)}
              >
                Undo
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {preview && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Review before importing</CardTitle>
            <CardDescription>
              Parsed {preview.totalRows} rows from <strong>{preview.source}</strong>
              {preview.duplicates > 0 && ` · ${preview.duplicates} look like duplicates`}
              {preview.autoCategorised > 0 &&
                ` · ${preview.autoCategorised} were auto-categorised`}
              .
            </CardDescription>
            {preview.details.length > 0 && (
              <p className="mt-1 flex items-start gap-2 text-xs text-muted-foreground">
                <Info className="mt-0.5 h-3 w-3 shrink-0" />
                {preview.details.join(" · ")}
              </p>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Batch label</Label>
                <Input
                  value={batchName}
                  onChange={(e) => setBatchName(e.target.value)}
                  placeholder="e.g. Chase Checking — Feb 2026"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Source</Label>
                <Input
                  value={sourceLabel}
                  onChange={(e) => setSourceLabel(e.target.value)}
                  placeholder="e.g. Chase Checking"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">{selectedCount} selected</Badge>
              <Button size="sm" variant="ghost" onClick={() => toggleAll(true)}>
                Select all
              </Button>
              <Button size="sm" variant="ghost" onClick={() => toggleAll(false)}>
                Clear
              </Button>
            </div>

            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="p-2 w-8"></th>
                    <th className="p-2">Date</th>
                    <th className="p-2">Merchant / Note</th>
                    <th className="p-2 text-right">Amount</th>
                    <th className="p-2">Category</th>
                    <th className="p-2">Method</th>
                  </tr>
                </thead>
                <tbody>
                  {drafts.map((d, idx) => (
                    <tr
                      key={idx}
                      className={`border-t ${d.row.duplicate ? "bg-warning/5" : ""}`}
                    >
                      <td className="p-2">
                        <input
                          type="checkbox"
                          checked={d.include}
                          onChange={(e) => updateDraft(idx, { include: e.target.checked })}
                        />
                      </td>
                      <td className="p-2 whitespace-nowrap">{shortDate(d.row.date)}</td>
                      <td className="p-2">
                        <div className="font-medium">
                          {d.row.merchant ?? d.row.note ?? "—"}
                        </div>
                        {d.row.duplicate && (
                          <Badge variant="warning" className="mt-1 text-[10px]">
                            Looks like a duplicate
                          </Badge>
                        )}
                      </td>
                      <td
                        className={`p-2 text-right font-mono ${
                          d.row.type === "INCOME" ? "text-success" : "text-destructive"
                        }`}
                      >
                        {money(d.row.amount, d.row.type)}
                      </td>
                      <td className="p-2">
                        <Select
                          value={d.categorySlug ?? ""}
                          onValueChange={(v) =>
                            updateDraft(idx, { categorySlug: v || null })
                          }
                        >
                          <SelectTrigger className="h-8 w-40 text-xs">
                            <SelectValue placeholder="— choose —" />
                          </SelectTrigger>
                          <SelectContent>
                            {categories
                              .filter((c) =>
                                d.row.type === "INCOME"
                                  ? c.kind === "INCOME"
                                  : c.kind !== "INCOME",
                              )
                              .map((c) => (
                                <SelectItem key={c.id} value={c.slug}>
                                  {c.name}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="p-2">
                        <Select
                          value={d.paymentMethod ?? ""}
                          onValueChange={(v) =>
                            updateDraft(idx, { paymentMethod: v || null })
                          }
                        >
                          <SelectTrigger className="h-8 w-36 text-xs">
                            <SelectValue placeholder="—" />
                          </SelectTrigger>
                          <SelectContent>
                            {PAYMENT_METHODS.map((m) => (
                              <SelectItem key={m} value={m}>
                                {prettyPaymentMethod(m)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-wrap justify-end gap-2">
              <Button
                variant="ghost"
                onClick={() => {
                  setPreview(null);
                  setDrafts([]);
                }}
              >
                Cancel
              </Button>
              <Button onClick={commit} disabled={committing || selectedCount === 0}>
                {committing ? "Importing…" : `Import ${selectedCount} transactions`}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {recentBatches.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent imports</CardTitle>
            <CardDescription>
              Every import (and the demo loader) shows up here. Undo removes every transaction
              from that batch without touching anything else.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="divide-y">
              {recentBatches.map((b) => (
                <li key={b.batchId} className="flex items-center justify-between py-2 text-sm">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{b.label}</span>
                      <Badge
                        variant={b.kind === "DEMO" ? "warning" : "secondary"}
                        className="text-[10px]"
                      >
                        {b.kind === "DEMO" ? "DEMO" : b.kind}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {b.source} · {b.count} transactions
                      {b.skipped > 0 ? ` · ${b.skipped} duplicates skipped` : ""}
                      {b.when ? ` · ${shortDate(b.when)}` : ""}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => undoBatch(b.batchId)}
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Undo
                  </Button>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">How to get your statement file</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            <strong>Chase / Bank of America / Wells Fargo / Capital One / Citi / Amex /
            Discover:</strong>{" "}
            Sign in → Statements &amp; documents → Download as CSV or QFX for the date range you
            want.
          </p>
          <p>
            <strong>Mint:</strong> Transactions → Export all transactions (CSV).
          </p>
          <p>
            <strong>Any other bank:</strong> Any CSV with a date, description and amount column
            will work — the parser auto-detects the column names.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
