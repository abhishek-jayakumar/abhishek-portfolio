/**
 * The Paid Media Analyst: written rules over the metrics in metrics.ts. Each rule has a minimum
 * sample so it doesn't fire on noise, every sentence is a template filled with calculated numbers,
 * and every finding carries its evidence and the rule that produced it. It works the same on the
 * demo account and on imported exports (rules that need qualified leads or value skip without them).
 */

import { isNum, ratio, sum } from "../shared/lib/safe-math.ts";
import { formatCurrency, formatMultiple, formatNumber, formatPercent } from "../shared/lib/format.ts";
import { twoProportionTest } from "../shared/lib/stats.ts";
import { byUrgency, type Finding } from "../shared/lib/finding.ts";
import { dayToIso, platformLabel, type AdRow } from "./model.ts";
import {
  breakdown,
  currentPlan,
  curves,
  marginalCpl,
  optimise,
  periods,
  planTotals,
  project,
  rates,
  scope,
  totals,
  weekly,
  WEEKS_PER_MONTH,
  type Filter,
  type Objective,
} from "./metrics.ts";

const usd = (v: number | null) => formatCurrency(v, "USD");
const pct = (v: number | null, dp = 1) => formatPercent(v, { dp });
const pText = (p: number) => (p < 0.001 ? "p < 0.001" : `p = ${p.toFixed(3)}`);

/** Minimum samples before a rule may judge a campaign. */
export const MIN = { clicks: 1500, leads: 30, impressions: 50_000, spend: 1000 } as const;

export function runAnalyst(rows: AdRow[], f: Filter): Finding[] {
  const per = periods(rows, f.range);
  if (!per) return [];
  const cur = scope(rows, f, per.current);
  if (!cur.length) return [];
  const out: Finding[] = [];
  const all = totals(cur);
  const blended = rates(all);
  const camps = breakdown(cur, "campaign");
  const plats = breakdown(cur, "platform");
  const hasQual = all.qualified !== null && all.qualified > 0;
  const hasValue = all.value !== null && all.value > 0;

  // ---- 1. Money with nothing to show for it --------------------------------------------------
  for (const c of camps) {
    if (c.spend >= MIN.spend && c.leads === 0) {
      out.push({
        id: `zero-${c.key}`,
        status: "critical",
        title: `${c.label} spent ${usd(c.spend)} and produced no leads`,
        summary: `${formatNumber(c.clicks)} clicks and not one lead in the period. Either the campaign isn't working or its conversions aren't being tracked.`,
        recommendation: "Check the conversion tag or lead-form sync first; if tracking is fine, pause it.",
        evidence: [
          { label: "Spend", value: usd(c.spend) },
          { label: "Clicks", value: formatNumber(c.clicks) },
          { label: "Leads", value: "0" },
        ],
        rule: `Spend ≥ ${usd(MIN.spend)} with zero leads.`,
      });
    }
  }

  // ---- 2. Clicks that don't convert: CTR well above its platform, conversion well below -----
  for (const c of camps) {
    const p = plats.find((x) => x.key === c.platform);
    if (!p || c.clicks < MIN.clicks || p.clicks - c.clicks < MIN.clicks) continue;
    const rest = totals(cur.filter((r) => r.platform === c.platform && r.campaign !== c.label));
    const others = rates(rest);
    const ctrX = ratio(c.ctr, others.ctr);
    const cvrX = ratio(c.cvr, others.cvr);
    if (!isNum(ctrX) || !isNum(cvrX) || ctrX < 1.3 || cvrX > 0.6) continue;
    const test = twoProportionTest(rest.leads, rest.clicks, c.leads, c.clicks);
    if (!test || test.pValue >= 0.05) continue;
    out.push({
      id: `ctr-cvr-${c.key}`,
      status: "serious",
      title: `${c.label}: people click, then don't convert`,
      summary: `Its click-through rate is ${formatMultiple(ctrX)} the rest of ${platformLabel(c.platform ?? "google")}, but only ${pct(c.cvr, 2)} of clicks become leads, against ${pct(others.cvr, 2)} elsewhere on the platform. Cheap clicks, expensive leads: CPL ${usd(c.cpl)} against ${usd(others.cpl)}.`,
      recommendation: "The ad promises something the landing page doesn't deliver, or attracts the wrong people. Match the landing page to the ad, tighten targeting, and judge it on CPL, not CTR.",
      evidence: [
        { label: "CTR", value: pct(c.ctr, 2), context: `vs ${pct(others.ctr, 2)} rest of platform` },
        { label: "Click → lead", value: pct(c.cvr, 2), context: `vs ${pct(others.cvr, 2)} (${pText(test.pValue)})` },
        { label: "CPL", value: usd(c.cpl), context: `vs ${usd(others.cpl)}` },
        { label: "Clicks", value: formatNumber(c.clicks) },
      ],
      rule: `CTR ≥ 1.3× the rest of the platform, click → lead ≤ 0.6× it, ≥ ${formatNumber(MIN.clicks)} clicks, difference significant at p < 0.05.`,
    });
  }

  // ---- 3. Creative fatigue: CTR falling while CPM rises, last 4 weeks vs the 8 before ------
  const end = per.current.to;
  const recent = { from: end - 27, to: end };
  const before = { from: end - 83, to: end - 28 };
  const scoped = rows.filter((r) => f.platform === "all" || r.platform === f.platform);
  for (const c of breakdown(scoped.filter((r) => r.day >= before.from && r.day <= end), "campaign")) {
    const own = scoped.filter((r) => r.campaign === c.label && r.platform === c.platform);
    const a = totals(own.filter((r) => r.day >= before.from && r.day <= before.to));
    const b = totals(own.filter((r) => r.day >= recent.from && r.day <= recent.to));
    if (a.impressions < MIN.impressions || b.impressions < MIN.impressions / 2) continue;
    const ra = rates(a);
    const rb = rates(b);
    const ctrChange = isNum(rb.ctr) && isNum(ra.ctr) ? rb.ctr / ra.ctr - 1 : null;
    const cpmChange = isNum(rb.cpm) && isNum(ra.cpm) ? rb.cpm / ra.cpm - 1 : null;
    if (!isNum(ctrChange) || !isNum(cpmChange) || ctrChange > -0.15 || cpmChange < 0.1) continue;
    const test = twoProportionTest(a.clicks, a.impressions, b.clicks, b.impressions);
    if (!test || test.pValue >= 0.01) continue;
    const freq = isNum(ra.frequency) && isNum(rb.frequency) ? [ra.frequency, rb.frequency] : null;
    out.push({
      id: `fatigue-${c.key}`,
      status: "serious",
      title: `${c.label} is showing ad fatigue`,
      summary: `Over the last four weeks its click-through rate fell ${pct(Math.abs(ctrChange), 0)} and its CPM rose ${pct(cpmChange, 0)} against the eight weeks before${freq ? `, while frequency climbed from ${freq[0].toFixed(1)} to ${freq[1].toFixed(1)}` : ""}. The same people are seeing the same ads too often; the platform charges more to show them and they click less.`,
      recommendation: "Refresh the creative, widen or rotate the audience, and add a frequency cap. Expect CPL to keep rising until you do.",
      evidence: [
        { label: "CTR", value: pct(rb.ctr, 2), context: `vs ${pct(ra.ctr, 2)} (${pText(test.pValue)})` },
        { label: "CPM", value: usd(rb.cpm), context: `vs ${usd(ra.cpm)}` },
        ...(freq ? [{ label: "Frequency", value: freq[1].toFixed(1), context: `vs ${freq[0].toFixed(1)}` }] : []),
        { label: "CPL", value: usd(rb.cpl), context: `vs ${usd(ra.cpl)}` },
      ],
      rule: `Last 28 days vs the 56 before: CTR down ≥ 15% (significant at p < 0.01) and CPM up ≥ 10%, ≥ ${formatNumber(MIN.impressions)} earlier impressions. Uses the data's last 12 weeks, whatever the date range.`,
    });
  }

  // ---- 4. Lead quality: CPL against what the leads turn into ------------------------------
  if (hasQual) {
    for (const c of camps) {
      if (c.leads < MIN.leads || c.qualified === null) continue;
      const cplX = ratio(c.cpl, blended.cpl);
      const qX = ratio(c.qualRate, blended.qualRate);
      if (!isNum(cplX) || !isNum(qX)) continue;
      if (cplX >= 1.5 && qX >= 1.5) {
        out.push({
          id: `quality-high-${c.key}`,
          status: "good",
          title: `Don't judge ${c.label} on CPL`,
          summary: `Its leads cost ${formatMultiple(cplX)} the account average, but ${pct(c.qualRate, 0)} of them qualify against ${pct(blended.qualRate, 0)} overall${hasValue && isNum(c.roas) ? `, and it returns ${formatMultiple(c.roas)} in pipeline per dollar against ${formatMultiple(blended.roas)}` : ""}. On cost per qualified lead it's ${usd(c.cpa)} against ${usd(blended.cpa)}.`,
          recommendation: "Report it on cost per qualified lead and pipeline, not CPL. Cutting it to lower the account CPL would cut the leads sales actually want.",
          evidence: [
            { label: "CPL", value: usd(c.cpl), context: `vs ${usd(blended.cpl)} account` },
            { label: "Qualified rate", value: pct(c.qualRate, 0), context: `vs ${pct(blended.qualRate, 0)}` },
            { label: "Cost per qualified lead", value: usd(c.cpa), context: `vs ${usd(blended.cpa)}` },
            ...(hasValue ? [{ label: "ROAS (pipeline)", value: formatMultiple(c.roas), context: `vs ${formatMultiple(blended.roas)}` }] : []),
          ],
          rule: `CPL ≥ 1.5× the account and qualified rate ≥ 1.5× the account, ≥ ${MIN.leads} leads.`,
        });
      } else if (qX <= 0.5 && isNum(c.cpa) && isNum(blended.cpa) && c.cpa >= 1.5 * blended.cpa) {
        out.push({
          id: `quality-low-${c.key}`,
          status: "warning",
          title: `${c.label} brings leads that rarely qualify`,
          summary: `Only ${pct(c.qualRate, 0)} of its ${formatNumber(c.leads)} leads qualify, against ${pct(blended.qualRate, 0)} across the account, so each qualified lead costs ${usd(c.cpa)} against ${usd(blended.cpa)}.`,
          recommendation: "Tighten the audience or add a qualifying question to the form. If quality doesn't improve, move its budget to campaigns with a lower cost per qualified lead.",
          evidence: [
            { label: "Qualified rate", value: pct(c.qualRate, 0), context: `vs ${pct(blended.qualRate, 0)}` },
            { label: "Cost per qualified lead", value: usd(c.cpa), context: `vs ${usd(blended.cpa)}` },
            { label: "CPL", value: usd(c.cpl), context: `vs ${usd(blended.cpl)}` },
          ],
          rule: `Qualified rate ≤ 0.5× the account and cost per qualified lead ≥ 1.5× it, ≥ ${MIN.leads} leads.`,
        });
      }
    }
  }

  // ---- 5. Saturation and headroom, from the fitted response curves -------------------------
  const cs = curves(rows, f.platform);
  const totalWeekly = sum(cs.map((c) => c.weeklySpend));
  for (const c of cs) {
    const monthly = c.weeklySpend * WEEKS_PER_MONTH;
    const avg = ratio(monthly, project(c, monthly).leads);
    const marg = marginalCpl(c, monthly);
    const share = ratio(c.weeklySpend, totalWeekly);
    if (!c.fitted || !isNum(avg) || !isNum(marg) || !isNum(share) || c.points.length < 6) continue;
    const leadsInWindow = sum(c.points.map((p) => p.leads));
    if (leadsInWindow < MIN.leads) continue;
    if (marg >= 2 * avg && share >= 0.1) {
      out.push({
        id: `saturated-${c.key}`,
        status: "serious",
        title: `${c.campaign} is past the point of diminishing returns`,
        summary: `Its leads cost ${usd(avg)} on average, but the next lead costs about ${usd(marg)}: weeks with more spend brought proportionally fewer leads. It takes ${pct(share, 0)} of the budget.`,
        recommendation: "Hold or trim its budget and move the difference to a campaign whose next lead is cheaper (see Budget simulator).",
        evidence: [
          { label: "Average CPL", value: usd(avg) },
          { label: "Marginal CPL", value: usd(marg), context: "cost of the next lead at today's spend" },
          { label: "Curve exponent b", value: c.b.toFixed(2), context: "1 = scales linearly" },
          { label: "Fit", value: `R² ${isNum(c.r2) ? c.r2.toFixed(2) : "—"}`, context: `${c.points.length} weeks` },
        ],
        rule: "Fitted leads = a·spend^b on the last 12 weeks; marginal CPL (average CPL ÷ b) ≥ 2× average CPL and ≥ 10% of spend.",
      });
    }
  }
  const leadCurves = cs.filter((c) => c.fitted && sum(c.points.map((p) => p.leads)) >= MIN.leads);
  if (leadCurves.length >= 2) {
    const margs = leadCurves.map((c) => ({ c, m: marginalCpl(c, c.weeklySpend * WEEKS_PER_MONTH) })).filter((x): x is { c: (typeof leadCurves)[number]; m: number } => isNum(x.m));
    const acctAvg = ratio(sum(leadCurves.map((c) => c.weeklySpend)), sum(leadCurves.map((c) => sum(c.points.map((p) => p.leads)) / c.points.length)));
    const room = margs.filter((x) => isNum(acctAvg) && x.m <= acctAvg && x.c.b >= 0.7).sort((a, b) => a.m - b.m)[0];
    if (room && isNum(acctAvg)) {
      out.push({
        id: `headroom-${room.c.key}`,
        status: "good",
        title: `${room.c.campaign} has room to scale`,
        summary: `Even its next lead (about ${usd(room.m)}) costs less than the account's average lead (${usd(acctAvg)}), and its returns fall off slowly as spend rises.`,
        recommendation: "It's the first place to put extra budget. Raise it in steps of 20–30% and recheck its CPL after two weeks.",
        evidence: [
          { label: "Marginal CPL", value: usd(room.m) },
          { label: "Account average CPL", value: usd(acctAvg), context: "fit window" },
          { label: "Curve exponent b", value: room.c.b.toFixed(2) },
        ],
        rule: "Marginal CPL at today's spend ≤ the account's average CPL, with b ≥ 0.7.",
      });
    }
  }

  // ---- 6. Reallocation: the same budget, split by marginal returns ----------------------
  if (cs.length >= 2) {
    const objective: Objective = cs.every((c) => isNum(c.qualPerLead)) && hasQual ? "qualified" : "leads";
    const base = currentPlan(cs);
    const total = sum(Object.values(base));
    const next = optimise(cs, total, objective);
    const before = planTotals(cs.map((c) => project(c, base[c.key])));
    const after = planTotals(cs.map((c) => project(c, next[c.key])));
    const unit = objective === "qualified" ? "qualified leads" : "leads";
    const b0 = objective === "qualified" ? before.qualified : before.leads;
    const a0 = objective === "qualified" ? after.qualified : after.leads;
    const gain = isNum(a0) && isNum(b0) && b0 > 0 ? a0 / b0 - 1 : null;
    if (isNum(gain) && gain >= 0.05) {
      const moves = cs
        .map((c) => ({ c, d: next[c.key] - base[c.key] }))
        .filter((x) => Math.abs(x.d) >= 0.1 * base[x.c.key])
        .sort((x, y) => x.d - y.d);
      const cut = moves.filter((x) => x.d < 0).slice(0, 2);
      const add = moves.filter((x) => x.d > 0).slice(-2).reverse();
      out.push({
        id: "realloc",
        status: "info",
        title: `The same budget could buy about ${pct(gain, 0)} more ${unit}`,
        summary: `Moving money from ${cut.map((x) => x.c.campaign).join(" and ") || "the most saturated campaigns"} to ${add.map((x) => x.c.campaign).join(" and ") || "the campaigns with headroom"} projects ${formatNumber(a0, { dp: 0 })} ${unit} a month instead of ${formatNumber(b0, { dp: 0 })}, at the same ${usd(total)} a month.`,
        recommendation: "Shift it in two or three steps rather than all at once, and check the projection against what actually happens after each step.",
        evidence: [
          ...cut.map((x) => ({ label: `Cut ${x.c.campaign}`, value: usd(x.d), context: `to ${usd(next[x.c.key])}/mo` })),
          ...add.map((x) => ({ label: `Add to ${x.c.campaign}`, value: `+${usd(x.d)}`, context: `to ${usd(next[x.c.key])}/mo` })),
          { label: "Projected CPL", value: usd(after.cpl), context: `vs ${usd(before.cpl)}` },
        ],
        rule: `Budget simulator optimiser (equalise marginal cost per ${unit === "leads" ? "lead" : "qualified lead"}, each campaign kept within 0.5–2× today's spend); shown when the gain is ≥ 5%. A simulation, not a forecast.`,
      });
    }
  }

  // ---- 7. Platform summary -------------------------------------------------------------
  const judged = plats.filter((p) => p.leads >= MIN.leads);
  if (judged.length >= 2) {
    const metric = hasQual ? "cpa" : "cpl";
    const label = hasQual ? "cost per qualified lead" : "CPL";
    const sorted = [...judged].filter((p) => isNum(p[metric])).sort((a, b) => (a[metric] as number) - (b[metric] as number));
    if (sorted.length >= 2) {
      const best = sorted[0];
      const worst = sorted[sorted.length - 1];
      out.push({
        id: "platforms",
        status: "info",
        title: `${best.label} has the lowest ${label}; ${worst.label} the highest`,
        summary: `${best.label}: ${usd(best[metric])}. ${worst.label}: ${usd(worst[metric])}. Account: ${usd(blended[metric])}. The platforms buy different things (search intent, social reach, B2B targeting), so read this with the lead-quality findings.`,
        evidence: judged.map((p) => ({ label: p.label, value: usd(p[metric]), context: `${usd(p.spend)} spend · ${formatNumber(p.leads)} leads` })),
        rule: `Platforms with ≥ ${MIN.leads} leads, ranked by ${label}.`,
      });
    }
  }

  // ---- 8. Data checks -------------------------------------------------------------------
  const over = camps.filter((c) => c.clicks > 0 && c.leads > c.clicks);
  if (over.length) {
    out.push({
      id: "data-leads-clicks",
      status: "warning",
      title: "Some campaigns report more leads than clicks",
      summary: `${over.map((c) => c.label).join(", ")} ${over.length === 1 ? "reports" : "report"} more leads than clicks, which usually means view-through or imported offline conversions are counted as leads.`,
      recommendation: "Check the conversion action settings so CPL compares like with like across platforms.",
      evidence: over.slice(0, 4).map((c) => ({ label: c.label, value: `${formatNumber(c.leads)} leads`, context: `${formatNumber(c.clicks)} clicks` })),
      rule: "Leads > clicks for a campaign in the period.",
    });
  }

  return out.sort(byUrgency);
}

/** A plain account summary for the top of the Analyst. */
export function summary(rows: AdRow[], f: Filter): string | null {
  const per = periods(rows, f.range);
  if (!per) return null;
  const cur = scope(rows, f, per.current);
  if (!cur.length) return null;
  const t = totals(cur);
  const r = rates(t);
  const prev = per.previous ? rates(totals(scope(rows, f, per.previous))) : null;
  const cplMove = prev && isNum(prev.cpl) && isNum(r.cpl) ? r.cpl / prev.cpl - 1 : null;
  return [
    `From ${dayToIso(per.current.from)} to ${dayToIso(per.current.to)}, ${usd(t.spend)} of spend bought ${formatNumber(t.clicks)} clicks and ${formatNumber(t.leads)} leads at ${usd(r.cpl)} each`,
    isNum(cplMove) ? ` (${cplMove > 0 ? "up" : "down"} ${pct(Math.abs(cplMove), 0)} on the period before)` : "",
    t.qualified !== null ? `. ${formatNumber(t.qualified)} leads qualified, at ${usd(r.cpa)} per qualified lead` : "",
    t.value !== null && isNum(r.roas) ? `, returning ${formatMultiple(r.roas)} in pipeline per dollar` : "",
    ".",
  ].join("");
}

export function analystPrompt(findings: Finding[], rows: AdRow[], f: Filter): string {
  const per = periods(rows, f.range);
  const scopeText = per ? `${dayToIso(per.current.from)} to ${dayToIso(per.current.to)}, platform: ${f.platform === "all" ? "all" : platformLabel(f.platform)}` : "no data";
  const lines = findings.map((x, i) => [`${i + 1}. [${x.status}] ${x.title}`, `   ${x.summary}`, ...x.evidence.map((e) => `   - ${e.label}: ${e.value}${e.context ? ` (${e.context})` : ""}`), `   Rule: ${x.rule}`].join("\n"));
  return [
    "You are a performance marketing analyst. Below are findings computed from Northstar CRM's Google, Meta and LinkedIn ad data.",
    "Northstar CRM is a fictional company and the demo data is synthetic.",
    `Scope: ${scopeText}.`,
    `Account summary: ${summary(rows, f) ?? "no data"}`,
    "",
    "Rules for your answer:",
    "- Use only the numbers given below. Do not introduce, estimate or round to any other figure.",
    "- Budget projections are simulations from fitted curves; say so if you use them.",
    "- Prioritise: the three changes you would make this week, each tied to its evidence.",
    "",
    "Findings:",
    lines.join("\n\n"),
  ].join("\n");
}

/** Weekly CTR/CPM for one campaign (used by the fatigue chart). */
export function campaignWeeks(rows: AdRow[], key: { platform: string; campaign: string }, weeks = 12) {
  const own = rows.filter((r) => r.platform === key.platform && r.campaign === key.campaign);
  const end = Math.max(...own.map((r) => r.day));
  return weekly(own, { from: end - weeks * 7 + 1, to: end }).map((w) => ({ ...w, rates: rates(w.totals) }));
}
