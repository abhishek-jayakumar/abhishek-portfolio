"use client";

import { useMemo, useState } from "react";
import type { Dataset } from "@/lab/growth/generate";
import { CHANNELS } from "@/lab/growth/model";
import { STEP_MATURE_DAYS, funnel, leverage, periods, simulateFunnel, STAGES, type Assumptions, type Filter } from "@/lab/growth/metrics";
import { isNum } from "@/lab/shared/lib/safe-math";
import { formatDays, formatNumber, formatPercent, formatPoints } from "@/lab/shared/lib/format";
import { ChartFrame } from "@/lab/shared/charts/chart-frame";
import { FunnelChart } from "@/lab/shared/charts/funnel-chart";
import { RangeField } from "@/lab/shared/ui/controls";
import { DataTable } from "@/lab/shared/ui/data-table";
import { MetricTile } from "@/lab/shared/ui/metric-tile";
import { EmptyState, SimulationNote } from "@/lab/shared/ui/notices";
import s from "@/lab/shared/ui/lab.module.css";
import { usd } from "./shared";

type Props = { data: Dataset; filter: Filter; assumptions: Assumptions };
const STEPS = ["Lead → MQL", "MQL → SQL", "SQL → Opportunity", "Opportunity → Won"];

export function Funnel({ data, filter }: Props) {
  const view = useMemo(() => {
    const { current } = periods(filter.range);
    const fv = funnel(data, filter, current);
    // The model uses the fair rate where a step can be judged, the 12-month rate where it can't yet.
    const model = fv.fairRates.map((r, i) => (isNum(r) ? r : fv.baselineRates[i]));
    const byChannel = CHANNELS.filter((c) => filter.channel === "all" || c.id === filter.channel).map((c) => {
      const cf = funnel(data, { ...filter, channel: c.id }, current);
      return { key: c.id, label: c.label, leads: cf.all[0], r0: cf.fairRates[0], r1: cf.fairRates[1], r2: cf.fairRates[2], r3: cf.fairRates[3], days: cf.medianDaysToWin, deal: cf.avgDeal };
    });
    return { fv, model, byChannel };
  }, [data, filter]);

  const { fv, model, byChannel } = view;
  const ready = model.every(isNum) && fv.all[0] > 0;
  const [overrides, setOverrides] = useState<Record<string, number[]>>({});
  const key = `${filter.range}-${filter.channel}-${filter.country}`;
  const sim = overrides[key] ?? (model as number[]);
  const deal = fv.avgDeal ?? null;
  const leads = fv.all[0];
  const base = ready ? simulateFunnel(leads, model as number[], deal) : null;
  const next = ready ? simulateFunnel(leads, sim, deal) : null;
  const lev = ready ? leverage(leads, model as number[], 0.05) : null;
  const flag = (() => {
    let worst = -1;
    let drop = 0.1;
    fv.fairRates.forEach((r, i) => {
      const b = fv.baselineRates[i];
      if (isNum(r) && isNum(b) && b > 0 && (b - r) / b >= drop) {
        drop = (b - r) / b;
        worst = i + 1;
      }
    });
    return worst > 0 ? worst : undefined;
  })();

  if (!leads) {
    return <EmptyState title="No leads in this filter">Try a longer date range or another channel or country.</EmptyState>;
  }

  return (
    <>
      <p className={s.note}>
        This is a cohort view: the {formatNumber(leads)} leads created in the period, followed to wherever they are today. Leads need time to progress, so each step&rsquo;s rate
        below uses only leads old enough to judge it fairly ({STEP_MATURE_DAYS.map((d, i) => `${STEPS[i]}: ${d}+ days`).join(", ")}).
      </p>
      <div className={s.grid2}>
        <ChartFrame
          title="Where the period's leads are now"
          subtitle={flag ? "Flagged: the step that fell furthest against the previous 12 months" : "Counts to date, including leads still in progress"}
          table={
            <DataTable
              caption="Funnel counts"
              rowKey={(r) => String(r.stage)}
              columns={[
                { key: "stage", label: "Stage", sortable: false },
                { key: "count", label: "Count", align: "right", sortable: false, render: (r) => formatNumber(r.count as number) },
              ]}
              rows={STAGES.map((st, i) => ({ stage: st.label, count: fv.all[i] }))}
            />
          }
        >
          <FunnelChart ariaLabel="Funnel from leads to customers" stages={STAGES.map((st, i) => ({ id: st.id, label: st.label, value: fv.all[i] }))} flag={flag} />
          <p className={s.note}>{formatNumber(fv.openOpps)} opportunities are still open. Median time from lead to won: {fv.medianDaysToWin === null ? "—" : formatDays(fv.medianDaysToWin)}.</p>
        </ChartFrame>

        <div className={s.card}>
          <h3 className={s.cardTitle}>Step conversion, judged fairly</h3>
          <DataTable
            caption="Step conversion rates against the previous 12 months"
            rowKey={(r) => String(r.step)}
            columns={[
              { key: "step", label: "Step", sortable: false },
              { key: "now", label: "This period", align: "right", sortable: false, render: (r) => (isNum(r.now) ? formatPercent(r.now as number) : <span className={s.note}>too recent</span>) },
              { key: "n", label: "n", align: "right", sortable: false, render: (r) => formatNumber(r.n as number) },
              { key: "base", label: "Prev. 12 mo", align: "right", sortable: false, render: (r) => formatPercent(r.base as number | null) },
              { key: "diff", label: "Change", align: "right", sortable: false, render: (r) => (isNum(r.diff) ? formatPoints(r.diff as number) : "—") },
            ]}
            rows={STEPS.map((step, i) => ({ step, now: fv.fairRates[i], n: fv.fairN[i], base: fv.baselineRates[i], diff: isNum(fv.fairRates[i]) && isNum(fv.baselineRates[i]) ? (fv.fairRates[i] as number) - (fv.baselineRates[i] as number) : null }))}
          />
          {lev && (
            <p className={s.note} style={{ marginTop: "0.8rem" }}>
              Where five extra points matter most: {STEPS.map((st, i) => `${st} +${formatNumber(lev[i], { dp: 1 })}`).join(" · ")} customers. The lowest-converting step has the most room.
            </p>
          )}
        </div>
      </div>

      {ready && base && next ? (
        <div className={s.card}>
          <h3 className={s.cardTitle}>What if a step converted better?</h3>
          <p className={s.note}>Drag a step&rsquo;s rate. The same {formatNumber(leads)} leads flow through, and customers and revenue update at the cohort&rsquo;s average deal value of {usd(deal)}.</p>
          <div className={s.grid2} style={{ marginTop: "1rem" }}>
            <div style={{ display: "grid", gap: "1rem" }}>
              {STEPS.map((st, i) => (
                <RangeField
                  key={st}
                  label={st}
                  value={sim[i]}
                  min={0.01}
                  max={0.95}
                  step={0.005}
                  format={(v) => formatPercent(v)}
                  note={`Now ${formatPercent(model[i] as number)}${isNum(fv.fairRates[i]) ? "" : " (12-month rate: this period is too recent to judge)"}`}
                  onChange={(v) => setOverrides((o) => ({ ...o, [key]: sim.map((x, k) => (k === i ? v : x)) }))}
                />
              ))}
              {overrides[key] && (
                <button type="button" className={s.btnGhost} onClick={() => setOverrides((o) => ({ ...o, [key]: model as number[] }))} style={{ justifySelf: "start" }}>
                  Reset to actual rates
                </button>
              )}
            </div>
            <div style={{ display: "grid", gap: "1rem", alignContent: "start" }}>
              <MetricTile label="Customers from these leads" value={formatNumber(next.counts[4], { dp: 1 })} delta={{ value: base.counts[4] ? next.counts[4] / base.counts[4] - 1 : null, upIsGood: true, vs: `vs ${formatNumber(base.counts[4], { dp: 1 })} at today's rates` }} />
              <MetricTile label="First-year revenue" value={usd(next.revenue)} delta={{ value: base.revenue ? (next.revenue as number) / base.revenue - 1 : null, upIsGood: true, vs: `vs ${usd(base.revenue)}` }} />
              <SimulationNote>Every step is held independent of the others and deal size doesn&rsquo;t change. In reality, pushing more leads through a step usually lowers the quality of the next one.</SimulationNote>
            </div>
          </div>
        </div>
      ) : (
        <EmptyState title="Not enough history to model this slice">At least 30 leads are needed at every step, in this period or the 12 months before. Try a wider date range or All countries.</EmptyState>
      )}

      <div className={s.card}>
        <h3 className={s.cardTitle}>Funnel by channel</h3>
        <DataTable
          caption="Step conversion by channel"
          rowKey={(r) => r.key}
          rows={byChannel}
          initialSort={{ key: "leads", dir: "desc" }}
          columns={[
            { key: "label", label: "Channel" },
            { key: "leads", label: "Leads", align: "right", render: (r) => formatNumber(r.leads) },
            { key: "r0", label: "Lead → MQL", align: "right", render: (r) => formatPercent(r.r0) },
            { key: "r1", label: "MQL → SQL", align: "right", render: (r) => formatPercent(r.r1) },
            { key: "r2", label: "SQL → Opp", align: "right", render: (r) => formatPercent(r.r2) },
            { key: "r3", label: "Opp → Won", align: "right", render: (r) => formatPercent(r.r3) },
            { key: "days", label: "Days to win", align: "right", render: (r) => (r.days === null ? "—" : formatNumber(r.days)) },
            { key: "deal", label: "Avg deal", align: "right", render: (r) => usd(r.deal) },
          ]}
        />
        <p className={s.note} style={{ marginTop: "0.6rem" }}>A dash means fewer than 30 leads old enough to judge that step in this slice.</p>
      </div>
    </>
  );
}
