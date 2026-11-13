/**
 * Northstar CRM's landing pages, as a conversion-rate-optimisation dataset. The definitions here are
 * the generator's underlying behaviour (probabilities), not results: every rate the studio shows is
 * counted from the simulated visitor records, so a chart can never disagree with a table.
 *
 * Four stories are planted in these assumptions. The CRO assistant is not told about them; it has
 * to find them in the counts:
 *  1. Free trial: a nine-field form that mobile visitors abandon far more often than desktop ones.
 *  2. Pricing: plenty of people click "Get started", then most of them leave the form unfinished.
 *  3. Blog: the most traffic on the site, but readers rarely click towards a form (low intent).
 *  4. Compare: converts very well on desktop, but a slow, heavy page sends most mobile visitors away.
 */

export const DAYS = 28; // the reporting window: four full weeks
export const END_ISO = "2026-10-31";
export const SEED = 20261104;

export type PageId = "home" | "pricing" | "demo" | "trial" | "blog" | "compare";
export type DeviceId = "desktop" | "mobile" | "tablet";
export type SourceId = "search" | "social" | "organic" | "direct" | "email";

/** The journey every visitor takes; each stage is a subset of the one before it. */
export const STAGES = [
  { id: "visitors", label: "Visitors", short: "Visit" },
  { id: "engaged", label: "Engaged (didn't bounce)", short: "Engage" },
  { id: "cta", label: "Clicked the CTA", short: "CTA click" },
  { id: "start", label: "Started the form", short: "Form start" },
  { id: "submit", label: "Submitted the form", short: "Submit" },
  { id: "qualified", label: "Qualified lead", short: "Qualified" },
] as const;
export type StageId = (typeof STAGES)[number]["id"];

/** The five steps between stages. */
export const STEPS = ["Visit → engage", "Engage → CTA click", "CTA click → form start", "Form start → submit", "Submit → qualified"] as const;

/** Step probabilities: engage (1 − bounce), CTA click (of engaged), form start (of CTA clicks), submit (of starts), qualified (of submits). */
export type Rates = [number, number, number, number, number];

export type Page = {
  id: PageId;
  path: string;
  label: string;
  /** What the page is for, in a phrase (used in drafted copy and the hypothesis). */
  purpose: string;
  /** The page's main call to action today. */
  cta: string;
  /** The current headline. */
  headline: string;
  /** Mean visitors per day. */
  daily: number;
  /** Desktop step probabilities. */
  rates: Rates;
  /** Share of visitors on mobile (tablet takes 6%, desktop the rest). */
  mobile: number;
  /** Multipliers on each step for mobile (default MOBILE) and tablet (default TABLET). */
  mobileRates?: Rates;
  /** Mean share of the page visitors scroll through, desktop / mobile. */
  scroll: [number, number];
  /** Form fields on the page's form (what the visitor fills in). */
  fields: number;
  /** Largest-contentful-paint on mobile, seconds (a page-speed signal). */
  mobileLcp: number;
};

/** Default mobile and tablet step multipliers (smaller screens convert a little worse at every step). */
export const MOBILE: Rates = [0.9, 0.85, 0.92, 0.86, 0.95];
export const TABLET: Rates = [0.96, 0.95, 0.97, 0.95, 1];

export const PAGES: Page[] = [
  {
    id: "home",
    path: "/",
    label: "Home",
    purpose: "introduce Northstar to small sales teams",
    cta: "Start free",
    headline: "The CRM your sales team will actually use",
    daily: 900,
    rates: [0.62, 0.15, 0.56, 0.64, 0.46],
    mobile: 0.38,
    scroll: [0.52, 0.44],
    fields: 4,
    mobileLcp: 2.3,
  },
  {
    id: "pricing",
    path: "/pricing",
    label: "Pricing",
    purpose: "help a buyer choose a plan",
    cta: "Get started",
    headline: "Simple pricing for growing teams",
    daily: 520,
    // Story 2: a strong CTA, then a form most people leave (it asks for card details up front).
    rates: [0.72, 0.34, 0.6, 0.33, 0.56],
    mobile: 0.34,
    scroll: [0.66, 0.55],
    fields: 8,
    mobileLcp: 2.1,
  },
  {
    id: "demo",
    path: "/demo",
    label: "Book a demo",
    purpose: "book a call with sales",
    cta: "Book my demo",
    headline: "See Northstar in 20 minutes",
    daily: 380,
    rates: [0.74, 0.31, 0.68, 0.66, 0.62],
    mobile: 0.3,
    scroll: [0.6, 0.5],
    fields: 5,
    mobileLcp: 1.9,
  },
  {
    id: "trial",
    path: "/free-trial",
    label: "Free trial",
    purpose: "start a 14-day free trial",
    cta: "Start my trial",
    headline: "Try Northstar free for 14 days",
    daily: 620,
    // Story 1: a nine-field form; on mobile almost three in four who start it give up.
    rates: [0.69, 0.27, 0.72, 0.71, 0.45],
    mobile: 0.52,
    mobileRates: [0.92, 0.88, 0.92, 0.37, 0.95],
    scroll: [0.48, 0.42],
    fields: 9,
    mobileLcp: 2.4,
  },
  {
    id: "blog",
    path: "/blog/crm-for-small-teams",
    label: "Blog: CRM for small teams",
    purpose: "answer a research question about CRMs",
    cta: "Try Northstar",
    headline: "How to choose a CRM for a small sales team",
    daily: 1500,
    // Story 3: lots of readers, read deeply, but very few are ready to fill in a form.
    rates: [0.47, 0.035, 0.52, 0.6, 0.34],
    mobile: 0.55,
    scroll: [0.71, 0.63],
    fields: 4,
    mobileLcp: 2.2,
  },
  {
    id: "compare",
    path: "/compare/hubspot-alternative",
    label: "Compare: HubSpot alternative",
    purpose: "compare Northstar with HubSpot",
    cta: "See the comparison demo",
    headline: "Northstar vs HubSpot: everything you need, a third of the price",
    daily: 430,
    // Story 4: excellent on desktop; on mobile a heavy comparison table makes the page slow and most leave.
    rates: [0.7, 0.26, 0.64, 0.66, 0.6],
    mobile: 0.36,
    mobileRates: [0.44, 0.85, 0.92, 0.86, 0.95],
    scroll: [0.58, 0.21],
    fields: 5,
    mobileLcp: 5.8,
  },
];

export const DEVICES: { id: DeviceId; label: string }[] = [
  { id: "desktop", label: "Desktop" },
  { id: "mobile", label: "Mobile" },
  { id: "tablet", label: "Tablet" },
];

/** Traffic sources: share of a page's visitors, and how they shift engagement and lead quality. */
export const SOURCES: { id: SourceId; label: string; share: number; engage: number; qualify: number }[] = [
  { id: "search", label: "Paid search", share: 0.3, engage: 1.02, qualify: 1.05 },
  { id: "social", label: "Paid social", share: 0.18, engage: 0.85, qualify: 0.75 },
  { id: "organic", label: "Organic search", share: 0.3, engage: 1.0, qualify: 1.0 },
  { id: "direct", label: "Direct", share: 0.14, engage: 1.08, qualify: 1.1 },
  { id: "email", label: "Email", share: 0.08, engage: 1.12, qualify: 1.15 },
];

export const pageOf = (id: PageId) => PAGES.find((p) => p.id === id) as Page;
