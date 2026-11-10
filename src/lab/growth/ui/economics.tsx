"use client";

import { useMemo } from "react";
import type { Dataset } from "@/lab/growth/generate";
import { CHANNELS } from "@/lab/growth/model";
import { breakdown, buckets, costShareFor, economics, periods, totals, DEFAULT_ASSUMPTIONS, type Assumptions, type Filter } from "@/lab/growth/metrics";
import { isNum, ratio } from "@/lab/shared/lib/safe-math";
import { formatMonth, formatMonths, formatMultiple, formatNumber, formatPercent } from "@/lab/shared/lib/format";
import { SERIES } from "@/lab/shared/lib/palette";
import { ChartFrame } from "@/lab/shared/charts/chart-frame";
import { LineChart } from "@/lab/shared/charts/line-chart";
import { RangeField } from "@/lab/shared/ui/controls";
import { DataTable } from "@/lab/shared/ui/data-table";
import { MetricTile } from "@/lab/shared/ui/metric-tile";
import s from "@/lab/shared/ui/lab.module.css";
import { usd } from "./shared";

type Props = { data: Dataset; filter: Filter; assumptions: Assumptions; onAssumptions: (a: Assumptions) => void };

export function Economics({ data, filter, assumptions: a, onAssumptions }: Props) {
  const view = useMemo(() => {
    const { current } = periods(filter.range);
    const t = totals(data, filter, current);
    const share = costShareFor(data, filter, current);
    // Paid CAC by month over the last 12 months, for the trend.
    const months = buckets({ from: current.to - 364, to: current.to }, "month");
    const cacTrend = months.map((m) => {
      const mt = totals(data, filter, { from: m.from, to: m.to });
      return { label: m.label, cac: mt.paidSpend > 0 ? ratio(mt.paidSpend, mt.customers) : null, deal: ratio(mt.revenue, mt.customers) };
    });
    const channels = breakdown(data, filter, current, "channel")
      .filter((r) => CHANNELS.find((c) => c.id === r.key)?.paid && r.spend > 0)
      .map((r) => {
        const deal = ratio(r.revenue, r.customers);
        const ltv = deal === null ? null : ratio((deal / 12) * a.grossMargin, a.monthlyChurn);
        const cac = ratio(r.spend, r.customers);
        return { key: r.key, label: r.label, customers: r.customers, cac, deal, ltv, ltvCac: ratio(ltv, cac), roas: ratio(r.revenue, r.spend), payback: deal === null ? null : ratio(cac, (deal / 12) * a.grossMargin) };
      });
    return { t, share, ue: economics(t, filter.range, a, share), cacTrend, channels };
  }, [data, filter, a]);

  const { t, share, ue, cacTrend, channels } = view;
  const ltvCacStatus = !isNum(ue.ltvCac) ? "" : ue.ltvCac >= 3 ? "healthy (3× or more)" : ue.ltvCac >= 1.5 ? "below the 3× guide" : "too low";
  const set = (k: keyof Assumptions, v: number) => onAssumptions({ ...a, [k]: v });
  const changed = a.grossMargin !== DEFAULT_ASSUMPTIONS.grossMargin || a.monthlyChurn !== DEFAULT_ASSUMPTIONS.monthlyChurn || a.otherCostPerMonth !== DEFAULT_ASSUMPTIONS.otherCostPerMonth;

  return (
    <>
      <div className={s.card}>
        <h3 className={s.cardTitle}>Assumptions</h3>
        <p className={s.note}>LTV and the fully loaded CAC depend on numbers marketing data can&rsquo;t provide. Set them here; the Analyst uses the same values.</p>
        <div className={s.grid3} style={{ marginTop: "1rem" }}>
          <RangeField label="Gross margin" value={a.grossMargin} min={0.5} max={0.95} step={0.01} format={(v) => formatPercent(v, { dp: 0 })} onChange={(v) => set("grossMargin", v)} note="Share of subscription revenue left after hosting and support" />
          <RangeField label="Monthly churn" value={a.monthlyChurn} min={0.005} max={0.06} step={0.001} format={(v) => formatPercent(v, { dp: 1 })} onChange={(v) => set("monthlyChurn", v)} note={`Average customer life: ${formatMonths(1 / a.monthlyChurn, 0)}`} />
          <RangeField label="Other sales & marketing cost" value={a.otherCostPerMonth} min={0} max={150000} step={5000} format={(v) => `${usd(v)}/mo`} onChange={(v) => set("otherCostPerMonth", v)} note="Salaries, tools and agencies; not media" />
        </div>
        {changed && (
          <button type="button" className={s.btnGhost} style={{ marginTop: "0.8rem" }} onClick={() => onAssumptions(DEFAULT_ASSUMPTIONS)}>
            Reset assumptions
          </button>
        )}
      </div>

      <div className={s.tiles}>
        <MetricTile label="Average deal value" hint="first-year contract value" value={usd(ue.avgDeal)} />
        <MetricTile label="CAC, paid media only" hint="paid spend ÷ customers" value={usd(ue.cacPaid)} />
        <MetricTile label="CAC, fully loaded" hint="incl. other S&M cost" value={usd(ue.cacLoaded)} />
        <MetricTile label="Customer lifetime value" hint="gross profit over the customer's life" value={usd(ue.ltv)} />
        <MetricTile label="LTV : CAC" hint={ltvCacStatus} value={formatMultiple(ue.ltvCac)} />
        <MetricTile label="Payback period" hint="months of gross profit to repay CAC" value={formatMonths(ue.paybackMonths)} />
        <MetricTile label="Paid ROAS, first year" hint="contract value from paid ÷ paid spend" value={formatMultiple(ue.roas, 2)} />
        <MetricTile label="Customers won" hint={`in the last ${filter.range} days`} value={formatNumber(t.customers)} />
      </div>

      <div className={s.card}>
        <h3 className={s.cardTitle}>How each number is calculated, with this period&rsquo;s values</h3>
        <dl className={s.formulas}>
          <div>
            <dt>Average deal value</dt>
            <dd>
              first-year contract value won ÷ customers won = {usd(t.revenue)} ÷ {formatNumber(t.customers)} = <strong>{usd(ue.avgDeal)}</strong>
            </dd>
          </div>
          <div>
            <dt>Monthly revenue per account</dt>
            <dd>
              average deal value ÷ 12 = <strong>{usd(ue.arpaMonthly)}</strong>
            </dd>
          </div>
          <div>
            <dt>CAC, paid media only</dt>
            <dd>
              paid spend ÷ customers won = {usd(t.paidSpend)} ÷ {formatNumber(t.customers)} = <strong>{usd(ue.cacPaid)}</strong>
            </dd>
          </div>
          <div>
            <dt>CAC, fully loaded</dt>
            <dd>
              (paid spend + other cost × {formatNumber(ue.months, { dp: 1 })} months{share < 1 ? ` × ${formatPercent(share, { dp: 0 })} share` : ""}) ÷ customers = {usd(ue.loadedCost)} ÷ {formatNumber(t.customers)} = <strong>{usd(ue.cacLoaded)}</strong>
            </dd>
          </div>
          <div>
            <dt>Customer lifetime value</dt>
            <dd>
              monthly revenue per account × gross margin ÷ monthly churn = {usd(ue.arpaMonthly)} × {formatPercent(a.grossMargin, { dp: 0 })} ÷ {formatPercent(a.monthlyChurn, { dp: 1 })} = <strong>{usd(ue.ltv)}</strong>
            </dd>
          </div>
          <div>
            <dt>LTV : CAC</dt>
            <dd>
              LTV ÷ fully loaded CAC = <strong>{formatMultiple(ue.ltvCac)}</strong>
            </dd>
          </div>
          <div>
            <dt>Payback period</dt>
            <dd>
              fully loaded CAC ÷ (monthly revenue per account × gross margin) = <strong>{formatMonths(ue.paybackMonths)}</strong>
            </dd>
          </div>
          <div>
            <dt>Paid ROAS, first year</dt>
            <dd>
              contract value won from paid-sourced customers ÷ paid spend = {usd(t.paidRevenue)} ÷ {usd(t.paidSpend)} = <strong>{formatMultiple(ue.roas, 2)}</strong>
            </dd>
          </div>
        </dl>
        {share < 1 && <p className={s.note}>This view is a slice of the business, so it carries {formatPercent(share, { dp: 0 })} of the non-media cost: its share of all customers won.</p>}
        <p className={s.note}>Spend and customers are matched by period, not by cohort: a customer won this month may have been a lead two months ago. Over 90 days or more the difference mostly evens out.</p>
      </div>

      <div className={s.grid2}>
        <ChartFrame title="Paid CAC by month" subtitle="Paid spend ÷ customers won, last 12 months">
          <LineChart ariaLabel="Paid CAC by month" labels={cacTrend.map((m) => formatMonth(m.label))} series={[{ id: "cac", label: "Paid CAC", color: SERIES[0], values: cacTrend.map((m) => m.cac) }]} format={(v) => usd(v)} tickFormat={(v) => usd(v, true)} zeroBased />
        </ChartFrame>
        <ChartFrame title="Average deal value by month" subtitle="First-year contract value ÷ customers won">
          <LineChart ariaLabel="Average deal value by month" labels={cacTrend.map((m) => formatMonth(m.label))} series={[{ id: "deal", label: "Average deal", color: SERIES[2], values: cacTrend.map((m) => m.deal) }]} format={(v) => usd(v)} tickFormat={(v) => usd(v, true)} zeroBased />
        </ChartFrame>
      </div>

      <div className={s.card}>
        <h3 className={s.cardTitle}>Unit economics by paid channel</h3>
        <DataTable
          caption="Unit economics by paid channel"
          rowKey={(r) => r.key}
          rows={channels}
          initialSort={{ key: "ltvCac", dir: "desc" }}
          columns={[
            { key: "label", label: "Channel" },
            { key: "customers", label: "Customers", align: "right", render: (r) => formatNumber(r.customers) },
            { key: "cac", label: "CAC (media)", align: "right", render: (r) => usd(r.cac) },
            { key: "deal", label: "Avg deal", align: "right", render: (r) => usd(r.deal) },
            { key: "ltv", label: "LTV", align: "right", render: (r) => usd(r.ltv) },
            { key: "ltvCac", label: "LTV : CAC", align: "right", render: (r) => formatMultiple(r.ltvCac) },
            { key: "payback", label: "Payback", align: "right", render: (r) => formatMonths(r.payback) },
            { key: "roas", label: "ROAS", align: "right", render: (r) => formatMultiple(r.roas, 2) },
          ]}
        />
        <p className={s.note} style={{ marginTop: "0.6rem" }}>Per channel, CAC is media-only: non-media cost isn&rsquo;t split by channel. Each channel&rsquo;s LTV uses its own average deal value.</p>
      </div>
    </>
  );
}
