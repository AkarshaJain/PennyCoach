import { formatMoney } from "../money";

/**
 * Build a deterministic money formatter bound to a user's currency/locale.
 * Injected into advisor sub-modules so their reasoning strings use the user's
 * currency symbol ($, ₹, £, €…) instead of being hard-coded.
 */
export interface FmtCtx {
  currency: string;
  locale: string;
}

export function makeFmt(ctx: FmtCtx): (minor: number) => string {
  return (minor: number) =>
    formatMoney(minor, {
      currency: ctx.currency,
      locale: ctx.locale,
      withDecimals: false,
    });
}

/** Fallback formatter used by tests and one-off calls. */
export const defaultFmt = makeFmt({ currency: "USD", locale: "en-US" });
