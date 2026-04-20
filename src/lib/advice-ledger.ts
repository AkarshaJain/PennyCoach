import type { MonthlyTotals } from "@/lib/advisor/types";

/**
 * Calendar months with no transactions still need a sensible ledger baseline for
 * the advisor (fixed vs variable spend, anomalies, safe-to-spend). Use the
 * most recent prior month that has any income or expense.
 */
export function pickAdviceLedgerMonth(
  calendarMonth: MonthlyTotals,
  historyOldestToNewest: MonthlyTotals[],
): MonthlyTotals {
  if (calendarMonth.income > 0 || calendarMonth.expense > 0) return calendarMonth;
  for (let i = historyOldestToNewest.length - 1; i >= 0; i--) {
    const h = historyOldestToNewest[i];
    if (h.income > 0 || h.expense > 0) return h;
  }
  return calendarMonth;
}
