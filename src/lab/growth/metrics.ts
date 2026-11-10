/**
 * Every Northstar metric, defined once. Two kinds of number, never mixed:
 *
 *  - EVENT metrics count what happened inside the period: sessions, spend, leads created,
 *    MQLs reached, SQLs reached, opportunities opened, customers won and their contract value.
 *  - COHORT metrics follow the leads created inside the period to wherever they are today
 *    (the funnel, lead quality). Recent leads haven't had time to progress, so cohort rates use
 *    only leads at least MATURE_DAYS old, and say so.
 *
 * Spend for a country, device or landing page is allocated in proportion to that slice's
 * sessions (ad platforms report spend by campaign); the interface states this where it matters.
 * Every ratio goes through ratio(), so an empty slice gives "no value", never NaN.
 */

import { ratio, sum, mean, stdev, isNum } from "../shared/lib/safe-math.ts";
import type { Dataset, DayRow, Lead } from "./generate.ts";
import { CAMPAIGNS, CHANNELS, COUNTRIES, DEVICES, END_DAY, PAGES, dayToIso, type ChannelId, type CountryId } from "./model.ts";

export const MATURE_DAYS = 45;
/**
 * How old a lead must be before each step can be judged fairly: lead→MQL, MQL→SQL, SQL→opp,
 * opp→won. Taken from the longest normal time each step takes (deals take up to ~100 days to close).
 */
export const STEP_MATURE_DAYS = [10, 30, 45, 105] as const;

export type RangeDays = 30 | 90 | 180 | 365;
export type Filter = { range: RangeDays; channel: ChannelId | "all"; country: CountryId | "all" };
export type Period = { from: number; to: number };

export const RANGES: { value: RangeDays; label: string }[] = [
  { value: 30, label: "30 days" },
  { value: 90, label: "90 days" },
  { value: 180, label: "6 months" },
  { value: 365, label: "12 months" },
];

/** The selected period and the equally long period before it. */
export function periods(range: RangeDays): { current: Period; previous: Period } {
  return {
    current: { from: END_DAY - range + 1, to: END_DAY },
    previous: { from: END_DAY - 2 * range + 1, to: END_DAY - range },
  };
}

const inP = (d: number | null, p: Period) => d !== null && d >= p.from && d <= p.to;
const countryIndex = (c: CountryId) => COUNTRIES.findIndex((k) => k.id === c);
const isPaid = (ch: ChannelId) => CHANNELS.find((c) => c.id === ch)?.paid ?? false;

/** The share of a day-row that belongs to the selected country (1 when all countries). */
function rowShare(r: DayRow, f: Filter): number {
  if (f.country === "all") return 1;
  return r.sessions > 0 ? r.byCountry[countryIndex(f.country)] / r.sessions : 0;
}

export function rowsFor(data: Dataset, f: Filter, p: Period): DayRow[] {
  return data.rows.filter((r) => r.day >= p.from && r.day <= p.to && (f.channel === "all" || r.channel === f.channel));
}

export function leadsFor(data: Dataset, f: Filter): Lead[] {
  return data.leads.filter((l) => (f.channel === "all" || l.channel === f.channel) && (f.country === "all" || l.country === f.country));
}

// ---------------------------------------------------------------------------------------------
// Totals
// ---------------------------------------------------------------------------------------------

export type Totals = {
  sessions: number;
  spend: number;
  paidSpend: number;
  impressions: number;
  clicks: number;
  leads: number;
  mqls: number;
  sqls: number;
  opps: number;
  customers: number;
  revenue: number;
  /** Contract value won from leads whose source was a paid channel (for ROAS). */
  paidRevenue: number;
};

const EMPTY: Totals = { sessions: 0, spend: 0, paidSpend: 0, impressions: 0, clicks: 0, leads: 0, mqls: 0, sqls: 0, opps: 0, customers: 0, revenue: 0, paidRevenue: 0 };

function addRow(t: Totals, r: DayRow, share: number) {
  t.sessions += r.sessions * share;
  t.spend += r.spend * share;
  if (isPaid(r.channel)) t.paidSpend += r.spend * share;
  t.impressions += (r.impressions ?? 0) * share;
  t.clicks += (r.clicks ?? 0) * share;
}

function addLead(t: Totals, l: Lead, p: Period) {
  if (inP(l.day, p)) t.leads++;
  if (inP(l.mqlDay, p)) t.mqls++;
  if (inP(l.sqlDay, p)) t.sqls++;
  if (inP(l.oppDay, p)) t.opps++;
  if (l.outcome === "won" && inP(l.closeDay, p)) {
    t.customers++;
    t.revenue += l.acv ?? 0;
    if (isPaid(l.channel)) t.paidRevenue += l.acv ?? 0;
  }
}

/** Event totals for one period under the filter. */
export function totals(data: Dataset, f: Filter, p: Period): Totals {
  const t = { ...EMPTY };
  for (const r of rowsFor(data, f, p)) addRow(t, r, rowShare(r, f));
  for (const l of leadsFor(data, f)) addLead(t, l, p);
  t.sessions = Math.round(t.sessions);
  t.impressions = Math.round(t.impressions);
  t.clicks = Math.round(t.clicks);
  return t;
}

/** Add several totals together (e.g. the paid channels, for a blended figure). */
export function sumTotals(list: Totals[]): Totals {
  const out = { ...EMPTY };
  for (const x of list) for (const k of Object.keys(out) as (keyof Totals)[]) out[k] += x[k];
  return out;
}

/** Ratios derived from totals, each with a precise definition. */
export function rates(t: Totals) {
  return {
    /** Session → lead. */
    cvr: ratio(t.leads, t.sessions),
    ctr: ratio(t.clicks, t.impressions),
    cpc: ratio(t.spend, t.clicks),
    cpm: (() => {
      const r = ratio(t.spend, t.impressions);
      return r === null ? null : r * 1000;
    })(),
    /** Spend ÷ leads created. Null with no spend (organic, direct): there is no media cost to divide. */
    cpl: t.spend > 0 ? ratio(t.spend, t.leads) : null,
    costPerSql: t.spend > 0 ? ratio(t.spend, t.sqls) : null,
    /** Paid media spend ÷ customers won in the period. */
    cac: t.spend > 0 ? ratio(t.spend, t.customers) : null,
    /** First-year contract value won ÷ spend. */
    roas: t.spend > 0 ? ratio(t.revenue, t.spend) : null,
    avgDeal: ratio(t.revenue, t.customers),
  };
}

// ---------------------------------------------------------------------------------------------
// Breakdowns (channel, campaign, country, device, landing page)
// ---------------------------------------------------------------------------------------------

export type Dimension = "channel" | "campaign" | "country" | "device" | "page";

export type BreakdownRow = Totals & {
  key: string;
  label: string;
  sub?: string;
  /** Cohort quality: of the matured leads created in the period, the share that reached SQL so far. */
  leadToSql: number | null;
  maturedLeads: number;
};

function keysFor(dim: Dimension): { key: string; label: string; sub?: string }[] {
  switch (dim) {
    case "channel":
      return CHANNELS.map((c) => ({ key: c.id, label: c.label }));
    case "campaign":
      return CAMPAIGNS.map((c) => ({ key: c.id, label: c.name, sub: CHANNELS.find((x) => x.id === c.channel)?.label }));
    case "country":
      return COUNTRIES.map((c) => ({ key: c.id, label: c.label }));
    case "device":
      return DEVICES.map((d) => ({ key: d.id, label: d.label }));
    case "page":
      return PAGES.map((p) => ({ key: p.id, label: p.path, sub: p.label }));
  }
}

function leadKey(l: Lead, dim: Dimension): string {
  if (dim === "channel") return l.channel;
  if (dim === "campaign") return CAMPAIGNS[l.campaign].id;
  if (dim === "country") return l.country;
  if (dim === "device") return l.device;
  return l.page;
}

export function breakdown(data: Dataset, f: Filter, p: Period, dim: Dimension): BreakdownRow[] {
  const keys = keysFor(dim);
  const idx = new Map(keys.map((k, i) => [k.key, i]));
  const acc: Totals[] = keys.map(() => ({ ...EMPTY }));
  const mat = keys.map(() => ({ n: 0, sql: 0 }));

  for (const r of rowsFor(data, f, p)) {
    const share = rowShare(r, f);
    if (share === 0) continue;
    if (dim === "channel" || dim === "campaign") {
      const k = dim === "channel" ? r.channel : CAMPAIGNS[r.campaign].id;
      addRow(acc[idx.get(k) as number], r, share);
    } else {
      // Split the row by the dimension's session shares (spend allocated the same way).
      const parts = dim === "country" ? r.byCountry : dim === "device" ? r.byDevice : r.byPage;
      parts.forEach((sessions, i) => {
        if (!sessions || r.sessions === 0) return;
        if (dim === "country" && f.country !== "all" && i !== countryIndex(f.country)) return;
        const s = sessions / r.sessions;
        addRow(acc[i], r, dim === "country" ? s : s * share);
      });
    }
  }
  for (const l of leadsFor(data, f)) {
    const i = idx.get(leadKey(l, dim));
    if (i === undefined) continue;
    addLead(acc[i], l, p);
    if (inP(l.day, p) && l.day <= END_DAY - MATURE_DAYS) {
      mat[i].n++;
      if (l.sqlDay !== null) mat[i].sql++;
    }
  }
  return keys.map((k, i) => ({
    ...acc[i],
    sessions: Math.round(acc[i].sessions),
    impressions: Math.round(acc[i].impressions),
    clicks: Math.round(acc[i].clicks),
    key: k.key,
    label: k.label,
    sub: k.sub,
    leadToSql: mat[i].n >= 20 ? ratio(mat[i].sql, mat[i].n) : null,
    maturedLeads: mat[i].n,
  }));
}

// ---------------------------------------------------------------------------------------------
// Time series
// ---------------------------------------------------------------------------------------------

export type Granularity = "day" | "week" | "month";
export const granularityFor = (range: RangeDays): Granularity => (range <= 30 ? "day" : range <= 180 ? "week" : "month");

export type Bucket = { label: string; from: number; to: number };

/** Buckets covering the period, aligned to its end (weeks are the 7 days ending on each step). */
export function buckets(p: Period, g: Granularity): Bucket[] {
  const out: Bucket[] = [];
  if (g === "day") {
    for (let d = p.from; d <= p.to; d++) out.push({ label: dayToIso(d), from: d, to: d });
    return out;
  }
  if (g === "week") {
    for (let end = p.to; end >= p.from; end -= 7) out.unshift({ label: dayToIso(Math.max(p.from, end - 6)), from: Math.max(p.from, end - 6), to: end });
    return out;
  }
  // Calendar months.
  let d = p.from;
  while (d <= p.to) {
    const iso = dayToIso(d);
    const start = d;
    while (d <= p.to && dayToIso(d).slice(0, 7) === iso.slice(0, 7)) d++;
    out.push({ label: iso.slice(0, 7), from: start, to: d - 1 });
  }
  return out;
}

export type SeriesMetric = "sessions" | "spend" | "leads" | "mqls" | "sqls" | "opps" | "customers" | "revenue";

/** One value per bucket, optionally split by channel. */
export function series(data: Dataset, f: Filter, p: Period, g: Granularity, metric: SeriesMetric, byChannel: boolean) {
  const bs = buckets(p, g);
  const at = new Int32Array(DAYS_LEN);
  bs.forEach((b, i) => {
    for (let d = b.from; d <= b.to; d++) at[d] = i;
  });
  const groups = byChannel ? CHANNELS.filter((c) => f.channel === "all" || c.id === f.channel).map((c) => c.id as string) : ["total"];
  const vals = groups.map(() => new Array(bs.length).fill(0) as number[]);
  const gi = (ch: ChannelId) => (byChannel ? groups.indexOf(ch) : 0);

  if (metric === "sessions" || metric === "spend") {
    for (const r of rowsFor(data, f, p)) {
      const v = (metric === "sessions" ? r.sessions : r.spend) * rowShare(r, f);
      const g2 = gi(r.channel);
      if (g2 >= 0) vals[g2][at[r.day]] += v;
    }
  } else {
    for (const l of leadsFor(data, f)) {
      const d =
        metric === "leads" ? l.day : metric === "mqls" ? l.mqlDay : metric === "sqls" ? l.sqlDay : metric === "opps" ? l.oppDay : l.outcome === "won" ? l.closeDay : null;
      if (!inP(d, p)) continue;
      const g2 = gi(l.channel);
      if (g2 < 0) continue;
      vals[g2][at[d as number]] += metric === "revenue" ? (l.acv ?? 0) : 1;
    }
  }
  return { buckets: bs, groups, values: vals.map((v) => v.map((x) => Math.round(x * 100) / 100)) };
}
const DAYS_LEN = END_DAY + 1;

// ---------------------------------------------------------------------------------------------
// Funnel (cohort)
// ---------------------------------------------------------------------------------------------

export const STAGES = [
  { id: "lead", label: "Leads" },
  { id: "mql", label: "MQLs" },
  { id: "sql", label: "SQLs" },
  { id: "opp", label: "Opportunities" },
  { id: "won", label: "Customers" },
] as const;

export type FunnelCounts = [number, number, number, number, number];

function countFunnel(leads: Lead[]): FunnelCounts {
  const c: FunnelCounts = [0, 0, 0, 0, 0];
  for (const l of leads) {
    c[0]++;
    if (l.mqlDay !== null) c[1]++;
    if (l.sqlDay !== null) c[2]++;
    if (l.oppDay !== null) c[3]++;
    if (l.outcome === "won") c[4]++;
  }
  return c;
}

/** Step conversion rates: [lead→MQL, MQL→SQL, SQL→opp, opp→won]. */
export function stepRates(c: FunnelCounts): (number | null)[] {
  return [ratio(c[1], c[0]), ratio(c[2], c[1]), ratio(c[3], c[2]), ratio(c[4], c[3])];
}

export type FunnelView = {
  /** Every lead created in the period, wherever it is today. */
  all: FunnelCounts;
  /** Only leads old enough to have had a fair chance (created ≥ MATURE_DAYS before the data ends). */
  matured: FunnelCounts;
  /** The same, for the 12 months before the period: the baseline to compare step rates with. */
  baseline: FunnelCounts;
  /**
   * Step rates judged fairly: step i uses only leads at least STEP_MATURE_DAYS[i] old, so recent
   * leads that simply haven't had time aren't counted as failures. n = the step's denominator.
   */
  fairRates: (number | null)[];
  fairN: number[];
  baselineRates: (number | null)[];
  baselineN: number[];
  /** Opportunities still open (no outcome yet). */
  openOpps: number;
  /** Median days from lead to won, over won leads in the cohort. */
  medianDaysToWin: number | null;
  /** Average contract value of won deals in the cohort. */
  avgDeal: number | null;
};

export function funnel(data: Dataset, f: Filter, p: Period): FunnelView {
  const ls = leadsFor(data, f);
  const cohort = ls.filter((l) => inP(l.day, p));
  const matured = cohort.filter((l) => l.day <= END_DAY - MATURE_DAYS);
  const base = ls.filter((l) => l.day >= p.from - 365 && l.day < p.from && l.day <= END_DAY - MATURE_DAYS);
  const reached = (l: Lead, stage: number) =>
    stage === 0 ? true : stage === 1 ? l.mqlDay !== null : stage === 2 ? l.sqlDay !== null : stage === 3 ? l.oppDay !== null : l.outcome === "won";
  const fair = (set: Lead[]) => {
    const rates: (number | null)[] = [];
    const ns: number[] = [];
    for (let i = 0; i < 4; i++) {
      const old = set.filter((l) => l.day <= END_DAY - STEP_MATURE_DAYS[i] && reached(l, i));
      ns.push(old.length);
      rates.push(old.length >= 30 ? ratio(old.filter((l) => reached(l, i + 1)).length, old.length) : null);
    }
    return { rates, ns };
  };
  const fc = fair(cohort);
  const fb = fair(ls.filter((l) => l.day >= p.from - 365 && l.day < p.from));
  const won = cohort.filter((l) => l.outcome === "won");
  const days = won.map((l) => (l.closeDay as number) - l.day).sort((a, b) => a - b);
  return {
    all: countFunnel(cohort),
    matured: countFunnel(matured),
    baseline: countFunnel(base),
    fairRates: fc.rates,
    fairN: fc.ns,
    baselineRates: fb.rates,
    baselineN: fb.ns,
    openOpps: cohort.filter((l) => l.outcome === "open").length,
    medianDaysToWin: days.length ? days[Math.floor(days.length / 2)] : null,
    avgDeal: ratio(sum(won.map((l) => l.acv)), won.length),
  };
}

/**
 * What-if: apply step rates to a starting lead count. Returns stage counts (unrounded, so small
 * changes still show) and won revenue at a given average deal value.
 */
export function simulateFunnel(leads: number, rates: number[], avgDeal: number | null) {
  const counts = [leads];
  rates.forEach((r, i) => counts.push(counts[i] * r));
  return { counts, revenue: avgDeal === null ? null : counts[4] * avgDeal };
}

/** For each step: extra customers from +`points` (absolute) on that step alone. Lowest rate = most leverage. */
export function leverage(leads: number, rates: number[], points = 0.05) {
  const base = simulateFunnel(leads, rates, null).counts[4];
  return rates.map((r, i) => {
    const next = [...rates];
    next[i] = Math.min(1, r + points);
    return simulateFunnel(leads, next, null).counts[4] - base;
  });
}

// ---------------------------------------------------------------------------------------------
// Unit economics
// ---------------------------------------------------------------------------------------------

export type Assumptions = {
  /** Gross margin on subscription revenue. */
  grossMargin: number;
  /** Share of customers who cancel each month. */
  monthlyChurn: number;
  /** Non-media sales & marketing cost per month (salaries, tools, agencies). */
  otherCostPerMonth: number;
};

export const DEFAULT_ASSUMPTIONS: Assumptions = { grossMargin: 0.8, monthlyChurn: 0.022, otherCostPerMonth: 40000 };

/**
 * `costShare` is the slice's share of the non-media cost. Looking at one channel or country, it
 * would be wrong to load the whole team's cost onto that slice's customers, so callers pass the
 * slice's share of all customers won (1 for the whole business).
 */
export function economics(t: Totals, range: RangeDays, a: Assumptions, costShare = 1) {
  const months = range / 30.4375;
  const avgDeal = ratio(t.revenue, t.customers);
  const arpaMonthly = avgDeal === null ? null : avgDeal / 12;
  const cacPaid = t.paidSpend > 0 ? ratio(t.paidSpend, t.customers) : null;
  const otherCost = a.otherCostPerMonth * months * costShare;
  const loadedCost = t.spend + otherCost;
  const cacLoaded = ratio(loadedCost, t.customers);
  const ltv = arpaMonthly === null ? null : ratio(arpaMonthly * a.grossMargin, a.monthlyChurn);
  const monthlyGrossProfit = arpaMonthly === null ? null : arpaMonthly * a.grossMargin;
  return {
    months,
    avgDeal,
    arpaMonthly,
    cacPaid,
    cacLoaded,
    loadedCost,
    otherCost,
    ltv,
    ltvCac: ratio(ltv, cacLoaded),
    roas: t.paidSpend > 0 ? ratio(t.paidRevenue, t.paidSpend) : null,
    paybackMonths: ratio(cacLoaded, monthlyGrossProfit),
  };
}

/** The share of non-media cost a filtered view should carry: its share of customers won (1 when unfiltered). */
export function costShareFor(data: Dataset, f: Filter, p: Period): number {
  if (f.channel === "all" && f.country === "all") return 1;
  const all = totals(data, { ...f, channel: "all", country: "all" }, p).customers;
  const mine = totals(data, f, p).customers;
  return all > 0 ? mine / all : 0;
}

// ---------------------------------------------------------------------------------------------
// Anomalies: weekly z-scores against the 12 weeks before
// ---------------------------------------------------------------------------------------------

export type AnomalyMetric = "sessions" | "cvr" | "cpc";
export type Anomaly = {
  channel: ChannelId;
  metric: AnomalyMetric;
  weekFrom: number;
  weekTo: number;
  value: number;
  baselineMean: number;
  z: number;
};

/**
 * For each channel in scope, the weekly sessions, session→lead rate and (paid) CPC over the last
 * weeks of the period; each week is compared with the 12 weeks before it. |z| ≥ 3 is unusual.
 */
export function anomalies(data: Dataset, f: Filter, p: Period, threshold = 3): Anomaly[] {
  const weeks = Math.min(12, Math.floor((p.to - p.from + 1) / 7));
  const total = weeks + 12;
  const out: Anomaly[] = [];
  const chans = CHANNELS.filter((c) => f.channel === "all" || c.id === f.channel);
  const ls = leadsFor(data, f);
  for (const ch of chans) {
    const sess = new Array(total).fill(0);
    const spend = new Array(total).fill(0);
    const clicks = new Array(total).fill(0);
    const leads = new Array(total).fill(0);
    const wk = (d: number) => Math.floor((END_DAY - d) / 7); // 0 = most recent week
    for (const r of data.rows) {
      if (r.channel !== ch.id) continue;
      const w = wk(r.day);
      if (w < 0 || w >= total) continue;
      const share = rowShare(r, f);
      sess[w] += r.sessions * share;
      spend[w] += r.spend * share;
      clicks[w] += (r.clicks ?? 0) * share;
    }
    for (const l of ls) {
      if (l.channel !== ch.id) continue;
      const w = wk(l.day);
      if (w >= 0 && w < total) leads[w]++;
    }
    // Minimum weekly volume (baseline average) before a metric can be called unusual: small
    // slices swing by chance. Sessions need 200 a week, rates 400 sessions or 200 clicks.
    const metrics: { m: AnomalyMetric; v: (w: number) => number | null; volume: number[]; min: number }[] = [
      { m: "sessions", v: (w) => sess[w], volume: sess, min: 200 },
      { m: "cvr", v: (w) => ratio(leads[w], sess[w]), volume: sess, min: 400 },
    ];
    if (ch.paid) metrics.push({ m: "cpc", v: (w) => ratio(spend[w], clicks[w]), volume: clicks, min: 200 });
    for (const { m, v, volume, min } of metrics) {
      let best: Anomaly | null = null;
      for (let w = 0; w < weeks; w++) {
        const ref = Array.from({ length: 12 }, (_, k) => v(w + 1 + k));
        const val = v(w);
        if (!isNum(val)) continue;
        const vol = mean(volume.slice(w + 1, w + 13));
        if (vol === null || vol < min) continue;
        const sd = stdev(ref);
        const mu = mean(ref);
        if (sd === null || mu === null || sd === 0) continue;
        // Guard against tiny spreads making trivial moves look extreme: at least 5% of the mean.
        const z = (val - mu) / Math.max(sd, Math.abs(mu) * 0.05);
        // Unusual means both statistically extreme AND a material move (seasonality alone is neither).
        const material = mu !== 0 && Math.abs(val / mu - 1) >= 0.25;
        if (Math.abs(z) >= threshold && material && (!best || Math.abs(z) > Math.abs(best.z))) {
          best = { channel: ch.id, metric: m, weekFrom: END_DAY - 7 * w - 6, weekTo: END_DAY - 7 * w, value: val, baselineMean: mu, z };
        }
      }
      if (best) out.push(best);
    }
  }
  return out.sort((a, b) => Math.abs(b.z) - Math.abs(a.z));
}
