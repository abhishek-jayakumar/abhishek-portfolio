/**
 * The Lab's four experiments: one source of truth for the homepage cards, each experiment's cover,
 * its module tabs, and the "next experiment" link. Every business named here is fictional and
 * every number in the experiments is synthetic; the pages say so on every screen.
 */

export type LabSlug = "growth-intelligence" | "paid-media-studio" | "customer-lifecycle" | "conversion-studio";
export type Preview = "growth" | "paid" | "lifecycle" | "cro";

export type LabModule = {
  /** Stable id, also the URL hash (#funnel). */
  id: string;
  code: string;
  label: string;
  /** One line on what the visitor does in this module. */
  does: string;
};

export type Experiment = {
  slug: LabSlug;
  no: string;
  title: string;
  category: string;
  /** The card's one-line pitch. */
  short: string;
  /** The cover paragraph. */
  description: string;
  /** The business question the experiment answers. */
  question: string;
  /** The fictional business the data describes. */
  business: { name: string; what: string; currency: "USD" | "INR" };
  tools: string[];
  cta: string;
  /** "live" once its modules are built; until then its page explains what is coming. */
  status: "live" | "building";
  /** A short handwritten question for the folded panel on the homepage. */
  hook: string;
  preview: Preview;
  howTo: string[];
  modules: LabModule[];
};

export const EXPERIMENTS: Experiment[] = [
  {
    slug: "growth-intelligence",
    no: "01",
    title: "Growth Intelligence Workbench",
    category: "Growth analytics & business intelligence",
    short: "From the first session to closed revenue, on one set of definitions, with an analyst that shows its working.",
    description:
      "A B2B SaaS growth workbench for Northstar CRM, a fictional company. It follows every lead from the session that brought it in to the revenue it became, and connects spend, channels, the funnel and unit economics in one place.",
    question: "Where is growth coming from, where is it leaking, and what would I change first?",
    business: { name: "Northstar CRM", what: "a fictional B2B SaaS CRM for small sales teams", currency: "USD" },
    tools: ["TypeScript", "React", "Hand-built SVG charts", "Seeded synthetic data", "Rule-based insight engine"],
    cta: "Open the workbench",
    status: "live",
    hook: "where is growth leaking?",
    preview: "growth",
    howTo: [
      "Start on Overview for the headline numbers and how they moved.",
      "Use the date and channel filters at the top; every module below follows them.",
      "In Funnel, drag a stage's conversion rate to see what it does to customers and revenue.",
      "Open Analyst last: each finding lists the exact numbers it is based on.",
    ],
    modules: [
      { id: "overview", code: "A", label: "Overview", does: "Sessions, spend, leads, pipeline, customers and revenue, with trends." },
      { id: "acquisition", code: "B", label: "Acquisition", does: "Sources, campaigns, countries, devices and landing pages." },
      { id: "channels", code: "C", label: "Channels", does: "Google, Meta, LinkedIn, organic and direct on CPC, CPM, CTR, CPL and ROAS." },
      { id: "funnel", code: "D", label: "Funnel", does: "Lead → MQL → SQL → Opportunity → Customer, with adjustable rates." },
      { id: "economics", code: "E", label: "Unit economics", does: "CAC, LTV, LTV:CAC, ROAS, payback period and deal value." },
      { id: "analyst", code: "F", label: "Analyst", does: "Rule-based findings and recommendations, each with its evidence." },
    ],
  },
  {
    slug: "paid-media-studio",
    no: "02",
    title: "Paid Media Optimisation Studio",
    category: "Performance marketing & paid acquisition",
    short: "Bring Google, Meta and LinkedIn exports together, compare them fairly, and test a budget split before spending it.",
    description:
      "A campaign intelligence studio. Load ad-platform exports, or start with the demo account, and it validates the files, normalises them to one set of metric definitions, compares platforms and campaigns, and simulates budget reallocation.",
    question: "Which campaigns earn their budget, and where would the next dollar do the most work?",
    business: { name: "Northstar CRM", what: "the same fictional SaaS company's ad accounts", currency: "USD" },
    tools: ["TypeScript", "React", "CSV parsing & validation", "Diminishing-returns model", "Rule-based insight engine"],
    cta: "Open the studio",
    status: "building",
    hook: "where should the next dollar go?",
    preview: "paid",
    howTo: [
      "Explore the demo account straight away, or import your own CSV exports in Import.",
      "Every platform's columns are mapped to one definition of CTR, CPC, CPM, CPL, CPA and ROAS.",
      "In Budget simulator, set a total and move the platform sliders; projections are simulations, not promises.",
    ],
    modules: [
      { id: "import", code: "A", label: "Import", does: "Upload Google, Meta or LinkedIn reports; preview and validate them." },
      { id: "analytics", code: "B", label: "Campaign analytics", does: "Impressions to ROAS, calculated the same way for every platform." },
      { id: "compare", code: "C", label: "Compare", does: "Platforms, campaigns, audiences and regions side by side." },
      { id: "budget", code: "D", label: "Budget simulator", does: "Reallocate spend and see the projected leads and conversions." },
      { id: "analyst", code: "E", label: "Analyst", does: "Summaries, alerts and budget suggestions with their evidence." },
    ],
  },
  {
    slug: "customer-lifecycle",
    no: "03",
    title: "Customer Lifecycle Intelligence",
    category: "Retention marketing & marketing automation",
    short: "Segment customers by behaviour, read cohort retention, and design the journeys that bring them back.",
    description:
      "A customer intelligence platform for Kettlebloom, a fictional direct-to-consumer tea brand in India. It segments customers by recency, frequency and value, tracks retention by cohort, and lets you design lifecycle journeys with drafted WhatsApp and email messages.",
    question: "Who is about to leave, what are they worth, and what should we send them?",
    business: { name: "Kettlebloom", what: "a fictional D2C tea brand selling online in India", currency: "INR" },
    tools: ["TypeScript", "React", "RFM segmentation", "Cohort analysis", "Template-based message drafting"],
    cta: "Open the platform",
    status: "building",
    hook: "who is about to leave?",
    preview: "lifecycle",
    howTo: [
      "Segments groups every customer by recency, frequency and spend; click a segment to filter everything.",
      "Retention shows cohorts by first-order month; read across a row to follow one cohort.",
      "In Journey builder, pick a segment and a goal, then edit the steps and their drafted messages.",
    ],
    modules: [
      { id: "segments", code: "A", label: "Segments", does: "New, active, repeat, inactive, high-value and at-risk customers." },
      { id: "retention", code: "B", label: "Retention", does: "Repeat rate, retention, churn, CLV, cohorts and revenue by segment." },
      { id: "behaviour", code: "C", label: "Behaviour", does: "Purchase frequency, recency, engagement and lifecycle stage." },
      { id: "journeys", code: "D", label: "Journey builder", does: "Welcome, follow-up, reminder, reactivation and win-back journeys." },
      { id: "assistant", code: "E", label: "Retention assistant", does: "Segment insights and drafted WhatsApp and email campaigns." },
    ],
  },
  {
    slug: "conversion-studio",
    no: "04",
    title: "Conversion Experiment Studio",
    category: "Conversion rate optimisation & experimentation",
    short: "Find where a landing-page journey loses people, write a real hypothesis, and read an A/B test honestly.",
    description:
      "A workspace for landing-page conversion. It shows where visitors drop out between the page and a qualified lead, helps you build an experiment with a proper hypothesis, and analyses results with sample sizes and uncertainty. It won't call a winner on a small sample.",
    question: "What is stopping visitors from converting, and how do I prove a fix worked?",
    business: { name: "Northstar CRM", what: "the fictional SaaS company's landing pages", currency: "USD" },
    tools: ["TypeScript", "React", "Two-proportion z-test", "Wilson intervals", "Sample-size planning"],
    cta: "Open the studio",
    status: "building",
    hook: "did the fix really work?",
    preview: "cro",
    howTo: [
      "Landing pages ranks each page; pick one to see its journey and its biggest drop-off.",
      "In Experiment builder, write the hypothesis, define control and variation, and set the audience.",
      "Experiment analysis takes the results and tells you what they can and cannot support.",
    ],
    modules: [
      { id: "pages", code: "A", label: "Landing pages", does: "Traffic, conversion, CTA performance, bounce and form completion." },
      { id: "journey", code: "B", label: "Conversion journey", does: "Visitor → page → CTA → form → qualified lead, and the worst drop-off." },
      { id: "builder", code: "C", label: "Experiment builder", does: "Hypothesis, control and variation, metric, duration and audience." },
      { id: "analysis", code: "D", label: "Experiment analysis", does: "Rates, uplift, sample size, uncertainty and significance." },
      { id: "assistant", code: "E", label: "CRO assistant", does: "Prioritised fixes, headline and CTA alternatives, hypotheses." },
    ],
  },
];

export function getExperiment(slug: LabSlug): Experiment {
  const e = EXPERIMENTS.find((x) => x.slug === slug);
  if (!e) throw new Error(`Unknown experiment: ${slug}`);
  return e;
}

export function nextExperiment(slug: LabSlug): Experiment {
  const i = EXPERIMENTS.findIndex((x) => x.slug === slug);
  return EXPERIMENTS[(i + 1) % EXPERIMENTS.length];
}
