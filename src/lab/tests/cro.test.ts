// Experiment 04: data integrity, journey metrics, test planning and honest verdicts.
import { test } from "node:test";
import assert from "node:assert/strict";
import { generate } from "../cro/generate.ts";
import { PAGES } from "../cro/model.ts";
import { ALL, count, journey, pageStats, recovered, siteStats, stepRates, baselineFor } from "../cro/metrics.ts";
import { MAX_DAYS, MIN_DAYS, PRESETS, PRESET_PLANNED, analyse, detectableIn, hypothesisText, missingParts, plan, powerFor, presetResults, srmTest, type Results } from "../cro/experiment.ts";
import { runAssistant, strongestPage, assistantPrompt, COPY } from "../cro/insights.ts";

const data = generate();

test("generation is deterministic", () => {
  const again = generate();
  assert.equal(again.rows.length, data.rows.length);
  assert.deepEqual(again.rows[777], data.rows[777]);
});

test("every row's journey only narrows: each stage is a subset of the one before", () => {
  for (const r of data.rows) {
    const st = [r.visitors, r.engaged, r.cta, r.start, r.submit, r.qualified];
    st.forEach((v, i) => {
      assert.ok(Number.isInteger(v) && v >= 0);
      if (i > 0) assert.ok(v <= st[i - 1], `stage ${i} grew`);
    });
    assert.ok(r.scrollSum >= 0 && r.scrollSum <= r.visitors + 1e-9);
  }
});

test("page stats reconcile with the site total and step rates stay in 0–1", () => {
  const pages = pageStats(data, ALL);
  const site = siteStats(data, ALL);
  assert.equal(pages.reduce((a, p) => a + p.visitors, 0), site.visitors);
  assert.equal(pages.reduce((a, p) => a + p.submits, 0), site.submits);
  for (const p of PAGES) for (const r of stepRates(count(data, ALL, p.id))) if (r !== null) assert.ok(r >= 0 && r <= 1);
  // A device filter is a strict slice.
  const mobile = siteStats(data, { device: "mobile", source: "all" });
  assert.ok(mobile.visitors > 0 && mobile.visitors < site.visitors);
});

test("the journey flags the planted drop-offs", () => {
  assert.equal(journey(data, ALL, "pricing").worst, 3, "pricing loses people between form start and submit");
  assert.equal(journey(data, ALL, "trial").worst, 3, "free trial's form");
  assert.equal(journey(data, ALL, "compare").worst, 0, "compare loses visitors before they engage");
  assert.equal(journey(data, ALL, "demo").worst, null, "the demo page has no step below the median");
  const trial = journey(data, ALL, "trial");
  const desk = trial.devices.find((d) => d.id === "desktop");
  const mob = trial.devices.find((d) => d.id === "mobile");
  assert.ok((mob?.rates[3] as number) < 0.6 * (desk?.rates[3] as number), "mobile form completion collapses on the free trial");
});

test("leads recovered: zero when a step already beats the target, positive when below", () => {
  const c = count(data, ALL, "pricing");
  const rates = stepRates(c);
  assert.equal(recovered(c, rates, 3, 0.01), 0);
  const r = recovered(c, rates, 3, 0.6) as number;
  assert.ok(r > 0);
  // Hand check: entered × gap × downstream qualify rate.
  assert.ok(Math.abs(r - c.stages[3] * (0.6 - (rates[3] as number)) * (rates[4] as number)) < 1e-9);
  assert.equal(recovered(c, [null, null, null, null, null], 0, 0.5), null);
});

test("planning: sample size grows as the effect shrinks; duration in whole weeks, at least two", () => {
  const big = plan({ baseline: 0.05, mde: 0.3, alpha: 0.05, power: 0.8, daily: 600, share: 1 });
  const small = plan({ baseline: 0.05, mde: 0.1, alpha: 0.05, power: 0.8, daily: 600, share: 1 });
  assert.ok(big && small && small.perVariant > big.perVariant * 5);
  assert.ok(big.recommendedDays >= MIN_DAYS && big.recommendedDays % 7 === 0);
  assert.equal(small.days, Math.ceil(small.total / 600));
  assert.ok(small.tooLong, "a 10% lift on a 5% baseline at 600 a day takes more than six weeks");
  const half = plan({ baseline: 0.05, mde: 0.3, alpha: 0.05, power: 0.8, daily: 600, share: 0.5 });
  assert.equal(half?.perVariant, big.perVariant);
  assert.ok((half?.days as number) >= big.days * 2 - 1);
  assert.equal(plan({ baseline: null, mde: 0.2, alpha: 0.05, power: 0.8, daily: 600, share: 1 }), null);
  const m = detectableIn({ baseline: 0.05, alpha: 0.05, power: 0.8, daily: 600, share: 1 }) as number;
  assert.ok((plan({ baseline: 0.05, mde: m, alpha: 0.05, power: 0.8, daily: 600, share: 1 })?.recommendedDays as number) <= MAX_DAYS);
  const b = baselineFor(data, ALL, "trial", "conversion");
  assert.ok(b.daily > 100 && (b.rate as number) > 0);
});

test("hypothesis text names every part; missing parts are listed", () => {
  const h = { observation: "x", change: "y", audience: "z", metric: "m", control: "", variation: "" };
  assert.equal(hypothesisText(h), "Because we saw x, we believe y for z will increase m.");
  assert.deepEqual(missingParts(h), ["the control", "the variation"]);
});

test("sample-ratio check: an even split passes, a 51.7/48.3 split on 23k visitors fails", () => {
  assert.ok(srmTest(10000, 10050) > 0.5);
  assert.ok(srmTest(12000, 11200) < 0.001);
});

test("verdicts: each preset reads the way an honest analyst would", () => {
  const kind = (id: string) => {
    const a = analyse(presetResults(PRESETS.find((p) => p.id === id) as (typeof PRESETS)[number]));
    assert.ok(!("error" in a));
    return a;
  };
  assert.equal(kind("winner").kind, "winner");
  assert.equal(kind("loser").kind, "loser");
  assert.equal(kind("flat").kind, "flat");
  assert.equal(kind("srm").kind, "invalid");
  const early = kind("early");
  assert.equal(early.kind, "early", "won't call a winner before the planned sample");
  assert.ok(early.test.pValue < 0.05, "the early peek does look significant");
  assert.equal(early.checks.find((c) => c.id === "peek")?.ok, false, "and is flagged as peeking");
  assert.ok(PRESET_PLANNED > 10000 && PRESET_PLANNED < 11000);
});

test("verdicts: significant but under a week is still too early; underpowered null is inconclusive, not 'no effect'", () => {
  const base: Results = { visitorsA: 12000, convA: 480, visitorsB: 12000, convB: 600, planned: 10000, splitB: 0.5, daysRun: 5, mde: 0.2, alpha: 0.05 };
  assert.equal((analyse(base) as { kind: string }).kind, "early");
  assert.equal((analyse({ ...base, daysRun: 14 }) as { kind: string }).kind, "winner");
  const tiny: Results = { visitorsA: 2000, convA: 80, visitorsB: 2000, convB: 84, planned: 1500, splitB: 0.5, daysRun: 14, mde: 0.2, alpha: 0.05 };
  assert.equal((analyse(tiny) as { kind: string }).kind, "inconclusive");
  assert.ok(powerFor(0.04, 0.2, 2000, 2000) < 0.8);
});

test("analysis rejects impossible input instead of computing nonsense", () => {
  const ok: Results = { visitorsA: 100, convA: 5, visitorsB: 100, convB: 6, planned: 100, splitB: 0.5, daysRun: 7, mde: 0.2, alpha: 0.05 };
  assert.ok("error" in analyse({ ...ok, convA: 101 }));
  assert.ok("error" in analyse({ ...ok, visitorsB: 0 }));
  assert.ok("error" in analyse({ ...ok, convB: Number.NaN }));
  assert.ok("error" in analyse({ ...ok, daysRun: 0 }));
});

test("the assistant finds the planted stories, ranks by ICE and drafts complete hypotheses", () => {
  const fixes = runAssistant(data, ALL);
  const ids = fixes.map((f) => f.finding.id);
  assert.ok(ids.includes("step-pricing-3"), "pricing form abandonment");
  assert.ok(ids.includes("device-trial-3"), "free-trial mobile form");
  assert.ok(ids.includes("device-compare-0"), "compare mobile bounce");
  assert.ok(ids.includes("intent-blog"), "blog low intent");
  for (let i = 1; i < fixes.length; i++) assert.ok(fixes[i - 1].ice.score >= fixes[i].ice.score);
  for (const f of fixes) {
    assert.deepEqual(missingParts(f.hypothesis), []);
    for (const v of [f.ice.impact, f.ice.confidence, f.ice.ease]) assert.ok(v >= 1 && v <= 10);
    assert.ok(f.finding.evidence.length >= 3);
  }
  assert.equal(new Set(fixes.map((f) => `${f.page}-${f.step}`)).size, fixes.length, "one fix per page and step");
  assert.equal(strongestPage(data, ALL)?.id, "best-demo");
  const prompt = assistantPrompt(fixes, ALL);
  assert.ok(prompt.includes("Do not introduce") && prompt.includes("Pricing"));
  for (const p of PAGES) assert.ok(COPY[p.id].headlines.length >= 2 && COPY[p.id].ctas.length >= 2);
});
