import { describe, expect, it } from "vitest";
import {
  formatMoney,
  nonNegativePaise,
  paiseToRupees,
  rupeesToPaise,
  safePct,
  sumPaise,
} from "./money";

describe("money", () => {
  it("converts major to minor units without float drift", () => {
    expect(rupeesToPaise(1234.5)).toBe(123450);
    expect(rupeesToPaise(0.1 + 0.2)).toBe(30);
    expect(rupeesToPaise(0)).toBe(0);
    expect(rupeesToPaise(NaN)).toBe(0);
  });

  it("converts minor to major units", () => {
    expect(paiseToRupees(123450)).toBe(1234.5);
    expect(paiseToRupees(0)).toBe(0);
  });

  it("formats USD correctly in en-US by default", () => {
    const s = formatMoney(123450);
    expect(s).toMatch(/\$/);
    expect(s).toMatch(/1,234\.50/);
  });

  it("supports compact US formatting (K / M / B)", () => {
    expect(formatMoney(12_000 * 100, { compact: true })).toMatch(/K/);
    expect(formatMoney(2_500_000 * 100, { compact: true })).toMatch(/M/);
    expect(formatMoney(1_200_000_000 * 100, { compact: true })).toMatch(/B/);
  });

  it("supports compact Indian formatting when locale is en-IN", () => {
    expect(
      formatMoney(1_25_000 * 100, { compact: true, currency: "INR", locale: "en-IN" }),
    ).toMatch(/L/);
    expect(
      formatMoney(3_00_00_000 * 100, { compact: true, currency: "INR", locale: "en-IN" }),
    ).toMatch(/Cr/);
  });

  it("honours custom currency & locale", () => {
    const s = formatMoney(123450, { currency: "INR", locale: "en-IN" });
    expect(s).toMatch(/₹/);
  });

  it("signs negative amounts", () => {
    expect(formatMoney(-10000)).toMatch(/^-/);
  });

  it("sums paise safely", () => {
    expect(sumPaise([100, 200, null, undefined, 300])).toBe(600);
  });

  it("guards against negatives with nonNegativePaise", () => {
    expect(nonNegativePaise(-500)).toBe(0);
    expect(nonNegativePaise(500.4)).toBe(500);
  });

  it("safePct handles zero divisor", () => {
    expect(safePct(500, 0)).toBe(0);
    expect(safePct(500, 1000)).toBe(50);
  });
});
