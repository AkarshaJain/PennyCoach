import type { CategoryAverage } from "./types";

/**
 * Budget suggestion engine.
 *
 * Idea: use trailing averages with a small buffer. For categories with high
 * variance, add a larger buffer so the budget isn't blown on a volatile month.
 *
 * suggestion = round( avg * (1 + buffer) )
 *   where buffer = clamp( stdev/avg, 0.05, 0.35 )
 *
 * Returns map of categorySlug -> suggested paise.
 */
export function suggestBudgets(
  averages: CategoryAverage[],
  opts: {
    excludeSlugs?: string[];
    // hard-cap per slug (paise)
    capBySlug?: Record<string, number>;
  } = {},
): Record<string, number> {
  const { excludeSlugs = [], capBySlug = {} } = opts;
  const out: Record<string, number> = {};
  for (const a of averages) {
    if (excludeSlugs.includes(a.slug)) continue;
    if (a.avg <= 0) continue;
    const variance = a.avg > 0 ? a.stdev / a.avg : 0;
    const buffer = Math.min(0.35, Math.max(0.05, variance));
    let suggested = Math.round(a.avg * (1 + buffer));
    if (capBySlug[a.slug]) suggested = Math.min(suggested, capBySlug[a.slug]);
    // round to nearest 50 minor units (e.g. $0.50) for tidy budgets
    suggested = Math.round(suggested / 5000) * 5000;
    out[a.slug] = Math.max(suggested, 10000); // 100 minor units (e.g. $1) minimum
  }
  return out;
}
