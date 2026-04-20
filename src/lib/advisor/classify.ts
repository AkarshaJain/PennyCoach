import { FIXED_CATEGORY_SLUGS, INCOME_CATEGORY_SLUGS, SAVINGS_CATEGORY_SLUGS } from "../categories";

export type ExpenseClass = "FIXED" | "VARIABLE" | "SAVINGS" | "INCOME";

/** Classify a category slug into its expense nature. */
export function classifyCategory(slug: string | null | undefined): ExpenseClass {
  if (!slug) return "VARIABLE";
  if (FIXED_CATEGORY_SLUGS.has(slug)) return "FIXED";
  if (SAVINGS_CATEGORY_SLUGS.has(slug)) return "SAVINGS";
  if (INCOME_CATEGORY_SLUGS.has(slug)) return "INCOME";
  return "VARIABLE";
}
