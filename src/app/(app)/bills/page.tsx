import { prisma } from "@/lib/db";
import { ensureUserBootstrap } from "@/lib/profile";
import { BillsClient } from "./client";

export const dynamic = "force-dynamic";

export default async function BillsPage() {
  const { user } = await ensureUserBootstrap();
  const [bills, categories] = await Promise.all([
    prisma.recurringBill.findMany({
      where: { userId: user.id },
      include: { category: true },
      orderBy: [{ active: "desc" }, { nextDueDate: "asc" }],
    }),
    prisma.category.findMany({
      where: { userId: user.id },
      orderBy: [{ kind: "asc" }, { sortOrder: "asc" }],
    }),
  ]);
  return (
    <BillsClient
      bills={bills.map((b) => ({
        id: b.id,
        name: b.name,
        categoryId: b.categoryId,
        categoryName: b.category?.name ?? null,
        amountPaise: b.amountPaise,
        frequency: b.frequency,
        nextDueDate: b.nextDueDate.toISOString(),
        type: b.type,
        autoPay: b.autoPay,
        active: b.active,
        notes: b.notes,
      }))}
      categories={categories.map((c) => ({ id: c.id, name: c.name }))}
    />
  );
}
