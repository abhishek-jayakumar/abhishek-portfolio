/**
 * Generates Northstar CRM's two years of synthetic data from a fixed seed.
 *
 * Two kinds of record:
 *  - DayRow: one per campaign per day: spend, impressions, clicks, sessions, and how those
 *    sessions split across countries, devices and landing pages.
 *  - Lead: one per lead, with where it came from and every funnel step it has reached so far,
 *    each with its own date. A step dated after the dataset's last day hasn't happened yet, so
 *    recent leads are "still in the funnel", exactly as in a real CRM export.
 *
 * Opportunities and customers are views of the same lead records, so IDs always line up:
 * every customer has an opportunity, every opportunity an SQL, and so on back to a campaign.
 */

import { createRng, makeId, type Rng } from "../shared/lib/random.ts";
import {
  CAMPAIGNS,
  COUNTRIES,
  DAYS,
  DEVICES,
  END_DAY,
  EVENTS,
  PAGES,
  SEED,
  monthOf,
  weekday,
  type ChannelId,
  type CountryId,
  type DeviceId,
  type PageId,
} from "./model.ts";

export type DayRow = {
  day: number;
  campaign: number;
  channel: ChannelId;
  /** Null for organic and direct: no ad impressions or clicks to report. */
  impressions: number | null;
  clicks: number | null;
  spend: number;
  sessions: number;
  /** Sessions split, in COUNTRIES / DEVICES / PAGES order. */
  byCountry: number[];
  byDevice: number[];
  byPage: number[];
};

export type Outcome = "won" | "lost" | "open";

export type Lead = {
  id: string;
  day: number;
  campaign: number;
  channel: ChannelId;
  country: CountryId;
  device: DeviceId;
  page: PageId;
  mqlDay: number | null;
  sqlDay: number | null;
  oppId: string | null;
  oppDay: number | null;
  outcome: Outcome | null;
  closeDay: number | null;
  /** Annual contract value, only when won. */
  acv: number | null;
  customerId: string | null;
};

export type Dataset = { rows: DayRow[]; leads: Lead[] };

const MONTH_SEASON = [1.0, 1.05, 1.1, 1.05, 1.0, 0.95, 0.92, 0.88, 1.02, 1.1, 1.05, 0.8]; // Jan … Dec
/** Overall lead volume (keeps the dataset light enough to generate instantly on a phone). */
const LEAD_SCALE = 0.6;
const WEEKDAY = [0.55, 1.08, 1.1, 1.08, 1.06, 0.95, 0.55]; // Sun … Sat (B2B: quiet weekends)

/** Split an integer total across weights so the parts always sum back to the total exactly. */
function split(total: number, weights: number[], rng: Rng): number[] {
  const sum = weights.reduce((a, b) => a + b, 0) || 1;
  const parts = weights.map((w) => Math.floor((total * w) / sum));
  let rest = total - parts.reduce((a, b) => a + b, 0);
  while (rest > 0) {
    parts[rng.weighted(parts.map((_, i) => i), weights)]++;
    rest--;
  }
  return parts;
}

function lognormalAround(rng: Rng, mean: number, sigma = 0.45): number {
  // Mean-preserving lognormal: E[exp(N(μ, σ²))] = exp(μ + σ²/2).
  return mean * Math.exp(rng.normal(-(sigma * sigma) / 2, sigma));
}

export function generate(seed = SEED): Dataset {
  const rng = createRng(seed);
  const rows: DayRow[] = [];
  const leads: Lead[] = [];
  let leadN = 0;
  let oppN = 0;
  let custN = 0;

  for (let day = 0; day < DAYS; day++) {
    const progress = day / (DAYS - 1);
    const season = MONTH_SEASON[monthOf(day)] * WEEKDAY[weekday(day)];

    CAMPAIGNS.forEach((c, ci) => {
      const paid = c.channel === "google" || c.channel === "meta" || c.channel === "linkedin";
      let spend = 0;
      let impressions: number | null = null;
      let clicks: number | null = null;
      let sessions: number;

      if (paid) {
        const budgetTrend = 0.8 + 0.35 * progress;
        spend = Math.max(0, c.base * budgetTrend * season * rng.normal(1, 0.06));
        let cpc = (c.cpc as number) * rng.normal(1, 0.05);
        const { metaCpcRise } = EVENTS;
        if (c.channel === "meta" && day >= metaCpcRise.fromDay) {
          cpc *= 1 + metaCpcRise.increase * Math.min(1, (day - metaCpcRise.fromDay + 1) / metaCpcRise.rampDays);
        }
        clicks = Math.round(spend / Math.max(0.05, cpc));
        const ctr = Math.max(0.001, (c.ctr as number) * rng.normal(1, 0.05));
        impressions = Math.round(clicks / ctr);
        sessions = rng.binomial(clicks, 0.88); // some clicks never load the page
        spend = Math.round(spend * 100) / 100;
      } else {
        const growth = c.channel === "organic" ? 0.6 + 0.8 * progress : 0.85 + 0.3 * progress;
        sessions = Math.max(0, Math.round(c.base * growth * season * rng.normal(1, 0.06)));
        const { directBots } = EVENTS;
        if (c.channel === "direct" && day >= directBots.fromDay && day < directBots.fromDay + directBots.days) {
          sessions = Math.round(sessions * directBots.factor);
        }
      }

      // How the sessions split. Bot sessions on direct land on the home page from desktops.
      const countryW = COUNTRIES.map((k) => k.share * (k.id === "US" && c.usBias ? c.usBias : 1));
      const deviceW = [(1 - c.mobile) * 0.92, c.mobile, (1 - c.mobile) * 0.08];
      const pageW = PAGES.map((p) => c.pages[p.id] ?? 0);
      const byCountry = split(sessions, countryW, rng);
      const byDevice = split(sessions, deviceW, rng);
      const byPage = split(sessions, pageW, rng);
      rows.push({ day, campaign: ci, channel: c.channel, impressions, clicks, spend, sessions, byCountry, byDevice, byPage });

      // Leads: each landing page converts its share of sessions at its own rate. Bot sessions don't convert.
      const isBotWeek = c.channel === "direct" && day >= EVENTS.directBots.fromDay && day < EVENTS.directBots.fromDay + EVENTS.directBots.days;
      const realShare = isBotWeek ? 1 / EVENTS.directBots.factor : 1;
      PAGES.forEach((p, pi) => {
        const n = rng.binomial(Math.round(byPage[pi] * realShare), Math.min(0.95, c.cvr * p.cvr * LEAD_SCALE));
        for (let k = 0; k < n; k++) {
          const country = rng.weighted(COUNTRIES, COUNTRIES.map((x, xi) => byCountry[xi] * x.cvr + 0.001));
          const device = rng.weighted(DEVICES, DEVICES.map((x, xi) => byDevice[xi] * x.cvr + 0.001));
          leads.push(progressLead(rng, ++leadN, day, ci, country.id, device.id, p.id, () => ++oppN, () => ++custN));
        }
      });
    });
  }
  return { rows, leads };
}

/** Walk one lead through the funnel. A step dated beyond the last day hasn't happened yet. */
function progressLead(
  rng: Rng,
  n: number,
  day: number,
  ci: number,
  country: CountryId,
  device: DeviceId,
  page: PageId,
  nextOpp: () => number,
  nextCust: () => number,
): Lead {
  const c = CAMPAIGNS[ci];
  const k = COUNTRIES.find((x) => x.id === country) as (typeof COUNTRIES)[number];
  const p = PAGES.find((x) => x.id === page) as (typeof PAGES)[number];
  const lead: Lead = {
    id: makeId("LD", n),
    day,
    campaign: ci,
    channel: c.channel,
    country,
    device,
    page,
    mqlDay: null,
    sqlDay: null,
    oppId: null,
    oppDay: null,
    outcome: null,
    closeDay: null,
    acv: null,
    customerId: null,
  };
  const happened = (d: number) => d <= END_DAY;

  if (!rng.chance(Math.min(0.95, c.mql * p.mql))) return lead;
  const mqlDay = day + rng.int(0, 6);
  if (!happened(mqlDay)) return lead;
  lead.mqlDay = mqlDay;

  const slow = day >= EVENTS.sqlSlowdown.fromDay ? EVENTS.sqlSlowdown.factor : 1;
  if (!rng.chance(Math.min(0.95, c.sql * p.sql * k.sql * slow))) return lead;
  const sqlDay = mqlDay + rng.int(2, 20);
  if (!happened(sqlDay)) return lead;
  lead.sqlDay = sqlDay;

  if (!rng.chance(c.opp)) return lead;
  const oppDay = sqlDay + rng.int(3, 15);
  if (!happened(oppDay)) return lead;
  lead.oppDay = oppDay;
  lead.oppId = makeId("OP", nextOpp());

  const won = rng.chance(c.win);
  const closeDay = oppDay + rng.int(14, 60);
  if (!happened(closeDay)) {
    lead.outcome = "open";
    return lead;
  }
  lead.closeDay = closeDay;
  lead.outcome = won ? "won" : "lost";
  if (won) {
    lead.acv = Math.max(600, Math.round(lognormalAround(rng, c.acv * k.acv) / 50) * 50);
    lead.customerId = makeId("CU", nextCust());
  }
  return lead;
}

let cache: Dataset | null = null;
/** The dataset, generated once per page load (deterministic, so it's the same for everyone). */
export function getDataset(): Dataset {
  cache ??= generate();
  return cache;
}
