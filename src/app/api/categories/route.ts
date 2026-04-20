import { prisma } from "@/lib/db";
import { ensureUserBootstrap } from "@/lib/profile";
import { httpOk } from "@/lib/api";

export async function GET() {
  const { user } = await ensureUserBootstrap();
  const categories = await prisma.category.findMany({
    where: { userId: user.id },
    orderBy: [{ kind: "asc" }, { sortOrder: "asc" }],
  });
  return httpOk(categories);
}
