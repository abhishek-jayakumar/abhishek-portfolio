/**
 * Generates four weeks of Northstar's landing-page traffic from a fixed seed.
 *
 * One Row per page × device × source × day. Each row walks its visitors down the journey with
 * binomial draws (visitors → engaged → CTA click → form start → submit → qualified), so every stage
 * is a subset of the one before it and every rate in the studio is counted, not assumed.
 */

import { createRng, type Rng } from "../shared/lib/random.ts";
import { DAYS, DEVICES, MOBILE, PAGES, SEED, SOURCES, TABLET, type DeviceId, type PageId, type SourceId } from "./model.ts";

export type Row = {
  day: number;
  page: PageId;
  device: DeviceId;
  source: SourceId;
  visitors: number;
  engaged: number;
  cta: number;
  start: number;
  submit: number;
  qualified: number;
  /** Sum over visitors of the share of the page they scrolled through (avg = scrollSum ÷ visitors). */
  scrollSum: number;
};

export type Dataset = { rows: Row[] };

const WEEKDAY = [0.62, 1.08, 1.12, 1.1, 1.06, 0.96, 0.6]; // Sun … Sat: B2B traffic dips at weekends

function weekdayOf(day: number): number {
  // Day 0 is 4 Oct 2026 (a Sunday); the window ends on 31 Oct 2026.
  return day % 7;
}

function deviceRates(base: [number, number, number, number, number], mult: readonly number[]) {
  return base.map((r, i) => Math.min(0.97, r * mult[i]));
}

export function generate(seed = SEED): Dataset {
  const rng: Rng = createRng(seed);
  const rows: Row[] = [];
  for (let day = 0; day < DAYS; day++) {
    const season = WEEKDAY[weekdayOf(day)];
    for (const p of PAGES) {
      const total = Math.max(0, Math.round(p.daily * season * rng.normal(1, 0.07)));
      const deviceShare: Record<DeviceId, number> = { desktop: 1 - p.mobile - 0.06, mobile: p.mobile, tablet: 0.06 };
      for (const d of DEVICES) {
        const mult = d.id === "desktop" ? [1, 1, 1, 1, 1] : d.id === "mobile" ? (p.mobileRates ?? MOBILE) : TABLET;
        const rates = deviceRates(p.rates, mult);
        for (const src of SOURCES) {
          const visitors = rng.binomial(total, deviceShare[d.id] * src.share);
          const engaged = rng.binomial(visitors, Math.min(0.97, rates[0] * src.engage));
          const cta = rng.binomial(engaged, rates[1]);
          const start = rng.binomial(cta, rates[2]);
          const submit = rng.binomial(start, rates[3]);
          const qualified = rng.binomial(submit, Math.min(0.97, rates[4] * src.qualify));
          // Scroll: bounced visitors barely scroll; engaged ones read about the page's mean depth.
          const depth = d.id === "desktop" ? p.scroll[0] : d.id === "mobile" ? p.scroll[1] : (p.scroll[0] + p.scroll[1]) / 2;
          const bounced = visitors - engaged;
          const engagedDepth = Math.min(1, (depth * visitors - 0.08 * bounced) / Math.max(1, engaged));
          const scrollSum = Math.round((bounced * 0.08 + engaged * Math.max(0.1, engagedDepth) * rng.normal(1, 0.03)) * 100) / 100;
          rows.push({ day, page: p.id, device: d.id, source: src.id, visitors, engaged, cta, start, submit, qualified, scrollSum });
        }
      }
    }
  }
  return { rows };
}

let cache: Dataset | null = null;
/** The dataset, generated once per page load (deterministic, so it's the same for everyone). */
export function getDataset(): Dataset {
  cache ??= generate();
  return cache;
}
