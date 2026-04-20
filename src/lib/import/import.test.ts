import { describe, expect, it } from "vitest";
import { parseCsv, parseOfx, parseQif, parseFile } from "./parsers";
import { guessCategorySlug, guessPaymentMethod } from "./autocategorize";

describe("CSV parser", () => {
  it("parses a Chase-style CSV with signed amount column", () => {
    const csv = [
      "Transaction Date,Post Date,Description,Category,Type,Amount",
      "04/01/2026,04/02/2026,TRADER JOE'S #123,Groceries,Sale,-42.17",
      "04/02/2026,04/03/2026,STARBUCKS STORE 4821,Food & Drink,Sale,-5.45",
      "04/03/2026,04/03/2026,PAYROLL ACME INC,Payment,Payment,2750.00",
    ].join("\n");
    const out = parseCsv(csv);
    expect(out.rows).toHaveLength(3);
    expect(out.rows[0].date).toBe("2026-04-01");
    expect(out.rows[0].amount).toBe(42.17);
    expect(out.rows[0].type).toBe("EXPENSE");
    expect(out.rows[2].type).toBe("INCOME");
    expect(out.rows[0].merchant).toMatch(/TRADER JOE/i);
  });

  it("parses a BoA-style CSV with separate debit/credit columns", () => {
    const csv = [
      "Posting Date,Description,Amount",
      "4/01/2026,AMAZON.COM MKTPLACE,-18.99",
      "4/02/2026,VENMO CASHOUT,+150.00",
    ].join("\n");
    const out = parseCsv(csv);
    expect(out.rows).toHaveLength(2);
    expect(out.rows[0].amount).toBe(18.99);
    expect(out.rows[0].type).toBe("EXPENSE");
    expect(out.rows[1].type).toBe("INCOME");
  });

  it("parses parentheses-style negatives and currency symbols", () => {
    const csv = [
      "Date,Description,Amount",
      "2026-04-10,WHOLE FOODS MKT,($78.23)",
      "2026-04-11,REFUND TARGET,$12.50",
    ].join("\n");
    const out = parseCsv(csv);
    expect(out.rows[0].amount).toBeCloseTo(78.23);
    expect(out.rows[0].type).toBe("EXPENSE");
    expect(out.rows[1].type).toBe("INCOME");
  });

  it("skips malformed rows but keeps going", () => {
    const csv = [
      "Date,Description,Amount",
      ",NO DATE ROW,10.00",
      "2026-04-15,SHELL OIL,-42.00",
      "badrow",
    ].join("\n");
    const out = parseCsv(csv);
    expect(out.rows).toHaveLength(1);
    expect(out.rows[0].merchant).toMatch(/SHELL/i);
  });

  it("reports when it cannot find required columns", () => {
    const csv = ["Col1,Col2,Col3", "1,2,3"].join("\n");
    const out = parseCsv(csv);
    expect(out.rows).toHaveLength(0);
    expect(out.source).toMatch(/Unrecognised/);
  });
});

describe("OFX parser", () => {
  it("parses STMTTRN blocks with FITID dedupe id", () => {
    const ofx = `
OFXHEADER:100
<OFX>
  <BANKMSGSRSV1>
    <STMTRS>
      <BANKTRANLIST>
        <STMTTRN>
          <TRNTYPE>DEBIT
          <DTPOSTED>20260401120000
          <TRNAMT>-42.17
          <FITID>ABC1234
          <NAME>TRADER JOE'S
          <MEMO>Groceries
        </STMTTRN>
        <STMTTRN>
          <TRNTYPE>CREDIT
          <DTPOSTED>20260403
          <TRNAMT>2750.00
          <FITID>ABC1235
          <NAME>PAYROLL ACME INC
        </STMTTRN>
      </BANKTRANLIST>
    </STMTRS>
  </BANKMSGSRSV1>
</OFX>`;
    const out = parseOfx(ofx);
    expect(out.rows).toHaveLength(2);
    expect(out.rows[0].externalId).toBe("ABC1234");
    expect(out.rows[0].type).toBe("EXPENSE");
    expect(out.rows[0].date).toBe("2026-04-01");
    expect(out.rows[1].type).toBe("INCOME");
    expect(out.rows[1].amount).toBe(2750);
  });
});

describe("QIF parser", () => {
  it("parses a standard Quicken bank export", () => {
    const qif = [
      "!Type:Bank",
      "D04/01/2026",
      "T-42.17",
      "PTRADER JOE'S #123",
      "MGroceries",
      "N1001",
      "LFood:Groceries",
      "^",
      "D04/03/2026",
      "T2750.00",
      "PPAYROLL ACME INC",
      "LIncome:Salary",
      "^",
    ].join("\n");
    const out = parseQif(qif);
    expect(out.rows).toHaveLength(2);
    expect(out.rows[0].date).toBe("2026-04-01");
    expect(out.rows[0].amount).toBeCloseTo(42.17);
    expect(out.rows[0].type).toBe("EXPENSE");
    expect(out.rows[0].externalId).toContain("1001");
    expect(out.rows[1].type).toBe("INCOME");
    expect(out.rows[1].amount).toBe(2750);
  });

  it("handles short-year D-codes like 04/01'26", () => {
    const qif = ["!Type:CCard", "D04/01'26", "T-9.99", "PNETFLIX", "^"].join("\n");
    const out = parseQif(qif);
    expect(out.rows).toHaveLength(1);
    expect(out.rows[0].date).toBe("2026-04-01");
    expect(out.rows[0].type).toBe("EXPENSE");
  });
});

describe("parseFile auto-detection", () => {
  it("detects OFX when tags are present", () => {
    const out = parseFile("<STMTTRN><TRNAMT>-5.00<DTPOSTED>20260401<NAME>X</STMTTRN>", "mystatement.bin");
    expect(out.source).toMatch(/OFX/);
  });

  it("detects QIF from file extension", () => {
    const qif = "!Type:Bank\nD04/01/2026\nT-1.00\nPX\n^";
    const out = parseFile(qif, "export.qif");
    expect(out.source).toMatch(/QIF/);
    expect(out.rows).toHaveLength(1);
  });

  it("detects QIF from !Type header even without extension", () => {
    const qif = "!Type:Bank\nD04/01/2026\nT-1.00\nPX\n^";
    const out = parseFile(qif, "mystuff.txt");
    expect(out.source).toMatch(/QIF/);
  });

  it("falls back to CSV otherwise", () => {
    const csv = "Date,Description,Amount\n2026-04-01,X,-1.00";
    const out = parseFile(csv, "export.csv");
    expect(out.source).toMatch(/CSV/);
  });
});

describe("autocategorize", () => {
  it("guesses common US merchants", () => {
    expect(guessCategorySlug("TRADER JOE'S #123")).toBe("groceries");
    expect(guessCategorySlug("STARBUCKS 4821")).toBe("coffee");
    expect(guessCategorySlug("DOORDASH * CHIPOTLE")).toBe("takeout");
    expect(guessCategorySlug("UBER   TRIP")).toBe("rideshare");
    expect(guessCategorySlug("UBER EATS 321")).toBe("takeout");
    expect(guessCategorySlug("SHELL OIL 4456")).toBe("fuel");
    expect(guessCategorySlug("AMAZON.COM AMZN")).toBe("shopping");
    expect(guessCategorySlug("Netflix.com")).toBe("subscriptions");
    expect(guessCategorySlug("VANGUARD BUY VTI")).toBe("investments");
    expect(guessCategorySlug("GEICO PREMIUM")).toBe("insurance");
  });

  it("returns null for unknown merchants", () => {
    expect(guessCategorySlug("RANDOM MERCHANT NAME XYZ")).toBeNull();
    expect(guessCategorySlug("")).toBeNull();
    expect(guessCategorySlug(null)).toBeNull();
  });

  it("guesses payment method heuristically", () => {
    expect(guessPaymentMethod("ACH DIRECT DEPOSIT")).toBe("ACH");
    expect(guessPaymentMethod("CHECK #1023")).toBe("CHECK");
    expect(guessPaymentMethod("AUTOPAY MONTHLY")).toBe("AUTOPAY");
    expect(guessPaymentMethod("ZELLE to Dana")).toBe("ZELLE");
    expect(guessPaymentMethod("VENMO Cashout")).toBe("VENMO");
    expect(guessPaymentMethod("PAYPAL *ETSY")).toBe("PAYPAL");
    expect(guessPaymentMethod(null)).toBeNull();
  });

  it("classifies US-specific accounts correctly", () => {
    expect(guessCategorySlug("BLUE CROSS BLUE SHIELD")).toBe("health-insurance");
    expect(guessCategorySlug("IRS USATAXPYMT")).toBe("taxes");
    expect(guessCategorySlug("CHASE CARD ONLINE PAYMENT THANK YOU")).toBe(
      "credit-card-payment",
    );
    expect(guessCategorySlug("401K CONTRIBUTION FIDELITY")).toBe("retirement-401k");
    expect(guessCategorySlug("ROTH IRA CONTRIB VANGUARD")).toBe("retirement-ira");
  });
});
