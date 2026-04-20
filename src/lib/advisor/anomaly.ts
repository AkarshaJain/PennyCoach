import { defaultFmt } from "./fmt";
import type { Anomaly, CategoryAverage, MonthlyTotals, Recommendation } from "./types";

/**
 * Spending anomaly detector.
 * A category is flagged when current spend exceeds (avg + k*stdev) or exceeds avg by
 * at least a relative threshold (handles categories with very low variance).
 *
 * Rules are explicitly conservative:
 *   - Need ≥ 2 months of history to flag.
 *   - Require minimum absolute delta of 5000 minor units to avoid noise.
 *   - HIGH severity when delta ≥ 50% above average AND > 30000 minor units,
 *     MEDIUM when ≥ 25% above average AND > 10000 minor units.
 */
export function detectAnomalies(
  current: MonthlyTotals,
  averages: CategoryAverage[],
): Anomaly[] {
  const out: Anomaly[] = [];
  for (const a of averages) {
    if (a.months < 2) continue;
    const spent = current.byCategory[a.slug] ?? 0;
    const delta = spent - a.avg;
    if (delta < 50_00) continue; // noise floor ($50 / ₹50)
    const deltaPct = a.avg > 0 ? delta / a.avg : 1;
    if (deltaPct < 0.25) continue;

    let severity: Anomaly["severity"] = "LOW";
    if (deltaPct >= 0.5 && delta >= 300_00) severity = "HIGH";
    else if (deltaPct >= 0.25 && delta >= 100_00) severity = "MEDIUM";
    else continue;

    out.push({
      slug: a.slug,
      currentPaise: spent,
      avgPaise: a.avg,
      delta,
      deltaPct: Math.round(deltaPct * 1000) / 10,
      severity,
    });
  }
  return out.sort((x, y) => y.delta - x.delta);
}

export function anomalyRecommendations(
  anomalies: Anomaly[],
  fmt: (n: number) => string = defaultFmt,
): Recommendation[] {
  return anomalies.map((a) => ({
    id: `anomaly-${a.slug}`,
    kind: "CAP",
    severity: a.severity,
    title: `Higher than usual spend on ${humanize(a.slug)}`,
    body: `You've spent ${fmt(a.currentPaise)} on ${humanize(a.slug)} this month — about ${a.deltaPct.toFixed(0)}% above your typical ${fmt(a.avgPaise)}.`,
    reasoning: [
      `Average of recent months: ${fmt(a.avgPaise)}`,
      `Current month spend: ${fmt(a.currentPaise)}`,
      `Delta: +${fmt(a.delta)} (${a.deltaPct.toFixed(0)}% over average)`,
      "Consider setting a cap for the rest of the month so this doesn't become a habit.",
    ],
    payload: { categorySlug: a.slug, delta: a.delta },
    action: { label: "Set a budget", href: "/budgets" },
  }));
}

function humanize(slug: string): string {
  return slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
