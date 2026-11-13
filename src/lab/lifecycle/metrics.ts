/**
 * Every Kettlebloom metric, defined once.
 *
 *  - A PROFILE is one customer's state on a given day: orders, spend, recency and their RFM
 *    scores, computed only from orders on or before that day. Segments come from the profile, so
 *    "where were these customers 90 days ago" is the same calculation run on an earlier day.
 *  - Rates that need time to be judged (repeat rate, churn, 12-month value) only count customers
 *    old enough to have had the chance, and say so.
 *
 * Every ratio goes through ratio(), so an empty slice gives "no value", never NaN.
 */

import { ratio, sum, isNum } from "../shared/lib/safe-math.ts";
import type { Customer, Dataset, Order } from "./generate.ts";
import { CHANNELS, END_DAY, GROSS_MARGIN, MONTHS, PRODUCTS, monthIndex, type ChannelId, type ProductId } from "./model.ts";

/** A customer is churned once this many days pass without an order (about 3× the usual reorder gap). */
export const CHURN_DAYS = 120;
/** Repeat rates only count customers whose first order is at least this old. */
export const REPEAT_WINDOW = 90;
export const YEAR = 365;

// ---------------------------------------------------------------------------------------------
// RFM and segments
// ---------------------------------------------------------------------------------------------

export type SegmentId = "high" | "loyal" | "active" | "new" | "risk" | "lapsed";

/** Rules are applied in this order; a customer takes the first segment that matches. */
export const SEGMENTS: { id: SegmentId; label: string; rule: string; short: string }[] = [
  { id: "high", label: "High-value", rule: "R 4–5 and M 5", short: "Bought in the last 60 days and have spent ₹6,000 or more in total." },
  { id: "loyal", label: "Loyal", rule: "R 4–5 and F 3–5", short: "Bought in the last 60 days, with three or more orders." },
  { id: "active", label: "Active", rule: "R 4–5 and F 2", short: "Bought in the last 60 days; this was their second order." },
  { id: "new", label: "New", rule: "R 4–5 and F 1", short: "First and only order in the last 60 days." },
  { id: "risk", label: "At risk", rule: "R 2–3 and F 2–5", short: "Repeat buyers whose last order was 61–180 days ago." },
  { id: "lapsed", label: "Inactive", rule: "everyone else", short: "One-time buyers quiet for over 60 days, or anyone quiet for over 180." },
];

/** Score thresholds (upper bounds) for R, F and M; score 5 is the best. */
export const R_DAYS = [30, 60, 90, 180] as const; // ≤30 → 5, ≤60 → 4, ≤90 → 3, ≤180 → 2, else 1
export const F_ORDERS = [1, 2, 4, 7] as const; // 1 → 1, 2 → 2, 3–4 → 3, 5–7 → 4, 8+ → 5
export const M_SPEND = [800, 1600, 3200, 6000] as const; // <800 → 1 … ≥6000 → 5

export function rScore(recency: number): number {
  const i = R_DAYS.findIndex((t) => recency <= t);
  return i < 0 ? 1 : 5 - i;
}
export function fScore(orders: number): number {
  const i = F_ORDERS.findIndex((t) => orders <= t);
  return i < 0 ? 5 : i + 1;
}
export function mScore(spend: number): number {
  const i = M_SPEND.findIndex((t) => spend < t);
  return i < 0 ? 5 : i + 1;
}

export function segmentFor(r: number, f: number, m: number): SegmentId {
  if (r >= 4 && m === 5) return "high";
  if (r >= 4 && f >= 3) return "loyal";
  if (r >= 4 && f === 2) return "active";
  if (r >= 4) return "new";
  if (r >= 2 && f >= 2) return "risk";
  return "lapsed";
}

export type Profile = {
  /** Index into Dataset.customers. */
  ci: number;
  c: Customer;
  orders: number;
  spend: number;
  last: number;
  recency: number;
  /** Median days between this customer's orders (null with one order). */
  medianGap: number | null;
  lastProduct: ProductId;
  r: number;
  f: number;
  m: number;
  segment: SegmentId;
};

export function median(xs: number[]): number | null {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

export function ordersOf(data: Dataset, c: Customer): Order[] {
  return data.orders.slice(c.o0, c.o0 + c.n);
}

/** One customer as of a day, or null if they hadn't ordered yet. */
export function profileAt(data: Dataset, ci: number, asOf = END_DAY): Profile | null {
  const c = data.customers[ci];
  if (c.day > asOf) return null;
  let orders = 0;
  let spend = 0;
  let last = c.day;
  let lastProduct = c.firstProduct;
  const gaps: number[] = [];
  for (let k = c.o0; k < c.o0 + c.n; k++) {
    const o = data.orders[k];
    if (o.day > asOf) break;
    if (orders > 0) gaps.push(o.day - last);
    orders++;
    spend += o.value;
    last = o.day;
    lastProduct = o.product;
  }
  const recency = asOf - last;
  const r = rScore(recency);
  const f = fScore(orders);
  const m = mScore(spend);
  return { ci, c, orders, spend, last, recency, medianGap: median(gaps), lastProduct, r, f, m, segment: segmentFor(r, f, m) };
}

const profileCache = new WeakMap<Dataset, Map<number, Profile[]>>();
/** Every customer who had ordered by `asOf`, profiled on that day. Cached per day. */
export function profilesAt(data: Dataset, asOf = END_DAY): Profile[] {
  let byDay = profileCache.get(data);
  if (!byDay) profileCache.set(data, (byDay = new Map()));
  let list = byDay.get(asOf);
  if (!list) {
    list = [];
    for (let i = 0; i < data.customers.length; i++) {
      const p = profileAt(data, i, asOf);
      if (p) list.push(p);
    }
    byDay.set(asOf, list);
  }
  return list;
}

// ---------------------------------------------------------------------------------------------
// Filters
// ---------------------------------------------------------------------------------------------

export type Filter = { channel: ChannelId | "all"; segment: SegmentId | "all" };
export const ALL: Filter = { channel: "all", segment: "all" };

/** Customers in the filter, as of today. The segment is always today's segment. */
export function select(data: Dataset, f: Filter): Profile[] {
  return profilesAt(data).filter((p) => (f.channel === "all" || p.c.channel === f.channel) && (f.segment === "all" || p.segment === f.segment));
}

export type SegmentRow = {
  id: SegmentId;
  label: string;
  customers: number;
  share: number | null;
  /** Revenue from the segment's orders in the last 365 days. */
  revenue12: number;
  avgSpend: number | null;
  avgOrders: number | null;
  avgRecency: number | null;
};

/** Every segment's size and value inside the channel filter (the segment filter is ignored: this is the picker). */
export function segmentSummary(data: Dataset, channel: Filter["channel"]): SegmentRow[] {
  const ps = select(data, { channel, segment: "all" });
  const from = END_DAY - YEAR + 1;
  return SEGMENTS.map((sg) => {
    const xs = ps.filter((p) => p.segment === sg.id);
    const revenue12 = sum(xs.flatMap((p) => ordersOf(data, p.c).filter((o) => o.day >= from).map((o) => o.value)));
    return {
      id: sg.id,
      label: sg.label,
      customers: xs.length,
      share: ratio(xs.length, ps.length),
      revenue12,
      avgSpend: ratio(sum(xs.map((p) => p.spend)), xs.length),
      avgOrders: ratio(sum(xs.map((p) => p.orders)), xs.length),
      avgRecency: ratio(sum(xs.map((p) => p.recency)), xs.length),
    };
  });
}

/** Customer counts on the R (rows, 5 → 1) × F (columns, 1 → 5) grid. */
export function rfmGrid(ps: Profile[]): number[][] {
  const grid = [5, 4, 3, 2, 1].map(() => [0, 0, 0, 0, 0]);
  for (const p of ps) grid[5 - p.r][p.f - 1]++;
  return grid;
}

// ---------------------------------------------------------------------------------------------
// Retention KPIs
// ---------------------------------------------------------------------------------------------

export type Kpis = {
  customers: number;
  orders: number;
  revenue: number;
  aov: number | null;
  ordersPerCustomer: number | null;
  /** Customers acquired at least REPEAT_WINDOW days ago, and how many of them ordered again (ever / within 90 days). */
  repeatBase: number;
  repeatRate: number | null;
  repeat90: number | null;
  /** Customers acquired more than CHURN_DAYS ago; churned = no order in the last CHURN_DAYS. */
  churnBase: number;
  churnRate: number | null;
  retentionRate: number | null;
  /** Customers acquired at least a year ago, and their first-year revenue per customer. */
  clvBase: number;
  clvRevenue: number | null;
  clvMargin: number | null;
};

/** The KPIs for a set of profiles, all measured as of `asOf`. */
export function kpis(data: Dataset, ps: Profile[], asOf = END_DAY): Kpis {
  let orders = 0;
  let revenue = 0;
  let repeatBase = 0;
  let repeated = 0;
  let repeated90 = 0;
  let churnBase = 0;
  let churned = 0;
  let clvBase = 0;
  let clvSum = 0;
  for (const p of ps) {
    orders += p.orders;
    revenue += p.spend;
    const age = asOf - p.c.day;
    if (age >= REPEAT_WINDOW) {
      repeatBase++;
      if (p.orders >= 2) repeated++;
      const second = p.c.n >= 2 ? data.orders[p.c.o0 + 1] : null;
      if (second && second.day <= asOf && second.day - p.c.day <= REPEAT_WINDOW) repeated90++;
    }
    if (age > CHURN_DAYS) {
      churnBase++;
      if (p.recency > CHURN_DAYS) churned++;
    }
    if (age >= YEAR) {
      clvBase++;
      clvSum += firstYearRevenue(data, p.c);
    }
  }
  const churnRate = ratio(churned, churnBase);
  const clvRevenue = ratio(clvSum, clvBase);
  return {
    customers: ps.length,
    orders,
    revenue,
    aov: ratio(revenue, orders),
    ordersPerCustomer: ratio(orders, ps.length),
    repeatBase,
    repeatRate: ratio(repeated, repeatBase),
    repeat90: ratio(repeated90, repeatBase),
    churnBase,
    churnRate,
    retentionRate: churnRate === null ? null : 1 - churnRate,
    clvBase,
    clvRevenue,
    clvMargin: clvRevenue === null ? null : clvRevenue * GROSS_MARGIN,
  };
}

/** Revenue from a customer's first 365 days (first order included). */
export function firstYearRevenue(data: Dataset, c: Customer): number {
  let v = 0;
  for (let k = c.o0; k < c.o0 + c.n; k++) {
    const o = data.orders[k];
    if (o.day - c.day >= YEAR) break;
    v += o.value;
  }
  return v;
}

/** The same customers' KPIs 90 days earlier (customers who hadn't ordered yet drop out). */
export function kpisEarlier(data: Dataset, ps: Profile[], days = 90): Kpis {
  const asOf = END_DAY - days;
  const earlier = ps.map((p) => profileAt(data, p.ci, asOf)).filter((p): p is Profile => p !== null);
  return kpis(data, earlier, asOf);
}

// ---------------------------------------------------------------------------------------------
// Cohorts and revenue over time
// ---------------------------------------------------------------------------------------------

export const COHORT_OFFSETS = 12;

export type Cohorts = {
  /** Acquisition month index for each row. */
  months: number[];
  sizes: number[];
  /** values[row][k − 1] = share of the cohort ordering in month (cohort + k); null where that month is still to come. */
  values: (number | null)[][];
};

export function cohorts(data: Dataset, ps: Profile[]): Cohorts {
  const sizes = Array.from({ length: MONTHS }, () => 0);
  const active = Array.from({ length: MONTHS }, () => Array.from({ length: COHORT_OFFSETS }, () => 0));
  for (const p of ps) {
    const m0 = monthIndex(p.c.day);
    sizes[m0]++;
    const seen = new Set<number>();
    for (const o of ordersOf(data, p.c)) {
      const k = monthIndex(o.day) - m0;
      if (k >= 1 && k <= COHORT_OFFSETS && !seen.has(k)) {
        seen.add(k);
        active[m0][k - 1]++;
      }
    }
  }
  const months: number[] = [];
  const values: (number | null)[][] = [];
  for (let m = 0; m < MONTHS; m++) {
    if (!sizes[m]) continue;
    months.push(m);
    values.push(active[m].map((n, k) => (m + k + 1 < MONTHS ? ratio(n, sizes[m]) : null)));
  }
  return { months, sizes: months.map((m) => sizes[m]), values };
}

/** Average retention at each month offset, weighted by cohort size, over cohorts that have reached it. */
export function averageCurve(c: Cohorts): (number | null)[] {
  return Array.from({ length: COHORT_OFFSETS }, (_, k) => {
    let n = 0;
    let w = 0;
    c.values.forEach((row, i) => {
      const v = row[k];
      if (isNum(v)) {
        n += v * c.sizes[i];
        w += c.sizes[i];
      }
    });
    return ratio(n, w);
  });
}

/** Revenue per month from first orders (new) and from every later order (returning). */
export function revenueByMonth(data: Dataset, ps: Profile[]): { fresh: number[]; returning: number[] } {
  const fresh = Array.from({ length: MONTHS }, () => 0);
  const returning = Array.from({ length: MONTHS }, () => 0);
  for (const p of ps) for (const o of ordersOf(data, p.c)) (o.seq === 1 ? fresh : returning)[monthIndex(o.day)] += o.value;
  return { fresh, returning };
}

// ---------------------------------------------------------------------------------------------
// Behaviour
// ---------------------------------------------------------------------------------------------

export type Bucket = { id: string; label: string; value: number };

function bucketise(values: number[], edges: { label: string; max: number }[]): Bucket[] {
  const counts = edges.map(() => 0);
  for (const v of values) {
    const i = edges.findIndex((e) => v <= e.max);
    counts[i < 0 ? edges.length - 1 : i]++;
  }
  return edges.map((e, i) => ({ id: e.label, label: e.label, value: counts[i] }));
}

export function frequencyBuckets(ps: Profile[]): Bucket[] {
  return bucketise(
    ps.map((p) => p.orders),
    [
      { label: "1 order", max: 1 },
      { label: "2 orders", max: 2 },
      { label: "3 orders", max: 3 },
      { label: "4 orders", max: 4 },
      { label: "5–7 orders", max: 7 },
      { label: "8+ orders", max: Infinity },
    ],
  );
}

/** Every gap between consecutive orders of the selected customers. */
export function gaps(data: Dataset, ps: Profile[]): number[] {
  const out: number[] = [];
  for (const p of ps) {
    const os = ordersOf(data, p.c);
    for (let k = 1; k < os.length; k++) out.push(os[k].day - os[k - 1].day);
  }
  return out;
}

export function gapBuckets(gs: number[]): Bucket[] {
  return bucketise(gs, [
    { label: "0–15 days", max: 15 },
    { label: "16–30 days", max: 30 },
    { label: "31–45 days", max: 45 },
    { label: "46–60 days", max: 60 },
    { label: "61–90 days", max: 90 },
    { label: "91–180 days", max: 180 },
    { label: "180+ days", max: Infinity },
  ]);
}

export function recencyBuckets(ps: Profile[]): Bucket[] {
  return bucketise(
    ps.map((p) => p.recency),
    [
      { label: "0–30 days", max: 30 },
      { label: "31–60 days", max: 60 },
      { label: "61–90 days", max: 90 },
      { label: "91–180 days", max: 180 },
      { label: "181–365 days", max: 365 },
      { label: "365+ days", max: Infinity },
    ],
  );
}

export type RepeatRow = { id: string; label: string; base: number; rate: number | null; firstYear: number | null };

/** Repeat rate and first-year revenue by a grouping of customers (mature customers only). */
function repeatBy<K extends string>(data: Dataset, ps: Profile[], keys: { id: K; label: string }[], keyOf: (p: Profile) => K): RepeatRow[] {
  return keys.map((k) => {
    const xs = ps.filter((p) => keyOf(p) === k.id && END_DAY - p.c.day >= REPEAT_WINDOW);
    const year = ps.filter((p) => keyOf(p) === k.id && END_DAY - p.c.day >= YEAR);
    return {
      id: k.id,
      label: k.label,
      base: xs.length,
      rate: xs.length >= 30 ? ratio(xs.filter((p) => p.orders >= 2).length, xs.length) : null,
      firstYear: year.length >= 30 ? ratio(sum(year.map((p) => firstYearRevenue(data, p.c))), year.length) : null,
    };
  });
}

export function repeatByProduct(data: Dataset, ps: Profile[]): RepeatRow[] {
  return repeatBy(data, ps, PRODUCTS, (p) => p.c.firstProduct);
}

export function repeatByChannel(data: Dataset, ps: Profile[]): RepeatRow[] {
  return repeatBy(data, ps, CHANNELS, (p) => p.c.channel);
}

/** How the selected customers moved between segments over the last `days` days. Rows: then (plus "not yet a customer"); columns: now. */
export function segmentFlow(data: Dataset, ps: Profile[], days = 90): { from: string[]; to: string[]; counts: number[][] } {
  const asOf = END_DAY - days;
  const idx = new Map(SEGMENTS.map((s, i) => [s.id, i]));
  const counts = Array.from({ length: SEGMENTS.length + 1 }, () => SEGMENTS.map(() => 0));
  for (const p of ps) {
    const then = profileAt(data, p.ci, asOf);
    const row = then ? (idx.get(then.segment) as number) : SEGMENTS.length;
    counts[row][idx.get(p.segment) as number]++;
  }
  return { from: [...SEGMENTS.map((s) => s.label), "Not yet a customer"], to: SEGMENTS.map((s) => s.label), counts };
}

export const segmentLabel = (id: SegmentId) => SEGMENTS.find((s) => s.id === id)?.label ?? id;
