/**
 * Planning and reading an A/B test honestly.
 *
 *  - plan(): how many visitors each variant needs to detect a chosen minimum detectable effect
 *    (MDE), and how many days that takes at the page's real traffic.
 *  - analyse(): the result, checked in the order a careful analyst would: is the traffic split
 *    trustworthy (sample-ratio mismatch), was the planned sample reached, did it run a full week,
 *    is the difference significant, and was there enough power to see the effect we cared about.
 *    It will not call a winner on a test that stopped early, however good the numbers look.
 */

import { isNum } from "../shared/lib/safe-math.ts";
import { formatNumber, formatPercent, formatPoints } from "../shared/lib/format.ts";
import { normalCdf, normalQuantile, sampleSizePerVariant, twoProportionTest, wilsonInterval, type ProportionTest } from "../shared/lib/stats.ts";
import type { Status } from "../shared/lib/palette.ts";

/* ---- Hypothesis ------------------------------------------------------------------------------ */

export type Hypothesis = {
  /** What the data showed ("Because we saw …"). */
  observation: string;
  /** The change to make ("… we believe changing …"). */
  change: string;
  /** Who it is for ("… for …"). */
  audience: string;
  /** What should move ("… will increase …"). */
  metric: string;
  control: string;
  variation: string;
};

export const EMPTY_HYPOTHESIS: Hypothesis = { observation: "", change: "", audience: "", metric: "", control: "", variation: "" };

export function hypothesisText(h: Hypothesis): string {
  const or = (v: string, fallback: string) => (v.trim() ? v.trim() : fallback);
  return `Because we saw ${or(h.observation, "[what the data shows]")}, we believe ${or(h.change, "[the change]")} for ${or(h.audience, "[which visitors]")} will increase ${or(h.metric, "[the metric]")}.`;
}

/** Which parts of a hypothesis are still empty (a test shouldn't start until none are). */
export function missingParts(h: Hypothesis): string[] {
  const names: [keyof Hypothesis, string][] = [
    ["observation", "the observation"],
    ["change", "the change"],
    ["audience", "the audience"],
    ["metric", "the metric"],
    ["control", "the control"],
    ["variation", "the variation"],
  ];
  return names.filter(([k]) => !h[k].trim()).map(([, n]) => n);
}

/* ---- Planning ------------------------------------------------------------------------------- */

export type PlanInput = {
  /** Current rate of the primary metric (0–1). */
  baseline: number | null;
  /** Smallest relative lift worth detecting (0.15 = +15%). */
  mde: number;
  alpha: number;
  power: number;
  /** Visitors per day on the page. */
  daily: number;
  /** Share of the page's traffic entered into the test (0–1). */
  share: number;
};

export type Plan = {
  perVariant: number;
  total: number;
  dailyInTest: number;
  /** Days to reach the sample at today's traffic. */
  days: number;
  /** Days rounded up to whole weeks, at least two weeks (weekday and weekend visitors behave differently). */
  recommendedDays: number;
  /** The rate the variation would need to reach. */
  target: number;
  tooLong: boolean;
};

export const MAX_DAYS = 42; // six weeks: beyond this, cookies churn and the season changes under the test
export const MIN_DAYS = 14;

export function plan(p: PlanInput): Plan | null {
  if (!isNum(p.baseline) || p.daily <= 0 || p.share <= 0) return null;
  const perVariant = sampleSizePerVariant(p.baseline, p.mde, p.alpha, p.power);
  if (perVariant === null) return null;
  const total = perVariant * 2;
  const dailyInTest = p.daily * p.share;
  const days = Math.ceil(total / dailyInTest);
  const recommendedDays = Math.max(MIN_DAYS, Math.ceil(days / 7) * 7);
  return { perVariant, total, dailyInTest, days, recommendedDays, target: p.baseline * (1 + p.mde), tooLong: recommendedDays > MAX_DAYS };
}

/** The smallest relative lift detectable within `maxDays` (searching MDE in 1% steps), or null if none up to +200%. */
export function detectableIn(p: Omit<PlanInput, "mde">, maxDays = MAX_DAYS): number | null {
  for (let m = 0.01; m <= 2.0001; m += 0.01) {
    const r = plan({ ...p, mde: m });
    if (r && r.recommendedDays <= maxDays) return Math.round(m * 100) / 100;
  }
  return null;
}

/* ---- Analysis ------------------------------------------------------------------------------- */

export type Results = {
  visitorsA: number;
  convA: number;
  visitorsB: number;
  convB: number;
  /** Planned visitors per variant (from the builder). */
  planned: number;
  /** Planned share of traffic sent to B (0.5 for an even split). */
  splitB: number;
  daysRun: number;
  /** The relative lift the test was planned to detect. */
  mde: number;
  alpha: number;
};

export type Check = { id: string; label: string; ok: boolean; detail: string };
export type VerdictKind = "invalid" | "early" | "winner" | "loser" | "flat" | "inconclusive";

export type Analysis = {
  kind: VerdictKind;
  status: Status;
  headline: string;
  body: string;
  test: ProportionTest;
  ciA: { low: number; high: number };
  ciB: { low: number; high: number };
  /** p-value of the sample-ratio check (chi-square, 1 df). */
  srmP: number;
  /** Power the test actually had to detect the planned MDE. */
  powerReached: number;
  reached: boolean;
  checks: Check[];
};

export const SRM_ALPHA = 0.001;

/** Chi-square goodness-of-fit (1 df) on the visitor split: a tiny p means the split is broken. */
export function srmTest(nA: number, nB: number, splitB = 0.5): number {
  const n = nA + nB;
  if (n <= 0 || splitB <= 0 || splitB >= 1) return 1;
  const eA = n * (1 - splitB);
  const eB = n * splitB;
  const chi2 = (nA - eA) ** 2 / eA + (nB - eB) ** 2 / eB;
  return 2 * (1 - normalCdf(Math.sqrt(chi2)));
}

/** Power to detect a relative lift `mde` on `baseline` with these sample sizes (two-sided). */
export function powerFor(baseline: number, mde: number, nA: number, nB: number, alpha = 0.05): number {
  const p2 = baseline * (1 + mde);
  if (nA <= 0 || nB <= 0 || baseline <= 0 || baseline >= 1 || p2 <= 0 || p2 >= 1) return 0;
  const se = Math.sqrt((baseline * (1 - baseline)) / nA + (p2 * (1 - p2)) / nB);
  const z = normalQuantile(1 - alpha / 2);
  return normalCdf(Math.abs(p2 - baseline) / se - z);
}

export function validate(r: Results): string | null {
  const ints = [r.visitorsA, r.convA, r.visitorsB, r.convB];
  if (ints.some((v) => !isNum(v) || v < 0 || !Number.isInteger(v))) return "Enter whole numbers of zero or more for visitors and conversions.";
  if (r.visitorsA === 0 || r.visitorsB === 0) return "Each variant needs at least one visitor.";
  if (r.convA > r.visitorsA || r.convB > r.visitorsB) return "A variant can't have more conversions than visitors.";
  if (!isNum(r.daysRun) || r.daysRun < 1) return "Enter how many days the test has run (1 or more).";
  return null;
}

export function analyse(r: Results): Analysis | { error: string } {
  const err = validate(r);
  if (err) return { error: err };
  const test = twoProportionTest(r.convA, r.visitorsA, r.convB, r.visitorsB, 1 - r.alpha) as ProportionTest;
  const ciA = wilsonInterval(r.convA, r.visitorsA, 1 - r.alpha) as { low: number; high: number };
  const ciB = wilsonInterval(r.convB, r.visitorsB, 1 - r.alpha) as { low: number; high: number };
  const srmP = srmTest(r.visitorsA, r.visitorsB, r.splitB);
  const powerReached = powerFor(test.rateA, r.mde, r.visitorsA, r.visitorsB, r.alpha);
  const reached = Math.min(r.visitorsA, r.visitorsB) >= r.planned;
  const fullWeek = r.daysRun >= 7;
  const significant = test.pValue < r.alpha;
  const srmOk = srmP >= SRM_ALPHA;
  const peeked = significant && (!reached || !fullWeek);
  const conf = formatPercent(1 - r.alpha, { dp: 0 });
  const expectedB = formatPercent(r.splitB, { dp: 0 });

  const checks: Check[] = [
    {
      id: "srm",
      label: "Traffic split matches the plan",
      ok: srmOk,
      detail: `B received ${formatPercent(r.visitorsB / (r.visitorsA + r.visitorsB))} of visitors against a planned ${expectedB} (sample-ratio check p = ${formatP(srmP)}; a broken split is p < 0.001).`,
    },
    {
      id: "sample",
      label: "Planned sample reached",
      ok: reached,
      detail: `${formatNumber(Math.min(r.visitorsA, r.visitorsB))} visitors in the smaller variant of ${formatNumber(r.planned)} planned (${formatPercent(Math.min(r.visitorsA, r.visitorsB) / Math.max(1, r.planned), { dp: 0 })}).`,
    },
    { id: "week", label: "Ran at least one full week", ok: fullWeek, detail: `${formatNumber(r.daysRun)} day${r.daysRun === 1 ? "" : "s"} so far; weekday and weekend visitors behave differently.` },
    {
      id: "sig",
      label: `Significant at ${conf} confidence`,
      ok: significant,
      detail: `p = ${formatP(test.pValue)} (needs to be below ${r.alpha}).`,
    },
    {
      id: "power",
      label: "Enough power to see the planned effect",
      ok: powerReached >= 0.8,
      detail: `${formatPercent(powerReached, { dp: 0 })} chance of detecting a ${formatPercent(r.mde, { dp: 0 })} lift with this many visitors (80% is the usual bar).`,
    },
    {
      id: "peek",
      label: "Not stopped on an early peek",
      ok: !peeked,
      detail: peeked
        ? "The difference looks significant before the test finished. Checking repeatedly and stopping at the first significant look makes false winners far more likely."
        : "No early stop on a significant result.",
    },
  ];

  const lift = test.relativeLift;
  const liftText = isNum(lift) ? formatPercent(lift, { signed: true }) : formatPoints(test.absoluteLift);
  const ci = `${formatPoints(test.diffInterval.low)} to ${formatPoints(test.diffInterval.high)}`;
  const base = { test, ciA, ciB, srmP, powerReached, reached, checks };

  if (!srmOk) {
    return {
      ...base,
      kind: "invalid",
      status: "critical",
      headline: "Don't trust this result: the traffic split is broken",
      body: `The test was meant to send ${expectedB} of visitors to B, but the split is too far off to be chance. Something (a redirect, a bot filter, a tracking bug) is treating the variants differently, so the conversion rates can't be compared. Find and fix the cause, then restart the test.`,
    };
  }
  if (!reached || !fullWeek) {
    return {
      ...base,
      kind: "early",
      status: "warning",
      headline: significant ? "Looks like a winner, but it's too early to say" : "Too early to read",
      body: significant
        ? `B is ${liftText} against A and p = ${formatP(test.pValue)}, but only ${formatPercent(Math.min(r.visitorsA, r.visitorsB) / r.planned, { dp: 0 })} of the planned sample is in${fullWeek ? "" : " and it hasn't run a full week"}. Early results swing a lot; stopping now on a good-looking peek is how false winners get shipped. Keep it running to the planned ${formatNumber(r.planned)} visitors per variant.`
        : `Only ${formatPercent(Math.min(r.visitorsA, r.visitorsB) / r.planned, { dp: 0 })} of the planned sample is in. The difference so far (${liftText}) could easily change. Keep the test running to ${formatNumber(r.planned)} visitors per variant${fullWeek ? "" : " and at least a full week"}.`,
    };
  }
  if (significant && test.absoluteLift > 0) {
    return {
      ...base,
      kind: "winner",
      status: "good",
      headline: `B wins: ${liftText} conversion`,
      body: `With the planned sample reached and a clean split, B converts better than A (p = ${formatP(test.pValue)}). The true difference is most likely between ${ci}. Ship B, and keep watching the qualified-lead rate: more form fills only help if they are good leads.`,
    };
  }
  if (significant) {
    return {
      ...base,
      kind: "loser",
      status: "serious",
      headline: `B loses: ${liftText} conversion`,
      body: `B converts worse than A (p = ${formatP(test.pValue)}); the difference is most likely between ${ci}. Keep A. A losing test is still a result: write down what it tells you about these visitors before the next idea.`,
    };
  }
  if (powerReached >= 0.8) {
    return {
      ...base,
      kind: "flat",
      status: "info",
      headline: "No meaningful difference",
      body: `The test had a good chance to detect a ${formatPercent(r.mde, { dp: 0 })} lift and didn't find one (p = ${formatP(test.pValue)}; the difference is most likely between ${ci}). Any real effect is probably smaller than you planned for. Keep whichever is simpler to maintain and test a bolder change.`,
    };
  }
  return {
    ...base,
    kind: "inconclusive",
    status: "warning",
    headline: "Inconclusive: the test was too small for the effect",
    body: `The planned sample is in, but it only had a ${formatPercent(powerReached, { dp: 0 })} chance of detecting a ${formatPercent(r.mde, { dp: 0 })} lift at this baseline. "Not significant" here doesn't mean "no effect". Re-plan with a larger sample or a bigger change.`,
  };
}

export function formatP(p: number): string {
  if (!isNum(p)) return "—";
  if (p < 0.0001) return "< 0.0001";
  return p < 0.01 ? p.toFixed(4) : p.toFixed(3);
}

/* ---- Presets -------------------------------------------------------------------------------- */

/** Every preset is planned the same way: a 4% baseline, a +20% MDE, 95% confidence, 80% power. */
export const PRESET_BASELINE = 0.04;
export const PRESET_MDE = 0.2;
export const PRESET_PLANNED = sampleSizePerVariant(PRESET_BASELINE, PRESET_MDE, 0.05, 0.8) as number;

export type Preset = { id: string; label: string; story: string; results: Omit<Results, "planned" | "mde" | "alpha" | "splitB"> };

export const PRESETS: Preset[] = [
  {
    id: "winner",
    label: "Clear winner",
    story: "Pricing page: a shorter form with no card details up front, run for four weeks to the planned sample.",
    results: { visitorsA: 12400, convA: 496, visitorsB: 12350, convB: 605, daysRun: 28 },
  },
  {
    id: "early",
    label: "Early peek",
    story: "Free trial: a new headline, checked after four days. It looks like a big win.",
    results: { visitorsA: 820, convA: 29, visitorsB: 815, convB: 47, daysRun: 4 },
  },
  {
    id: "srm",
    label: "Broken split",
    story: "Home page: a new hero, where the variation's redirect quietly drops some visitors.",
    results: { visitorsA: 12000, convA: 480, visitorsB: 11200, convB: 470, daysRun: 28 },
  },
  {
    id: "flat",
    label: "No difference",
    story: "Book a demo: a green button instead of a violet one.",
    results: { visitorsA: 12100, convA: 486, visitorsB: 12080, convB: 492, daysRun: 28 },
  },
  {
    id: "loser",
    label: "Clear loser",
    story: "Compare page: a pop-up offering a guide, shown after five seconds.",
    results: { visitorsA: 12200, convA: 500, visitorsB: 12150, convB: 420, daysRun: 28 },
  },
];

export function presetResults(p: Preset): Results {
  return { ...p.results, planned: PRESET_PLANNED, mde: PRESET_MDE, alpha: 0.05, splitB: 0.5 };
}
