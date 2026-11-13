/**
 * Every conversion metric in the studio, defined once:
 *
 *  - Bounce rate        = visitors who left without engaging ÷ visitors
 *  - CTA click rate     = visitors who clicked the main call to action ÷ visitors
 *  - Form completion    = form submissions ÷ form starts
 *  - Conversion rate    = form submissions ÷ visitors
 *  - Qualified lead rate = qualified leads ÷ visitors
 *
 * A step's rate is only judged with at least MIN_N people entering it; below that it reads as
 * "not enough data" (null), never as a confident number. Every ratio goes through ratio().
 */

import { isNum, ratio, sum } from "../shared/lib/safe-math.ts";
import type { Dataset, Row } from "./generate.ts";
import { DAYS, DEVICES, PAGES, STAGES, STEPS, type DeviceId, type PageId, type SourceId } from "./model.ts";

export const MIN_N = 100;

export type Filter = { device: DeviceId | "all"; source: SourceId | "all" };
export const ALL: Filter = { device: "all", source: "all" };

/** Stage counts in STAGES order, plus total scroll. */
export type Counts = { stages: [number, number, number, number, number, number]; scrollSum: number };

const KEYS = ["visitors", "engaged", "cta", "start", "submit", "qualified"] as const;

export function matches(r: Row, f: Filter, page?: PageId | "all", device?: DeviceId): boolean {
  if (page && page !== "all" && r.page !== page) return false;
  if (device && r.device !== device) return false;
  if (f.device !== "all" && r.device !== f.device) return false;
  if (f.source !== "all" && r.source !== f.source) return false;
  return true;
}

export function count(data: Dataset, f: Filter, page: PageId | "all" = "all", device?: DeviceId): Counts {
  const stages: Counts["stages"] = [0, 0, 0, 0, 0, 0];
  let scrollSum = 0;
  for (const r of data.rows) {
    if (!matches(r, f, page, device)) continue;
    KEYS.forEach((k, i) => (stages[i] += r[k]));
    scrollSum += r.scrollSum;
  }
  return { stages, scrollSum };
}

/** The five step rates (each stage ÷ the one before), null where fewer than `min` entered the step. */
export function stepRates(c: Counts, min = MIN_N): (number | null)[] {
  return STEPS.map((_, i) => (c.stages[i] >= min ? ratio(c.stages[i + 1], c.stages[i]) : null));
}

export type PageStats = {
  id: PageId;
  label: string;
  path: string;
  visitors: number;
  daily: number;
  bounce: number | null;
  ctaRate: number | null;
  formCompletion: number | null;
  conversion: number | null;
  leadRate: number | null;
  submits: number;
  qualified: number;
  scroll: number | null;
  share: number | null;
};

export function pageStats(data: Dataset, f: Filter): PageStats[] {
  const site = count(data, f).stages[0];
  return PAGES.map((p) => {
    const c = count(data, f, p.id);
    const [v, e, cta, start, submit, q] = c.stages;
    return {
      id: p.id,
      label: p.label,
      path: p.path,
      visitors: v,
      daily: v / DAYS,
      bounce: ratio(v - e, v),
      ctaRate: ratio(cta, v),
      formCompletion: start >= MIN_N / 4 ? ratio(submit, start) : null,
      conversion: ratio(submit, v),
      leadRate: ratio(q, v),
      submits: submit,
      qualified: q,
      scroll: ratio(c.scrollSum, v),
      share: ratio(v, site),
    };
  });
}

export function siteStats(data: Dataset, f: Filter) {
  const c = count(data, f);
  const [v, e, cta, start, submit, q] = c.stages;
  return {
    visitors: v,
    daily: v / DAYS,
    bounce: ratio(v - e, v),
    ctaRate: ratio(cta, v),
    formCompletion: ratio(submit, start),
    conversion: ratio(submit, v),
    leadRate: ratio(q, v),
    submits: submit,
    qualified: q,
  };
}

/** Median of the real numbers in a list, or null. */
export function median(values: readonly (number | null)[]): number | null {
  const xs = values.filter(isNum).sort((a, b) => a - b);
  if (!xs.length) return null;
  const m = Math.floor(xs.length / 2);
  return xs.length % 2 ? xs[m] : (xs[m - 1] + xs[m]) / 2;
}

/** The site median for each step: the middle page's rate, so one huge page can't set the benchmark. */
export function siteMedianRates(data: Dataset, f: Filter): (number | null)[] {
  const perPage = PAGES.map((p) => stepRates(count(data, f, p.id)));
  return STEPS.map((_, i) => median(perPage.map((r) => r[i])));
}

/**
 * Extra qualified leads if step `i` converted at `target` instead of its own rate, with every later
 * step unchanged. Zero when the step already beats the target; null when a rate is missing.
 */
export function recovered(c: Counts, rates: (number | null)[], i: number, target: number | null): number | null {
  const r = rates[i];
  if (!isNum(r) || !isNum(target)) return null;
  if (r >= target) return 0;
  let extra = c.stages[i] * (target - r);
  for (let k = i + 1; k < rates.length; k++) {
    const next = isNum(rates[k]) ? (rates[k] as number) : ratio(c.stages[k + 1], c.stages[k]);
    if (!isNum(next)) return null;
    extra *= next;
  }
  return extra;
}

export type StepView = {
  step: string;
  index: number;
  entered: number;
  rate: number | null;
  median: number | null;
  /** Relative shortfall against the median (0.3 = 30% below); negative when better. */
  gap: number | null;
  /** Extra qualified leads over the window if this step reached the median. */
  recovered: number | null;
};

export type Journey = {
  page: PageId;
  counts: Counts;
  rates: (number | null)[];
  steps: StepView[];
  /** Index (0–4) of the step that falls furthest below the site median, or null if none does. */
  worst: number | null;
  /** Per device: counts and step rates. */
  devices: { id: DeviceId; label: string; counts: Counts; rates: (number | null)[]; conversion: number | null; scroll: number | null }[];
};

export function journey(data: Dataset, f: Filter, page: PageId): Journey {
  const counts = count(data, f, page);
  const rates = stepRates(counts);
  const med = siteMedianRates(data, f);
  const steps: StepView[] = STEPS.map((step, i) => {
    const gap = isNum(rates[i]) && isNum(med[i]) && (med[i] as number) > 0 ? ((med[i] as number) - (rates[i] as number)) / (med[i] as number) : null;
    return { step, index: i, entered: counts.stages[i], rate: rates[i], median: med[i], gap, recovered: recovered(counts, rates, i, med[i]) };
  });
  let worst: number | null = null;
  let biggest = 0.1; // ignore shortfalls under 10%: that's noise and normal variation between pages
  steps.forEach((s) => {
    if (isNum(s.gap) && s.gap > biggest) {
      biggest = s.gap;
      worst = s.index;
    }
  });
  const devices = DEVICES.filter((d) => f.device === "all" || f.device === d.id).map((d) => {
    const c = count(data, f, page, d.id);
    return { id: d.id, label: d.label, counts: c, rates: stepRates(c), conversion: ratio(c.stages[4], c.stages[0]), scroll: ratio(c.scrollSum, c.stages[0]) };
  });
  return { page, counts, rates, steps, worst, devices };
}

/** Daily visitors and the baseline of a metric on a page, for planning a test there. */
export type TestMetric = "conversion" | "leadRate" | "ctaRate";
export const TEST_METRICS: { value: TestMetric; label: string; stage: number }[] = [
  { value: "conversion", label: "Form submissions per visitor", stage: 4 },
  { value: "leadRate", label: "Qualified leads per visitor", stage: 5 },
  { value: "ctaRate", label: "CTA clicks per visitor", stage: 2 },
];

export function baselineFor(data: Dataset, f: Filter, page: PageId, metric: TestMetric): { daily: number; rate: number | null } {
  const c = count(data, f, page);
  const stage = (TEST_METRICS.find((m) => m.value === metric) as { stage: number }).stage;
  return { daily: c.stages[0] / DAYS, rate: ratio(c.stages[stage], c.stages[0]) };
}

export const stageLabel = (i: number) => STAGES[i].label;
export const totalVisitors = (data: Dataset) => sum(data.rows.map((r) => r.visitors));
