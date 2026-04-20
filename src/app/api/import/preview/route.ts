import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { ensureUserBootstrap } from "@/lib/profile";
import { httpError, httpOk } from "@/lib/api";
import { parseFile, type ParsedRow } from "@/lib/import/parsers";
import { guessCategorySlug, guessPaymentMethod } from "@/lib/import/autocategorize";

/**
 * POST /api/import/preview
 *
 * Accepts a multipart form (`file`) OR JSON `{ filename, content }`. Parses
 * CSV / OFX / QFX, auto-categorises, and returns a preview the user can
 * review before committing. NOTHING is written to the database here.
 */
export async function POST(req: NextRequest) {
  const { user } = await ensureUserBootstrap();
  const categories = await prisma.category.findMany({ where: { userId: user.id } });

  let filename = "upload.csv";
  let text = "";

  const contentType = req.headers.get("content-type") || "";
  if (contentType.startsWith("multipart/form-data")) {
    const form = await req.formData();
    const f = form.get("file");
    if (!(f instanceof File)) return httpError("Missing 'file' in form data", 400);
    filename = f.name || filename;
    text = await f.text();
  } else {
    const body = await req.json().catch(() => null);
    if (!body?.content) return httpError("Missing 'content'", 400);
    filename = body.filename || filename;
    text = String(body.content);
  }

  if (text.length > 4_000_000) return httpError("File too large (max 4MB)", 413);
  if (!text.trim()) return httpError("File is empty", 400);

  const parsed = parseFile(text, filename);

  const existingExternal = new Set(
    (
      await prisma.transaction.findMany({
        where: { userId: user.id, externalId: { not: null } },
        select: { externalId: true },
      })
    )
      .map((t) => t.externalId)
      .filter(Boolean) as string[],
  );

  const enriched = parsed.rows.map((row: ParsedRow) => {
    const signal = row.merchant ?? row.note ?? "";
    const categorySlug = guessCategorySlug(signal);
    const category = categorySlug
      ? categories.find((c) => c.slug === categorySlug)
      : undefined;
    const duplicate = row.externalId ? existingExternal.has(row.externalId) : false;
    return {
      externalId: row.externalId,
      date: row.date,
      amount: row.amount,
      type: row.type,
      merchant: row.merchant,
      note: row.note,
      paymentMethod: guessPaymentMethod(row.note ?? row.merchant ?? ""),
      suggestedCategorySlug: categorySlug ?? null,
      suggestedCategoryId: category?.id ?? null,
      duplicate,
    };
  });

  return httpOk({
    source: parsed.source,
    filename,
    details: parsed.details,
    rows: enriched,
    totalRows: enriched.length,
    duplicates: enriched.filter((r) => r.duplicate).length,
    autoCategorised: enriched.filter((r) => r.suggestedCategorySlug).length,
  });
}
