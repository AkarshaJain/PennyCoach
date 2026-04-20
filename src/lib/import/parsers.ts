/**
 * Free bank-statement parsers.
 *
 * Supports:
 *   - CSV (generic + Chase / Bank of America / Capital One / Amex / Wells Fargo /
 *     Discover / Citi / Mint export). Column names are auto-detected.
 *   - OFX / QFX (SGML-like bank statement format — most US banks offer a
 *     free "Download as QFX" option).
 *
 * Everything is deterministic & runs in Node without network access. No paid
 * aggregator APIs. Integrating with your bank means: download the file from
 * the bank's website and upload it here.
 */

export interface ParsedRow {
  /** Unique id from the bank if available (FITID in OFX, "Transaction ID" in some CSVs). */
  externalId: string | null;
  date: string; // ISO yyyy-mm-dd
  /** Positive number in major units (dollars). Sign is captured in `type`. */
  amount: number;
  type: "EXPENSE" | "INCOME";
  merchant: string | null;
  note: string | null;
}

export interface ParseResult {
  rows: ParsedRow[];
  /** Friendly name of the detected source, shown to the user in the preview. */
  source: string;
  /** Human-readable notes about the parse (e.g. which columns were used). */
  details: string[];
}

// ---------- CSV ----------

/** Parse one CSV line handling RFC 4180 quoting. */
function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cur += ch;
      }
    } else {
      if (ch === ",") {
        out.push(cur);
        cur = "";
      } else if (ch === '"') {
        inQuotes = true;
      } else {
        cur += ch;
      }
    }
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

/** Normalise a header name: "Transaction Date" -> "transactiondate". */
function normaliseHeader(h: string): string {
  return h.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/** Try to parse a date string from bank CSVs — accepts many US formats. */
function parseDate(raw: string): string | null {
  const s = raw.trim();
  if (!s) return null;
  // ISO yyyy-mm-dd
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  // mm/dd/yyyy (US)
  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (m) {
    const mm = m[1].padStart(2, "0");
    const dd = m[2].padStart(2, "0");
    const yyyy = m[3].length === 2 ? `20${m[3]}` : m[3];
    return `${yyyy}-${mm}-${dd}`;
  }
  // mm-dd-yyyy
  m = s.match(/^(\d{1,2})-(\d{1,2})-(\d{2,4})$/);
  if (m) {
    const mm = m[1].padStart(2, "0");
    const dd = m[2].padStart(2, "0");
    const yyyy = m[3].length === 2 ? `20${m[3]}` : m[3];
    return `${yyyy}-${mm}-${dd}`;
  }
  // yyyymmdd
  m = s.match(/^(\d{4})(\d{2})(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  // Fallback — let Date.parse try
  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) {
    return d.toISOString().slice(0, 10);
  }
  return null;
}

function parseAmount(raw: string): number | null {
  if (raw === "" || raw == null) return null;
  // Strip currency symbols, commas, spaces. Handle parentheses for negatives.
  let s = raw.trim();
  let negative = false;
  if (/^\(.*\)$/.test(s)) {
    negative = true;
    s = s.slice(1, -1);
  }
  s = s.replace(/[$£€₹,\s]/g, "");
  if (!s) return null;
  const n = Number(s);
  if (!Number.isFinite(n)) return null;
  return negative ? -n : n;
}

type HeaderMap = {
  date: number;
  amount?: number;
  debit?: number;
  credit?: number;
  description: number;
  type?: number;
  externalId?: number;
};

function pickHeaders(headers: string[]): HeaderMap | null {
  const norm = headers.map(normaliseHeader);
  const idxOf = (needles: string[]): number => {
    for (const needle of needles) {
      const i = norm.indexOf(needle);
      if (i >= 0) return i;
    }
    return -1;
  };
  const date = idxOf([
    "date",
    "transactiondate",
    "postingdate",
    "postdate",
    "posteddate",
    "postingdateet",
  ]);
  if (date < 0) return null;
  const description = idxOf([
    "description",
    "payee",
    "merchant",
    "name",
    "memo",
    "details",
    "transactiondescription",
    "originaldescription",
  ]);
  if (description < 0) return null;
  const amount = idxOf(["amount", "transactionamount", "amountusd", "amt"]);
  const debit = idxOf(["debit", "withdrawal", "withdrawals", "withdrawalamt", "amountdebit"]);
  const credit = idxOf(["credit", "deposit", "deposits", "depositamt", "amountcredit"]);
  const type = idxOf(["type", "transactiontype"]);
  const externalId = idxOf(["transactionid", "referencenumber", "reference", "fitid", "id"]);
  const map: HeaderMap = { date, description };
  if (amount >= 0) map.amount = amount;
  if (debit >= 0) map.debit = debit;
  if (credit >= 0) map.credit = credit;
  if (type >= 0) map.type = type;
  if (externalId >= 0) map.externalId = externalId;
  if (map.amount === undefined && map.debit === undefined && map.credit === undefined) {
    return null;
  }
  return map;
}

function detectCsvSource(headers: string[]): string {
  const set = new Set(headers.map(normaliseHeader));
  if (set.has("transactiondate") && set.has("postdate") && set.has("category"))
    return "Chase CSV";
  if (set.has("postingdate") && set.has("payee")) return "Bank of America CSV";
  if (set.has("transactiondate") && set.has("postedate")) return "Capital One CSV";
  if (set.has("description") && set.has("amount") && set.has("date") && set.has("category"))
    return "Mint export";
  if (set.has("transdate") || set.has("trandate")) return "American Express CSV";
  return "Generic CSV";
}

export function parseCsv(text: string): ParseResult {
  // Handle BOM + Windows line endings.
  const clean = text.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n").trim();
  const lines = clean.split("\n").filter((l) => l.length > 0);
  if (!lines.length) return { rows: [], source: "Empty CSV", details: ["No rows"] };

  // Some banks (Discover, BoA) put preamble rows before the header — scan for the
  // first line that looks like a proper header (contains "date" + description-like keyword).
  let headerIdx = 0;
  for (let i = 0; i < Math.min(10, lines.length); i++) {
    const cells = parseCsvLine(lines[i]).map(normaliseHeader);
    if (
      cells.some((c) => c.includes("date")) &&
      cells.some((c) => ["description", "payee", "merchant", "memo", "details"].includes(c))
    ) {
      headerIdx = i;
      break;
    }
  }
  const headers = parseCsvLine(lines[headerIdx]);
  const map = pickHeaders(headers);
  if (!map) {
    return {
      rows: [],
      source: "Unrecognised CSV",
      details: [
        `Could not detect Date + Description/Amount columns.`,
        `Headers seen: ${headers.join(", ")}`,
      ],
    };
  }
  const source = detectCsvSource(headers);
  const rows: ParsedRow[] = [];
  for (let i = headerIdx + 1; i < lines.length; i++) {
    const cells = parseCsvLine(lines[i]);
    if (cells.every((c) => !c)) continue;
    const dateRaw = cells[map.date] ?? "";
    const date = parseDate(dateRaw);
    if (!date) continue;
    const description = cells[map.description] ?? "";
    let amount: number | null = null;
    if (map.amount !== undefined) {
      amount = parseAmount(cells[map.amount] ?? "");
    } else {
      const debit = parseAmount(cells[map.debit ?? -1] ?? "");
      const credit = parseAmount(cells[map.credit ?? -1] ?? "");
      if (debit != null && debit !== 0) amount = -Math.abs(debit);
      else if (credit != null && credit !== 0) amount = Math.abs(credit);
    }
    if (amount == null || amount === 0) continue;
    // Chase/Amex convention: negative amount = expense, positive = credit/refund.
    const typeCol = map.type !== undefined ? (cells[map.type] ?? "").toLowerCase() : "";
    let type: "EXPENSE" | "INCOME";
    if (typeCol.includes("debit") || typeCol.includes("sale") || typeCol.includes("purchase")) {
      type = "EXPENSE";
    } else if (typeCol.includes("credit") || typeCol.includes("deposit") || typeCol.includes("payment")) {
      type = "INCOME";
    } else {
      type = amount < 0 ? "EXPENSE" : "INCOME";
    }
    const externalId = map.externalId !== undefined ? (cells[map.externalId] || null) : null;
    rows.push({
      externalId,
      date,
      amount: Math.abs(amount),
      type,
      merchant: cleanMerchant(description),
      note: description || null,
    });
  }
  return {
    rows,
    source,
    details: [
      `Detected ${source} with ${rows.length} rows.`,
      `Used columns: Date="${headers[map.date]}", Description="${headers[map.description]}"${
        map.amount !== undefined
          ? `, Amount="${headers[map.amount]}"`
          : `, Debit="${headers[map.debit ?? 0]}", Credit="${headers[map.credit ?? 0]}"`
      }.`,
    ],
  };
}

/** Strip the usual bank noise from a description to get a readable merchant. */
function cleanMerchant(description: string): string | null {
  if (!description) return null;
  return description
    .replace(/\s+#\d+/g, "")
    .replace(/\s+x{2,}\d+/gi, "")
    .replace(/\s+\d{6,}\b/g, "")
    .replace(/\s+POS\b/gi, "")
    .replace(/\s+DEBIT\b/gi, "")
    .replace(/\s+CREDIT\b/gi, "")
    .replace(/\s+ACH\b/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim()
    .slice(0, 120);
}

// ---------- OFX / QFX ----------

/**
 * OFX/QFX is SGML-ish. Real banks emit a mix of quoted and unquoted tags. We
 * extract STMTTRN blocks with regex — robust enough for every US bank's export
 * because the tag names are standardised.
 */
export function parseOfx(text: string): ParseResult {
  const details: string[] = [];
  const transactions: ParsedRow[] = [];
  const trnBlocks = text.match(/<STMTTRN>[\s\S]*?<\/STMTTRN>/gi) || [];
  if (!trnBlocks.length) {
    return {
      rows: [],
      source: "OFX (no transactions)",
      details: ["No <STMTTRN> blocks found. Make sure you exported a QFX/OFX statement."],
    };
  }
  for (const block of trnBlocks) {
    const get = (tag: string): string | null => {
      const m = block.match(new RegExp(`<${tag}>([^<\\r\\n]+)`, "i"));
      return m ? m[1].trim() : null;
    };
    const amountRaw = get("TRNAMT");
    const dateRaw = get("DTPOSTED") ?? get("DTUSER");
    const name = get("NAME") ?? get("PAYEE") ?? "";
    const memo = get("MEMO") ?? "";
    const fitid = get("FITID");
    const trntype = (get("TRNTYPE") ?? "").toUpperCase();
    if (!amountRaw || !dateRaw) continue;
    const amount = parseAmount(amountRaw);
    const date = parseDate(dateRaw);
    if (amount == null || amount === 0 || !date) continue;
    const type: "EXPENSE" | "INCOME" =
      amount < 0 || trntype === "DEBIT" || trntype === "POS" || trntype === "ATM"
        ? "EXPENSE"
        : "INCOME";
    const merchantSource = name || memo;
    transactions.push({
      externalId: fitid,
      date,
      amount: Math.abs(amount),
      type,
      merchant: cleanMerchant(merchantSource),
      note: [name, memo].filter(Boolean).join(" — ") || null,
    });
  }
  details.push(`Parsed ${transactions.length} <STMTTRN> blocks.`);
  return { rows: transactions, source: "OFX/QFX statement", details };
}

// ---------- QIF ----------

/**
 * QIF (Quicken Interchange Format). Plain-text, record-based.
 *
 * One record per transaction. Fields are prefixed with a single letter:
 *   D  date (MM/DD/YYYY or MM/DD'YY)
 *   T  amount (negative = expense)
 *   P  payee / description
 *   M  memo
 *   N  check number / reference
 *   L  category
 *   ^  end of record
 *
 * We ignore the header "!Type:..." line (Bank / CCard / Cash / Invst). All
 * types use the same transaction field layout.
 */
export function parseQif(text: string): ParseResult {
  const clean = text.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");
  const lines = clean.split("\n");
  const rows: ParsedRow[] = [];
  const details: string[] = [];
  let headerType: string | null = null;
  let cur: Partial<{
    D: string;
    T: string;
    P: string;
    M: string;
    N: string;
    L: string;
  }> = {};

  const flush = () => {
    if (!cur.D && !cur.T) {
      cur = {};
      return;
    }
    const amount = cur.T ? parseAmount(cur.T) : null;
    const date = cur.D ? parseDate(cur.D) : null;
    if (amount == null || amount === 0 || !date) {
      cur = {};
      return;
    }
    const type: "EXPENSE" | "INCOME" = amount < 0 ? "EXPENSE" : "INCOME";
    const payee = cur.P ?? "";
    const memo = cur.M ?? "";
    const merchantSource = payee || memo;
    rows.push({
      externalId: cur.N ? `QIF-${cur.N}-${date}` : null,
      date,
      amount: Math.abs(amount),
      type,
      merchant: cleanMerchant(merchantSource),
      note: [payee, memo].filter(Boolean).join(" — ") || null,
    });
    cur = {};
  };

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith("!Type:")) {
      headerType = line.slice(6).trim();
      continue;
    }
    if (line === "^") {
      flush();
      continue;
    }
    const code = line[0] as "D" | "T" | "P" | "M" | "N" | "L" | string;
    const rest = line.slice(1);
    if (code === "D") cur.D = rest.replace(/'/g, "/20"); // '22 -> /2022
    else if (code === "T" || code === "U") cur.T = rest;
    else if (code === "P") cur.P = rest;
    else if (code === "M") cur.M = rest;
    else if (code === "N") cur.N = rest;
    else if (code === "L") cur.L = rest;
    // Other codes (C, S, E, $, A, etc.) are ignored.
  }
  // Last record may not have a trailing ^.
  flush();

  details.push(
    `Parsed QIF${headerType ? ` (!Type:${headerType})` : ""} — ${rows.length} transactions.`,
  );
  return { rows, source: "QIF (Quicken)", details };
}

/** Auto-select the right parser based on file contents. */
export function parseFile(text: string, filename: string): ParseResult {
  const lower = filename.toLowerCase();
  const looksLikeQif =
    lower.endsWith(".qif") ||
    /^!Type:(Bank|CCard|Cash|Invst|Oth A|Oth L)/im.test(text.slice(0, 200));
  if (looksLikeQif) return parseQif(text);
  const isOfx = lower.endsWith(".ofx") || lower.endsWith(".qfx") || text.includes("<STMTTRN>");
  return isOfx ? parseOfx(text) : parseCsv(text);
}
