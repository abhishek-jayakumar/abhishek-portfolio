// Experiment 02: data integrity, one metric definition for every platform, CSV import, the budget model and the analyst.
import { test } from "node:test";
import assert from "node:assert/strict";
import { generate } from "../paid/generate.ts";
import { DEMO_CAMPAIGNS, DEMO_DAYS, DEMO_END, DEMO_START, REGIONS, isoToDay, dayToIso, type AdRow } from "../paid/model.ts";
import { breakdown, currentPlan, curves, fitPower, marginalCpl, optimise, periods, planTotals, predictLeads, project, rates, scope, totals, weekly, type Filter } from "../paid/metrics.ts";
import { combine, detectPlatform, importCsv, mapColumns, parseDate, sampleCsv } from "../paid/import.ts";
import { analystPrompt, runAnalyst, summary } from "../paid/insights.ts";

const rows = generate();
const ALL: Filter = { range: 90, platform: "all" };

test("generation is deterministic and covers every campaign, region and day", () => {
  const again = generate();
  assert.equal(again.length, rows.length);
  assert.deepEqual(again[4321], rows[4321]);
  assert.equal(rows.length, DEMO_CAMPAIGNS.length * REGIONS.length * DEMO_DAYS);
  assert.equal(Math.min(...rows.map((r) => r.day)), DEMO_START);
  assert.equal(Math.max(...rows.map((r) => r.day)), DEMO_END);
});

test("every row is internally consistent", () => {
  for (const r of rows) {
    assert.ok(r.spend >= 0 && r.impressions >= 0);
    assert.ok(r.clicks <= r.impressions, "clicks never exceed impressions");
    assert.ok(r.leads <= r.clicks, "leads never exceed clicks");
    assert.ok(r.qualified !== null && r.qualified <= r.leads);
    assert.ok(r.value !== null && (r.qualified > 0 || r.value === 0));
    if (r.platform === "meta") assert.ok(r.reach !== null && r.reach > 0 && r.reach <= r.impressions);
    else assert.equal(r.reach, null);
  }
});

test("breakdowns reconcile with totals on every dimension", () => {
  const per = periods(rows, 90);
  assert.ok(per && per.previous);
  const cur = scope(rows, ALL, per.current);
  const t = totals(cur);
  for (const d of ["platform", "campaign", "audience", "region"] as const) {
    const b = breakdown(cur, d);
    assert.equal(b.reduce((s, x) => s + x.leads, 0), t.leads, d);
    assert.equal(b.reduce((s, x) => s + x.clicks, 0), t.clicks, d);
    assert.ok(Math.abs(b.reduce((s, x) => s + x.spend, 0) - t.spend) < 0.05, d);
  }
  const weeks = weekly(cur, per.current);
  assert.equal(weeks.length, 13);
  assert.equal(weeks.reduce((s, w) => s + w.totals.leads, 0), t.leads);
});

test("one definition of each metric, with no division by zero", () => {
  const r = rates({ spend: 500, impressions: 100_000, clicks: 1000, leads: 20, qualified: 5, value: 10_000, reach: 40_000, reachImpressions: 80_000, rows: 1 });
  assert.equal(r.ctr, 0.01);
  assert.equal(r.cpc, 0.5);
  assert.equal(r.cpm, 5);
  assert.equal(r.cvr, 0.02);
  assert.equal(r.cpl, 25);
  assert.equal(r.qualRate, 0.25);
  assert.equal(r.cpa, 100);
  assert.equal(r.roas, 20);
  assert.equal(r.frequency, 2);
  const z = rates(totals([]));
  for (const v of Object.values(z)) assert.equal(v, null);
});

test("periods: 30/90 days end on the last day; All has no comparison", () => {
  const p = periods(rows, 30);
  assert.ok(p);
  assert.equal(p.current.to, DEMO_END);
  assert.equal(p.current.to - p.current.from + 1, 30);
  assert.equal(p.previous?.to, p.current.from - 1);
  assert.equal(periods(rows, 0)?.previous, null);
  assert.equal(periods([], 30), null);
});

test("dates: ISO, US, day-first and written months", () => {
  assert.equal(parseDate("2026-10-31"), isoToDay("2026-10-31"));
  assert.equal(parseDate("10/31/2026"), isoToDay("2026-10-31"));
  assert.equal(parseDate("31/10/2026"), isoToDay("2026-10-31"));
  assert.equal(parseDate("03/04/2026", true), isoToDay("2026-04-03"));
  assert.equal(parseDate("Oct 31, 2026"), isoToDay("2026-10-31"));
  assert.equal(parseDate("31 October 2026"), isoToDay("2026-10-31"));
  assert.equal(parseDate("2026-02-30"), null);
  assert.equal(parseDate("yesterday"), null);
  assert.equal(dayToIso(isoToDay("2026-01-05") as number), "2026-01-05");
});

test("each platform's sample export imports back to the same numbers", () => {
  for (const p of ["google", "meta", "linkedin"] as const) {
    const csv = sampleCsv(rows, p);
    const res = importCsv(csv, `${p}.csv`);
    assert.ok(res.ok, `${p}: ${res.issues.map((i) => i.message).join(" | ")}`);
    assert.equal(res.platform, p);
    assert.ok(res.detected);
    const src = rows.filter((r) => r.platform === p && r.day > DEMO_END - 28);
    const a = totals(src);
    const b = totals(res.rows);
    assert.equal(b.impressions, a.impressions, p);
    assert.equal(b.clicks, a.clicks, p);
    assert.equal(b.leads, a.leads, p);
    assert.ok(Math.abs(b.spend - a.spend) < 1, `${p} spend ${b.spend} vs ${a.spend}`);
  }
  const g = importCsv(sampleCsv(rows, "google"), "g.csv");
  assert.ok(g.issues.some((i) => /above the header/.test(i.message)), "title lines skipped");
  assert.ok(g.issues.some((i) => /totals rows/.test(i.message)), "totals row skipped");
  assert.equal(g.mapping.impressions, "Impr.");
  assert.equal(g.mapping.value, "Conv. value");
  const li = importCsv(sampleCsv(rows, "linkedin"), "li.csv");
  assert.equal(li.mapping.leads, "Lead form completions");
  assert.equal(li.mapping.spend, "Total Spent");
});

test("import validation: messy headers, bad numbers, negatives, clicks > impressions, missing columns", () => {
  const messy = [
    "﻿Some report title",
    "  campaign NAME ;IMPRESSIONS;Link Clicks;amount spent (usd);Leads;Date",
    'Spring push;"12,000";300;"$1,234.50";12;2026-10-01',
    "Spring push;n/a;300;100;3;2026-10-02",
    "Spring push;1000;-5;100;3;2026-10-03",
    "Spring push;100;300;100;3;2026-10-04",
    "Spring push;1000;30;100;3;someday",
    "Total;13000;600;1500;20;",
  ].join("\n");
  const res = importCsv(messy, "messy.csv");
  assert.equal(res.platform, "meta");
  assert.equal(res.rows.length, 1);
  assert.equal(res.rows[0].impressions, 12000);
  assert.equal(res.rows[0].spend, 1234.5);
  const msgs = res.issues.map((i) => i.message).join(" | ");
  for (const re of [/number that couldn't be read/, /negative/, /more clicks than impressions/, /date that couldn't be read/, /totals/]) assert.match(msgs, re);

  const missing = importCsv("Campaign,Impressions,Clicks\nA,100,5\n", "x.csv", "google");
  assert.equal(missing.ok, false);
  assert.match(missing.issues[0].message, /Missing required columns: Date, Spend, Leads/);
  assert.equal(importCsv("", "e.csv").ok, false);
  assert.equal(importCsv("hello\nworld", "e.csv").ok, false);
  // Unknown platform: needs the visitor's choice.
  const generic = "Date,Campaign,Impressions,Clicks,Spend,Leads\n2026-10-01,A,1000,20,50,2\n";
  assert.equal(importCsv(generic, "g.csv").ok, false);
  assert.equal(importCsv(generic, "g.csv", "linkedin").ok, true);
  assert.equal(detectPlatform(["Day", "Impr.", "Cost"]), "google");
  assert.equal(mapColumns(["Clicks (all)", "Link clicks"]).clicks, "Link clicks");
});

test("combine: a later file for a platform replaces the earlier one", () => {
  const a = importCsv(sampleCsv(rows, "google", 2), "a.csv");
  const b = importCsv(sampleCsv(rows, "google", 1), "b.csv");
  const m = importCsv(sampleCsv(rows, "meta", 1), "m.csv");
  const all = combine([a, m, b]);
  assert.equal(all.filter((r) => r.platform === "google").length, b.rows.length);
  assert.equal(all.filter((r) => r.platform === "meta").length, m.rows.length);
});

test("power fit recovers a known curve; flat spend can't be fitted", () => {
  const pts = [500, 800, 1200, 2000, 3000, 4500].map((s) => ({ spend: s, leads: 3 * s ** 0.6 }));
  const fit = fitPower(pts);
  assert.ok(fit);
  assert.ok(Math.abs(fit.b - 0.6) < 1e-9 && Math.abs(fit.a - 3) < 1e-6 && fit.r2 > 0.999);
  assert.equal(fitPower([{ spend: 100, leads: 5 }, { spend: 100, leads: 6 }, { spend: 100, leads: 7 }]), null);
});

test("budget model: diminishing returns, reproduces today, optimiser keeps the total and does better", () => {
  const cs = curves(rows);
  assert.equal(cs.length, DEMO_CAMPAIGNS.length);
  assert.ok(cs.every((c) => c.fitted), "every demo campaign has enough variation to fit");
  const generic = cs.find((c) => c.campaign === "Search – CRM software");
  const compare = cs.find((c) => c.campaign === "Search – Competitor terms");
  assert.ok(generic && compare);
  assert.ok(generic.b < 0.6, `generic search is saturated (b=${generic.b.toFixed(2)})`);
  assert.ok(compare.b > 0.65, `competitor terms scale (b=${compare.b.toFixed(2)})`);
  for (const c of cs) {
    const m = c.weeklySpend * (30 / 7);
    assert.ok(predictLeads(c, 2 * m) < 2 * predictLeads(c, m), "doubling spend less than doubles leads");
    assert.ok((marginalCpl(c, 2 * m) as number) > (marginalCpl(c, m) as number), "the next lead gets dearer");
    assert.equal(predictLeads(c, 0), 0);
  }
  const base = currentPlan(cs);
  const total = Object.values(base).reduce((a, b) => a + b, 0);
  const next = optimise(cs, total, "qualified");
  const spent = Object.values(next).reduce((a, b) => a + b, 0);
  assert.ok(Math.abs(spent - total) <= cs.length, `allocates the whole budget (${spent} vs ${total})`);
  for (const c of cs) assert.ok(next[c.key] >= base[c.key] * 0.5 - 1 && next[c.key] <= base[c.key] * 2 + 1, "stays within the tested range");
  const before = planTotals(cs.map((c) => project(c, base[c.key])));
  const after = planTotals(cs.map((c) => project(c, next[c.key])));
  assert.ok((after.qualified as number) > (before.qualified as number));
  assert.ok(next[generic.key] < base[generic.key], "money moves out of the saturated campaign");
});

test("the analyst finds the four planted stories, with evidence", () => {
  const f = runAnalyst(rows, ALL);
  const ids = f.map((x) => x.id);
  const has = (re: RegExp) => ids.some((id) => re.test(id));
  assert.ok(has(/^ctr-cvr-meta\|Prospecting – Broad video$/), `high CTR, low conversion: ${ids.join(", ")}`);
  assert.ok(has(/^fatigue-meta\|Retargeting – Site visitors$/), `fatigue: ${ids.join(", ")}`);
  assert.ok(has(/^quality-high-linkedin\|ABM – Sales leaders$/), `ABM quality: ${ids.join(", ")}`);
  assert.ok(has(/^saturated-google\|Search – CRM software$/), `saturation: ${ids.join(", ")}`);
  assert.ok(has(/^realloc$/));
  assert.ok(!has(/^fatigue-(google|linkedin)/), "no false fatigue on search or LinkedIn");
  assert.ok(!has(/^zero-/) && !has(/^data-/), "no data alarms on clean data");
  for (const x of f) {
    assert.ok(x.evidence.length > 0 && x.rule.length > 0);
    assert.ok(!/NaN|Infinity|undefined/.test(JSON.stringify(x)), x.id);
  }
  const prompt = analystPrompt(f, rows, ALL);
  assert.match(prompt, /Use only the numbers given below/);
  assert.match(summary(rows, ALL) ?? "", /leads at \$/);
});

test("the analyst copes with thin and imported data", () => {
  assert.deepEqual(runAnalyst([], ALL), []);
  const few: AdRow[] = rows.slice(0, 20);
  assert.doesNotThrow(() => runAnalyst(few, { range: 0, platform: "all" }));
  const imported = importCsv(sampleCsv(rows, "meta"), "m.csv").rows;
  const f = runAnalyst(imported, { range: 0, platform: "all" });
  assert.ok(!f.some((x) => x.id.startsWith("quality-")), "no quality rules without a qualified column");
  const zero = [...imported, { ...imported[0], campaign: "Dead campaign", spend: 1500, clicks: 400, leads: 0 }];
  assert.ok(runAnalyst(zero, { range: 0, platform: "all" }).some((x) => x.id === "zero-meta|Dead campaign"));
});
