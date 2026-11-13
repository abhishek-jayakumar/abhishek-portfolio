/**
 * Northstar CRM's ad accounts on Google, Meta and LinkedIn: one schema for every platform, and the
 * assumptions the synthetic demo account is generated from. Imported CSV exports are mapped onto
 * the same AdRow shape, so every module works the same way on demo data and on a visitor's files.
 */

export type PlatformId = "google" | "meta" | "linkedin";

export const PLATFORMS: { id: PlatformId; label: string }[] = [
  { id: "google", label: "Google Ads" },
  { id: "meta", label: "Meta Ads" },
  { id: "linkedin", label: "LinkedIn Ads" },
];

export const platformLabel = (id: PlatformId) => PLATFORMS.find((p) => p.id === id)?.label ?? id;

/**
 * One row per campaign per day (per region, where the export has one). Every platform's columns
 * are mapped to these names, so CTR, CPC, CPM, CPL, CPA and ROAS are calculated the same way for all.
 */
export type AdRow = {
  /** Days since 1970-01-01 (UTC), so date arithmetic is integer arithmetic. */
  day: number;
  platform: PlatformId;
  campaign: string;
  /** Who the campaign targets ("Unspecified" when the export has no such column). */
  audience: string;
  region: string;
  impressions: number;
  clicks: number;
  spend: number;
  /** Platform-reported leads (form fills, lead-form completions, "conversions"). */
  leads: number;
  /** Leads the CRM later qualified (SQLs). Null when the source doesn't have it. */
  qualified: number | null;
  /** Conversion value (here: attributed pipeline value, USD). Null when the source doesn't have it. */
  value: number | null;
  /** People reached that day (Meta reports it; frequency = impressions ÷ reach). */
  reach: number | null;
};

export type Account = {
  source: "demo" | "import";
  /** "Demo account" or the file names. */
  label: string;
  rows: AdRow[];
};

export const UNSPECIFIED = "Unspecified";

// ---- Dates -------------------------------------------------------------------------------------

const MS_DAY = 86_400_000;

export function isoToDay(iso: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return null;
  const t = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  const d = new Date(t);
  if (d.getUTCMonth() !== Number(m[2]) - 1 || d.getUTCDate() !== Number(m[3])) return null;
  return Math.round(t / MS_DAY);
}

export function dayToIso(day: number): string {
  return new Date(day * MS_DAY).toISOString().slice(0, 10);
}

/** 0 = Sunday … 6 = Saturday. */
export function weekdayOf(day: number): number {
  return new Date(day * MS_DAY).getUTCDay();
}

// ---- The demo account --------------------------------------------------------------------------

export const SEED = 20261124;
export const DEMO_END = isoToDay("2026-10-31") as number;
/** 26 weeks, so the simulator has 12 recent weeks to fit and the analyst has history to compare with. */
export const DEMO_DAYS = 182;
export const DEMO_START = DEMO_END - DEMO_DAYS + 1;

export const REGIONS: { id: string; share: number; cost: number; leads: number }[] = [
  { id: "North America", share: 0.5, cost: 1.15, leads: 1.05 },
  { id: "UK & Ireland", share: 0.2, cost: 1.0, leads: 1.0 },
  { id: "Europe", share: 0.15, cost: 0.9, leads: 0.85 },
  { id: "APAC", share: 0.15, cost: 0.6, leads: 0.8 },
];

/**
 * The generator's campaign behaviour. Leads per day follow leads × (spend ÷ budget)^curve, so each
 * campaign has its own diminishing returns; `curve` near 1 scales almost linearly, near 0.4 is
 * saturated. These are inputs to the simulation, never shown as results: the modules measure
 * everything back out of the generated rows.
 */
export type DemoCampaign = {
  platform: PlatformId;
  name: string;
  audience: string;
  /** Base daily budget, USD. */
  budget: number;
  /** Cost per 1,000 impressions, USD. */
  cpm: number;
  ctr: number;
  /** Expected leads per day at the base budget. */
  leads: number;
  /** Diminishing-returns exponent. */
  curve: number;
  /** Share of leads the CRM qualifies. */
  qualify: number;
  /** Mean pipeline value of a qualified lead, USD. */
  dealValue: number;
  /** Meta frequency at normal running. */
  frequency?: number;
  /** Ad fatigue over the last six weeks: frequency climbs, CTR falls, CPM rises. */
  fatigue?: boolean;
};

export const DEMO_CAMPAIGNS: DemoCampaign[] = [
  { platform: "google", name: "Search – Brand", audience: "Brand searchers", budget: 120, cpm: 95, ctr: 0.11, leads: 9, curve: 0.35, qualify: 0.45, dealValue: 3600 },
  { platform: "google", name: "Search – CRM software", audience: "In-market searchers", budget: 900, cpm: 140, ctr: 0.05, leads: 14, curve: 0.4, qualify: 0.3, dealValue: 3500 },
  { platform: "google", name: "Search – Competitor terms", audience: "In-market searchers", budget: 300, cpm: 120, ctr: 0.045, leads: 6, curve: 0.85, qualify: 0.38, dealValue: 3800 },
  { platform: "meta", name: "Prospecting – Lookalike", audience: "Lookalike: customers", budget: 400, cpm: 11, ctr: 0.011, leads: 7, curve: 0.8, qualify: 0.2, dealValue: 2400, frequency: 1.6 },
  { platform: "meta", name: "Prospecting – Broad video", audience: "Broad: small business", budget: 350, cpm: 7, ctr: 0.028, leads: 2.5, curve: 0.8, qualify: 0.08, dealValue: 2000, frequency: 1.4 },
  { platform: "meta", name: "Retargeting – Site visitors", audience: "Site visitors (30 days)", budget: 160, cpm: 18, ctr: 0.016, leads: 6, curve: 0.7, qualify: 0.35, dealValue: 3200, frequency: 2.2, fatigue: true },
  { platform: "linkedin", name: "ABM – Sales leaders", audience: "Sales leaders, target accounts", budget: 500, cpm: 75, ctr: 0.0065, leads: 2.6, curve: 0.85, qualify: 0.6, dealValue: 9000 },
  { platform: "linkedin", name: "Lead Gen Form – SMB", audience: "SMB founders & managers", budget: 350, cpm: 55, ctr: 0.009, leads: 5, curve: 0.8, qualify: 0.2, dealValue: 3500 },
];

/** How the fatigue story unfolds on the fatigued campaign. */
export const FATIGUE = { days: 42, ctrDrop: 0.4, cpmRise: 0.35, frequencyRise: 3 } as const;
