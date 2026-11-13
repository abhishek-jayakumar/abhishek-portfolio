/** Helpers shared by the Paid Media Studio modules: one label, format and direction per metric. */

import { formatCurrency, formatMultiple, formatNumber, formatPercent } from "@/lab/shared/lib/format";
import { SERIES } from "@/lab/shared/lib/palette";
import { PLATFORMS, type PlatformId } from "@/lab/paid/model";
import type { Rates, Totals } from "@/lab/paid/metrics";

export const usd = (v: number | null | undefined, compact = false) => formatCurrency(v ?? null, "USD", { compact });

/** A platform keeps its colour everywhere, whatever is filtered. */
export const PLATFORM_COLOR: Record<PlatformId, string> = Object.fromEntries(PLATFORMS.map((p, i) => [p.id, SERIES[i]])) as Record<PlatformId, string>;

export type MetricKey = "spend" | "impressions" | "clicks" | "leads" | "qualified" | "value" | keyof Rates;
export type MetricDef = {
  key: MetricKey;
  label: string;
  long: string;
  /** How it's calculated, in words. */
  formula: string;
  fmt: (v: number) => string;
  /** true: higher is better; false: lower is better; null: neither (spend). */
  upIsGood: boolean | null;
  /** Which optional field it needs. */
  needs?: "qualified" | "value" | "reach";
};

export const METRICS: MetricDef[] = [
  { key: "spend", label: "Spend", long: "Media spend", formula: "What the platforms charged", fmt: (v) => usd(v, v >= 100_000), upIsGood: null },
  { key: "impressions", label: "Impressions", long: "Impressions", formula: "Times an ad was shown", fmt: (v) => formatNumber(v, { compact: v >= 100_000 }), upIsGood: true },
  { key: "clicks", label: "Clicks", long: "Clicks", formula: "Clicks to the site or form (Meta: link clicks)", fmt: (v) => formatNumber(v, { compact: v >= 100_000 }), upIsGood: true },
  { key: "ctr", label: "CTR", long: "Click-through rate", formula: "Clicks ÷ impressions", fmt: (v) => formatPercent(v, { dp: 2 }), upIsGood: true },
  { key: "cpc", label: "CPC", long: "Cost per click", formula: "Spend ÷ clicks", fmt: (v) => usd(v), upIsGood: false },
  { key: "cpm", label: "CPM", long: "Cost per 1,000 impressions", formula: "Spend ÷ impressions × 1,000", fmt: (v) => usd(v), upIsGood: false },
  { key: "leads", label: "Leads", long: "Leads", formula: "Platform-reported leads (forms, lead-form completions, conversions)", fmt: (v) => formatNumber(v), upIsGood: true },
  { key: "cvr", label: "Click → lead", long: "Conversion rate", formula: "Leads ÷ clicks", fmt: (v) => formatPercent(v, { dp: 2 }), upIsGood: true },
  { key: "cpl", label: "CPL", long: "Cost per lead", formula: "Spend ÷ leads", fmt: (v) => usd(v), upIsGood: false },
  { key: "qualified", label: "Qualified", long: "Qualified leads", formula: "Leads the CRM accepted as sales-qualified", fmt: (v) => formatNumber(v), upIsGood: true, needs: "qualified" },
  { key: "qualRate", label: "Qualified rate", long: "Qualified rate", formula: "Qualified leads ÷ leads", fmt: (v) => formatPercent(v, { dp: 0 }), upIsGood: true, needs: "qualified" },
  { key: "cpa", label: "CPA", long: "Cost per qualified lead", formula: "Spend ÷ qualified leads", fmt: (v) => usd(v), upIsGood: false, needs: "qualified" },
  { key: "value", label: "Pipeline", long: "Conversion value", formula: "Value attributed to the conversions (here: pipeline)", fmt: (v) => usd(v, v >= 100_000), upIsGood: true, needs: "value" },
  { key: "roas", label: "ROAS", long: "Return on ad spend", formula: "Conversion value ÷ spend", fmt: (v) => formatMultiple(v, 1), upIsGood: true, needs: "value" },
  { key: "frequency", label: "Frequency", long: "Average daily frequency", formula: "Impressions ÷ reach, on rows that report reach", fmt: (v) => v.toFixed(2), upIsGood: null, needs: "reach" },
];

export const metric = (k: MetricKey) => METRICS.find((m) => m.key === k) as MetricDef;

export type Has = { qualified: boolean; value: boolean; reach: boolean };
export function hasFields(t: Totals): Has {
  return { qualified: t.qualified !== null, value: t.value !== null, reach: t.reach !== null };
}
export const available = (m: MetricDef, has: Has) => !m.needs || has[m.needs];

/** Read a metric off a totals-and-rates object. */
export function valueOf(row: Totals & Rates, k: MetricKey): number | null {
  return (row as unknown as Record<string, number | null>)[k] ?? null;
}
