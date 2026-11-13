// Experiment 03: data integrity, RFM segmentation, cohort maths, CLV, journey drafting and the assistant.
import { test } from "node:test";
import assert from "node:assert/strict";
import { generate } from "../lifecycle/generate.ts";
import { END_DAY, EVENTS, monthIndex } from "../lifecycle/model.ts";
import {
  ALL,
  CHURN_DAYS,
  SEGMENTS,
  YEAR,
  cohorts,
  fScore,
  firstYearRevenue,
  frequencyBuckets,
  kpis,
  mScore,
  ordersOf,
  profileAt,
  profilesAt,
  rScore,
  segmentFlow,
  segmentFor,
  segmentSummary,
  select,
} from "../lifecycle/metrics.ts";
import { GOALS, PLACEHOLDERS, audienceOf, fill, reorderPoint, simulateJourney, templateSteps, varsFor } from "../lifecycle/journeys.ts";
import { assistantPrompt, runAssistant } from "../lifecycle/insights.ts";

const data = generate();
const all = profilesAt(data);

test("generation is deterministic", () => {
  const again = generate();
  assert.equal(again.customers.length, data.customers.length);
  assert.equal(again.orders.length, data.orders.length);
  assert.deepEqual(again.customers[777], data.customers[777]);
  assert.deepEqual(again.orders[5000], data.orders[5000]);
});

test("orders belong to their customer, in date order, numbered, and never after the data ends", () => {
  const ids = new Set<string>();
  let counted = 0;
  data.customers.forEach((c, ci) => {
    const os = ordersOf(data, c);
    assert.equal(os.length, c.n);
    assert.ok(c.n >= 1);
    assert.equal(os[0].day, c.day, "first order on the acquisition day");
    os.forEach((o, k) => {
      assert.equal(o.customer, ci);
      assert.equal(o.seq, k + 1);
      assert.ok(o.day <= END_DAY);
      assert.ok(o.value > 0 && o.discount >= 0);
      if (k > 0) assert.ok(o.day > os[k - 1].day);
      assert.ok(!ids.has(o.id));
      ids.add(o.id);
    });
    if (c.code === EVENTS.festiveSale.code) assert.ok(c.festive && os[0].discount > 0);
    if (c.channel === "marketplace") assert.equal(os[0].channel, "marketplace");
    counted += os.length;
  });
  assert.equal(counted, data.orders.length, "every order is reachable from exactly one customer");
  assert.ok(data.customers.length > 8000 && data.orders.length > 18000);
});

test("RFM scores follow the stated thresholds", () => {
  assert.deepEqual([0, 30, 31, 60, 61, 90, 91, 180, 181].map(rScore), [5, 5, 4, 4, 3, 3, 2, 2, 1]);
  assert.deepEqual([1, 2, 3, 4, 5, 7, 8, 20].map(fScore), [1, 2, 3, 3, 4, 4, 5, 5]);
  assert.deepEqual([0, 799, 800, 1599, 1600, 3199, 3200, 5999, 6000].map(mScore), [1, 1, 2, 2, 3, 3, 4, 4, 5]);
  assert.equal(segmentFor(5, 1, 5), "high");
  assert.equal(segmentFor(4, 3, 2), "loyal");
  assert.equal(segmentFor(5, 2, 2), "active");
  assert.equal(segmentFor(4, 1, 1), "new");
  assert.equal(segmentFor(3, 2, 5), "risk");
  assert.equal(segmentFor(3, 1, 1), "lapsed");
  assert.equal(segmentFor(1, 5, 5), "lapsed");
});

test("segments partition every customer, and the summary reconciles", () => {
  assert.equal(all.length, data.customers.length);
  const rows = segmentSummary(data, "all");
  assert.equal(rows.length, SEGMENTS.length);
  assert.equal(rows.reduce((a, r) => a + r.customers, 0), all.length);
  for (const r of rows) assert.ok(r.customers > 0, `${r.label} is empty`);
  const bySegment = SEGMENTS.reduce((a, sg) => a + select(data, { channel: "all", segment: sg.id }).length, 0);
  assert.equal(bySegment, all.length);
  // A profile as of an earlier day only sees orders up to that day.
  const p = all.find((x) => x.orders >= 4) as (typeof all)[number];
  const earlier = profileAt(data, p.ci, data.orders[p.c.o0 + 1].day);
  assert.equal(earlier?.orders, 2);
});

test("cohort retention: month 0 excluded, future months null, shares in range, sizes add up", () => {
  const c = cohorts(data, all);
  assert.equal(c.sizes.reduce((a, b) => a + b, 0), all.length);
  const last = monthIndex(END_DAY);
  c.months.forEach((m, i) => {
    c.values[i].forEach((v, k) => {
      if (m + k + 1 > last) assert.equal(v, null);
      else assert.ok(v !== null && v >= 0 && v <= 1);
    });
  });
  // Hand-check one cell.
  const row = 3;
  const m = c.months[row];
  const members = all.filter((p) => monthIndex(p.c.day) === m);
  const back = members.filter((p) => ordersOf(data, p.c).some((o) => monthIndex(o.day) === m + 2)).length;
  assert.equal(c.values[row][1], back / members.length);
});

test("KPIs: repeat, churn + retention = 100%, CLV from first-year revenue", () => {
  const k = kpis(data, all);
  assert.ok(k.repeatRate !== null && k.repeatRate > 0.25 && k.repeatRate < 0.6);
  assert.ok(k.churnRate !== null && k.retentionRate !== null);
  assert.ok(Math.abs((k.churnRate as number) + (k.retentionRate as number) - 1) < 1e-12);
  const old = all.filter((p) => END_DAY - p.c.day >= YEAR);
  const clv = old.reduce((a, p) => a + firstYearRevenue(data, p.c), 0) / old.length;
  assert.ok(Math.abs((k.clvRevenue as number) - clv) < 1e-6);
  const churned = all.filter((p) => END_DAY - p.c.day > CHURN_DAYS && p.recency > CHURN_DAYS).length;
  assert.equal(k.churnRate, churned / k.churnBase);
  // Empty input gives "no value", never NaN.
  const empty = kpis(data, []);
  assert.equal(empty.repeatRate, null);
  assert.equal(empty.aov, null);
});

test("behaviour views reconcile", () => {
  const freq = frequencyBuckets(all);
  assert.equal(freq.reduce((a, b) => a + b.value, 0), all.length);
  const flow = segmentFlow(data, all, 90);
  assert.equal(flow.counts.flat().reduce((a, b) => a + b, 0), all.length);
});

test("journey drafting fills every placeholder in every template", () => {
  const ps = select(data, { channel: "all", segment: "risk" });
  const rp = reorderPoint(data, ps);
  assert.ok(rp.fromData && rp.median > 20 && rp.median < 60);
  const vars = varsFor(ps[0], rp.median, "a test offer");
  for (const k of PLACEHOLDERS) assert.ok(vars[k].length > 0);
  for (const g of GOALS) {
    for (const st of templateSteps(g.id, rp.send)) {
      const body = fill(st.body, vars);
      const subject = fill(st.subject, vars);
      assert.deepEqual(body.unknown, []);
      assert.deepEqual(subject.unknown, []);
      assert.ok(!/\{[a-z_]+\}/.test(body.text + subject.text), `unfilled placeholder in ${g.id}`);
    }
  }
  assert.deepEqual(fill("Hi {first_name} {oops}", vars).unknown, ["oops"]);
  assert.equal(templateSteps("replenish", rp.send)[0].delay, rp.send);
});

test("journey simulation stays within the audience", () => {
  const ps = select(data, { channel: "all", segment: "lapsed" });
  const a = audienceOf(ps);
  const steps = templateSteps("winback", 30);
  const sim = simulateJourney(steps, a, "winback");
  assert.ok(sim.orders > 0 && sim.orders < a.size);
  sim.steps.forEach((r) => assert.ok(r.sent <= a.size && r.read <= r.sent && r.orders <= r.read));
  assert.ok(sim.discountCost > 0, "win-back offer is a discount");
  const none = simulateJourney(steps, audienceOf([]), "winback");
  assert.equal(none.orders, 0);
  assert.equal(none.conversion, null);
});

test("the assistant finds the planted stories, with evidence", () => {
  const f = runAssistant(data, ALL);
  const ids = f.map((x) => x.id);
  for (const id of ["overdue", "festive", "subs", "marketplace"]) assert.ok(ids.includes(id), `missing ${id}`);
  for (const x of f) {
    assert.ok(x.evidence.length > 0 && x.rule.length > 0);
    assert.ok(!/NaN|Infinity|undefined/.test(x.title + x.summary + JSON.stringify(x.evidence)), `${x.id} has a broken number`);
  }
  assert.equal(f.find((x) => x.id === "overdue")?.status, "critical");
  const prompt = assistantPrompt(f, ALL);
  assert.ok(prompt.includes("Use only the numbers given below"));
  // Small slices are flagged rather than over-read.
  const small = runAssistant(data, { channel: "referral", segment: "high" });
  assert.ok(small.some((x) => x.id === "small"));
});
