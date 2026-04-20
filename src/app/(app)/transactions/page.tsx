import { prisma } from "@/lib/db";
import { ensureUserBootstrap } from "@/lib/profile";
import { TransactionsClient } from "./client";
import type { Category } from "@/components/forms/transaction-form";

export const dynamic = "force-dynamic";

export default async function TransactionsPage() {
  const { user } = await ensureUserBootstrap();
  const [txns, categories] = await Promise.all([
    prisma.transaction.findMany({
      where: { userId: user.id },
      include: { category: true },
      orderBy: { date: "desc" },
      take: 200,
    }),
    prisma.category.findMany({
      where: { userId: user.id },
      orderBy: [{ kind: "asc" }, { sortOrder: "asc" }],
    }),
  ]);

  return (
    <TransactionsClient
      initialTxns={txns.map((t) => ({
        id: t.id,
        type: t.type as "EXPENSE" | "INCOME" | "TRANSFER",
        amountPaise: t.amountPaise,
        date: t.date.toISOString(),
        categoryId: t.categoryId,
        categoryName: t.category?.name ?? "Other",
        categoryColor: t.category?.color ?? null,
        note: t.note,
        merchant: t.merchant,
        paymentMethod: t.paymentMethod,
        isRecurring: t.isRecurring,
      }))}
      categories={categories.map<Category>((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        kind: c.kind,
      }))}
    />
  );
}
