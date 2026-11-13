/**
 * Generates the demo ad account from a fixed seed: 26 weeks of daily rows for every campaign and
 * region. Budgets move every week (as a real media buyer's would), which is what lets the
 * budget simulator fit each campaign's diminishing-returns curve from the data itself.
 */

import { createRng } from "../shared/lib/random.ts";
import { DEMO_CAMPAIGNS, DEMO_DAYS, DEMO_START, FATIGUE, REGIONS, SEED, weekdayOf, type Account, type AdRow } from "./model.ts";

const WEEKDAY = [0.6, 1.08, 1.12, 1.1, 1.06, 0.95, 0.6]; // Sun … Sat: B2B leads are quiet at weekends

export function generate(seed = SEED): AdRow[] {
  const rng = createRng(seed);
  const rows: AdRow[] = [];
  for (const c of DEMO_CAMPAIGNS) {
    let level = 1;
    for (let i = 0; i < DEMO_DAYS; i++) {
      const day = DEMO_START + i;
      if (i > 0 && i % 7 === 0) level = Math.round(rng.float(0.5, 1.8) * 100) / 100;
      const campaignSpend = c.budget * level * rng.normal(1, 0.05);
      const into = i - (DEMO_DAYS - FATIGUE.days);
      const t = c.fatigue && into >= 0 ? (into + 1) / FATIGUE.days : 0;
      const ctrMult = 1 - FATIGUE.ctrDrop * t;
      const cpmMult = 1 + FATIGUE.cpmRise * t;
      const frequency = c.frequency ? c.frequency + FATIGUE.frequencyRise * t : null;
      // Diminishing returns on the campaign's whole spend, shared across regions.
      const response = Math.pow(Math.max(0, campaignSpend) / c.budget, c.curve);

      for (const r of REGIONS) {
        const spend = Math.max(0, Math.round(campaignSpend * r.share * rng.normal(1, 0.03) * 100) / 100);
        const cpm = Math.max(0.5, c.cpm * r.cost * cpmMult * rng.normal(1, 0.05));
        const impressions = Math.round((spend / cpm) * 1000);
        const clicks = rng.binomial(impressions, Math.max(0.0005, c.ctr * ctrMult * rng.normal(1, 0.05)));
        const expected = c.leads * r.share * r.leads * response * WEEKDAY[weekdayOf(day)] * ctrMult;
        const leads = Math.min(clicks, rng.poisson(expected));
        const qualified = rng.binomial(leads, c.qualify);
        let value = 0;
        for (let k = 0; k < qualified; k++) value += c.dealValue * Math.exp(rng.normal(-0.08, 0.4));
        rows.push({
          day,
          platform: c.platform,
          campaign: c.name,
          audience: c.audience,
          region: r.id,
          impressions,
          clicks,
          spend,
          leads,
          qualified,
          value: Math.round(value),
          reach: frequency ? Math.max(1, Math.round(impressions / Math.max(1, frequency * rng.normal(1, 0.04)))) : null,
        });
      }
    }
  }
  return rows;
}

let cache: Account | null = null;
/** The demo account, generated once per page load (deterministic, so it's the same for everyone). */
export function demoAccount(): Account {
  cache ??= { source: "demo", label: "Demo account", rows: generate() };
  return cache;
}
