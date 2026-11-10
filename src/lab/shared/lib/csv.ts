/**
 * A small CSV reader for ad-platform exports. Handles what real exports throw at you: a byte-order
 * mark, quoted fields with commas and newlines, doubled quotes, CRLF line ends, comma / semicolon /
 * tab delimiters (Google Ads' "CSV for Excel" is tab-separated), and report-title lines above the
 * real header row. No dependency; tested with `node --test`.
 */

export type ParsedCsv = {
  rows: string[][];
  delimiter: string;
  /** Problems worth telling the visitor about (unclosed quote, etc.). */
  warnings: string[];
};

const DELIMITERS = [",", "\t", ";"] as const;

/** Guess the delimiter from the first few non-empty lines: the one that splits them most consistently. */
export function detectDelimiter(text: string): string {
  const lines = text.split(/\r?\n/).filter((l) => l.trim()).slice(0, 12);
  let best: string = ",";
  let bestScore = -1;
  for (const d of DELIMITERS) {
    const counts = lines.map((l) => splitOutsideQuotes(l, d));
    const max = Math.max(0, ...counts);
    if (max === 0) continue;
    // Score: how many lines share the most common field count, weighted by that count.
    const freq = new Map<number, number>();
    counts.forEach((c) => freq.set(c, (freq.get(c) ?? 0) + 1));
    const [mode, times] = [...freq.entries()].sort((a, b) => b[1] - a[1] || b[0] - a[0])[0];
    const score = times * mode;
    if (mode > 0 && score > bestScore) {
      bestScore = score;
      best = d;
    }
  }
  return best;
}

function splitOutsideQuotes(line: string, d: string): number {
  let n = 0;
  let quoted = false;
  for (const ch of line) {
    if (ch === '"') quoted = !quoted;
    else if (ch === d && !quoted) n++;
  }
  return n;
}

export function parseCsv(input: string, delimiter?: string): ParsedCsv {
  const text = input.replace(/^﻿/, "");
  const d = delimiter ?? detectDelimiter(text);
  const rows: string[][] = [];
  const warnings: string[] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  let i = 0;
  while (i < text.length) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        quoted = false;
        i++;
        continue;
      }
      field += ch;
      i++;
      continue;
    }
    if (ch === '"' && field === "") {
      quoted = true;
      i++;
      continue;
    }
    if (ch === d) {
      row.push(field);
      field = "";
      i++;
      continue;
    }
    if (ch === "\n" || ch === "\r") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      if (ch === "\r" && text[i + 1] === "\n") i++;
      i++;
      continue;
    }
    field += ch;
    i++;
  }
  if (quoted) warnings.push("The file ends inside a quoted field, so the last row may be incomplete.");
  if (field !== "" || row.length) {
    row.push(field);
    rows.push(row);
  }
  // Drop fully empty lines; trim whitespace around unquoted values.
  const clean = rows.map((r) => r.map((c) => c.trim())).filter((r) => r.some((c) => c !== ""));
  return { rows: clean, delimiter: d, warnings };
}

/**
 * Find the header row: the first row within the first `scan` rows that contains at least
 * `minMatches` of the expected column names (case- and punctuation-insensitive).
 */
export function findHeaderRow(rows: string[][], expected: readonly string[], minMatches = 2, scan = 15): number {
  const want = new Set(expected.map(normaliseHeader));
  for (let i = 0; i < Math.min(scan, rows.length); i++) {
    const hits = rows[i].filter((c) => want.has(normaliseHeader(c))).length;
    if (hits >= minMatches) return i;
  }
  return -1;
}

/** "Cost / conv.", "cost_per_conv" and "Cost per conv" all normalise to "costperconv". */
export function normaliseHeader(h: string): string {
  return h
    .toLowerCase()
    .replace(/\(.*?\)/g, "")
    .replace(/[^a-z0-9]/g, "");
}

/** Rows below the header as objects keyed by the original header text. Footer "Total" rows are kept; callers decide. */
export function toRecords(rows: string[][], headerIndex: number): Record<string, string>[] {
  if (headerIndex < 0 || headerIndex >= rows.length) return [];
  const header = rows[headerIndex];
  return rows.slice(headerIndex + 1).map((r) => {
    const rec: Record<string, string> = {};
    header.forEach((h, k) => {
      rec[h] = r[k] ?? "";
    });
    return rec;
  });
}
