"use client";

import { useMemo, useState } from "react";
import { PLATFORMS, platformLabel, type Account } from "@/lab/paid/model";
import { BOUNDS, FIT_WEEKS, currentPlan, curves, optimise, planTotals, project, type Filter, type Objective } from "@/lab/paid/metrics";
import { isNum, sum } from "@/lab/shared/lib/safe-math";
import { formatNumber, formatPercent } from "@/lab/shared/lib/format";
import { ChartFrame } from "@/lab/shared/charts/chart-frame";
import { RangeField, Segmented, SelectField } from "@/lab/shared/ui/controls";
import { DataTable } from "@/lab/shared/ui/data-table";
import { MetricTile } from "@/lab/shared/ui/metric-tile";
import { EmptyState, SimulationNote } from "@/lab/shared/ui/notices";
import { track } from "@/lib/track";
import s from "@/lab/shared/ui/lab.module.css";
import p from "./paid.module.css";
import { PLATFORM_COLOR, usd } from "./shared";
import { ResponseCurve } from "./response-curve";

type Props = { account: Account; filter: Filter };

const roundTo = (v: number, step = 50) => Math.round(v / step) * step;

/**
 * Reallocate a monthly budget and see the projected leads. Each campaign's curve
 * (leads = a · spend^b) is fitted on its own recent weeks; the optimiser hands money to whichever
 * campaign's next dollar buys the most, within the range each curve was measured over.
 */
export function Budget({ account, filter }: Props) {
  const cs = useMemo(() => curves(account.rows, filter.platform), [account, filter.platform]);
  const base = useMemo(() => currentPlan(cs), [cs]);
  const baseTotal = sum(Object.values(base));
  const canQualify = cs.length > 0 && cs.every((c) => isNum(c.qualPerLead));
  const [objective, setObjective] = useState<Objective>(canQualify ? "qualified" : "leads");
  const [plan, setPlan] = useState<Record<string, number>>(base);
  const [focus, setFocus] = useState<string>(cs[0]?.key ?? "");
  const [note, setNote] = useState("");

  if (!cs.length) {
    return <EmptyState title="Nothing to simulate">The simulator needs spend and leads by campaign over several weeks. Choose All platforms, or import data with a date column.</EmptyState>;
  }

  const total = sum(cs.map((c) => plan[c.key] ?? 0));
  const before = planTotals(cs.map((c) => project(c, base[c.key])));
  const after = planTotals(cs.map((c) => project(c, plan[c.key] ?? 0)));
  const fc = cs.find((c) => c.key === focus) ?? cs[0];
  const unfitted = cs.filter((c) => !c.fitted);
  const extrapolated = cs.filter((c) => project(c, plan[c.key] ?? 0).extrapolated);
  const unit = objective === "qualified" ? "qualified leads" : "leads";

  const setOne = (k: string, v: number) => setPlan((pl) => ({ ...pl, [k]: v }));
  const setTotal = (t: number) => setPlan((pl) => {
    const cur = sum(cs.map((c) => pl[c.key] ?? 0)) || 1;
    return Object.fromEntries(cs.map((c) => [c.key, roundTo(((pl[c.key] ?? 0) / cur) * t, 10)]));
  });
  const suggest = () => {
    const next = optimise(cs, total, objective);
    setPlan(next);
    const placed = sum(Object.values(next));
    setNote(placed < total - cs.length ? `${usd(total - placed)} couldn't be placed without taking campaigns past ${BOUNDS.high}× today's spend, where their curves are untested.` : "Suggested split applied. Every campaign's next dollar now buys about the same, within the tested range.");
    track("lab_budget_optimise", objective);
  };
  const reset = () => {
    setPlan(base);
    setNote("");
  };

  const delta = (a: number | null, b: number | null) => (isNum(a) && isNum(b) && b !== 0 ? a / b - 1 : null);

  return (
    <>
      <div className={s.card}>
        <h3 className={s.cardTitle}>Plan a month of spend</h3>
        <p className={s.note}>
          Today&rsquo;s budget is the average of the last {FIT_WEEKS} weeks, as a month: {usd(baseTotal)}. Change the total or any campaign, or let the simulator suggest a split.
        </p>
        <div className={p.row} style={{ marginTop: "0.9rem" }}>
          <Segmented
            label="Optimise for"
            value={objective}
            onChange={setObjective}
            options={canQualify ? [{ value: "qualified", label: "Qualified leads" }, { value: "leads", label: "Leads" }] : [{ value: "leads", label: "Leads" }]}
          />
          <button type="button" className={s.btn} onClick={suggest}>
            Suggest a split
          </button>
          <button type="button" className={s.btnGhost} onClick={reset}>
            Reset to today
          </button>
        </div>
        <p className={s.note} role="status" aria-live="polite" style={{ marginTop: "0.5rem" }}>
          {note}
        </p>
        <div style={{ marginTop: "0.6rem" }}>
          <RangeField label="Total monthly budget" value={roundTo(total, 10)} min={roundTo(baseTotal * 0.5)} max={roundTo(baseTotal * 1.5)} step={50} format={(v) => usd(v)} onChange={setTotal} note={`Today ${usd(baseTotal)}. Moving this scales every campaign by the same proportion.`} />
        </div>
      </div>

      <div className={s.grid2}>
        <div className={s.card}>
          <h3 className={s.cardTitle}>Campaign budgets</h3>
          {PLATFORMS.filter((pl) => cs.some((c) => c.platform === pl.id)).map((pl) => (
            <div key={pl.id} className={p.group}>
              <p className={p.groupTitle}>
                <span className={p.swatch} style={{ background: PLATFORM_COLOR[pl.id] }} aria-hidden="true" />
                {pl.label}
              </p>
              {cs
                .filter((c) => c.platform === pl.id)
                .map((c) => {
                  const pr = project(c, plan[c.key] ?? 0);
                  return (
                    <RangeField
                      key={c.key}
                      label={c.campaign}
                      value={plan[c.key] ?? 0}
                      min={0}
                      max={Math.max(100, roundTo(base[c.key] * 2.5))}
                      step={10}
                      format={(v) => `${usd(v)}/mo`}
                      onChange={(v) => setOne(c.key, v)}
                      note={
                        <>
                          Today {usd(base[c.key])} · {formatNumber(pr.leads, { dp: 0 })} leads · next lead {usd(pr.marginal)}
                          {pr.extrapolated && <span className={p.warn}> · outside the tested range</span>}
                        </>
                      }
                    />
                  );
                })}
            </div>
          ))}
        </div>

        <div style={{ display: "grid", gap: "1rem", alignContent: "start" }}>
          <div className={s.tiles}>
            <MetricTile label="Leads a month" value={formatNumber(after.leads, { dp: 0 })} delta={{ value: delta(after.leads, before.leads), upIsGood: true, vs: `vs ${formatNumber(before.leads, { dp: 0 })} today` }} />
            {after.qualified !== null && (
              <MetricTile label="Qualified a month" value={formatNumber(after.qualified, { dp: 0 })} delta={{ value: delta(after.qualified, before.qualified), upIsGood: true, vs: `vs ${formatNumber(before.qualified, { dp: 0 })} today` }} />
            )}
            <MetricTile label="CPL" value={usd(after.cpl)} delta={{ value: delta(after.cpl, before.cpl), upIsGood: false, vs: `vs ${usd(before.cpl)}` }} />
            {after.cpa !== null && <MetricTile label="Cost per qualified" value={usd(after.cpa)} delta={{ value: delta(after.cpa, before.cpa), upIsGood: false, vs: `vs ${usd(before.cpa)}` }} />}
            <MetricTile label="Spend a month" value={usd(after.spend)} delta={{ value: delta(after.spend, before.spend), upIsGood: null, vs: `vs ${usd(before.spend)}` }} />
          </div>
          <SimulationNote>
            Projections come from curves fitted to each campaign&rsquo;s last {FIT_WEEKS} weeks, assuming lead quality per campaign stays as it is and nothing else changes
            (seasonality, competitors, creative). Treat them as a direction to test, in steps, not a forecast.
            {extrapolated.length > 0 && ` ${extrapolated.length} campaign${extrapolated.length === 1 ? " is" : "s are"} now outside the spend range ${extrapolated.length === 1 ? "its curve was" : "their curves were"} measured on, so ${extrapolated.length === 1 ? "that projection is" : "those projections are"} weaker.`}
            {unfitted.length > 0 && ` ${unfitted.map((c) => c.campaign).join(", ")} didn't vary spend enough to fit a curve, so ${unfitted.length === 1 ? "it uses" : "they use"} an assumed exponent of 0.7.`}
          </SimulationNote>
          {objective === "qualified" && <p className={s.note}>Optimising for qualified leads uses each campaign&rsquo;s qualified rate, so a campaign with dear leads that qualify well can still win budget.</p>}
        </div>
      </div>

      <ChartFrame
        title={`Diminishing returns: ${fc.campaign}`}
        subtitle={`Each dot is a week. Line: leads = a · spend^${fc.b.toFixed(2)}${fc.fitted ? ` (fitted, R² ${isNum(fc.r2) ? fc.r2.toFixed(2) : "—"})` : " (assumed)"}. The shaded band is the spend range it was measured on.`}
        actions={<SelectField label="Campaign" value={fc.key} onChange={setFocus} options={cs.map((c) => ({ value: c.key, label: c.campaign }))} />}
        table={
          <DataTable
            caption={`${fc.campaign}: weekly spend and leads`}
            rowKey={(r) => String(r.i)}
            columns={[
              { key: "i", label: "Week", align: "right", render: (r) => String((r.i as number) + 1) },
              { key: "spend", label: "Spend", align: "right", render: (r) => usd(r.spend as number) },
              { key: "leads", label: "Leads", align: "right", render: (r) => formatNumber(r.leads as number) },
            ]}
            rows={fc.points.map((pt, i) => ({ i, spend: pt.spend, leads: pt.leads }))}
          />
        }
      >
        <ResponseCurve curve={fc} plan={plan[fc.key] ?? 0} color={PLATFORM_COLOR[fc.platform]} />
        <p className={s.note}>
          The exponent b says how fast returns fall off: at 1.0 twice the spend brings twice the leads; at 0.5 it brings about {formatPercent(Math.SQRT2 - 1, { dp: 0 })} more. The cost of the next lead is the average CPL ÷ b.
        </p>
      </ChartFrame>

      <div className={s.card}>
        <h3 className={s.cardTitle}>The plan, campaign by campaign</h3>
        <DataTable
          caption="Budget plan by campaign"
          rowKey={(r) => r.key}
          initialSort={{ key: "plan", dir: "desc" }}
          rows={cs.map((c) => {
            const pr = project(c, plan[c.key] ?? 0);
            const now = project(c, base[c.key]);
            return { key: c.key, campaign: c.campaign, platform: platformLabel(c.platform), today: base[c.key], plan: plan[c.key] ?? 0, change: (plan[c.key] ?? 0) - base[c.key], leads: pr.leads, leadsNow: now.leads, cpl: pr.cpl, marginal: pr.marginal, b: c.b, fitted: c.fitted };
          })}
          columns={[
            { key: "campaign", label: "Campaign" },
            { key: "platform", label: "Platform" },
            { key: "today", label: "Today /mo", align: "right", render: (r) => usd(r.today) },
            { key: "plan", label: "Plan /mo", align: "right", render: (r) => usd(r.plan) },
            { key: "change", label: "Change", align: "right", render: (r) => (Math.abs(r.change) < 1 ? "—" : `${r.change > 0 ? "+" : ""}${usd(r.change)}`) },
            { key: "leads", label: "Leads /mo", align: "right", render: (r) => `${formatNumber(r.leads, { dp: 0 })} (${formatNumber(r.leadsNow, { dp: 0 })})` },
            { key: "cpl", label: "Avg CPL", align: "right", render: (r) => usd(r.cpl) },
            { key: "marginal", label: "Next lead", align: "right", render: (r) => usd(r.marginal) },
            { key: "b", label: "b", align: "right", render: (r) => `${r.b.toFixed(2)}${r.fitted ? "" : "*"}` },
          ]}
        />
        <p className={s.note} style={{ marginTop: "0.6rem" }}>
          Leads in brackets are today&rsquo;s. &ldquo;Next lead&rdquo; is the marginal CPL: what one more lead costs at that budget. When it&rsquo;s far above the average, the campaign
          is saturated. {unfitted.length > 0 ? "* assumed exponent." : ""} Projections in {unit} use each campaign&rsquo;s recent rates.
        </p>
      </div>
    </>
  );
}
