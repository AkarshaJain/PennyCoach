import { DEFAULT_CATEGORIES } from "./categories";
import { getOrCreateDefaultUser, prisma } from "./db";

/**
 * Ensures the default user has a financial profile and the default category catalog.
 * Idempotent — safe to call on every request.
 */
export async function ensureUserBootstrap() {
  const user = await getOrCreateDefaultUser();
  const profile = await prisma.financialProfile.upsert({
    where: { userId: user.id },
    update: {},
    create: {
      userId: user.id,
      currency: process.env.APP_DEFAULT_CURRENCY ?? "USD",
      locale: process.env.APP_DEFAULT_LOCALE ?? "en-US",
    },
  });

  const existingCats = await prisma.category.findMany({
    where: { userId: user.id },
    select: { slug: true },
  });
  const existingSlugs = new Set(existingCats.map((c) => c.slug));
  const missing = DEFAULT_CATEGORIES.filter((c) => !existingSlugs.has(c.slug));
  if (missing.length > 0) {
    // Use per-row upsert so concurrent boot calls (common during Next's
    // static-gen step) don't crash on the (userId, slug) unique index.
    await Promise.all(
      missing.map((c) =>
        prisma.category.upsert({
          where: { userId_slug: { userId: user.id, slug: c.slug } },
          create: {
            userId: user.id,
            slug: c.slug,
            name: c.name,
            kind: c.kind,
            icon: c.icon,
            color: c.color,
            isDefault: true,
            sortOrder: c.sortOrder,
          },
          update: {},
        }),
      ),
    );
  }

  return { user, profile };
}

export async function getProfile() {
  const { user, profile } = await ensureUserBootstrap();
  return { user, profile };
}
