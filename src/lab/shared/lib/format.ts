/**
 * Display formatting for the Lab. One place decides how a number reads, so the same metric looks
 * the same in a tile, a table, a tooltip and an analyst finding. A missing value always shows as
 * an em dash, never as 0, NaN or "∞".
 */

import { isNum } from "./safe-math.ts";

export const DASH = "—";
export type Currency = "USD" | "INR";

const LOCALE: Record<Currency, string> = { USD: "en-US", INR: "en-IN" };

export function formatNumber(v: unknown, opts: { compact?: boolean; dp?: number } = {}): string {
  if (!isNum(v)) return DASH;
  const { compact = false, dp } = opts;
  return new Intl.NumberFormat("en-US", {
    notation: compact ? "compact" : "standard",
    maximumFractionDigits: dp ?? (compact ? 1 : Math.abs(v) < 10 && !Number.isInteger(v) ? 1 : 0),
    minimumFractionDigits: 0,
  }).format(v);
}

/** Money. INR uses Indian grouping and lakh/crore when compact (₹1.2L, ₹3.4Cr). */
export function formatCurrency(v: unknown, currency: Currency = "USD", opts: { compact?: boolean; dp?: number } = {}): string {
  if (!isNum(v)) return DASH;
  const { compact = false } = opts;
  const dp = opts.dp ?? (compact ? 1 : v === 0 || Math.abs(v) >= 100 ? 0 : 2);
  return new Intl.NumberFormat(LOCALE[currency], {
    style: "currency",
    currency,
    notation: compact ? "compact" : "standard",
    maximumFractionDigits: dp,
    minimumFractionDigits: compact ? 0 : Math.min(dp, 2),
  }).format(v);
}

/** A fraction as a percentage: 0.1234 → "12.3%". `signed` adds + for gains. */
export function formatPercent(v: unknown, opts: { dp?: number; signed?: boolean } = {}): string {
  if (!isNum(v)) return DASH;
  const { dp = 1, signed = false } = opts;
  const s = new Intl.NumberFormat("en-US", { style: "percent", maximumFractionDigits: dp, minimumFractionDigits: dp }).format(v);
  return signed && v > 0 ? `+${s}` : s;
}

/** Percentage points between two rates: 0.023 → "+2.3 pp". */
export function formatPoints(v: unknown, dp = 1): string {
  if (!isNum(v)) return DASH;
  const s = (v * 100).toFixed(dp);
  return `${v > 0 ? "+" : ""}${s} pp`;
}

/** A ratio such as LTV:CAC or ROAS: 3.24 → "3.2×". */
export function formatMultiple(v: unknown, dp = 1): string {
  if (!isNum(v)) return DASH;
  return `${v.toFixed(dp)}×`;
}

export function formatMonths(v: unknown, dp = 1): string {
  if (!isNum(v)) return DASH;
  return `${v.toFixed(dp)} mo`;
}

export function formatDays(v: unknown): string {
  if (!isNum(v)) return DASH;
  const d = Math.round(v);
  return `${d} day${d === 1 ? "" : "s"}`;
}

/** Short month label from an ISO month "2026-03" → "Mar 26". */
export function formatMonth(iso: string): string {
  const [y, m] = iso.split("-").map(Number);
  if (!y || !m) return iso;
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleString("en-US", { month: "short", year: "2-digit", timeZone: "UTC" });
}

/** Short date from an ISO day "2026-03-14" → "14 Mar". */
export function formatDay(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
}
