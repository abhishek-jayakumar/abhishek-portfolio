/**
 * Northstar CRM, a fictional B2B SaaS company: the shape of its data and the assumptions the
 * synthetic generator works from. Everything a chart or an analyst finding uses is derived from
 * records built on these definitions; nothing downstream hardcodes a result.
 */

export const DAYS = 730; // two years, so every date range has a previous period to compare with
export const START_ISO = "2024-11-01"; // day 0
export const END_DAY = DAYS - 1; // 2026-10-31, the "today" of the dataset
export const SEED = 20261031;

export type ChannelId = "google" | "meta" | "linkedin" | "organic" | "direct";
export type CountryId = "US" | "UK" | "IN" | "DE" | "AU";
export type DeviceId = "desktop" | "mobile" | "tablet";
export type PageId = "home" | "pricing" | "demo" | "trial" | "blog" | "compare";

export type Channel = { id: ChannelId; label: string; paid: boolean };
export const CHANNELS: Channel[] = [
  { id: "google", label: "Google Ads", paid: true },
  { id: "meta", label: "Meta Ads", paid: true },
  { id: "linkedin", label: "LinkedIn Ads", paid: true },
  { id: "organic", label: "Organic search", paid: false },
  { id: "direct", label: "Direct", paid: false },
];

export const COUNTRIES: { id: CountryId; label: string; share: number; cvr: number; sql: number; acv: number }[] = [
  { id: "US", label: "United States", share: 0.45, cvr: 1.0, sql: 1.05, acv: 1.15 },
  { id: "UK", label: "United Kingdom", share: 0.15, cvr: 1.0, sql: 1.0, acv: 1.05 },
  { id: "IN", label: "India", share: 0.18, cvr: 1.2, sql: 0.75, acv: 0.45 },
  { id: "DE", label: "Germany", share: 0.12, cvr: 0.95, sql: 1.0, acv: 1.05 },
  { id: "AU", label: "Australia", share: 0.1, cvr: 1.0, sql: 1.0, acv: 1.0 },
];

export const DEVICES: { id: DeviceId; label: string; cvr: number }[] = [
  { id: "desktop", label: "Desktop", cvr: 1.15 },
  { id: "mobile", label: "Mobile", cvr: 0.7 },
  { id: "tablet", label: "Tablet", cvr: 0.9 },
];

/** Landing pages: how well each converts a session into a lead, and how good those leads are. */
export const PAGES: { id: PageId; path: string; label: string; cvr: number; mql: number; sql: number }[] = [
  { id: "home", path: "/", label: "Home", cvr: 0.8, mql: 1.0, sql: 1.0 },
  { id: "pricing", path: "/pricing", label: "Pricing", cvr: 1.1, mql: 1.05, sql: 1.1 },
  { id: "demo", path: "/demo", label: "Book a demo", cvr: 1.3, mql: 1.1, sql: 1.15 },
  { id: "trial", path: "/free-trial", label: "Free trial", cvr: 1.6, mql: 0.9, sql: 0.55 },
  { id: "blog", path: "/blog/crm-for-small-teams", label: "Blog: CRM for small teams", cvr: 0.45, mql: 0.8, sql: 0.9 },
  { id: "compare", path: "/compare/hubspot-alternative", label: "Compare: HubSpot alternative", cvr: 1.0, mql: 1.0, sql: 1.05 },
];

/**
 * Campaigns and their underlying behaviour. Paid campaigns spend a daily budget at a cost per
 * click; organic and direct bring sessions without media cost. Rates are the generator's
 * probabilities, not results: results come out of the simulated records.
 */
export type Campaign = {
  id: string;
  channel: ChannelId;
  name: string;
  /** Paid: base daily budget (USD). Unpaid: base daily sessions. */
  base: number;
  cpc?: number;
  ctr?: number;
  /** Session → lead. */
  cvr: number;
  /** Lead → MQL, MQL → SQL, SQL → opportunity, opportunity → won. */
  mql: number;
  sql: number;
  opp: number;
  win: number;
  /** Mean annual contract value of a won deal (USD). */
  acv: number;
  pages: Partial<Record<PageId, number>>;
  /** Share of sessions on mobile (the rest split desktop / tablet). */
  mobile: number;
  /** Extra weight on the US (LinkedIn ABM targets US sales leaders). */
  usBias?: number;
};

export const CAMPAIGNS: Campaign[] = [
  { id: "g-brand", channel: "google", name: "Search – Brand", base: 250, cpc: 2.2, ctr: 0.09, cvr: 0.07, mql: 0.55, sql: 0.45, opp: 0.7, win: 0.35, acv: 5500, pages: { home: 0.4, pricing: 0.3, demo: 0.3 }, mobile: 0.3 },
  { id: "g-generic", channel: "google", name: "Search – CRM software", base: 900, cpc: 6.5, ctr: 0.045, cvr: 0.045, mql: 0.45, sql: 0.38, opp: 0.65, win: 0.28, acv: 6000, pages: { compare: 0.35, pricing: 0.25, demo: 0.2, trial: 0.2 }, mobile: 0.28 },
  { id: "g-pmax", channel: "google", name: "Performance Max", base: 500, cpc: 1.4, ctr: 0.012, cvr: 0.05, mql: 0.18, sql: 0.25, opp: 0.55, win: 0.22, acv: 4000, pages: { trial: 0.5, home: 0.3, pricing: 0.2 }, mobile: 0.5 },
  { id: "m-lal", channel: "meta", name: "Prospecting – Lookalike", base: 450, cpc: 1.1, ctr: 0.011, cvr: 0.02, mql: 0.28, sql: 0.3, opp: 0.6, win: 0.25, acv: 3500, pages: { trial: 0.6, blog: 0.4 }, mobile: 0.68 },
  { id: "m-rt", channel: "meta", name: "Retargeting – Site visitors", base: 150, cpc: 1.6, ctr: 0.018, cvr: 0.06, mql: 0.45, sql: 0.38, opp: 0.62, win: 0.3, acv: 4500, pages: { demo: 0.5, pricing: 0.5 }, mobile: 0.62 },
  { id: "li-abm", channel: "linkedin", name: "ABM – Sales leaders", base: 550, cpc: 9.5, ctr: 0.006, cvr: 0.05, mql: 0.65, sql: 0.45, opp: 0.7, win: 0.3, acv: 11000, pages: { demo: 0.8, compare: 0.2 }, mobile: 0.25, usBias: 1.6 },
  { id: "li-lgf", channel: "linkedin", name: "Lead Gen Form – SMB", base: 350, cpc: 7, ctr: 0.009, cvr: 0.11, mql: 0.35, sql: 0.3, opp: 0.6, win: 0.22, acv: 6500, pages: { demo: 1 }, mobile: 0.4 },
  { id: "organic", channel: "organic", name: "Organic search", base: 900, cvr: 0.025, mql: 0.5, sql: 0.4, opp: 0.68, win: 0.3, acv: 6000, pages: { blog: 0.55, home: 0.25, compare: 0.2 }, mobile: 0.38 },
  { id: "direct", channel: "direct", name: "Direct", base: 350, cvr: 0.035, mql: 0.6, sql: 0.45, opp: 0.7, win: 0.33, acv: 6500, pages: { home: 0.7, pricing: 0.3 }, mobile: 0.3 },
];

/**
 * Things that happen to the business during the two years. They shape the records the way real
 * events would; the analyst has to find their effects in the data without being told about them.
 */
export const EVENTS = {
  /** Meta's auction gets more expensive over the last five weeks. */
  metaCpcRise: { fromDay: END_DAY - 34, rampDays: 14, increase: 0.45 },
  /** Sales follow-up slows: MQLs created in the last 100 days become SQLs less often. */
  sqlSlowdown: { fromDay: END_DAY - 99, factor: 0.78 },
  /** A week of bot traffic on direct: sessions more than double, leads don't move. */
  directBots: { fromDay: END_DAY - 60, days: 7, factor: 2.3 },
} as const;

/** Day index → ISO date. */
export function dayToIso(day: number): string {
  const d = new Date(`${START_ISO}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + day);
  return d.toISOString().slice(0, 10);
}

/** 0 = Sunday … 6 = Saturday. */
export function weekday(day: number): number {
  return new Date(Date.UTC(2024, 10, 1 + day)).getUTCDay();
}

/** Month index (0–11) of a day. */
export function monthOf(day: number): number {
  return new Date(Date.UTC(2024, 10, 1 + day)).getUTCMonth();
}

export const channelOf = (id: ChannelId) => CHANNELS.find((c) => c.id === id) as Channel;
export const campaignIndex = new Map(CAMPAIGNS.map((c, i) => [c.id, i]));
