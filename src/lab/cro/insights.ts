/**
 * The CRO assistant: a rule engine over the journey metrics, not a language model. Each rule has a
 * minimum sample, each fix is scored with ICE (Impact, Confidence, Ease, each 1–10) from numbers it
 * can show, and each comes with a ready-to-test hypothesis. Headline and CTA alternatives are written
 * from per-page templates; they are starting points for a test, not predictions.
 */

import { clamp, isNum, ratio } from "../shared/lib/safe-math.ts";
import { formatNumber, formatPercent } from "../shared/lib/format.ts";
import { twoProportionTest } from "../shared/lib/stats.ts";
import type { Finding } from "../shared/lib/finding.ts";
import type { Hypothesis } from "./experiment.ts";
import type { Dataset } from "./generate.ts";
import { DEVICES, PAGES, SOURCES, STEPS, pageOf, type DeviceId, type PageId } from "./model.ts";
import { count, journey, pageStats, recovered, siteStats, stepRates, type Filter, type TestMetric } from "./metrics.ts";

export const MIN_STEP_N = 300; // people entering a step before a page-vs-site gap is judged
export const MIN_DEVICE_N = 150; // per device, before a device gap is judged
export const GAP = 0.2; // a step at least 20% below the site median
export const DEVICE_RATIO = 0.6; // mobile below 60% of desktop at the same step

export type Ice = { impact: number; confidence: number; ease: number; score: number };

export type Fix = {
  finding: Finding;
  ice: Ice;
  page: PageId;
  step: number;
  metric: TestMetric;
  hypothesis: Hypothesis;
};

/** How easy each step usually is to change: copy and buttons are quick; speed and lead quality are slow. */
const EASE = [4, 8, 7, 6, 4];
const EASE_WHY = [
  "page weight and layout work, needs a developer",
  "copy and button changes, no developer needed",
  "moving the form onto the page, small build",
  "removing form fields, small build plus a CRM mapping check",
  "targeting and qualification changes, needs sales to agree",
];

/** Confidence from the evidence's strength: how surely the gap isn't chance. */
function confidenceFrom(p: number | null): number {
  if (!isNum(p)) return 3;
  if (p < 0.0001) return 9;
  if (p < 0.001) return 8;
  if (p < 0.01) return 6;
  if (p < 0.05) return 4;
  return 2;
}

/** Impact from the qualified leads a fix could recover, as a share of the site's qualified leads. */
function impactFrom(leads: number | null, siteQualified: number): number {
  const share = ratio(leads, siteQualified);
  if (!isNum(share) || share <= 0) return 1;
  return clamp(Math.ceil((share * 100) / 1.5), 1, 10); // 15% of the site's leads or more scores 10
}

function ice(impact: number, confidence: number, ease: number): Ice {
  return { impact, confidence, ease, score: Math.round(((impact + confidence + ease) / 3) * 10) / 10 };
}

/** "Engage → CTA click" → "engage → CTA click" (only the first letter, so acronyms survive). */
const lower = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);

const statusFor = (score: number) => (score >= 7 ? "serious" : score >= 5 ? "warning" : "info");

/** What change to test at each step, worded for the page. */
function changeFor(pageId: PageId, step: number, device: DeviceId | null): { change: string; variation: string } {
  const p = pageOf(pageId);
  const essentials = Math.min(4, Math.max(3, Math.ceil(p.fields / 3)));
  switch (step) {
    case 0:
      return pageId === "compare" && device === "mobile"
        ? {
            change: `a mobile layout that replaces the full comparison table with a three-row summary and loads in under 2.5 seconds (it takes ${p.mobileLcp} s today)`,
            variation: "Mobile: a three-row comparison summary with 'See the full table' expanding below; images lazy-loaded.",
          }
        : { change: "a lighter page whose main message and CTA sit above the fold and which loads in under 2.5 seconds", variation: "The same page with a shorter hero, compressed images and the CTA above the fold." };
    case 1:
      return { change: `a benefit-led CTA that says what happens next, repeated after each section, instead of a single '${p.cta}'`, variation: "A CTA naming the outcome, repeated after each section." };
    case 2:
      return { change: "starting the form right on the page instead of on a separate step", variation: "The first two form fields embedded under the CTA." };
    case 3:
      return pageId === "pricing"
        ? { change: `a ${essentials}-field form that asks for card details only after the account is created (it has ${p.fields} fields today)`, variation: `A ${essentials}-field form; card details moved to after sign-up.` }
        : { change: `cutting the form from ${p.fields} fields to the ${essentials} essentials${device === "mobile" ? ", with mobile keyboards matched to each field" : ""}`, variation: `A ${essentials}-field form; the rest asked later in onboarding.` };
    default:
      return { change: "a qualifying question (team size) and a clearer 'who it's for' line above the form", variation: "The form with a team-size question and a 'Built for teams of 2–50' line." };
  }
}

const METRIC_FOR: TestMetric[] = ["conversion", "conversion", "conversion", "conversion", "leadRate"];
const METRIC_WORDS: Record<TestMetric, string> = { conversion: "form submissions per visitor", leadRate: "qualified leads per visitor", ctaRate: "CTA clicks per visitor" };

function audienceWords(f: Filter, device: DeviceId | null): string {
  const d = device ?? (f.device === "all" ? null : f.device);
  const dev = d ? `${(DEVICES.find((x) => x.id === d) as { label: string }).label.toLowerCase()} visitors` : "visitors";
  const src = f.source === "all" ? "" : ` from ${(SOURCES.find((x) => x.id === f.source) as { label: string }).label.toLowerCase()}`;
  return dev + src;
}

export function runAssistant(data: Dataset, f: Filter): Fix[] {
  const site = siteStats(data, f);
  const stats = pageStats(data, f);
  const fixes: Fix[] = [];

  for (const p of PAGES) {
    const j = journey(data, f, p.id);
    const ps = stats.find((s) => s.id === p.id);
    const lowIntent =
      ps && isNum(ps.share) && ps.share >= 0.2 && isNum(ps.conversion) && isNum(site.conversion) && ps.conversion < 0.4 * site.conversion && ps.visitors >= MIN_STEP_N * 3;

    // Rule: low-intent traffic. A research page shouldn't be judged on demo-form conversion.
    if (lowIntent && ps) {
      const cta = j.steps[1];
      const leads = cta.recovered;
      // Only a fraction of the gap is realistic for a research page; impact uses a quarter of it.
      const realistic = isNum(leads) ? leads * 0.25 : null;
      const rest = count(data, f);
      const pageC = j.counts.stages;
      const t = twoProportionTest(pageC[2], pageC[1], rest.stages[2] - pageC[2], rest.stages[1] - pageC[1]);
      const sc = ice(impactFrom(realistic, site.qualified), confidenceFrom(t?.pValue ?? null), 8);
      fixes.push({
        page: p.id,
        step: 1,
        metric: "ctaRate",
        ice: sc,
        finding: {
          id: `intent-${p.id}`,
          status: statusFor(sc.score),
          title: `${p.label}: lots of readers, few ready to buy`,
          summary: `${p.label} brings ${formatPercent(ps.share, { dp: 0 })} of all visitors and they read ${formatPercent(ps.scroll, { dp: 0 })} of the page on average, but only ${formatPercent(ps.ctaRate)} click '${p.cta}'. These are researchers, not buyers yet: a demo form is too big an ask.`,
          recommendation: `Don't optimise this page for demo requests. Offer a smaller next step that matches the reader's intent (a CRM buyer's checklist in exchange for an email, placed mid-article) and nurture them by email and retargeting.`,
          evidence: [
            { label: "Share of site visitors", value: formatPercent(ps.share), context: `${formatNumber(ps.visitors)} visitors` },
            { label: "Average scroll depth", value: formatPercent(ps.scroll, { dp: 0 }) },
            { label: "CTA click rate", value: formatPercent(ps.ctaRate), context: `site ${formatPercent(site.ctaRate)}` },
            { label: "Conversion rate", value: formatPercent(ps.conversion, { dp: 2 }), context: `site ${formatPercent(site.conversion, { dp: 2 })}` },
            { label: "If clicks reached the site median", value: `${formatNumber(leads, { dp: 0 })} more qualified leads`, context: "unrealistic for a research page; impact counts a quarter of it" },
            { label: "ICE", value: `${sc.impact} · ${sc.confidence} · ${sc.ease} = ${sc.score}`, context: "impact · confidence · ease" },
          ],
          rule: `A page with at least 20% of visitors and under 40% of the site's conversion rate is treated as low intent. Ease 8: ${EASE_WHY[1]}.`,
        },
        hypothesis: {
          observation: `${formatPercent(ps.ctaRate)} of ${p.label} readers click '${p.cta}' although they read ${formatPercent(ps.scroll, { dp: 0 })} of the article`,
          change: "offering a CRM buyer's checklist in the middle of the article instead of only a 'Try Northstar' button at the end",
          audience: audienceWords(f, null),
          metric: METRIC_WORDS.ctaRate,
          control: `The article as it is, with '${p.cta}' at the end.`,
          variation: "A checklist download box after the third section, plus the existing CTA at the end.",
        },
      });
    }

    // Rule: a step well below the site median for this page.
    j.steps.forEach((st) => {
      if (lowIntent && st.index === 1) return;
      if (!isNum(st.gap) || st.gap < GAP || st.entered < MIN_STEP_N) return;
      const c = j.counts.stages;
      const rest = count(data, f).stages;
      const t = twoProportionTest(c[st.index + 1], c[st.index], rest[st.index + 1] - c[st.index + 1], rest[st.index] - c[st.index]);
      const sc = ice(impactFrom(st.recovered, site.qualified), confidenceFrom(t?.pValue ?? null), EASE[st.index]);
      const ch = changeFor(p.id, st.index, f.device === "all" ? null : f.device);
      fixes.push({
        page: p.id,
        step: st.index,
        metric: METRIC_FOR[st.index],
        ice: sc,
        finding: {
          id: `step-${p.id}-${st.index}`,
          status: statusFor(sc.score),
          title: `${p.label}: ${lower(STEPS[st.index])} is ${formatPercent(st.gap, { dp: 0 })} below the site`,
          summary: `${formatPercent(st.rate)} of the ${formatNumber(st.entered)} people who reach this step on ${p.label} get through it, against a site median of ${formatPercent(st.median)}. Bringing it up to the median would mean about ${formatNumber(st.recovered, { dp: 0 })} more qualified leads over the four weeks.`,
          recommendation: `Test ${ch.change}.`,
          evidence: [
            { label: STEPS[st.index], value: formatPercent(st.rate), context: `of ${formatNumber(st.entered)}` },
            { label: "Site median for this step", value: formatPercent(st.median) },
            { label: "Leads recovered at the median", value: formatNumber(st.recovered, { dp: 0 }), context: "later steps unchanged" },
            { label: "Difference vs rest of site", value: t ? `p = ${t.pValue < 0.0001 ? "< 0.0001" : t.pValue.toFixed(4)}` : "—" },
            { label: "ICE", value: `${sc.impact} · ${sc.confidence} · ${sc.ease} = ${sc.score}`, context: "impact · confidence · ease" },
          ],
          rule: `A step at least ${formatPercent(GAP, { dp: 0 })} below the median of the six pages, with ${MIN_STEP_N}+ people entering it. Ease ${EASE[st.index]}: ${EASE_WHY[st.index]}.`,
        },
        hypothesis: {
          observation: `only ${formatPercent(st.rate)} of ${p.label} visitors get from ${lower(STEPS[st.index]).replace(" → ", " to ")}, against a site median of ${formatPercent(st.median)}`,
          change: ch.change,
          audience: audienceWords(f, null),
          metric: METRIC_WORDS[METRIC_FOR[st.index]],
          control: `The current ${p.label} page: '${p.headline}', CTA '${p.cta}', ${p.fields}-field form.`,
          variation: ch.variation,
        },
      });
    });

    // Rule: mobile far behind desktop at the same step (only when not already filtered to one device).
    if (f.device === "all") {
      const desk = j.devices.find((d) => d.id === "desktop");
      const mob = j.devices.find((d) => d.id === "mobile");
      if (desk && mob) {
        STEPS.forEach((step, i) => {
          const dr = desk.rates[i];
          const mr = mob.rates[i];
          if (!isNum(dr) || !isNum(mr) || desk.counts.stages[i] < MIN_DEVICE_N || mob.counts.stages[i] < MIN_DEVICE_N) return;
          if (mr >= DEVICE_RATIO * dr) return;
          const t = twoProportionTest(desk.counts.stages[i + 1], desk.counts.stages[i], mob.counts.stages[i + 1], mob.counts.stages[i]);
          const leads = recovered(mob.counts, stepRates(mob.counts, 1), i, dr);
          const sc = ice(impactFrom(leads, site.qualified), confidenceFrom(t?.pValue ?? null), EASE[i]);
          const ch = changeFor(p.id, i, "mobile");
          const pg = pageOf(p.id);
          fixes.push({
            page: p.id,
            step: i,
            metric: METRIC_FOR[i],
            ice: sc,
            finding: {
              id: `device-${p.id}-${i}`,
              status: statusFor(sc.score),
              title: `${p.label}: mobile visitors fall away at ${lower(step)}`,
              summary: `On mobile, ${formatPercent(mr)} get through ${lower(step)}; on desktop, ${formatPercent(dr)}. Mobile is ${formatPercent(ratio(mob.counts.stages[0], j.counts.stages[0]), { dp: 0 })} of this page's visitors, so closing the gap is worth about ${formatNumber(leads, { dp: 0 })} qualified leads over four weeks.${i === 0 ? ` The page takes ${pg.mobileLcp} s to show its main content on mobile, and mobile visitors scroll through only ${formatPercent(mob.scroll, { dp: 0 })} of it.` : i === 3 ? ` The form has ${pg.fields} fields, a lot to type on a phone.` : ""}`,
              recommendation: `Test ${ch.change}, for mobile visitors only.`,
              evidence: [
                { label: `Mobile ${step}`, value: formatPercent(mr), context: `of ${formatNumber(mob.counts.stages[i])}` },
                { label: `Desktop ${step}`, value: formatPercent(dr), context: `of ${formatNumber(desk.counts.stages[i])}` },
                ...(i === 0 ? [{ label: "Mobile load time (LCP)", value: `${pg.mobileLcp} s`, context: "good is under 2.5 s" }] : []),
                ...(i === 3 ? [{ label: "Form fields", value: formatNumber(pg.fields) }] : []),
                { label: "Leads recovered at the desktop rate", value: formatNumber(leads, { dp: 0 }) },
                { label: "Mobile vs desktop", value: t ? `p = ${t.pValue < 0.0001 ? "< 0.0001" : t.pValue.toFixed(4)}` : "—" },
                { label: "ICE", value: `${sc.impact} · ${sc.confidence} · ${sc.ease} = ${sc.score}`, context: "impact · confidence · ease" },
              ],
              rule: `Mobile below ${formatPercent(DEVICE_RATIO, { dp: 0 })} of the desktop rate at the same step, with ${MIN_DEVICE_N}+ people entering it on each device. Ease ${EASE[i]}: ${EASE_WHY[i]}.`,
            },
            hypothesis: {
              observation: `${formatPercent(mr)} of mobile visitors on ${p.label} get through ${lower(step)}, against ${formatPercent(dr)} on desktop`,
              change: ch.change,
              audience: audienceWords(f, "mobile"),
              metric: METRIC_WORDS[METRIC_FOR[i]],
              control: `The current ${p.label} page on mobile.`,
              variation: ch.variation,
            },
          });
        });
      }
    }
  }

  // One fix per page and step: keep the higher-scoring one (a device fix usually explains the step gap).
  const best = new Map<string, Fix>();
  for (const x of fixes) {
    const k = `${x.page}-${x.step}`;
    const cur = best.get(k);
    if (!cur || x.ice.score > cur.ice.score) best.set(k, x);
  }
  return [...best.values()].sort((a, b) => b.ice.score - a.ice.score || b.ice.impact - a.ice.impact);
}

/** The best-performing page, as a "working" finding: what good looks like on this site. */
export function strongestPage(data: Dataset, f: Filter): Finding | null {
  const site = siteStats(data, f);
  const ranked = pageStats(data, f)
    .filter((p) => p.visitors >= 1000 && isNum(p.leadRate))
    .sort((a, b) => (b.leadRate as number) - (a.leadRate as number));
  const top = ranked[0];
  if (!top || !isNum(site.leadRate) || (top.leadRate as number) < site.leadRate * 1.5) return null;
  return {
    id: `best-${top.id}`,
    status: "good",
    title: `${top.label} is the model to copy`,
    summary: `${formatPercent(top.leadRate, { dp: 2 })} of its visitors become qualified leads, ${formatPercent(ratio(top.leadRate, site.leadRate), { dp: 0 })} of the site rate. Its short form and specific promise are worth borrowing on weaker pages.`,
    evidence: [
      { label: "Qualified lead rate", value: formatPercent(top.leadRate, { dp: 2 }), context: `site ${formatPercent(site.leadRate, { dp: 2 })}` },
      { label: "Form completion", value: formatPercent(top.formCompletion), context: `site ${formatPercent(site.formCompletion)}` },
      { label: "Visitors", value: formatNumber(top.visitors) },
    ],
    rule: "The page with the highest qualified-lead rate among pages with 1,000+ visitors, if it is at least 1.5× the site rate.",
  };
}

/* ---- Copy alternatives ------------------------------------------------------------------------ */

export type CopyIdea = { text: string; why: string };

/** Templates per page: alternatives worth testing, each with the principle behind it. */
export const COPY: Record<PageId, { headlines: CopyIdea[]; ctas: CopyIdea[] }> = {
  home: {
    headlines: [
      { text: "Close more deals without more admin", why: "Leads with the outcome, not the category." },
      { text: "The CRM small sales teams set up in an afternoon", why: "Names the audience and removes the setup fear." },
      { text: "Every deal, every follow-up, one simple pipeline", why: "Concrete picture of the product." },
    ],
    ctas: [
      { text: "Start free, no card needed", why: "Removes the biggest objection at the click." },
      { text: "See my pipeline in 5 minutes", why: "Says what happens next and how long it takes." },
    ],
  },
  pricing: {
    headlines: [
      { text: "One price per seat. Everything included.", why: "Answers 'what's the catch?' before it's asked." },
      { text: "Pricing that grows with your team, not ahead of it", why: "Speaks to small teams wary of lock-in." },
      { text: "Start free for 14 days, then from $19 per seat", why: "Puts the low-risk start next to the price." },
    ],
    ctas: [
      { text: "Start free, add a card later", why: "Matches the shorter form being tested." },
      { text: "Try the Team plan free", why: "Ties the click to the plan the visitor was reading." },
    ],
  },
  demo: {
    headlines: [
      { text: "See your own pipeline in Northstar, live in 20 minutes", why: "Personal and time-boxed." },
      { text: "A 20-minute walkthrough with someone who's sold before", why: "Reduces the fear of a hard sell." },
      { text: "Bring your messiest spreadsheet. We'll show you the fix.", why: "Specific, memorable, invites the real problem." },
    ],
    ctas: [
      { text: "Pick a time", why: "Shorter and lower-commitment than 'Book my demo'." },
      { text: "Show me in 20 minutes", why: "Restates the promise at the click." },
    ],
  },
  trial: {
    headlines: [
      { text: "Your team's pipeline, set up before lunch", why: "Promises fast value from the trial." },
      { text: "14 days free. Import your contacts in one click.", why: "Answers the switching-cost worry." },
      { text: "Try everything free. Cancel with one click.", why: "Lowers the commitment of starting." },
    ],
    ctas: [
      { text: "Start my free trial", why: "First person tends to read as the visitor's own action." },
      { text: "Create my account, it takes 30 seconds", why: "Sets the expectation the shorter form must meet." },
    ],
  },
  blog: {
    headlines: [
      { text: "How to choose a CRM for a small sales team (with a free checklist)", why: "Signals a useful next step for readers." },
      { text: "The 7 questions to ask before you choose a CRM", why: "Promises structure to a researcher." },
      { text: "CRM for small teams: what matters, what doesn't", why: "Plain, honest framing builds trust." },
    ],
    ctas: [
      { text: "Get the CRM buyer's checklist", why: "Matches research intent; a small ask." },
      { text: "Compare 5 CRMs side by side", why: "The natural next step for someone comparing." },
    ],
  },
  compare: {
    headlines: [
      { text: "Everything you use in HubSpot, for a third of the price", why: "Keeps the strong claim, makes it about the visitor's use." },
      { text: "Switching from HubSpot? Move your data in a day.", why: "Answers the switching question directly." },
      { text: "Northstar vs HubSpot: the 3 differences that matter", why: "Short enough for a phone screen; suits the summary layout." },
    ],
    ctas: [
      { text: "See the side-by-side", why: "Says exactly what the click shows." },
      { text: "Get a free migration plan", why: "Turns the switching worry into an offer." },
    ],
  },
};

/** Everything the assistant found, as a prompt for any AI assistant, carrying only computed evidence. */
export function assistantPrompt(fixes: Fix[], f: Filter): string {
  const scope = `last 4 weeks, device: ${f.device}, source: ${f.source}`;
  const lines = fixes.map((x, i) =>
    [
      `${i + 1}. [ICE ${x.ice.score}] ${x.finding.title}`,
      `   ${x.finding.summary}`,
      ...x.finding.evidence.map((e) => `   - ${e.label}: ${e.value}${e.context ? ` (${e.context})` : ""}`),
      `   Hypothesis: Because we saw ${x.hypothesis.observation}, we believe ${x.hypothesis.change} for ${x.hypothesis.audience} will increase ${x.hypothesis.metric}.`,
    ].join("\n"),
  );
  return [
    "You are a conversion rate optimisation specialist. Below are findings computed from Northstar CRM's landing-page analytics.",
    "Northstar CRM is a fictional company and the data is synthetic.",
    `Scope: ${scope}.`,
    "",
    "Rules for your answer:",
    "- Use only the numbers given below. Do not introduce, estimate or round to any other figure.",
    "- For the top three fixes, suggest one more variation to test and what could make the test misleading.",
    "- If something can't be answered from this evidence, say what data would be needed.",
    "",
    "Fixes, highest ICE score first:",
    lines.join("\n\n"),
  ].join("\n");
}
