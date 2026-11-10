/**
 * Arithmetic that never lies. Every metric in the Lab goes through these helpers, so a zero
 * denominator, a missing value or a NaN becomes `null` ("no value"), which the interface shows
 * as a dash, instead of Infinity, NaN or a silently wrong 0.
 *
 * Pure functions, no imports: tested directly with `node --test`.
 */

export type Maybe = number | null | undefined;

/** A real, finite number (not NaN, not ±Infinity, not null). */
export function isNum(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

/** n ÷ d, or null when either side is missing or d is 0. */
export function ratio(n: Maybe, d: Maybe): number | null {
  if (!isNum(n) || !isNum(d) || d === 0) return null;
  return n / d;
}

/** Relative change from `previous` to `current` ((c − p) ÷ p), or null when p is 0 or missing. */
export function change(current: Maybe, previous: Maybe): number | null {
  if (!isNum(current) || !isNum(previous) || previous === 0) return null;
  return (current - previous) / Math.abs(previous);
}

/** Sum of the real numbers in a list; missing values are skipped. An empty list sums to 0. */
export function sum(values: readonly Maybe[]): number {
  let total = 0;
  for (const v of values) if (isNum(v)) total += v;
  return total;
}

/** Arithmetic mean of the real numbers, or null if there are none. */
export function mean(values: readonly Maybe[]): number | null {
  const xs = values.filter(isNum);
  return xs.length ? sum(xs) / xs.length : null;
}

/** Sample standard deviation (n − 1), or null with fewer than two values. */
export function stdev(values: readonly Maybe[]): number | null {
  const xs = values.filter(isNum);
  if (xs.length < 2) return null;
  const m = sum(xs) / xs.length;
  const variance = xs.reduce((acc, x) => acc + (x - m) ** 2, 0) / (xs.length - 1);
  return Math.sqrt(variance);
}

/** How many standard deviations `value` sits from the mean of `reference`; null if undefined. */
export function zScore(value: Maybe, reference: readonly Maybe[]): number | null {
  const m = mean(reference);
  const sd = stdev(reference);
  if (!isNum(value) || m === null || sd === null || sd === 0) return null;
  return (value - m) / sd;
}

export function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

/** Round half away from zero to `dp` decimal places. */
export function round(v: number, dp = 0): number {
  const f = 10 ** dp;
  return (Math.sign(v) * Math.round(Math.abs(v) * f)) / f;
}

/** Share of each value in the total (0–1). All-zero or empty input gives nulls, not NaN. */
export function shares(values: readonly number[]): (number | null)[] {
  const total = sum(values);
  return values.map((v) => ratio(v, total));
}

/** Parse a number from messy text: "1,234.50", "$1.2k", "12%", "(45)", "—". Null if not a number. */
export function parseNumber(raw: unknown): number | null {
  if (isNum(raw)) return raw;
  if (typeof raw !== "string") return null;
  let s = raw.trim();
  if (!s || /^(-|–|—|n\/?a|null|none|--)$/i.test(s)) return null;
  let negative = false;
  if (/^\(.*\)$/.test(s)) {
    negative = true;
    s = s.slice(1, -1);
  }
  const percent = s.endsWith("%");
  s = s.replace(/[%\s]/g, "").replace(/^[^\d\-+.]+/, ""); // currency symbols and codes in front
  let mult = 1;
  const suffix = s.match(/([kmb])$/i);
  if (suffix) {
    mult = { k: 1e3, m: 1e6, b: 1e9 }[suffix[1].toLowerCase() as "k" | "m" | "b"];
    s = s.slice(0, -1);
  }
  s = s.replace(/,/g, "");
  if (!/^[-+]?\d*\.?\d+(e[-+]?\d+)?$/i.test(s)) return null;
  let n = Number(s) * mult;
  if (negative) n = -n;
  if (percent) n /= 100;
  return Number.isFinite(n) ? n : null;
}
