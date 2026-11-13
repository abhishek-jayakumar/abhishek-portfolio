/**
 * The Retention assistant: a rule engine over the calculated metrics. No model, no free text from
 * anywhere else: every sentence is a template filled with numbers from metrics.ts, every rule has
 * a minimum sample so it doesn't fire on noise, and every finding carries its evidence and rule.
 */

import { ratio, sum, isNum } from "../shared/lib/safe-math.ts";
import { formatCurrency, formatNumber, formatPercent, formatPoints, formatMultiple } from "../shared/lib/format.ts";
import { twoProportionTest } from "../shared/lib/stats.ts";
import type { Finding } from "../shared/lib/finding.ts";
import { byUrgency } from "../shared/lib/finding.ts";
import type { Dataset } from "./generate.ts";
import { CHANNELS, END_DAY, EVENTS, dayToIso, channelOf } from "./model.ts";
import { CHURN_DAYS, REPEAT_WINDOW, YEAR, firstYearRevenue, kpis, kpisEarlier, ordersOf, profileAt, segmentLabel, select, type Filter, type Profile } from "./metrics.ts";

const inr = (v: number | null) => formatCurrency(v, "INR");
const inrK = (v: number | null) => formatCurrency(v, "INR", { compact: true });
const pText = (p: number) => (p < 0.001 ? "p < 0.001" : `p = ${p.toFixed(3)}`);
const scopeText = (f: Filter) => `${f.channel === "all" ? "all channels" : channelOf(f.channel).label}${f.segment === "all" ? "" : `, ${segmentLabel(f.segment)} segment`}`;

/** A regular is overdue once they've gone this many times their own usual gap without ordering. */
export const OVERDUE_FACTOR = 1.5;

/** Regulars (3+ orders, ₹3,200+ spent) past 1.5× their own median reorder gap but not yet lapsed (≤ 180 days). */
export function isOverdueRegular(p: Profile): boolean {
  return p.orders >= 3 && p.spend >= 3200 && isNum(p.medianGap) && p.recency > OVERDUE_FACTOR * p.medianGap && p.recency <= 180 && !p.c.subscriber;
}

/** Spend in the 365 days up to a customer's last order: what a quiet regular used to be worth a year. */
export function trailingYearSpend(data: Dataset, p: Profile): number {
  return sum(ordersOf(data, p.c).filter((o) => o.day <= p.last && o.day > p.last - YEAR).map((o) => o.value));
}

const mature = (p: Profile, days: number) => END_DAY - p.c.day >= days;

export function runAssistant(data: Dataset, f: Filter): Finding[] {
  const ps = select(data, f);
  const out: Finding[] = [];

  if (ps.length < 200) {
    out.push({
      id: "small",
      status: "info",
      title: "A small slice: read rates with care",
      summary: `${formatNumber(ps.length)} customers match ${scopeText(f)}. Rules that need a minimum sample stay quiet below it, so some findings may be missing here.`,
      evidence: [{ label: "Customers in the filter", value: formatNumber(ps.length) }],
      rule: "Fewer than 200 customers in the filter.",
    });
  }

  // 1. Regulars drifting: past their own reorder point, worth a lot, and more of them than before.
  {
    const now = ps.filter(isOverdueRegular);
    const before = ps.map((p) => profileAt(data, p.ci, END_DAY - 120)).filter((p): p is Profile => p !== null && isOverdueRegular(p));
    const regularsNow = ps.filter((p) => p.orders >= 3 && p.spend >= 3200 && !p.c.subscriber && p.recency <= 180).length;
    if (now.length >= 30) {
      const value = sum(now.map((p) => trailingYearSpend(data, p)));
      const grew = before.length > 0 ? now.length / before.length : null;
      const share = ratio(now.length, regularsNow);
      const outage = dayToIso(EVENTS.reminderOutage.fromDay);
      const sinceOutage = now.filter((p) => p.last + (p.medianGap as number) >= EVENTS.reminderOutage.fromDay).length;
      out.push({
        id: "overdue",
        status: (grew ?? 2) >= 1.5 ? "critical" : "serious",
        title: `${formatNumber(now.length)} valuable regulars are past their usual reorder date`,
        summary: `These customers have 3+ orders and ₹3,200+ spent, and have now gone more than ${OVERDUE_FACTOR}× their own usual gap without ordering. That is ${formatPercent(share)} of active regulars${grew !== null ? `, and ${formatMultiple(grew)} as many as 120 days ago` : ""}. In the year before they went quiet they spent ${inrK(value)} between them. ${formatNumber(sinceOutage)} of them were due a reorder after ${outage}: check that the replenishment reminder is still sending.`,
        recommendation: "Audit the replenishment flow first (it's the cheapest fix), then send the At-risk segment a personal reactivation journey keyed to each customer's own last product.",
        evidence: [
          { label: "Overdue regulars now", value: formatNumber(now.length) },
          { label: "Same rule, 120 days earlier", value: formatNumber(before.length), context: `(as of ${dayToIso(END_DAY - 120)})` },
          { label: "Share of active regulars", value: formatPercent(share), context: `of ${formatNumber(regularsNow)}` },
          { label: "Their spend in the year before going quiet", value: inr(value) },
          { label: "Reorder fell due after " + outage, value: formatNumber(sinceOutage) },
        ],
        rule: `Customers with 3+ orders and ₹3,200+ lifetime spend (not subscribers) whose days since last order exceed ${OVERDUE_FACTOR}× their own median gap, up to 180 days. Fires at 30+ customers; critical when the count has grown 1.5× in 120 days.`,
      });
    }
  }

  // 2. The festive discount cohort.
  {
    const festive = ps.filter((p) => p.c.code === EVENTS.festiveSale.code && mature(p, REPEAT_WINDOW));
    const others = ps.filter((p) => !p.c.festive && mature(p, REPEAT_WINDOW) && !p.c.subscriber);
    const second = (p: Profile) => p.c.n >= 2 && data.orders[p.c.o0 + 1].day - p.c.day <= REPEAT_WINDOW;
    if (festive.length >= 100 && others.length >= 100) {
      const a = others.filter(second).length;
      const b = festive.filter(second).length;
      const t = twoProportionTest(a, others.length, b, festive.length);
      if (t && t.pValue < 0.05 && t.rateB < t.rateA) {
        const giftShare = ratio(festive.filter((p) => p.c.firstProduct === "gift").length, festive.length);
        out.push({
          id: "festive",
          status: "serious",
          title: `Diwali sale customers came back ${formatPercent(1 - t.rateB / t.rateA, { dp: 0 })} less often`,
          summary: `Of ${formatNumber(festive.length)} customers acquired with ${EVENTS.festiveSale.code}, ${formatPercent(t.rateB)} placed a second order within 90 days, against ${formatPercent(t.rateA)} for customers acquired outside the sale (${pText(t.pValue)}). ${formatPercent(giftShare)} of them started with a gift box: many were buying a present, not a tea habit.`,
          recommendation: "Judge festive campaigns on 90-day value, not first-order volume. Next season, give sale buyers a welcome journey that sells their own first pack, and cap the discount at the second order instead of the first.",
          evidence: [
            { label: "Festive (code) 90-day repeat", value: formatPercent(t.rateB), context: `${formatNumber(b)} of ${formatNumber(festive.length)}` },
            { label: "Other customers 90-day repeat", value: formatPercent(t.rateA), context: `${formatNumber(a)} of ${formatNumber(others.length)}` },
            { label: "Difference", value: formatPoints(t.absoluteLift), context: `95% CI ${formatPoints(t.diffInterval.low)} to ${formatPoints(t.diffInterval.high)}` },
            { label: "Significance", value: pText(t.pValue), context: "two-proportion z-test" },
            { label: "Started with a gift box", value: formatPercent(giftShare) },
          ],
          rule: `Customers whose first order used ${EVENTS.festiveSale.code} vs non-festive, non-subscriber customers, both acquired 90+ days ago. 100+ in each group, p < 0.05.`,
        });
      }
    }
  }

  // 3. Subscribers are worth far more.
  {
    const subs = ps.filter((p) => p.c.subscriber && mature(p, YEAR));
    const rest = ps.filter((p) => !p.c.subscriber && mature(p, YEAR));
    if (subs.length >= 30 && rest.length >= 100) {
      const sv = ratio(sum(subs.map((p) => firstYearRevenue(data, p.c))), subs.length);
      const rv = ratio(sum(rest.map((p) => firstYearRevenue(data, p.c))), rest.length);
      const multiple = ratio(sv, rv);
      const subShareNew = ratio(ps.filter((p) => p.c.subscriber && END_DAY - p.c.day < 90).length, ps.filter((p) => END_DAY - p.c.day < 90).length);
      if (isNum(multiple) && multiple >= 1.5) {
        out.push({
          id: "subs",
          status: "good",
          title: `Chai Club subscribers are worth ${formatMultiple(multiple)} a one-off buyer in year one`,
          summary: `Subscribers acquired at least a year ago brought in ${inr(sv)} each in their first 12 months, against ${inr(rv)} for everyone else. Only ${formatPercent(subShareNew)} of the last 90 days' new customers started on the subscription.`,
          recommendation: "Offer the subscription in the welcome journey's third step and after a second order of the same tea; that is when the habit is visible.",
          evidence: [
            { label: "Subscribers, first-year revenue", value: inr(sv), context: `${formatNumber(subs.length)} customers` },
            { label: "Others, first-year revenue", value: inr(rv), context: `${formatNumber(rest.length)} customers` },
            { label: "Multiple", value: formatMultiple(multiple) },
            { label: "New customers starting on subscription", value: formatPercent(subShareNew), context: "last 90 days" },
          ],
          rule: "First-year revenue per customer, subscribers vs non-subscribers acquired 365+ days ago. 30+ subscribers; fires when the multiple is 1.5× or more.",
        });
      }
    }
  }

  // 4. Marketplace customers stay on the marketplace.
  if (f.channel === "all" || f.channel === "marketplace") {
    const mk = ps.filter((p) => p.c.channel === "marketplace" && p.orders >= 2);
    if (mk.length >= 50) {
      const direct = mk.filter((p) => data.orders[p.c.o0 + 1].channel === "direct").length;
      const share = ratio(direct, mk.length);
      const base = ps.filter((p) => mature(p, REPEAT_WINDOW));
      const mkBase = base.filter((p) => p.c.channel === "marketplace");
      const otherBase = base.filter((p) => p.c.channel !== "marketplace");
      const mkRate = ratio(mkBase.filter((p) => p.orders >= 2).length, mkBase.length);
      const otherRate = ratio(otherBase.filter((p) => p.orders >= 2).length, otherBase.length);
      out.push({
        id: "marketplace",
        status: "warning",
        title: `Only ${formatPercent(share, { dp: 0 })} of returning marketplace buyers came back direct`,
        summary: `${formatNumber(mk.length)} marketplace customers ordered again, but ${formatNumber(mk.length - direct)} of them did so on the marketplace, where the brand pays commission and never gets the customer's contact. They also repeat less: ${formatPercent(mkRate)} vs ${formatPercent(otherRate)}${f.channel === "marketplace" ? "" : " for other channels"}.`,
        recommendation: "Put a pack insert with a WhatsApp opt-in and a direct-only refill price in every marketplace order. Measure it as the share of second orders placed direct.",
        evidence: [
          { label: "Marketplace repeaters", value: formatNumber(mk.length) },
          { label: "Second order placed direct", value: formatPercent(share), context: `${formatNumber(direct)} customers` },
          { label: "Marketplace repeat rate", value: formatPercent(mkRate), context: `of ${formatNumber(mkBase.length)} acquired 90+ days ago` },
          ...(f.channel === "all" ? [{ label: "Other channels' repeat rate", value: formatPercent(otherRate) }] : []),
        ],
        rule: "Customers acquired on the marketplace with 2+ orders: where the second order was placed. 50+ repeaters.",
      });
    }
  }

  // 5. The channel that brings the best customers.
  if (f.channel === "all") {
    const rows = CHANNELS.map((c) => {
      const xs = ps.filter((p) => p.c.channel === c.id && mature(p, REPEAT_WINDOW));
      return { c, n: xs.length, rate: ratio(xs.filter((p) => p.orders >= 2).length, xs.length) };
    }).filter((r) => r.n >= 100 && isNum(r.rate));
    if (rows.length >= 2) {
      rows.sort((a, b) => (b.rate as number) - (a.rate as number));
      const best = rows[0];
      const worst = rows[rows.length - 1];
      out.push({
        id: "best-channel",
        status: "good",
        title: `${best.c.label} brings the customers most likely to return`,
        summary: `${formatPercent(best.rate)} of customers acquired through ${best.c.label} have ordered again, the highest of any channel; ${worst.c.label} is lowest at ${formatPercent(worst.rate)}. Acquisition budgets judged on first-order cost alone miss this.`,
        recommendation: `Weight acquisition targets by repeat rate. A ${best.c.label.toLowerCase()} customer is worth more than the first order shows.`,
        evidence: rows.map((r) => ({ label: r.c.label, value: formatPercent(r.rate), context: `of ${formatNumber(r.n)}` })),
        rule: "Share of customers acquired 90+ days ago with a second order, by acquisition channel. Channels with 100+ customers.",
      });
    }
  }

  // 6. Churn moving.
  {
    const now = kpis(data, ps);
    const then = kpisEarlier(data, ps, 90);
    if (now.churnBase >= 200 && then.churnBase >= 200 && isNum(now.churnRate) && isNum(then.churnRate)) {
      const diff = now.churnRate - then.churnRate;
      if (diff >= 0.03) {
        out.push({
          id: "churn",
          status: "warning",
          title: `Churn is up ${formatPoints(diff)} on 90 days ago`,
          summary: `${formatPercent(now.churnRate)} of customers acquired more than ${CHURN_DAYS} days ago haven't ordered in the last ${CHURN_DAYS} days, up from ${formatPercent(then.churnRate)} 90 days earlier.`,
          recommendation: "Look at which segment the churned customers came from in Behaviour → segment movement, and start with the biggest flow into Inactive.",
          evidence: [
            { label: "Churn now", value: formatPercent(now.churnRate), context: `of ${formatNumber(now.churnBase)}` },
            { label: "Churn 90 days ago", value: formatPercent(then.churnRate), context: `of ${formatNumber(then.churnBase)}` },
          ],
          rule: `Churned = no order for ${CHURN_DAYS} days, among customers acquired more than ${CHURN_DAYS} days before the date measured. Fires on a rise of 3 points or more, with 200+ customers each side.`,
        });
      }
    }
  }

  // 7. The welcome audience.
  {
    const fresh = ps.filter((p) => p.orders === 1 && p.recency <= 30);
    const k = kpis(data, ps.filter((p) => !p.c.subscriber));
    if (fresh.length >= 30) {
      out.push({
        id: "welcome",
        status: "info",
        title: `${formatNumber(fresh.length)} first-time buyers are in the welcome window`,
        summary: `They placed their first order in the last 30 days. Historically ${formatPercent(k.repeat90)} of first-time buyers order again within 90 days, so the next few weeks decide most of their value.`,
        recommendation: "Make sure each gets the welcome journey: a brewing tip on WhatsApp after delivery, then the second-order offer around day 14.",
        evidence: [
          { label: "First order in the last 30 days", value: formatNumber(fresh.length) },
          { label: "Historical 90-day repeat rate", value: formatPercent(k.repeat90), context: `of ${formatNumber(k.repeatBase)}` },
          { label: "Reachable on WhatsApp", value: formatNumber(fresh.filter((p) => p.c.whatsapp).length) },
        ],
        rule: "Customers with exactly one order placed in the last 30 days. Fires at 30+.",
      });
    }
  }

  return out.sort(byUrgency);
}

export function assistantPrompt(findings: Finding[], f: Filter): string {
  const lines = findings.map((x, i) => [`${i + 1}. [${x.status}] ${x.title}`, `   ${x.summary}`, ...x.evidence.map((e) => `   - ${e.label}: ${e.value}${e.context ? ` (${e.context})` : ""}`), `   Rule: ${x.rule}`].join("\n"));
  return [
    "You are a retention marketing lead for a D2C brand. Below are findings computed from Kettlebloom's customer and order data.",
    "Kettlebloom is a fictional Indian tea brand and the data is synthetic.",
    `Scope: customers as of ${dayToIso(END_DAY)}, ${scopeText(f)}.`,
    "",
    "Rules for your answer:",
    "- Use only the numbers given below. Do not introduce, estimate or round to any other figure.",
    "- If something can't be answered from this evidence, say what data would be needed.",
    "- Prioritise: the three retention actions you would take first, each tied to its evidence, with the WhatsApp or email message you would send.",
    "",
    "Findings:",
    lines.join("\n\n"),
  ].join("\n");
}
