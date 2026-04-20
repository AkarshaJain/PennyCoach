import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { ensureUserBootstrap } from "@/lib/profile";
import { formatMoney } from "@/lib/money";
import { format } from "date-fns";

export async function GET(req: NextRequest) {
  const { user } = await ensureUserBootstrap();
  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const txns = await prisma.transaction.findMany({
    where: {
      userId: user.id,
      date: {
        gte: from ? new Date(from) : undefined,
        lte: to ? new Date(to) : undefined,
      },
    },
    include: { category: true },
    orderBy: { date: "desc" },
  });

  const header = [
    "date",
    "type",
    "amount_rupees",
    "amount_formatted",
    "category",
    "merchant",
    "payment_method",
    "note",
  ];
  const lines = [header.join(",")];
  for (const t of txns) {
    const row = [
      format(t.date, "yyyy-MM-dd"),
      t.type,
      (t.amountPaise / 100).toFixed(2),
      formatMoney(t.amountPaise),
      t.category?.name ?? "",
      t.merchant ?? "",
      t.paymentMethod ?? "",
      (t.note ?? "").replace(/[\r\n,]/g, " "),
    ];
    lines.push(row.map(csvEscape).join(","));
  }
  const body = lines.join("\n");
  return new Response(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="penny-coach-transactions-${format(new Date(), "yyyyMMdd")}.csv"`,
    },
  });
}

function csvEscape(val: string): string {
  if (val.includes(",") || val.includes("\"")) {
    return `"${val.replace(/"/g, '""')}"`;
  }
  return val;
}
