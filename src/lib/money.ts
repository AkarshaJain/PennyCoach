/**
 * Money is stored and computed in **minor units** (integer cents / paise) to avoid
 * floating point rounding errors. For USD: 1 dollar = 100 cents. The variable names
 * still use "paise" for backwards compatibility with the data model — the unit is
 * simply "1/100 of the base currency".
 *
 * All conversions go through these helpers so arithmetic stays deterministic.
 */

export const MINOR_PER_MAJOR = 100;

/** Convert a major-unit number (e.g. 1234.50 dollars) to integer minor units (123450 cents). */
export function rupeesToPaise(amount: number): number {
  if (!Number.isFinite(amount)) return 0;
  return Math.round(amount * MINOR_PER_MAJOR);
}

/** Convert integer minor units to major units as a number (may have decimals). */
export function paiseToRupees(minor: number): number {
  return (minor || 0) / MINOR_PER_MAJOR;
}

export interface FormatMoneyOptions {
  locale?: string;
  currency?: string;
  /** Show decimals even when .00. Default true for amounts, false for compact. */
  withDecimals?: boolean;
  /** Use short form like $1.2K, $12M. */
  compact?: boolean;
  /** Show +/- sign prefix. */
  signed?: boolean;
}

/** Default currency & locale used by the UI when a profile isn't available yet. */
export const DEFAULT_CURRENCY =
  (typeof process !== "undefined" && process.env.APP_DEFAULT_CURRENCY) || "USD";
export const DEFAULT_LOCALE =
  (typeof process !== "undefined" && process.env.APP_DEFAULT_LOCALE) || "en-US";

/** Format minor units as a localized currency string (default en-US / USD). */
export function formatMoney(minor: number, opts: FormatMoneyOptions = {}): string {
  const {
    locale = DEFAULT_LOCALE,
    currency = DEFAULT_CURRENCY,
    withDecimals = true,
    compact = false,
    signed = false,
  } = opts;

  const major = paiseToRupees(Math.abs(minor || 0));
  const sign = (minor || 0) < 0 ? "-" : signed ? "+" : "";

  if (compact) {
    return sign + compactShort(major, currency, locale);
  }

  const formatted = new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: withDecimals ? 2 : 0,
    maximumFractionDigits: withDecimals ? 2 : 0,
  }).format(major);

  return sign + formatted;
}

/**
 * Locale-aware compact format:
 *   - en-IN / INR → Indian (L / Cr)
 *   - everything else → Western (K / M / B)
 */
function compactShort(major: number, currency: string, locale: string): string {
  const symbol = currencySymbol(currency, locale);
  const isIndian = locale.startsWith("en-IN") || currency === "INR";
  if (isIndian) {
    if (major >= 1_00_00_000) return `${symbol}${trimZero(major / 1_00_00_000)}Cr`;
    if (major >= 1_00_000) return `${symbol}${trimZero(major / 1_00_000)}L`;
    if (major >= 1_000) return `${symbol}${trimZero(major / 1_000)}K`;
    return `${symbol}${trimZero(major)}`;
  }
  if (major >= 1_000_000_000) return `${symbol}${trimZero(major / 1_000_000_000)}B`;
  if (major >= 1_000_000) return `${symbol}${trimZero(major / 1_000_000)}M`;
  if (major >= 1_000) return `${symbol}${trimZero(major / 1_000)}K`;
  return `${symbol}${trimZero(major)}`;
}

function trimZero(n: number): string {
  return n.toFixed(2).replace(/\.00$/, "").replace(/(\.\d)0$/, "$1");
}

function currencySymbol(currency: string, locale: string): string {
  try {
    const parts = new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
    }).formatToParts(0);
    const sym = parts.find((p) => p.type === "currency");
    return sym?.value ?? currency + " ";
  } catch {
    return currency + " ";
  }
}

/** Safely sum an array of minor-unit values. */
export function sumPaise(values: Array<number | null | undefined>): number {
  let total = 0;
  for (const v of values) total += v || 0;
  return total;
}

/** Clamp to non-negative integer minor units. */
export function nonNegativePaise(minor: number): number {
  return Math.max(0, Math.round(minor || 0));
}

/** Percentage with a safe divisor. Returns 0 if divisor is 0. */
export function safePct(numerator: number, denominator: number): number {
  if (!denominator) return 0;
  return Math.round((numerator / denominator) * 1000) / 10; // 1 decimal
}
