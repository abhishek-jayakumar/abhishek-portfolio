// Run with: npm run test:lab
import { test } from "node:test";
import assert from "node:assert/strict";
import { ratio, change, sum, mean, stdev, zScore, shares, parseNumber, round } from "../shared/lib/safe-math.ts";
import { formatCurrency, formatPercent, formatMultiple, formatNumber, formatPoints, DASH } from "../shared/lib/format.ts";
import { createRng, makeId } from "../shared/lib/random.ts";
import { parseCsv, detectDelimiter, findHeaderRow, toRecords, normaliseHeader } from "../shared/lib/csv.ts";
import { normalCdf, normalQuantile, wilsonInterval, twoProportionTest, sampleSizePerVariant } from "../shared/lib/stats.ts";
import { niceTicks, linearScale } from "../shared/lib/scale.ts";

const close = (a: number | null | undefined, b: number, tol = 1e-4) => {
  assert.ok(a !== null && a !== undefined && Math.abs(a - b) <= tol, `expected ${a} ≈ ${b}`);
};

test("safe-math: zero and missing denominators give null, never Infinity/NaN", () => {
  assert.equal(ratio(5, 0), null);
  assert.equal(ratio(null, 4), null);
  assert.equal(ratio(5, NaN), null);
  assert.equal(ratio(3, 4), 0.75);
  assert.equal(change(110, 100), 0.1);
  assert.equal(change(5, 0), null);
  close(change(-50, -100), 0.5); // less negative is an improvement
  assert.equal(sum([1, null, 2, undefined, NaN, 3]), 6);
  assert.equal(mean([]), null);
  assert.equal(stdev([4]), null);
  close(stdev([2, 4, 4, 4, 5, 5, 7, 9]), 2.13809);
  assert.equal(zScore(5, [5, 5, 5]), null); // zero spread: no z-score
  assert.deepEqual(shares([0, 0]), [null, null]);
  assert.equal(round(2.345, 2), 2.35);
  assert.equal(round(-2.345, 2), -2.35);
});

test("safe-math: parseNumber reads messy export values", () => {
  assert.equal(parseNumber("1,234.50"), 1234.5);
  assert.equal(parseNumber("$1.2k"), 1200);
  assert.equal(parseNumber("₹ 45,000"), 45000);
  close(parseNumber("12.5%"), 0.125);
  assert.equal(parseNumber("(45)"), -45);
  assert.equal(parseNumber("--"), null);
  assert.equal(parseNumber(" — "), null);
  assert.equal(parseNumber("abc"), null);
  assert.equal(parseNumber("USD 3.40"), 3.4);
});

test("format: missing values show a dash; units read correctly", () => {
  assert.equal(formatCurrency(null), DASH);
  assert.equal(formatPercent(NaN), DASH);
  assert.equal(formatMultiple(Infinity), DASH);
  assert.equal(formatPercent(0.1234), "12.3%");
  assert.equal(formatPercent(0.05, { signed: true }), "+5.0%");
  assert.equal(formatMultiple(3.24), "3.2×");
  assert.equal(formatPoints(0.023), "+2.3 pp");
  assert.equal(formatCurrency(1234, "USD"), "$1,234");
  assert.equal(formatCurrency(12.5, "USD"), "$12.50");
  assert.equal(formatCurrency(150000, "INR", { compact: true }), "₹1.5L");
  assert.equal(formatNumber(12900, { compact: true }), "12.9K");
});

test("random: the same seed gives the same sequence", () => {
  const a = createRng(42);
  const b = createRng(42);
  const xs = Array.from({ length: 5 }, () => a.next());
  const ys = Array.from({ length: 5 }, () => b.next());
  assert.deepEqual(xs, ys);
  assert.ok(xs.every((x) => x >= 0 && x < 1));
  const r = createRng(7);
  for (let i = 0; i < 200; i++) {
    const n = r.int(3, 6);
    assert.ok(n >= 3 && n <= 6 && Number.isInteger(n));
  }
  assert.equal(makeId("LD", 42), "LD-000042");
});

test("csv: quotes, doubled quotes, newlines in fields, BOM, CRLF", () => {
  const text = '﻿Campaign,Cost,Note\r\n"Brand, India",1200,"says ""hi"""\r\n"Multi\nline",3,\r\n';
  const { rows, delimiter, warnings } = parseCsv(text);
  assert.equal(delimiter, ",");
  assert.deepEqual(rows[0], ["Campaign", "Cost", "Note"]);
  assert.deepEqual(rows[1], ["Brand, India", "1200", 'says "hi"']);
  assert.deepEqual(rows[2], ["Multi\nline", "3", ""]);
  assert.equal(rows.length, 3);
  assert.deepEqual(warnings, []);
});

test("csv: tab-delimited export with a report title above the header", () => {
  const text = "Campaign performance report\nAll time\nCampaign\tClicks\tImpr.\tCost\nSearch – Brand\t120\t3400\t88.20\n";
  assert.equal(detectDelimiter(text), "\t");
  const { rows } = parseCsv(text);
  const h = findHeaderRow(rows, ["Campaign", "Clicks", "Impr", "Cost"]);
  assert.equal(h, 2);
  const recs = toRecords(rows, h);
  assert.equal(recs[0]["Clicks"], "120");
  assert.equal(normaliseHeader("Cost / conv. (USD)"), "costconv");
});

test("csv: an unclosed quote is reported, not swallowed", () => {
  const { warnings } = parseCsv('a,b\n"open,1\n');
  assert.equal(warnings.length, 1);
});

test("stats: normal distribution matches tables", () => {
  close(normalCdf(0), 0.5, 1e-7);
  close(normalCdf(1.96), 0.975, 1e-4);
  close(normalCdf(-1.645), 0.05, 1e-4);
  close(normalQuantile(0.975), 1.959964, 1e-5);
  close(normalQuantile(0.8), 0.841621, 1e-5);
});

test("stats: Wilson interval for 10/100 matches the textbook", () => {
  const ci = wilsonInterval(10, 100);
  close(ci?.low, 0.0552, 1e-3);
  close(ci?.high, 0.1744, 1e-3);
  assert.equal(wilsonInterval(0, 0), null);
});

test("stats: two-proportion z-test, 200/1000 vs 240/1000", () => {
  const t = twoProportionTest(200, 1000, 240, 1000);
  assert.ok(t);
  close(t.absoluteLift, 0.04);
  close(t.relativeLift, 0.2);
  close(t.z, 2.1591, 1e-3);
  close(t.pValue, 0.0308, 1e-3);
  assert.ok(t.diffInterval.low > 0 && t.diffInterval.high < 0.08);
  assert.equal(twoProportionTest(0, 0, 5, 10), null);
  assert.equal(twoProportionTest(0, 50, 3, 50)?.relativeLift, null); // A converted nobody
});

test("stats: sample size for a 10% baseline and a 20% relative lift ≈ 3,841 per variant", () => {
  const n = sampleSizePerVariant(0.1, 0.2);
  assert.ok(n !== null && Math.abs(n - 3841) <= 2, `got ${n}`);
  assert.equal(sampleSizePerVariant(0, 0.2), null);
});

test("scale: nice ticks and linear mapping", () => {
  assert.deepEqual(niceTicks(0, 87, 4).ticks, [0, 25, 50, 75, 100]);
  assert.deepEqual(niceTicks(0, 0).domain, [0, 1]);
  const s = linearScale([0, 100], [200, 0]);
  assert.equal(s(25), 150);
  assert.equal(linearScale([5, 5], [0, 10])(5), 5);
});
