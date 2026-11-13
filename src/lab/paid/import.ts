/**
 * Ad-platform CSV import. Google Ads, Meta and LinkedIn name the same things differently ("Impr.",
 * "Impressions"; "Cost", "Amount spent (USD)", "Total Spent"), add report titles above the header
 * and "Total" rows below the data. This maps every export to one schema (AdRow), validates it, and
 * says plainly what it skipped and why. It also writes the sample exports visitors can try.
 */

import { findHeaderRow, normaliseHeader, parseCsv, toRecords } from "../shared/lib/csv.ts";
import { isNum, parseNumber } from "../shared/lib/safe-math.ts";
import { PLATFORMS, UNSPECIFIED, dayToIso, isoToDay, type AdRow, type PlatformId } from "./model.ts";

export type Field = "date" | "campaign" | "audience" | "region" | "impressions" | "clicks" | "spend" | "leads" | "qualified" | "value" | "reach";

export const FIELDS: { id: Field; label: string; required: boolean; numeric: boolean }[] = [
  { id: "date", label: "Date", required: true, numeric: false },
  { id: "campaign", label: "Campaign", required: true, numeric: false },
  { id: "impressions", label: "Impressions", required: true, numeric: true },
  { id: "clicks", label: "Clicks", required: true, numeric: true },
  { id: "spend", label: "Spend", required: true, numeric: true },
  { id: "leads", label: "Leads", required: true, numeric: true },
  { id: "qualified", label: "Qualified leads", required: false, numeric: true },
  { id: "value", label: "Conversion value", required: false, numeric: true },
  { id: "reach", label: "Reach", required: false, numeric: true },
  { id: "audience", label: "Audience", required: false, numeric: false },
  { id: "region", label: "Region", required: false, numeric: false },
];

/** Header names each platform uses, most specific first. Compared after normaliseHeader(). */
export const ALIASES: Record<Field, string[]> = {
  date: ["Day", "Date", "Reporting starts", "Start Date (in UTC)", "Start Date", "Week"],
  campaign: ["Campaign", "Campaign name", "Campaign Name"],
  audience: ["Audience", "Ad set name", "Ad group", "Campaign Group", "Targeting"],
  region: ["Region", "Country", "Country/Territory", "Location"],
  impressions: ["Impressions", "Impr."],
  clicks: ["Link clicks", "Clicks", "Clicks (all)"],
  spend: ["Cost", "Amount spent (USD)", "Amount spent", "Total Spent", "Spend"],
  leads: ["Leads", "Lead form completions", "Conversions", "Results", "Conv."],
  qualified: ["Qualified leads", "SQLs", "Qualified"],
  value: ["Conv. value", "Conversion value", "Total conversion value", "Value"],
  reach: ["Reach"],
};

/** Columns only one platform uses, for auto-detection. */
const SIGNATURES: Record<PlatformId, string[]> = {
  google: ["Impr.", "Conv. value", "Ad group", "Day"],
  meta: ["Amount spent (USD)", "Reporting starts", "Ad set name", "Link clicks", "Reach"],
  linkedin: ["Total Spent", "Start Date (in UTC)", "Campaign Group", "Lead form completions"],
};

export function detectPlatform(header: string[]): PlatformId | null {
  const have = new Set(header.map(normaliseHeader));
  let best: PlatformId | null = null;
  let bestHits = 0;
  for (const p of PLATFORMS) {
    const hits = SIGNATURES[p.id].filter((h) => have.has(normaliseHeader(h))).length;
    if (hits > bestHits) {
      bestHits = hits;
      best = p.id;
    }
  }
  return best;
}

/** Which header (by its original text) feeds each field, or null. */
export function mapColumns(header: string[]): Record<Field, string | null> {
  const byNorm = new Map<string, string>();
  for (const h of header) if (!byNorm.has(normaliseHeader(h))) byNorm.set(normaliseHeader(h), h);
  const used = new Set<string>();
  const out = {} as Record<Field, string | null>;
  for (const f of FIELDS) {
    out[f.id] = null;
    for (const alias of ALIASES[f.id]) {
      const h = byNorm.get(normaliseHeader(alias));
      if (h && !used.has(h)) {
        out[f.id] = h;
        used.add(h);
        break;
      }
    }
  }
  return out;
}

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

/**
 * Dates as exports write them: 2026-10-31, 31/10/2026 or 10/31/2026, "Oct 31, 2026", "31 Oct 2026".
 * Slash dates are read day-first only when the first number can't be a month; `dayFirst` decides the rest.
 */
export function parseDate(raw: string, dayFirst = false): number | null {
  const s = raw.trim().replace(/[T ]\d{1,2}:\d{2}.*$/, "");
  let m = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/.exec(s);
  if (m) return isoToDay(`${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`);
  m = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})$/.exec(s);
  if (m) {
    let [a, b] = [Number(m[1]), Number(m[2])];
    const y = m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3]);
    if (a > 12 || (dayFirst && b <= 12)) [a, b] = [b, a];
    return isoToDay(`${y}-${String(a).padStart(2, "0")}-${String(b).padStart(2, "0")}`);
  }
  m = /^([a-z]{3})[a-z]*\.?\s+(\d{1,2}),?\s+(\d{4})$/i.exec(s) ?? null;
  if (m) {
    const mo = MONTHS.indexOf(m[1].toLowerCase());
    return mo < 0 ? null : isoToDay(`${m[3]}-${String(mo + 1).padStart(2, "0")}-${m[2].padStart(2, "0")}`);
  }
  m = /^(\d{1,2})\s+([a-z]{3})[a-z]*\.?,?\s+(\d{4})$/i.exec(s);
  if (m) {
    const mo = MONTHS.indexOf(m[2].toLowerCase());
    return mo < 0 ? null : isoToDay(`${m[3]}-${String(mo + 1).padStart(2, "0")}-${m[1].padStart(2, "0")}`);
  }
  return null;
}

export type Issue = { level: "error" | "warning" | "info"; message: string; count: number; examples: number[] };

export type ImportResult = {
  fileName: string;
  platform: PlatformId | null;
  /** True when the platform was recognised from the columns, false when it fell back to the visitor's choice. */
  detected: boolean;
  mapping: Record<Field, string | null>;
  header: string[];
  preview: string[][];
  rows: AdRow[];
  /** Data rows read (excluding the header and anything above it). */
  read: number;
  issues: Issue[];
  ok: boolean;
};

/** Read one export. `platform` is used when the columns don't identify the platform. */
export function importCsv(text: string, fileName: string, platform: PlatformId | "auto" = "auto"): ImportResult {
  const issues: Issue[] = [];
  const add = (level: Issue["level"], message: string, rowNo?: number) => {
    let i = issues.find((x) => x.message === message);
    if (!i) issues.push((i = { level, message, count: 0, examples: [] }));
    i.count++;
    if (rowNo !== undefined && i.examples.length < 5) i.examples.push(rowNo);
  };
  const empty = (header: string[] = []): ImportResult => ({
    fileName,
    platform: null,
    detected: false,
    mapping: mapColumns(header),
    header,
    preview: [],
    rows: [],
    read: 0,
    issues,
    ok: false,
  });

  if (!text.trim()) {
    add("error", "The file is empty.");
    return empty();
  }
  const parsed = parseCsv(text);
  parsed.warnings.forEach((w) => add("warning", w));
  const expected = Object.values(ALIASES).flat();
  const h = findHeaderRow(parsed.rows, expected, 3);
  if (h < 0) {
    add("error", "No header row found. The file needs columns such as Campaign, Impressions, Clicks and Cost in one of its first 15 lines.");
    return empty();
  }
  if (h > 0) add("info", `Skipped ${h} line${h === 1 ? "" : "s"} above the header (report title or date range).`);
  const header = parsed.rows[h];
  const mapping = mapColumns(header);
  const found = detectPlatform(header);
  const plat = found ?? (platform === "auto" ? null : platform);
  const base = { ...empty(header), platform: plat, detected: found !== null, mapping, preview: parsed.rows.slice(h + 1, h + 9) };

  const missing = FIELDS.filter((f) => f.required && !mapping[f.id]);
  if (missing.length) {
    add("error", `Missing required column${missing.length === 1 ? "" : "s"}: ${missing.map((f) => f.label).join(", ")}. Expected names include ${missing.map((f) => `"${ALIASES[f.id][0]}"`).join(", ")}.`);
  }
  if (!plat) add("error", "Couldn't tell which platform this export is from. Choose the platform and import it again.");
  if (missing.length || !plat) return base;

  const recs = toRecords(parsed.rows, h);
  // Day-first dates if any slash date in the file has a first part above 12.
  const dateCol = mapping.date as string;
  const dayFirst = recs.some((r) => {
    const m = /^(\d{1,2})[/.-](\d{1,2})[/.-]\d{2,4}/.exec((r[dateCol] ?? "").trim());
    return m !== null && Number(m[1]) > 12;
  });
  const rows: AdRow[] = [];
  recs.forEach((rec, i) => {
    const rowNo = h + i + 2; // 1-based line number in the file, counting the header
    const get = (f: Field) => (mapping[f] ? (rec[mapping[f] as string] ?? "").trim() : "");
    const campaign = get("campaign");
    const dateRaw = get("date");
    if (/^total/i.test(campaign) || /^total/i.test(dateRaw) || (!campaign && /total/i.test(Object.values(rec).join(" ")))) {
      add("info", "Skipped totals rows (the import adds rows up itself).", rowNo);
      return;
    }
    if (!campaign && !dateRaw) return;
    const day = parseDate(dateRaw, dayFirst);
    if (day === null) {
      add("warning", "Skipped rows with a date that couldn't be read.", rowNo);
      return;
    }
    if (!campaign) {
      add("warning", "Skipped rows with no campaign name.", rowNo);
      return;
    }
    const num = (f: Field, optional: boolean): number | null | undefined => {
      const raw = get(f);
      if (!mapping[f]) return null;
      // Blank and dashes are how exports write zero; anything else unreadable (n/a, "abc") skips the row.
      if (raw === "" || /^(-|–|—|--)$/.test(raw)) return optional ? null : 0;
      const v = parseNumber(raw);
      return v === null ? undefined : v;
    };
    const vals = {
      impressions: num("impressions", false),
      clicks: num("clicks", false),
      spend: num("spend", false),
      leads: num("leads", false),
      qualified: num("qualified", true),
      value: num("value", true),
      reach: num("reach", true),
    };
    if (Object.values(vals).some((v) => v === undefined)) {
      add("warning", "Skipped rows with a number that couldn't be read.", rowNo);
      return;
    }
    if (Object.values(vals).some((v) => isNum(v) && v < 0)) {
      add("warning", "Skipped rows with negative values.", rowNo);
      return;
    }
    const v = vals as Record<keyof typeof vals, number | null>;
    if ((v.clicks as number) > (v.impressions as number)) {
      add("warning", "Skipped rows reporting more clicks than impressions.", rowNo);
      return;
    }
    if ((v.leads as number) > (v.clicks as number) && (v.clicks as number) > 0) {
      add("info", "Some rows report more leads than clicks (view-through or offline conversions); kept as reported.", rowNo);
    }
    rows.push({
      day,
      platform: plat,
      campaign,
      audience: get("audience") || UNSPECIFIED,
      region: get("region") || UNSPECIFIED,
      impressions: Math.round(v.impressions as number),
      clicks: Math.round(v.clicks as number),
      spend: Math.round((v.spend as number) * 100) / 100,
      leads: v.leads as number,
      qualified: v.qualified,
      value: v.value,
      reach: v.reach,
    });
  });

  if (!rows.length) add("error", "No usable rows: every data row was skipped (see the reasons above).");
  if (rows.length && !mapping.qualified) add("info", "No qualified-lead column, so CPA (cost per qualified lead) can't be calculated for this file.");
  if (rows.length && !mapping.value) add("info", "No conversion value column, so ROAS can't be calculated for this file.");
  return { ...base, rows, read: recs.length, ok: rows.length > 0 };
}

/** Combine imports; a later file for the same platform replaces the earlier one. */
export function combine(results: ImportResult[]): AdRow[] {
  const byPlatform = new Map<PlatformId, AdRow[]>();
  for (const r of results) if (r.ok && r.platform) byPlatform.set(r.platform, r.rows);
  return [...byPlatform.values()].flat();
}

// ---- Sample exports -----------------------------------------------------------------------------

const money = (v: number) => v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const int = (v: number) => v.toLocaleString("en-US");
const q = (s: string) => (/[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);
const line = (cells: string[], d = ",") => cells.map(q).join(d);
const usDate = (day: number) => {
  const [y, m, dd] = dayToIso(day).split("-");
  return `${Number(m)}/${Number(dd)}/${y}`;
};

/**
 * A sample export in the platform's own shape (column names, number formats, report title lines,
 * a totals row), built from the last four weeks of the demo account, so the import has real work to do.
 */
export function sampleCsv(rows: AdRow[], platform: PlatformId, weeks = 4): string {
  const mine = rows.filter((r) => r.platform === platform);
  if (!mine.length) return "";
  const end = Math.max(...mine.map((r) => r.day));
  const from = end - weeks * 7 + 1;
  type Agg = { day: number; campaign: string; audience: string; region: string; impressions: number; clicks: number; spend: number; leads: number; value: number; reach: number };
  const groups = new Map<string, Agg>();
  for (const r of mine) {
    if (r.day < from) continue;
    // Google and LinkedIn samples have no region split; Meta's keeps it.
    const region = platform === "meta" ? r.region : "";
    const k = `${r.day}|${r.campaign}|${region}`;
    const g = groups.get(k) ?? { day: r.day, campaign: r.campaign, audience: r.audience, region, impressions: 0, clicks: 0, spend: 0, leads: 0, value: 0, reach: 0 };
    g.impressions += r.impressions;
    g.clicks += r.clicks;
    g.spend += r.spend;
    g.leads += r.leads;
    g.value += r.value ?? 0;
    g.reach += r.reach ?? 0;
    groups.set(k, g);
  }
  const aggs = [...groups.values()].sort((a, b) => a.day - b.day || a.campaign.localeCompare(b.campaign));
  const t = aggs.reduce((s, a) => ({ impressions: s.impressions + a.impressions, clicks: s.clicks + a.clicks, spend: s.spend + a.spend, leads: s.leads + a.leads, value: s.value + a.value }), { impressions: 0, clicks: 0, spend: 0, leads: 0, value: 0 });

  if (platform === "google") {
    return [
      "Campaign performance report",
      `"${usDate(from)} - ${usDate(end)}"`,
      line(["Day", "Campaign", "Ad group", "Impr.", "Clicks", "Cost", "Conversions", "Conv. value"]),
      ...aggs.map((a) => line([dayToIso(a.day), a.campaign, a.audience, int(a.impressions), int(a.clicks), money(a.spend), a.leads.toFixed(2), money(a.value)])),
      line(["Total: Account", "", "", int(t.impressions), int(t.clicks), money(t.spend), t.leads.toFixed(2), money(t.value)]),
    ].join("\r\n");
  }
  if (platform === "meta") {
    return [
      line(["Reporting starts", "Reporting ends", "Campaign name", "Ad set name", "Region", "Impressions", "Reach", "Link clicks", "Amount spent (USD)", "Leads"]),
      ...aggs.map((a) => line([dayToIso(a.day), dayToIso(a.day), a.campaign, a.audience, a.region, String(a.impressions), String(a.reach), String(a.clicks), a.spend.toFixed(2), a.leads ? String(a.leads) : ""])),
    ].join("\n");
  }
  return [
    line(["Start Date (in UTC)", "Campaign Name", "Campaign Group", "Impressions", "Clicks", "Total Spent", "Lead form completions", "Conversions"]),
    ...aggs.map((a) => line([usDate(a.day), a.campaign, a.audience, String(a.impressions), String(a.clicks), money(a.spend), String(a.leads), "--"])),
  ].join("\n");
}
