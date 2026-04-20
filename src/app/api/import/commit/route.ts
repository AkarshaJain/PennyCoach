import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { ensureUserBootstrap } from "@/lib/profile";
import { httpError, httpOk, parseJson } from "@/lib/api";
import { rupeesToPaise } from "@/lib/money";
import { importCommitSchema } from "@/lib/validation";

/**
 * POST /api/import/commit
 *
 * Creates a new `ImportBatch` and inserts the user-confirmed rows from a
 * preview. Duplicates (by (userId, externalId)) are skipped silently.
 * The batch can be rolled back later via DELETE.
 */
export async function POST(req: NextRequest) {
  const parsed = await parseJson(req, importCommitSchema);
  if (!parsed.ok) return parsed.error;
  const { batchName, sourceLabel, rows } = parsed.data;

  const { user } = await ensureUserBootstrap();
  const categories = await prisma.category.findMany({ where: { userId: user.id } });
  const catBySlug = new Map(categories.map((c) => [c.slug, c.id]));

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

  const kindGuess = /\bofx\b/i.test(sourceLabel)
    ? "OFX"
    : /\bqfx\b/i.test(sourceLabel)
      ? "QFX"
      : /\bqif\b/i.test(sourceLabel)
        ? "QIF"
        : "CSV";

  const batch = await prisma.importBatch.create({
    data: {
      userId: user.id,
      kind: kindGuess,
      label: batchName,
      source: sourceLabel,
      rowCount: 0,
      status: "ACTIVE",
    },
  });

  let inserted = 0;
  let skipped = 0;

  for (const row of rows) {
    if (row.externalId && existingExternal.has(row.externalId)) {
      skipped++;
      continue;
    }
    const categoryId = row.categorySlug ? catBySlug.get(row.categorySlug) ?? null : null;
    const date = new Date(row.date);
    if (Number.isNaN(date.getTime())) {
      skipped++;
      continue;
    }
    try {
      await prisma.transaction.create({
        data: {
          userId: user.id,
          type: row.type,
          amountPaise: rupeesToPaise(row.amount),
          date,
          categoryId,
          merchant: row.merchant ?? null,
          note: row.note ?? batchName,
          paymentMethod: row.paymentMethod ?? null,
          externalId: row.externalId ?? null,
          importBatchId: batch.id,
        },
      });
      if (row.externalId) existingExternal.add(row.externalId);
      inserted++;
    } catch (err) {
      // Likely a race-condition duplicate — treat as skipped.
      skipped++;
    }
  }

  await prisma.importBatch.update({
    where: { id: batch.id },
    data: { rowCount: inserted, skippedCount: skipped },
  });

  return httpOk({
    ok: true,
    batchId: batch.id,
    batchName,
    sourceLabel,
    inserted,
    skipped,
    totalRequested: rows.length,
  });
}

/**
 * DELETE /api/import/commit?batchId=xxx  → undo a specific import.
 */
export async function DELETE(req: NextRequest) {
  const batchId = req.nextUrl.searchParams.get("batchId");
  if (!batchId) return httpError("Missing batchId", 400);
  const { user } = await ensureUserBootstrap();
  const batch = await prisma.importBatch.findFirst({
    where: { id: batchId, userId: user.id },
  });
  if (!batch) return httpError("Batch not found", 404);

  const result = await prisma.transaction.deleteMany({
    where: { userId: user.id, importBatchId: batchId },
  });
  await prisma.importBatch.delete({ where: { id: batchId } });

  return httpOk({ ok: true, deleted: result.count });
}

export async function GET() {
  const { user } = await ensureUserBootstrap();
  const batches = await prisma.importBatch.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return httpOk({ batches });
}
