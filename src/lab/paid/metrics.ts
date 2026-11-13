/**
 * Every number in the Paid Media Studio comes from here: one definition of each metric, applied
 * the same way to every platform, to demo data and to imported exports alike. Pure functions over
 * AdRow[]; tested with `node --test`.
 */

import { clamp, isNum, ratio, sum } from "../shared/lib/safe-math.ts";
import { PLATFORMS, UNSPECIFIED, dayToIso, platformLabel, type AdRow, type PlatformId } from "./model.ts";

// ---- Filters and periods -----------------------------------------------------------------------

export type RangeDays = 30 | 90 | 0;
export const RANGES: { value: RangeDays; label: string }[] = [
  { value: 30, label: "30 days" },
  { value: 90, label: "90 days" },
  { value: 0, label: "All data" },
];

export type Filter = { range: RangeDays; platform: PlatformId | "all" };
export type Period = { from: number; to: number };

export function span(rows: AdRow[]): Period | null {
  if (!rows.length) return null;
  let from = Infinity;
  let to = -Infinity;
  for (const r of rows) {
    if (r.day < from) from = r.day;
    if (r.day > to) to = r.day;
  }
  return { from, to };
}

/** The selected window ending on the data's last day, and the same-length window before it if the data reaches back that far. */
export function periods(rows: AdRow[], range: RangeDays): { current: Period; previous: Period | null } | null {
  const s = span(rows);
  if (!s) return null;
  if (range === 0) return { current: s, previous: null };
  const from = Math.max(s.from, s.to - range + 1);
  const current = { from, to: s.to };
  const previous = from - range >= s.from ? { from: from - range, to: from - 1 } : null;
  return { current, previous };
}

export const days = (p: Period) => p.to - p.from + 1;

export function scope(rows: AdRow[], f: Filter, p: Period | null): AdRow[] {
  if (!p) return [];
  return rows.filter((r) => r.day >= p.from && r.day <= p.to && (f.platform === "all" || r.platform === f.platform));
}

// ---- Totals and rates --------------------------------------------------------------------------

export type Totals = {
  spend: number;
  impressions: number;
  clicks: number;
  leads: number;
  /** Null when no row in the set has the field (an export without it). */
  qualified: number | null;
  value: number | null;
  /** Impressions on rows that report reach, and that reach, so frequency only uses comparable rows. */
  reachImpressions: number;
  reach: number | null;
  rows: number;
};

export function totals(rows: AdRow[]): Totals {
  let spend = 0;
  let impressions = 0;
  let clicks = 0;
  let leads = 0;
  let qualified: number | null = null;
  let value: number | null = null;
  let reach: number | null = null;
  let reachImpressions = 0;
  for (const r of rows) {
    spend += r.spend;
    impressions += r.impressions;
    clicks += r.clicks;
    leads += r.leads;
    if (r.qualified !== null) qualified = (qualified ?? 0) + r.qualified;
    if (r.value !== null) value = (value ?? 0) + r.value;
    if (r.reach !== null) {
      reach = (reach ?? 0) + r.reach;
      reachImpressions += r.impressions;
    }
  }
  return { spend: Math.round(spend * 100) / 100, impressions, clicks, leads, qualified, value, reach, reachImpressions, rows: rows.length };
}

export type Rates = {
  /** Clicks ÷ impressions. */
  ctr: number | null;
  /** Spend ÷ clicks. */
  cpc: number | null;
  /** Spend ÷ impressions × 1,000. */
  cpm: number | null;
  /** Leads ÷ clicks. */
  cvr: number | null;
  /** Spend ÷ leads. */
  cpl: number | null;
  /** Qualified ÷ leads. */
  qualRate: number | null;
  /** Spend ÷ qualified leads (cost per acquisition of a qualified lead). */
  cpa: number | null;
  /** Conversion value ÷ spend. */
  roas: number | null;
  /** Impressions ÷ reach, on rows that report reach (average daily frequency). */
  frequency: number | null;
};

export function rates(t: Totals): Rates {
  const cpm = ratio(t.spend, t.impressions);
  return {
    ctr: ratio(t.clicks, t.impressions),
    cpc: ratio(t.spend, t.clicks),
    cpm: cpm === null ? null : cpm * 1000,
    cvr: ratio(t.leads, t.clicks),
    cpl: ratio(t.spend, t.leads),
    qualRate: ratio(t.qualified, t.leads),
    cpa: ratio(t.spend, t.qualified),
    roas: ratio(t.value, t.spend),
    frequency: ratio(t.reachImpressions, t.reach),
  };
}

// ---- Breakdowns --------------------------------------------------------------------------------

export type Dimension = "platform" | "campaign" | "audience" | "region";
export const DIMENSIONS: { value: Dimension; label: string }[] = [
  { value: "platform", label: "Platform" },
  { value: "campaign", label: "Campaign" },
  { value: "audience", label: "Audience" },
  { value: "region", label: "Region" },
];

export type BreakdownRow = Totals & Rates & { key: string; label: string; platform: PlatformId | null };

export function keyOf(r: AdRow, d: Dimension): string {
  if (d === "platform") return r.platform;
  if (d === "campaign") return `${r.platform}|${r.campaign}`;
  return d === "audience" ? r.audience : r.region;
}

export function breakdown(rows: AdRow[], d: Dimension): BreakdownRow[] {
  const groups = new Map<string, AdRow[]>();
  for (const r of rows) {
    const k = keyOf(r, d);
    let g = groups.get(k);
    if (!g) groups.set(k, (g = []));
    g.push(r);
  }
  const out: BreakdownRow[] = [];
  for (const [key, g] of groups) {
    const t = totals(g);
    const platforms = new Set(g.map((r) => r.platform));
    const platform = platforms.size === 1 ? g[0].platform : null;
    const label = d === "platform" ? platformLabel(key as PlatformId) : d === "campaign" ? g[0].campaign : key;
    out.push({ ...t, ...rates(t), key, label, platform });
  }
  return out.sort((a, b) => b.spend - a.spend);
}

/** True when a dimension has real values in this data (an import may have no audience column). */
export function hasDimension(rows: AdRow[], d: Dimension): boolean {
  if (d === "platform" || d === "campaign") return true;
  return rows.some((r) => (d === "audience" ? r.audience : r.region) !== UNSPECIFIED);
}

// ---- Weekly series -----------------------------------------------------------------------------

export type Week = { from: number; to: number; label: string; totals: Totals };

/** Seven-day buckets counted back from the period's last day (a partial first bucket is dropped if under 4 days). */
export function weekly(rows: AdRow[], p: Period): Week[] {
  const n = Math.ceil(days(p) / 7);
  const buckets: AdRow[][] = Array.from({ length: n }, () => []);
  for (const r of rows) {
    if (r.day < p.from || r.day > p.to) continue;
    const back = Math.floor((p.to - r.day) / 7);
    buckets[n - 1 - back].push(r);
  }
  const out: Week[] = [];
  buckets.forEach((b, i) => {
    const to = p.to - (n - 1 - i) * 7;
    const from = Math.max(p.from, to - 6);
    if (to - from + 1 < 4) return;
    out.push({ from, to, label: dayToIso(from), totals: totals(b) });
  });
  return out;
}

// ---- Diminishing returns: leads = a · spend^b, fitted per campaign ---------------------------

export const FIT_WEEKS = 16;
export const MIN_FIT_WEEKS = 6;
export const DEFAULT_CURVE = 0.7;
/** How far the simulator lets a campaign move from today's spend (outside this, the curve is a guess). */
export const BOUNDS = { low: 0.5, high: 2 } as const;

export type Curve = {
  key: string;
  campaign: string;
  platform: PlatformId;
  /** Weekly leads = a · (weekly spend)^b. */
  a: number;
  b: number;
  /** True when b came from the data; false when the data couldn't support a fit and the default was used. */
  fitted: boolean;
  /** Goodness of fit on log–log axes (0–1), when fitted. */
  r2: number | null;
  points: { spend: number; leads: number }[];
  /** Spend per week at today's level (average of the fit window). */
  weeklySpend: number;
  minWeekly: number;
  maxWeekly: number;
  /** Qualified ÷ leads and value ÷ leads over the fit window, used to carry leads through to quality. */
  qualPerLead: number | null;
  valuePerLead: number | null;
};

/** Least squares on log(leads) = log(a) + b·log(spend). */
export function fitPower(points: { spend: number; leads: number }[]): { a: number; b: number; r2: number } | null {
  const pts = points.filter((p) => p.spend > 0 && p.leads > 0);
  if (pts.length < 3) return null;
  const xs = pts.map((p) => Math.log(p.spend));
  const ys = pts.map((p) => Math.log(p.leads));
  const mx = sum(xs) / xs.length;
  const my = sum(ys) / ys.length;
  let sxx = 0;
  let sxy = 0;
  let syy = 0;
  for (let i = 0; i < xs.length; i++) {
    sxx += (xs[i] - mx) ** 2;
    sxy += (xs[i] - mx) * (ys[i] - my);
    syy += (ys[i] - my) ** 2;
  }
  if (sxx < 1e-9) return null; // spend never changed: the slope can't be estimated
  const b = sxy / sxx;
  const a = Math.exp(my - b * mx);
  const r2 = syy === 0 ? 1 : (sxy * sxy) / (sxx * syy);
  return { a, b, r2 };
}

/** One curve per campaign, fitted on its last FIT_WEEKS weeks. */
export function curves(rows: AdRow[], platform: PlatformId | "all" = "all"): Curve[] {
  const s = span(rows);
  if (!s) return [];
  const p = { from: Math.max(s.from, s.to - FIT_WEEKS * 7 + 1), to: s.to };
  const inWindow = rows.filter((r) => r.day >= p.from && (platform === "all" || r.platform === platform));
  const out: Curve[] = [];
  for (const g of breakdown(inWindow, "campaign")) {
    if (g.spend <= 0) continue;
    const own = inWindow.filter((r) => keyOf(r, "campaign") === g.key);
    const weeks = weekly(own, p).filter((w) => w.totals.spend > 0);
    if (!weeks.length) continue;
    // Scale partial weeks to seven days so every point is "per week".
    const points = weeks.map((w) => {
      const k = 7 / (w.to - w.from + 1);
      return { spend: w.totals.spend * k, leads: w.totals.leads * k };
    });
    const weeklySpend = sum(points.map((x) => x.spend)) / points.length;
    const weeklyLeads = sum(points.map((x) => x.leads)) / points.length;
    const fit = points.length >= MIN_FIT_WEEKS ? fitPower(points) : null;
    const usable = fit !== null && fit.b > 0.1 && fit.b < 1.2;
    const b = usable ? clamp(fit.b, 0.15, 0.95) : DEFAULT_CURVE;
    // Anchor the curve on today's average so the simulator reproduces today's results at today's spend.
    const a = weeklyLeads > 0 ? weeklyLeads / Math.pow(weeklySpend, b) : 0;
    out.push({
      key: g.key,
      campaign: g.label,
      platform: g.platform as PlatformId,
      a,
      b,
      fitted: usable,
      r2: usable ? fit.r2 : null,
      points,
      weeklySpend,
      minWeekly: Math.min(...points.map((x) => x.spend)),
      maxWeekly: Math.max(...points.map((x) => x.spend)),
      qualPerLead: ratio(g.qualified, g.leads),
      valuePerLead: ratio(g.value, g.leads),
    });
  }
  return out;
}

export const WEEKS_PER_MONTH = 30 / 7;

/** Leads per month at a monthly budget. */
export function predictLeads(c: Curve, monthly: number): number {
  if (monthly <= 0 || c.a <= 0) return 0;
  return c.a * Math.pow(monthly / WEEKS_PER_MONTH, c.b) * WEEKS_PER_MONTH;
}

/** Cost of the next lead at a monthly budget: 1 ÷ (d leads / d spend) = average CPL ÷ b. */
export function marginalCpl(c: Curve, monthly: number): number | null {
  const leads = predictLeads(c, monthly);
  if (leads <= 0 || c.b <= 0) return null;
  return monthly / leads / c.b;
}

export type Objective = "leads" | "qualified";

/** What one more dollar buys in the objective's units at this budget. */
function marginalReturn(c: Curve, monthly: number, objective: Objective): number {
  const m = marginalCpl(c, Math.max(monthly, 1));
  if (m === null) return 0;
  const perLead = objective === "qualified" ? (c.qualPerLead ?? 0) : 1;
  return perLead / m;
}

export type Projection = {
  key: string;
  monthly: number;
  leads: number;
  qualified: number | null;
  value: number | null;
  cpl: number | null;
  marginal: number | null;
  /** The budget is outside the weekly spend range the curve was fitted on. */
  extrapolated: boolean;
};

export function project(c: Curve, monthly: number): Projection {
  const leads = predictLeads(c, monthly);
  const weekly = monthly / WEEKS_PER_MONTH;
  return {
    key: c.key,
    monthly,
    leads,
    qualified: isNum(c.qualPerLead) ? leads * c.qualPerLead : null,
    value: isNum(c.valuePerLead) ? leads * c.valuePerLead : null,
    cpl: ratio(monthly, leads),
    marginal: marginalCpl(c, monthly),
    extrapolated: monthly > 0 && (weekly < c.minWeekly * 0.9 || weekly > c.maxWeekly * 1.1),
  };
}

export type PlanTotals = { spend: number; leads: number; qualified: number | null; value: number | null; cpl: number | null; cpa: number | null; roas: number | null };

export function planTotals(ps: Projection[]): PlanTotals {
  const spend = sum(ps.map((p) => p.monthly));
  const leads = sum(ps.map((p) => p.leads));
  const qualified = ps.some((p) => p.qualified !== null) ? sum(ps.map((p) => p.qualified)) : null;
  const value = ps.some((p) => p.value !== null) ? sum(ps.map((p) => p.value)) : null;
  return { spend, leads, qualified, value, cpl: ratio(spend, leads), cpa: ratio(spend, qualified), roas: ratio(value, spend) };
}

/** Today's monthly budget per campaign (the fit window's weekly average × 30/7). */
export function currentPlan(cs: Curve[]): Record<string, number> {
  return Object.fromEntries(cs.map((c) => [c.key, Math.round(c.weeklySpend * WEEKS_PER_MONTH)]));
}

/**
 * Split a total budget to maximise the objective: hand out the money in small steps, each to the
 * campaign whose next dollar returns the most (which ends where marginal costs are as equal as the
 * bounds allow). Each campaign stays within BOUNDS of today's spend, where its curve was measured.
 */
export function optimise(cs: Curve[], total: number, objective: Objective): Record<string, number> {
  const base = currentPlan(cs);
  const lo = (c: Curve) => base[c.key] * BOUNDS.low;
  const hi = (c: Curve) => base[c.key] * BOUNDS.high;
  const alloc: Record<string, number> = Object.fromEntries(cs.map((c) => [c.key, lo(c)]));
  let left = total - sum(Object.values(alloc));
  if (left < 0) {
    // Below everyone's floor: scale today's plan down proportionally instead.
    const t = sum(Object.values(base));
    return Object.fromEntries(cs.map((c) => [c.key, t > 0 ? Math.round((base[c.key] / t) * total) : 0]));
  }
  const step = Math.max(10, Math.round(total / 600));
  while (left > 0.5) {
    let best: Curve | null = null;
    let bestReturn = -1;
    for (const c of cs) {
      if (alloc[c.key] + 0.5 >= hi(c)) continue;
      const r = marginalReturn(c, alloc[c.key], objective);
      if (r > bestReturn) {
        bestReturn = r;
        best = c;
      }
    }
    if (!best) break; // every campaign is at its ceiling
    const add = Math.min(step, left, hi(best) - alloc[best.key]);
    alloc[best.key] += add;
    left -= add;
  }
  return Object.fromEntries(Object.entries(alloc).map(([k, v]) => [k, Math.round(v)]));
}

export const platformOrder = (id: PlatformId) => PLATFORMS.findIndex((p) => p.id === id);
