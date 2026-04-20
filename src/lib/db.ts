import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

/**
 * Returns the single-profile user for this instance. The app is designed as a
 * single-user personal tracker; we still use a User row so the data model is
 * multi-tenant ready without any code changes if auth is added later.
 */
export async function getOrCreateDefaultUser() {
  const existing = await prisma.user.findFirst({ orderBy: { createdAt: "asc" } });
  if (existing) return existing;
  return prisma.user.create({
    data: { name: "You", email: null },
  });
}
