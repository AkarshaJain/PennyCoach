import {
  addDays,
  addMonths,
  differenceInCalendarDays,
  differenceInCalendarMonths,
  endOfMonth,
  format,
  isAfter,
  isBefore,
  isSameMonth,
  startOfMonth,
  subMonths,
} from "date-fns";

/** Returns the canonical UTC midnight on the first day of the month that `date` falls in. */
export function periodMonth(date: Date | string): Date {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1, 0, 0, 0, 0));
}

export function monthLabel(date: Date | string, fmt = "MMM yyyy"): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return format(d, fmt);
}

/**
 * Format a date in the app's short date style (e.g. "Apr 19, 2026"). Works
 * for any locale since date-fns format is locale-agnostic at this level of
 * granularity; specific locales can pass a custom format token.
 */
export function shortDate(date: Date | string, fmt = "MMM d, yyyy"): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return format(d, fmt);
}

/** @deprecated Use shortDate. Kept as an alias to avoid breaking callers. */
export const indiaDate = shortDate;

/** Return an array of the N most recent periodMonths ending at `endMonth` (default now). */
export function lastNMonths(n: number, endMonth: Date = new Date()): Date[] {
  const end = periodMonth(endMonth);
  const months: Date[] = [];
  for (let i = n - 1; i >= 0; i--) {
    months.push(periodMonth(subMonths(end, i)));
  }
  return months;
}

export function daysUntil(date: Date | string): number {
  const d = typeof date === "string" ? new Date(date) : date;
  return differenceInCalendarDays(d, new Date());
}

export function monthsBetween(from: Date | string, to: Date | string): number {
  const a = typeof from === "string" ? new Date(from) : from;
  const b = typeof to === "string" ? new Date(to) : to;
  return Math.max(0, differenceInCalendarMonths(b, a));
}

export {
  addDays,
  addMonths,
  endOfMonth,
  format,
  isAfter,
  isBefore,
  isSameMonth,
  startOfMonth,
  subMonths,
};

/** Advance a next-due date to the next occurrence after today, based on frequency. */
export function nextDueDate(current: Date, frequency: string): Date {
  const today = new Date();
  let next = new Date(current);
  while (isBefore(next, today)) {
    if (frequency === "WEEKLY") next = addDays(next, 7);
    else if (frequency === "QUARTERLY") next = addMonths(next, 3);
    else if (frequency === "YEARLY") next = addMonths(next, 12);
    else next = addMonths(next, 1);
  }
  return next;
}
