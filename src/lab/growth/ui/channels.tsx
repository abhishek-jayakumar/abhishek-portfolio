"use client";

import { useMemo, useState } from "react";
import type { Dataset } from "@/lab/growth/generate";
import { CHANNELS, type ChannelId } from "@/lab/growth/model";
import { breakdown, periods, rates, sumTotals, type Assumptions, type BreakdownRow, type Filter } from "@/lab/growth/metrics";
import { ratio, sum } from "@/lab/shared/lib/safe-math";
import { formatMultiple, formatNumber, formatPercent } from "@/lab/shared/lib/format";
import { ChartFrame } from "@/lab/shared/charts/chart-frame";
import { BarChart } from "@/lab/shared/charts/bar-chart";
import { Segmented } from "@/lab/shared/ui/controls";
import { DataTable, type Column } from "@/lab/shared/ui/data-table";
import { EmptyState } from "@/lab/shared/ui/notices";
import s from "@/lab/shared/ui/lab.module.css";
import { CHANNEL_COLOR, usd } from "./shared";

type Props = { data: Dataset; filter: Filter; assumptions: Assumptions };
type Metric = "cpc" | "cpm" | "ctr" | "cpl" | "costPerSql" | "cac" | "roas";

const METRICS: { value: Metric; label: string; long: string; lowerIsBetter: boolean; fmt: (v: number) => string }[] = [
  { value: "cpc", label: "CPC", long: "Cost per click", lowerIsBetter: true, fmt: (v) => usd(v) },
  { value: "cpm", label: "CPM", long: "Cost per 1,000 impressions", lowerIsBetter: true, fmt: (v) => usd(v) },
  { value: "ctr", label: "CTR", long: "Click-through rate", lowerIsBetter: false, fmt: (v) => formatPercent(v, { dp: 2 }) },
  { value: "cpl", label: "CPL", long: "Cost per lead", lowerIsBetter: true, fmt: (v) => usd(v) },
  { value: "costPerSql", label: "Cost / SQL", long: "Cost per sales-qualified lead", lowerIsBetter: true, fmt: (v) => usd(v) },
  { value: "cac", label: "CAC", long: "Paid customer acquisition cost", lowerIsBetter: true, fmt: (v) => usd(v) },
  { value: "roas", label: "ROAS", long: "First-year contract value per dollar of spend", lowerIsBetter: false, fmt: (v) => formatMultiple(v, 2) },
];

type Row = BreakdownRow & ReturnType<typeof rates> & { paid: boolean; spendShare: number | null; revenueShare: number | null; customerShare: number | null };

export function Channels({ data, filter }: Props) {
  const [metric, setMetric] = useState<Metric>("cac");
  const rows = useMemo<Row[]>(() => {
    const { current } = periods(filter.range);
    const b = breakdown(data, filter, current, "channel").filter((r) => r.sessions > 0 || r.leads > 0);
    const spend = sum(b.map((r) => r.spend));
    const rev = sum(b.map((r) => r.revenue));
    const cust = sum(b.map((r) => r.customers));
    return b.map((r) => ({
      ...r,
      ...rates(r),
      paid: CHANNELS.find((c) => c.id === r.key)?.paid ?? false,
      spendShare: ratio(r.spend, spend),
      revenueShare: ratio(r.revenue, rev),
      customerShare: ratio(r.customers, cust),
    }));
  }, [data, filter]);

  const m = METRICS.find((x) => x.value === metric) as (typeof METRICS)[number];
  const paid = rows.filter((r) => r.paid);
  const blended = paid.length ? rates(sumTotals(paid)) : null;
  const sorted = [...paid].sort((a, b) => ((m.lowerIsBetter ? 1 : -1) * ((a[metric] ?? Infinity) - (b[metric] ?? Infinity))));

  const columns: Column<Row>[] = [
    { key: "label", label: "Channel", render: (r) => r.label },
    { key: "spend", label: "Spend", align: "right", render: (r) => (r.paid ? usd(r.spend) : "no media cost") },
    { key: "spendShare", label: "% spend", align: "right", render: (r) => formatPercent(r.spendShare, { dp: 0 }) },
    { key: "impressions", label: "Impr.", align: "right", render: (r) => (r.paid ? formatNumber(r.impressions, { compact: true }) : "—") },
    { key: "clicks", label: "Clicks", align: "right", render: (r) => (r.paid ? formatNumber(r.clicks) : "—") },
    { key: "ctr", label: "CTR", align: "right", render: (r) => formatPercent(r.ctr, { dp: 2 }) },
    { key: "cpc", label: "CPC", align: "right", render: (r) => usd(r.cpc) },
    { key: "cpm", label: "CPM", align: "right", render: (r) => usd(r.cpm) },
    { key: "leads", label: "Leads", align: "right", render: (r) => formatNumber(r.leads) },
    { key: "cpl", label: "CPL", align: "right", render: (r) => usd(r.cpl) },
    { key: "costPerSql", label: "Cost / SQL", align: "right", render: (r) => usd(r.costPerSql) },
    { key: "customers", label: "Customers", align: "right", render: (r) => formatNumber(r.customers) },
    { key: "cac", label: "CAC", align: "right", render: (r) => usd(r.cac) },
    { key: "revenueShare", label: "% revenue", align: "right", render: (r) => formatPercent(r.revenueShare, { dp: 0 }) },
    { key: "roas", label: "ROAS", align: "right", render: (r) => formatMultiple(r.roas, 2) },
  ];

  return (
    <>
      <Segmented label="Compare paid channels on" value={metric} onChange={setMetric} options={METRICS.map((x) => ({ value: x.value, label: x.label }))} />
      {paid.length === 0 ? (
        <EmptyState title="No paid channels in this filter">
          Organic search and direct traffic have no media cost, so cost metrics don&rsquo;t apply. Compare them on conversion in Acquisition, or set Channel to All channels.
        </EmptyState>
      ) : (
        <ChartFrame
          title={`${m.long} by channel`}
          subtitle={`${m.lowerIsBetter ? "Lower is better" : "Higher is better"}. The dashed line is the blended value across paid channels.`}
          table={
            <DataTable
              caption={`${m.long} by channel`}
              rows={sorted}
              rowKey={(r) => r.key}
              columns={[
                { key: "label", label: "Channel" },
                { key: metric, label: m.label, align: "right", render: (r) => (r[metric] === null ? "—" : m.fmt(r[metric] as number)) },
              ]}
            />
          }
        >
          <BarChart
            ariaLabel={`${m.long} by channel`}
            format={m.fmt}
            referenceValue={blended ? blended[metric] : null}
            referenceLabel="Blended"
            bars={sorted.map((r) => ({
              id: r.key,
              label: r.label,
              value: r[metric],
              color: CHANNEL_COLOR[r.key as ChannelId],
              detail: [
                { label: "spend", value: usd(r.spend) },
                { label: "customers", value: formatNumber(r.customers) },
              ],
            }))}
          />
        </ChartFrame>
      )}
      <ChartFrame title="Share of spend against share of revenue" subtitle="A channel taking more of the budget than it returns in revenue is the first place to look.">
        <div className={s.grid2}>
          <BarChart ariaLabel="Share of paid spend by channel" format={(v) => formatPercent(v, { dp: 0 })} bars={paid.map((r) => ({ id: r.key, label: `${r.label} · spend`, value: r.spendShare, color: CHANNEL_COLOR[r.key as ChannelId] }))} />
          <BarChart ariaLabel="Share of revenue by channel" format={(v) => formatPercent(v, { dp: 0 })} bars={rows.map((r) => ({ id: r.key, label: `${r.label} · revenue`, value: r.revenueShare, color: CHANNEL_COLOR[r.key as ChannelId] }))} />
        </div>
      </ChartFrame>
      <DataTable caption="All channels compared" rows={rows} rowKey={(r) => r.key} columns={columns} initialSort={{ key: "spend", dir: "desc" }} />
      <p className={s.note}>
        CTR = clicks ÷ impressions. CPC = spend ÷ clicks. CPM = spend ÷ impressions × 1,000. CPL = spend ÷ leads created. Cost / SQL = spend ÷ SQLs reached. CAC = spend ÷ customers won. ROAS = first-year contract value won ÷ spend. All in the same period and attributed to the lead&rsquo;s first source; organic search and direct have no media cost, so their cost metrics are blank, not zero.
      </p>
    </>
  );
}
