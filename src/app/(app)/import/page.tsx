import { prisma } from "@/lib/db";
import { ensureUserBootstrap } from "@/lib/profile";
import { ImportClient } from "./client";

export const dynamic = "force-dynamic";

export default async function ImportPage() {
  const { user, profile } = await ensureUserBootstrap();
  const categories = await prisma.category.findMany({
    where: { userId: user.id },
    orderBy: [{ kind: "asc" }, { sortOrder: "asc" }],
    select: { id: true, slug: true, name: true, kind: true },
  });

  const batches = await prisma.importBatch.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  return (
    <ImportClient
      categories={categories}
      currency={profile.currency}
      locale={profile.locale}
      recentBatches={batches.map((b) => ({
        batchId: b.id,
        kind: b.kind,
        count: b.rowCount,
        skipped: b.skippedCount,
        when: b.createdAt.toISOString(),
        label: b.label,
        source: b.source,
      }))}
    />
  );
}
