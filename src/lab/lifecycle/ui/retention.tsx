"use client";

import { useMemo } from "react";
import { GROSS_MARGIN, monthIso } from "@/lab/lifecycle/model";
import { CHURN_DAYS, COHORT_OFFSETS, REPEAT_WINDOW, averageCurve, cohorts, kpis, kpisEarlier, revenueByMonth, segmentSummary, select, type Kpis } from "@/lab/lifecycle/metrics";
import { change, isNum } from "@/lab/shared/lib/safe-math";
import { formatMonth, formatNumber, formatPercent } from "@/lab/shared/lib/format";
import { SERIES } from "@/lab/shared/lib/palette";
import { BarChart } from "@/lab/shared/charts/bar-chart";
import { ChartFrame } from "@/lab/shared/charts/chart-frame";
import { Heatmap } from "@/lab/shared/charts/heatmap";
import { LineChart } from "@/lab/shared/charts/line-chart";
import { DataTable } from "@/lab/shared/ui/data-table";
import { MetricTile } from "@/lab/shared/ui/metric-tile";
import { EmptyState } from "@/lab/shared/ui/notices";
import s from "@/lab/shared/ui/lab.module.css";
import { SEGMENT_COLOR, inr, type ModuleProps } from "./shared";

type Tile = { label: string; hint?: string; get: (k: Kpis) => number | null; show: (v: number | null) => string; upIsGood: boolean | null };

const TILES: Tile[] = [
  { label: "Customers", hint: "who have ordered", get: (k) => k.customers, show: (v) => formatNumber(v), upIsGood: true },
  { label: "Repeat rate", hint: `acquired ${REPEAT_WINDOW}+ days ago`, get: (k) => k.repeatRate, show: (v) => formatPercent(v), upIsGood: true },
  { label: "90-day repeat rate", hint: "2nd order within 90 days", get: (k) => k.repeat90, show: (v) => formatPercent(v), upIsGood: true },
  { label: "Retention", hint: `ordered in last ${CHURN_DAYS} days`, get: (k) => k.retentionRate, show: (v) => formatPercent(v), upIsGood: true },
  { label: "Churn", hint: `no order for ${CHURN_DAYS}+ days`, get: (k) => k.churnRate, show: (v) => formatPercent(v), upIsGood: false },
  { label: "Average order value", get: (k) => k.aov, show: (v) => inr(v), upIsGood: true },
  { label: "12-month CLV", hint: "revenue per customer", get: (k) => k.clvRevenue, show: (v) => inr(v), upIsGood: true },
  { label: "12-month CLV", hint: `gross margin at ${formatPercent(GROSS_MARGIN, { dp: 0 })}`, get: (k) => k.clvMargin, show: (v) => inr(v), upIsGood: true },
];

export function Retention({ data, filter }: ModuleProps) {
  const view = useMemo(() => {
    const ps = select(data, filter);
    const c = cohorts(data, ps);
    return { ps, now: kpis(data, ps), then: kpisEarlier(data, ps, 90), c, curve: averageCurve(c), rev: revenueByMonth(data, ps), seg: segmentSummary(data, filter.channel) };
  }, [data, filter]);
  const { ps, now, then, c, curve, rev, seg } = view;

  if (!ps.length) return <EmptyState title="No customers in this filter">Try another channel or segment, or reset the filters.</EmptyState>;

  const offsets = Array.from({ length: COHORT_OFFSETS }, (_, k) => `M${k + 1}`);
  const cohortLabels = c.months.map((m) => formatMonth(monthIso(m)));
  const cohortMax = Math.max(0.05, ...c.values.flat().filter(isNum));
  const months = rev.fresh.map((_, i) => formatMonth(monthIso(i)));

  return (
    <>
      <div className={s.tiles}>
        {TILES.map((t) => (
          <MetricTile key={t.label + t.hint} label={t.label} hint={t.hint} value={t.show(t.get(now))} delta={{ value: change(t.get(now), t.get(then)), upIsGood: t.upIsGood, vs: "vs 90 days ago" }} />
        ))}
      </div>
      {filter.segment !== "all" && (
        <p className={s.note}>
          Segments are defined by behaviour, so some rates are partly true by definition (every Active customer ordered recently, so their churn is 0%). Compare segments on repeat rate and CLV;
          read churn and retention on All customers.
        </p>
      )}

      <ChartFrame
        title="Monthly cohorts: share of customers ordering again"
        subtitle="Rows: the month of the first order. Columns: months later. Blank cells are months that haven't happened yet."
        table={
          <DataTable
            caption="Cohort retention"
            rowKey={(r) => String(r.cohort)}
            rows={c.months.map((m, i) => ({ cohort: cohortLabels[i], size: c.sizes[i], ...Object.fromEntries(c.values[i].map((v, k) => [`m${k + 1}`, v])) }))}
            columns={[
              { key: "cohort", label: "Cohort", sortable: false },
              { key: "size", label: "Customers", align: "right", sortable: false, render: (r) => formatNumber(r.size as number) },
              ...offsets.map((o, k) => ({ key: `m${k + 1}`, label: o, align: "right" as const, sortable: false, render: (r: Record<string, unknown>) => formatPercent(r[`m${k + 1}`] as number | null, { dp: 0 }) })),
            ]}
          />
        }
      >
        <Heatmap
          ariaLabel="Cohort retention by month of first order and months since"
          rows={cohortLabels}
          cols={offsets}
          values={c.values}
          max={cohortMax}
          format={(v) => formatPercent(v, { dp: 0 })}
          rowNote={c.sizes.map((n) => `of ${formatNumber(n)} customers ordered that month`)}
        />
        <p className={s.note}>
          Read across a row to follow one group of customers. Look at Sep and Oct 25, the Diwali sale months: the cohorts are large but fade faster than their neighbours.
        </p>
      </ChartFrame>

      <div className={s.grid2}>
        <ChartFrame
          title="Average retention curve"
          subtitle="Share of a cohort ordering in each later month, weighted by cohort size"
          table={
            <DataTable
              caption="Average retention by month"
              rowKey={(r) => String(r.m)}
              rows={curve.map((v, k) => ({ m: offsets[k], v }))}
              columns={[
                { key: "m", label: "Months after first order", sortable: false },
                { key: "v", label: "Ordering that month", align: "right", sortable: false, render: (r) => formatPercent(r.v as number | null) },
              ]}
            />
          }
        >
          <LineChart ariaLabel="Average retention by months since first order" labels={offsets} series={[{ id: "avg", label: "Retention", color: SERIES[0], values: curve }]} format={(v) => formatPercent(v)} tickFormat={(v) => formatPercent(v, { dp: 0 })} area height={220} />
        </ChartFrame>

        <ChartFrame
          title="Revenue by month: new vs returning"
          subtitle="New = first orders; returning = every later order"
          legend={[
            { label: "New customers", color: SERIES[1] },
            { label: "Returning customers", color: SERIES[0] },
          ]}
          table={
            <DataTable
              caption="Revenue by month"
              rowKey={(r) => String(r.m)}
              rows={months.map((m, i) => ({ m, fresh: rev.fresh[i], returning: rev.returning[i] }))}
              columns={[
                { key: "m", label: "Month", sortable: false },
                { key: "fresh", label: "New", align: "right", sortable: false, render: (r) => inr(r.fresh as number) },
                { key: "returning", label: "Returning", align: "right", sortable: false, render: (r) => inr(r.returning as number) },
              ]}
            />
          }
        >
          <LineChart
            ariaLabel="Revenue by month from new and returning customers"
            labels={months}
            series={[
              { id: "fresh", label: "New", color: SERIES[1], values: rev.fresh },
              { id: "returning", label: "Returning", color: SERIES[0], values: rev.returning },
            ]}
            format={(v) => inr(v)}
            tickFormat={(v) => inr(v, true)}
            height={220}
          />
        </ChartFrame>
      </div>

      <div className={s.grid2}>
        <ChartFrame title="Lifetime revenue by segment" subtitle="All orders ever placed by today's members of each segment">
          <BarChart
            ariaLabel="Lifetime revenue by segment"
            bars={seg.map((r) => ({ id: r.id, label: r.label, value: r.avgSpend === null ? null : r.avgSpend * r.customers, color: SEGMENT_COLOR[r.id], detail: [{ label: "customers", value: formatNumber(r.customers) }] }))}
            format={(v) => inr(v, true)}
            highlight={filter.segment === "all" ? undefined : filter.segment}
          />
        </ChartFrame>

        <div className={s.card}>
          <h3 className={s.cardTitle}>Definitions</h3>
          <dl className={s.formulas}>
            <div>
              <dt>Repeat rate</dt>
              <dd>Customers with 2+ orders ÷ customers whose first order is at least {REPEAT_WINDOW} days old ({formatNumber(now.repeatBase)} here).</dd>
            </div>
            <div>
              <dt>Churn</dt>
              <dd>
                A customer has churned once {CHURN_DAYS} days pass without an order, about three times the usual reorder gap. Churn rate = churned ÷ customers acquired more than {CHURN_DAYS} days
                ago ({formatNumber(now.churnBase)} here). Retention is the rest: retention + churn = 100%.
              </dd>
            </div>
            <div>
              <dt>Cohort retention</dt>
              <dd>Customers from a first-order month who ordered in a later month ÷ the cohort&rsquo;s size.</dd>
            </div>
            <div>
              <dt>12-month CLV</dt>
              <dd>
                Revenue from each customer&rsquo;s first 365 days ÷ customers acquired at least a year ago ({formatNumber(now.clvBase)} here). Shown as revenue and as gross margin at{" "}
                {formatPercent(GROSS_MARGIN, { dp: 0 })}. Observed, not predicted: no lifetime is assumed.
              </dd>
            </div>
            <div>
              <dt>Average order value</dt>
              <dd>Revenue after discounts ÷ orders ({formatNumber(now.orders)} orders here).</dd>
            </div>
          </dl>
        </div>
      </div>
    </>
  );
}
