/**
 * The Growth Analyst: a rule engine over the calculated metrics. No model, no free text from
 * anywhere else: every sentence is a template filled with numbers computed in metrics.ts, every
 * rule has a minimum sample so it doesn't fire on noise, and every finding carries the evidence
 * and the rule that produced it.
 */

import { ratio, isNum } from "../shared/lib/safe-math.ts";
import { formatCurrency, formatMultiple, formatNumber, formatPercent, formatPoints, formatDay, formatMonths } from "../shared/lib/format.ts";
import { twoProportionTest } from "../shared/lib/stats.ts";
import type { Finding } from "../shared/lib/finding.ts";
import { byUrgency } from "../shared/lib/finding.ts";
import type { Dataset } from "./generate.ts";
import { CHANNELS, dayToIso, type ChannelId } from "./model.ts";
import {
  MATURE_DAYS,
  anomalies,
  breakdown,
  economics,
  costShareFor,
  funnel,
  leverage,
  periods,
  STEP_MATURE_DAYS,
  totals,
  type Assumptions,
  type BreakdownRow,
  type Filter,
} from "./metrics.ts";

const usd = (v: number | null) => formatCurrency(v, "USD");
const chLabel = (id: ChannelId) => CHANNELS.find((c) => c.id === id)?.label ?? id;
/** "Meta Ads" → "Meta Ads'", "Google" → "Google's". */
const poss = (s: string) => (s.endsWith("s") ? `${s}'` : `${s}'s`);
const STEP_NAMES = ["Lead → MQL", "MQL → SQL", "SQL → Opportunity", "Opportunity → Won"];
const STAGE_NOUNS = ["leads", "MQLs", "SQLs", "opportunities"];
/** "p < 0.001" or "p = 0.012". */
const pText = (p: number) => (p < 0.001 ? "p < 0.001" : `p = ${p.toFixed(3)}`);
const customersText = (n: number) => `${formatNumber(n, { dp: 1 })} customer${n === 1 ? "" : "s"}`;
const STEP_ADVICE = [
  "Check targeting and lead scoring: are the leads coming in from the right companies and roles?",
  "Look at sales follow-up: time to first contact, routing, and whether the MQL definition still matches what sales will accept.",
  "Review discovery calls and qualification: SQLs are reaching sales but not turning into real opportunities.",
  "Look at pricing, competition and the proposal stage: opportunities are being lost late.",
];

export function runAnalyst(data: Dataset, f: Filter, a: Assumptions): Finding[] {
  const { current, previous } = periods(f.range);
  const out: Finding[] = [];
  const t = totals(data, f, current);
  const chans = breakdown(data, f, current, "channel");
  const paid = chans.filter((c) => CHANNELS.find((x) => x.id === c.key)?.paid && c.spend > 0);

  // ---- 1. Channel efficiency: CAC against the blended paid CAC ------------------------------
  const paidSpend = paid.reduce((s, c) => s + c.spend, 0);
  const paidCustomers = paid.reduce((s, c) => s + c.customers, 0);
  const paidLeads = paid.reduce((s, c) => s + c.leads, 0);
  const blendedCac = ratio(paidSpend, paidCustomers);
  const blendedCpl = ratio(paidSpend, paidLeads);
  const blendedRoas = ratio(paid.reduce((s, c) => s + c.revenue, 0), paidSpend);

  for (const c of paid) {
    const cac = ratio(c.spend, c.customers);
    const cpl = ratio(c.spend, c.leads);
    const roas = ratio(c.revenue, c.spend);
    const cacX = ratio(cac, blendedCac);
    const cplX = ratio(cpl, blendedCpl);
    if (c.customers < 3) {
      if (c.spend > 0.1 * paidSpend)
        out.push({
          id: `few-${c.key}`,
          status: "warning",
          title: `${c.label} has too few customers in this period to judge its CAC`,
          summary: `${c.label} spent ${usd(c.spend)} (${formatPercent(ratio(c.spend, paidSpend), { dp: 0 })} of paid spend) and won ${c.customers} customer${c.customers === 1 ? "" : "s"}.`,
          recommendation: "Widen the date range before cutting or scaling it; judge it on cost per SQL in the meantime.",
          evidence: [
            { label: "Spend", value: usd(c.spend) },
            { label: "Customers won", value: formatNumber(c.customers) },
            { label: "Cost per SQL", value: usd(ratio(c.spend, c.sqls)) },
          ],
          rule: "A paid channel with more than 10% of spend but fewer than 3 customers in the period.",
        });
      continue;
    }
    const roasBelow = !isNum(roas) || !isNum(blendedRoas) || roas < blendedRoas;
    if (isNum(cacX) && cacX >= 1.4 && !roasBelow) {
      out.push({
        id: `cac-bigdeals-${c.key}`,
        status: "info",
        title: `${c.label} customers cost ${formatMultiple(cacX)} the average, but they're worth more`,
        summary: `Its CAC is high, yet its first-year ROAS of ${formatMultiple(roas)} matches or beats the ${formatMultiple(blendedRoas)} paid average, because its deals average ${usd(ratio(c.revenue, c.customers))}.`,
        recommendation: `Keep it, judged on ROAS and payback rather than CAC; a CAC target alone would cut the channel bringing the largest deals.`,
        evidence: [
          { label: `${c.label} CAC`, value: usd(cac), context: `vs blended paid ${usd(blendedCac)}` },
          { label: "First-year ROAS", value: formatMultiple(roas), context: `vs ${formatMultiple(blendedRoas)} blended` },
          { label: "Average deal value", value: usd(ratio(c.revenue, c.customers)), context: `vs ${usd(ratio(t.revenue, t.customers))} overall` },
          { label: "Customers won", value: formatNumber(c.customers) },
        ],
        rule: "Paid channel CAC ≥ 1.4× blended paid CAC, but first-year ROAS at or above the paid average.",
      });
    } else if (isNum(cacX) && cacX >= 1.4) {
      out.push({
        id: `cac-${c.key}`,
        status: cacX >= 1.8 ? "serious" : "warning",
        title: `${c.label} acquires customers at ${formatMultiple(cacX)} the blended paid CAC`,
        summary: `${c.label} took ${formatPercent(ratio(c.spend, paidSpend), { dp: 0 })} of paid spend but delivered ${formatPercent(ratio(c.customers, paidCustomers), { dp: 0 })} of paid customers. Its first-year ROAS is ${formatMultiple(roas)} against ${formatMultiple(blendedRoas)} across paid channels.`,
        recommendation: `Cut its weakest campaigns first (see Acquisition → Campaigns) and move that budget towards channels with a lower CAC, or fix conversion before scaling it.`,
        evidence: [
          { label: `${c.label} CAC`, value: usd(cac), context: `vs blended paid ${usd(blendedCac)}` },
          { label: "Share of paid spend", value: formatPercent(ratio(c.spend, paidSpend), { dp: 1 }) },
          { label: "Share of paid customers", value: formatPercent(ratio(c.customers, paidCustomers), { dp: 1 }) },
          { label: "First-year ROAS", value: formatMultiple(roas), context: `vs ${formatMultiple(blendedRoas)} blended` },
          { label: "Customers won", value: formatNumber(c.customers) },
        ],
        rule: "Paid channel CAC ≥ 1.4× the blended paid CAC and first-year ROAS below the paid average, with at least 3 customers (CAC ≥ 1.8× is 'act soon').",
      });
    } else if (isNum(cplX) && cplX >= 1.5 && isNum(cacX) && cacX <= 1.1) {
      out.push({
        id: `cpl-ok-${c.key}`,
        status: "good",
        title: `${c.label} leads cost ${formatMultiple(cplX)} the average, but they close`,
        summary: `Its cost per lead is high, yet its CAC is within ${formatPercent(Math.max(0, cacX - 1), { dp: 0 })} of the blended paid CAC because more of its leads become customers, at ${usd(ratio(c.revenue, c.customers))} per deal.`,
        recommendation: `Judge ${c.label} on CAC and ROAS, not on CPL; a CPL target would cut its best-closing leads.`,
        evidence: [
          { label: `${c.label} CPL`, value: usd(cpl), context: `vs blended paid ${usd(blendedCpl)}` },
          { label: `${c.label} CAC`, value: usd(cac), context: `vs blended paid ${usd(blendedCac)}` },
          { label: "Average deal value", value: usd(ratio(c.revenue, c.customers)) },
          { label: "First-year ROAS", value: formatMultiple(roas) },
        ],
        rule: "Paid channel CPL ≥ 1.5× blended while its CAC is no more than 1.1× blended.",
      });
    }
  }

  // ---- 2. Budget reallocation (a simulation, with a range) ------------------------------------
  // Judged on first-year revenue per dollar, so a channel with fewer but bigger deals isn't penalised.
  const judged = paid.filter((c) => c.customers >= 5).map((c) => ({ c, roas: ratio(c.revenue, c.spend) as number }));
  if (judged.length >= 2) {
    const best = judged.reduce((x, y) => (y.roas > x.roas ? y : x));
    const worst = judged.reduce((x, y) => (y.roas < x.roas ? y : x));
    if (best.c.key !== worst.c.key && best.roas >= 1.4 * worst.roas) {
      const moved = worst.c.spend * 0.15;
      const lost = moved * worst.roas; // at average ROAS: the cut spend was probably below-average, so this overstates the loss
      const gainHigh = (moved * best.roas) / 1.2;
      const gainLow = (moved * best.roas) / 1.6;
      if (gainHigh - lost > 0) {
        out.push({
          id: "realloc",
          status: "info",
          title: `Moving 15% of ${poss(worst.c.label)} budget to ${best.c.label} could add ${usd(Math.max(0, gainLow - lost))}–${usd(gainHigh - lost)} in first-year revenue`,
          summary: `${usd(moved)} moved in this period, assuming the extra ${best.c.label} spend returns 1.2–1.6× less than its current ROAS (diminishing returns) and ${worst.c.label} loses revenue at its average ROAS.`,
          recommendation: `Test it as a 4-week geo or time holdout rather than a permanent switch, and keep ${poss(worst.c.label)} best campaign running.`,
          evidence: [
            { label: `${best.c.label} first-year ROAS`, value: formatMultiple(best.roas), context: `${best.c.customers} customers` },
            { label: `${worst.c.label} first-year ROAS`, value: formatMultiple(worst.roas), context: `${worst.c.customers} customers` },
            { label: "Budget moved", value: usd(moved) },
            { label: "Revenue lost (estimate)", value: usd(lost) },
            { label: "Revenue gained (range)", value: `${usd(gainLow)}–${usd(gainHigh)}` },
          ],
          rule: "Simulation: highest- vs lowest-ROAS paid channel (each ≥ 5 customers, gap ≥ 1.4×); marginal ROAS assumed 1.2–1.6× lower than average.",
        });
      }
    }
  }

  // ---- 3. Funnel bottleneck: matured step rates against the previous 12 months --------------
  const fv = funnel(data, f, current);
  const cur = fv.fairRates;
  const base = fv.baselineRates;
  if (fv.matured[0] < 50) {
    out.push({
      id: "immature",
      status: "info",
      title: "This period is too recent to judge funnel conversion",
      summary: `${fv.matured[0] === 0 ? "None of the leads" : `Only ${formatNumber(fv.matured[0])} leads`} in the period ${fv.matured[0] === 1 ? "is" : "are"} at least ${MATURE_DAYS} days old. Newer leads haven't had time to become SQLs or customers, so their rates would look falsely low.`,
      recommendation: "Choose 90 days or longer to compare funnel steps.",
      evidence: [
        { label: "Leads in the period", value: formatNumber(fv.all[0]) },
        { label: `Leads ≥ ${MATURE_DAYS} days old`, value: formatNumber(fv.matured[0]) },
      ],
      rule: `Funnel rules need at least 50 leads that are ${MATURE_DAYS}+ days old.`,
    });
  } else {
    let worst: { i: number; drop: number; p: number } | null = null;
    for (let i = 0; i < 4; i++) {
      const nCur = fv.fairN[i];
      const nBase = fv.baselineN[i];
      const rc = cur[i];
      const rb = base[i];
      if (nCur < 30 || nBase < 30 || !isNum(rc) || !isNum(rb) || rb === 0) continue;
      const test = twoProportionTest(Math.round(rb * nBase), nBase, Math.round(rc * nCur), nCur);
      const drop = (rb - rc) / rb;
      if (test && test.pValue < 0.05 && drop >= 0.1 && (!worst || drop > worst.drop)) worst = { i, drop, p: test.pValue };
    }
    if (worst) {
      const i = worst.i;
      out.push({
        id: `funnel-${i}`,
        status: worst.drop >= 0.2 ? "serious" : "warning",
        title: `${STEP_NAMES[i]} conversion fell ${formatPercent(worst.drop, { dp: 0 })} against the previous 12 months`,
        summary: `${formatPercent(cur[i])} of ${STAGE_NOUNS[i]} old enough to judge (${STEP_MATURE_DAYS[i]}+ days) reached the next stage, down from ${formatPercent(base[i])}. The difference is unlikely to be chance (${pText(worst.p)}).`,
        recommendation: STEP_ADVICE[i],
        evidence: [
          { label: `${STEP_NAMES[i]}, this period`, value: formatPercent(cur[i]), context: `n = ${formatNumber(fv.fairN[i])}` },
          { label: `${STEP_NAMES[i]}, previous 12 months`, value: formatPercent(base[i]), context: `n = ${formatNumber(fv.baselineN[i])}` },
          { label: "Change", value: formatPoints((cur[i] as number) - (base[i] as number)) },
          { label: "Significance", value: pText(worst.p), context: "two-proportion z-test" },
        ],
        rule: `Step rate on leads old enough for that step (${STEP_MATURE_DAYS.join(" / ")} days) ≥ 10% below the 12-month baseline, n ≥ 30 on both sides, p < 0.05 (≥ 20% is 'act soon').`,
      });
    }

    // ---- 4. Where five points of conversion would matter most ---------------------------------
    // Model with the fair rate where a step can be judged, the 12-month rate where it can't yet.
    const model = cur.map((r, k) => (isNum(r) ? r : base[k]));
    if (model.every(isNum)) {
      const lev = leverage(fv.matured[0], model as number[], 0.05);
      const top = lev.indexOf(Math.max(...lev));
      out.push({
        id: "leverage",
        status: "info",
        title: `Five more points on ${STEP_NAMES[top]} would add the most customers`,
        summary: `On the same matured leads, +5 points at ${STEP_NAMES[top]} adds ${customersText(lev[top])}; the next best step adds ${customersText([...lev].sort((x, y) => y - x)[1])}. The lowest-converting step has the most room.`,
        recommendation: "Prioritise experiments at this step. Try it yourself in Funnel with the sliders.",
        evidence: STEP_NAMES.map((n, k) => ({ label: `+5 pts ${n}`, value: `+${customersText(lev[k])}`, context: `now ${formatPercent(model[k])}${isNum(cur[k]) ? "" : " (12-month rate; too recent to judge)"}` })),
        rule: "Funnel model on matured leads: customers = leads × product of step rates (the 12-month rate where a step is too recent to judge); each step raised by 5 points in turn.",
      });
    }
  }

  // ---- 5. Unusual weekly changes ---------------------------------------------------------------
  const an = anomalies(data, f, current);
  const used = new Set<number>();
  an.forEach((x, i) => {
    if (used.has(i)) return;
    const week = `${formatDay(dayToIso(x.weekFrom))}–${formatDay(dayToIso(x.weekTo))}`;
    // Sessions up while conversion falls in the same channel and week: likely junk traffic.
    const pair = an.findIndex((y, j) => j !== i && !used.has(j) && y.channel === x.channel && y.weekFrom === x.weekFrom && ((x.metric === "sessions" && y.metric === "cvr") || (x.metric === "cvr" && y.metric === "sessions")));
    if (pair >= 0) {
      const s = x.metric === "sessions" ? x : an[pair];
      const c = x.metric === "cvr" ? x : an[pair];
      used.add(i).add(pair);
      if (s.z > 0 && c.z < 0) {
        out.push({
          id: `junk-${x.channel}-${x.weekFrom}`,
          status: "serious",
          title: `${chLabel(x.channel)} sessions jumped ${formatMultiple(s.value / s.baselineMean)} in the week of ${week}, without more leads`,
          summary: `Sessions rose to ${formatNumber(s.value)} against a 12-week average of ${formatNumber(s.baselineMean)}, while the session-to-lead rate fell to ${formatPercent(c.value, { dp: 2 })}. Traffic that doesn't convert at all is usually bots, a tracking fault or a referral spam source.`,
          recommendation: "Check the traffic's sources, hostnames and engagement in analytics; exclude it from reporting so it doesn't distort conversion rates.",
          evidence: [
            { label: "Sessions that week", value: formatNumber(s.value), context: `vs ${formatNumber(s.baselineMean)} average` },
            { label: "Session → lead that week", value: formatPercent(c.value, { dp: 2 }), context: `vs ${formatPercent(c.baselineMean, { dp: 2 })} average` },
            { label: "Sessions z-score", value: s.z.toFixed(1) },
            { label: "Conversion z-score", value: c.z.toFixed(1) },
          ],
          rule: "Weekly sessions z ≥ +3 and session→lead rate z ≤ −3 in the same channel and week, against the previous 12 weeks.",
        });
        return;
      }
    }
    used.add(i);
    const label = x.metric === "cpc" ? "CPC" : x.metric === "cvr" ? "session → lead rate" : "sessions";
    const fmt = (v: number) => (x.metric === "cpc" ? usd(v) : x.metric === "cvr" ? formatPercent(v, { dp: 2 }) : formatNumber(v));
    const up = x.z > 0;
    const bad = x.metric === "cpc" ? up : !up;
    // Traffic moving on its own is neither good nor bad until the leads say so: a neutral note.
    const status = x.metric === "sessions" ? "info" : bad ? "warning" : "good";
    out.push({
      id: `anom-${x.channel}-${x.metric}`,
      status,
      title: `${chLabel(x.channel)} ${label} ${up ? "rose" : "fell"} to ${fmt(x.value)} in the week of ${week}`,
      summary: `That is ${formatPercent(Math.abs(x.value / x.baselineMean - 1), { dp: 0 })} ${up ? "above" : "below"} its 12-week average of ${fmt(x.baselineMean)}, well outside normal week-to-week variation (z = ${x.z.toFixed(1)}).`,
      recommendation:
        x.metric === "cpc"
          ? "Check auction insights and frequency; if competition is up, tighten audiences or shift budget to placements that held their price."
          : x.metric === "cvr"
            ? "Check the landing pages and forms for this channel for breakages, and whether the traffic mix changed."
            : "Find the source of the change before it skews conversion rates.",
      evidence: [
        { label: `${label[0].toUpperCase()}${label.slice(1)}, that week`, value: fmt(x.value) },
        { label: "12-week average", value: fmt(x.baselineMean) },
        { label: "z-score", value: x.z.toFixed(1) },
      ],
      rule: "Weekly value at least 3 standard deviations from the previous 12 weeks (spread floored at 5% of the mean).",
    });
  });

  // ---- 6. Volume without quality: campaigns and landing pages ----------------------------------
  const overallQ = ratio(
    chans.reduce((s, c) => s + (c.leadToSql ?? 0) * c.maturedLeads, 0),
    chans.reduce((s, c) => s + (c.leadToSql === null ? 0 : c.maturedLeads), 0),
  );
  const quality = (rows: BreakdownRow[], kind: string, max: number) =>
    rows
      .filter((r) => r.maturedLeads >= 60 && isNum(r.leadToSql) && isNum(overallQ) && (r.leadToSql as number) < 0.6 * overallQ)
      .sort((x, y) => y.leads - x.leads)
      .slice(0, max)
      .forEach((r) => {
        out.push({
          id: `quality-${kind}-${r.key}`,
          status: "warning",
          title: `${r.label} brings volume, not sales-ready leads`,
          summary: `${formatPercent(ratio(r.leads, t.leads), { dp: 0 })} of leads in the period came from ${kind === "page" ? "this landing page" : "this campaign"}, but only ${formatPercent(r.leadToSql)} of its matured leads reached SQL, against ${formatPercent(overallQ)} overall.`,
          recommendation:
            kind === "page"
              ? "Keep the page's conversion, but qualify harder: add a company-size or use-case question, or route these leads to nurture rather than sales."
              : "Optimise the campaign for SQLs or qualified leads (offline conversions) rather than raw form fills, and exclude low-fit audiences.",
          evidence: [
            { label: "Leads in the period", value: formatNumber(r.leads), context: `${formatPercent(ratio(r.leads, t.leads), { dp: 0 })} of all` },
            { label: "Lead → SQL (matured)", value: formatPercent(r.leadToSql), context: `vs ${formatPercent(overallQ)} overall` },
            { label: "Matured leads judged", value: formatNumber(r.maturedLeads) },
            ...(r.spend > 0 ? [{ label: "Cost per SQL", value: usd(ratio(r.spend, r.sqls)) }] : []),
          ],
          rule: `Lead → SQL on ${MATURE_DAYS}+ day old leads below 60% of the overall rate, with at least 60 such leads.`,
        });
      });
  quality(breakdown(data, f, current, "campaign"), "campaign", 2);
  quality(breakdown(data, f, current, "page"), "page", 1);

  // ---- 7. Unit economics -------------------------------------------------------------------------
  const share = costShareFor(data, f, current);
  const ue = economics(t, f.range, a, share);
  if (isNum(ue.ltvCac) && isNum(ue.paybackMonths)) {
    const healthy = ue.ltvCac >= 3 && ue.paybackMonths <= 12;
    const status = ue.ltvCac < 1.5 ? "serious" : ue.ltvCac < 3 || ue.paybackMonths > 18 ? "warning" : healthy ? "good" : "info";
    out.push({
      id: "unit-economics",
      status,
      title: healthy
        ? `Unit economics are healthy: LTV is ${formatMultiple(ue.ltvCac)} the fully loaded CAC`
        : `LTV is ${formatMultiple(ue.ltvCac)} the fully loaded CAC, with a ${formatMonths(ue.paybackMonths)} payback`,
      summary: `A customer is worth ${usd(ue.ltv)} in gross profit over their life and costs ${usd(ue.cacLoaded)} to acquire once non-media costs are included. The usual SaaS guide is LTV:CAC of 3× or more with payback inside 12 months.`,
      recommendation: healthy
        ? "There is room to spend more on the channels with the lowest CAC; watch payback as spend rises."
        : "Improve conversion or deal size before adding budget; check the assumptions in Unit economics.",
      evidence: [
        { label: "LTV", value: usd(ue.ltv), context: `${formatPercent(a.grossMargin, { dp: 0 })} margin, ${formatPercent(a.monthlyChurn)} monthly churn` },
        { label: "CAC (fully loaded)", value: usd(ue.cacLoaded), context: share < 1 ? `incl. ${formatPercent(share, { dp: 0 })} of the ${usd(a.otherCostPerMonth)}/month non-media cost (this slice's share of customers)` : `incl. ${usd(a.otherCostPerMonth)}/month non-media cost` },
        { label: "CAC (paid media only)", value: usd(ue.cacPaid) },
        { label: "Payback", value: formatMonths(ue.paybackMonths) },
      ],
      rule: "LTV:CAC < 1.5× is 'act soon', < 3× or payback > 18 months is 'watch', ≥ 3× with payback ≤ 12 months is healthy.",
    });
  }

  // ---- 8. What is working -------------------------------------------------------------------------
  const winners = paid.filter((c) => c.customers >= 5 && (ratio(c.revenue, c.spend) ?? 0) >= 1);
  if (winners.length) {
    const top = winners.reduce((x, y) => ((ratio(y.revenue, y.spend) as number) > (ratio(x.revenue, x.spend) as number) ? y : x));
    out.push({
      id: `best-${top.key}`,
      status: "good",
      title: `${top.label} returns the most per dollar: ${formatMultiple(ratio(top.revenue, top.spend))} first-year ROAS`,
      summary: `It won ${formatNumber(top.customers)} customers worth ${usd(top.revenue)} in first-year contract value on ${usd(top.spend)} of spend.`,
      recommendation: "Protect its budget and test whether it can take more before returns fall.",
      evidence: [
        { label: "First-year ROAS", value: formatMultiple(ratio(top.revenue, top.spend)), context: `vs ${formatMultiple(blendedRoas)} blended paid` },
        { label: "CAC", value: usd(ratio(top.spend, top.customers)), context: `vs ${usd(blendedCac)} blended paid` },
      ],
      rule: "Highest first-year ROAS among paid channels with at least 5 customers, and at least 1× (it pays back its spend within the first year).",
    });
  }

  // Compare the period with the one before, for context.
  const prev = totals(data, f, previous);
  if (prev.customers >= 5 && t.customers >= 5) {
    const chg = ratio(t.customers - prev.customers, prev.customers);
    if (isNum(chg) && Math.abs(chg) >= 0.15)
      out.push({
        id: "customers-trend",
        status: chg > 0 ? "good" : "warning",
        title: `New customers ${chg > 0 ? "up" : "down"} ${formatPercent(Math.abs(chg), { dp: 0 })} on the previous period`,
        summary: `${formatNumber(t.customers)} customers won, against ${formatNumber(prev.customers)} in the ${f.range} days before.`,
        evidence: [
          { label: "This period", value: formatNumber(t.customers) },
          { label: "Previous period", value: formatNumber(prev.customers) },
          { label: "Revenue this period", value: usd(t.revenue), context: `vs ${usd(prev.revenue)}` },
        ],
        rule: "Customers won changed by 15% or more against the previous equal-length period (both ≥ 5).",
      });
  }

  return out.sort(byUrgency);
}

/**
 * A prompt a visitor can paste into any AI assistant. It carries only the calculated evidence
 * and tells the model not to introduce numbers of its own.
 */
export function analystPrompt(findings: Finding[], f: Filter): string {
  const scope = `${f.range} days ending ${dayToIso(periods(f.range).current.to)}, channel: ${f.channel === "all" ? "all" : chLabel(f.channel)}, country: ${f.country}`;
  const lines = findings.map((x, i) => [`${i + 1}. [${x.status}] ${x.title}`, `   ${x.summary}`, ...x.evidence.map((e) => `   - ${e.label}: ${e.value}${e.context ? ` (${e.context})` : ""}`), `   Rule: ${x.rule}`].join("\n"));
  return [
    "You are a B2B SaaS growth analyst. Below are findings computed from Northstar CRM's marketing and sales data.",
    "Northstar CRM is a fictional company and the data is synthetic.",
    `Scope: ${scope}.`,
    "",
    "Rules for your answer:",
    "- Use only the numbers given below. Do not introduce, estimate or round to any other figure.",
    "- If something can't be answered from this evidence, say what data would be needed.",
    "- Prioritise: the three actions you would take first, each tied to its evidence.",
    "",
    "Findings:",
    lines.join("\n\n"),
  ].join("\n");
}
