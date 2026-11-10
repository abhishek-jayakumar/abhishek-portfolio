"use client";

import { useMemo, useState } from "react";
import type { Dataset } from "@/lab/growth/generate";
import { CHANNELS } from "@/lab/growth/model";
import { granularityFor, periods, series, totals, type Assumptions, type Filter, type SeriesMetric, type Totals } from "@/lab/growth/metrics";
import { change } from "@/lab/shared/lib/safe-math";
import { formatNumber } from "@/lab/shared/lib/format";
import { SERIES } from "@/lab/shared/lib/palette";
import { ChartFrame } from "@/lab/shared/charts/chart-frame";
import { LineChart } from "@/lab/shared/charts/line-chart";
import { MetricTile } from "@/lab/shared/ui/metric-tile";
import { Segmented } from "@/lab/shared/ui/controls";
import { DataTable } from "@/lab/shared/ui/data-table";
import s from "@/lab/shared/ui/lab.module.css";
import { CHANNEL_COLOR, bucketLabel, bucketTitle, usd } from "./shared";

type Props = { data: Dataset; filter: Filter; assumptions: Assumptions };

const TILES: { key: keyof Totals; series: SeriesMetric; label: string; hint?: string; money?: boolean; upIsGood: boolean | null }[] = [
  { key: "sessions", series: "sessions", label: "Website sessions", upIsGood: true },
  { key: "spend", series: "spend", label: "Marketing spend", hint: "paid media", money: true, upIsGood: null },
  { key: "leads", series: "leads", label: "Leads", hint: "created in period", upIsGood: true },
  { key: "mqls", series: "mqls", label: "Marketing qualified", hint: "MQLs reached in period", upIsGood: true },
  { key: "sqls", series: "sqls", label: "Sales qualified", hint: "SQLs reached in period", upIsGood: true },
  { key: "opps", series: "opps", label: "Opportunities", hint: "opened in period", upIsGood: true },
  { key: "customers", series: "customers", label: "New customers", hint: "won in period", upIsGood: true },
  { key: "revenue", series: "revenue", label: "New revenue", hint: "first-year contract value", money: true, upIsGood: true },
];

const TREND: { value: SeriesMetric; label: string }[] = [
  { value: "sessions", label: "Sessions" },
  { value: "spend", label: "Spend" },
  { value: "leads", label: "Leads" },
  { value: "sqls", label: "SQLs" },
  { value: "customers", label: "Customers" },
  { value: "revenue", label: "Revenue" },
];

export function Overview({ data, filter }: Props) {
  const [metric, setMetric] = useState<SeriesMetric>("leads");
  const [split, setSplit] = useState<"total" | "channel">("total");
  const g = granularityFor(filter.range);

  // Everything here depends only on the data and the filter (periods are derived from the range).
  const { cur, prev, trends } = useMemo(() => {
    const { current, previous } = periods(filter.range);
    const tr: Partial<Record<SeriesMetric, number[]>> = {};
    for (const t of TILES) tr[t.series] = series(data, filter, current, granularityFor(filter.range), t.series, false).values[0];
    return { cur: totals(data, filter, current), prev: totals(data, filter, previous), trends: tr };
  }, [data, filter]);

  const chart = series(data, filter, periods(filter.range).current, g, metric, split === "channel");
  const money = metric === "spend" || metric === "revenue";
  const fmt = (v: number) => (money ? usd(v, v >= 10000) : formatNumber(v, { compact: v >= 10000 }));
  const lineSeries = chart.groups.map((gr, i) => {
    const ch = CHANNELS.find((c) => c.id === gr);
    return { id: gr, label: ch ? ch.label : TREND.find((t) => t.value === metric)?.label ?? "Total", color: ch ? CHANNEL_COLOR[ch.id] : SERIES[0], values: chart.values[i] };
  });
  const noSpend = metric === "spend" && cur.spend === 0;

  return (
    <>
      <div className={s.tiles}>
        {TILES.map((t) => (
          <MetricTile
            key={t.key}
            label={t.label}
            hint={t.hint}
            value={t.money ? usd(cur[t.key], cur[t.key] >= 100000) : formatNumber(cur[t.key])}
            delta={{ value: change(cur[t.key], prev[t.key]), upIsGood: t.upIsGood, vs: `vs previous ${filter.range} days` }}
            trend={trends[t.series]}
          />
        ))}
      </div>

      <ChartFrame
        title={`${TREND.find((t) => t.value === metric)?.label} by ${g}`}
        subtitle={split === "channel" ? "Split by acquisition channel (the lead's first source)" : "All channels in the current filter"}
        legend={split === "channel" ? lineSeries.map((l) => ({ label: l.label, color: l.color })) : undefined}
        actions={
          <Segmented
            label="Split"
            hideLabel
            value={split}
            onChange={setSplit}
            options={[
              { value: "total", label: "Total" },
              { value: "channel", label: "By channel" },
            ]}
          />
        }
        table={
          <DataTable
            caption={`${metric} by ${g}`}
            rowKey={(r) => String(r.period)}
            columns={[
              { key: "period", label: g === "day" ? "Day" : g === "week" ? "Week" : "Month", sortable: false },
              ...lineSeries.map((l) => ({ key: l.id, label: l.label, align: "right" as const, render: (r: Record<string, unknown>) => fmt(r[l.id] as number) })),
            ]}
            rows={chart.buckets.map((b, i) => ({ period: bucketTitle(b, g), ...Object.fromEntries(lineSeries.map((l) => [l.id, l.values[i]])) }))}
          />
        }
      >
        <Segmented label="Metric" value={metric} onChange={setMetric} options={TREND} />
        <div style={{ marginTop: "0.8rem" }}>
          {noSpend ? (
            <p className={s.note}>This channel has no media spend: organic search and direct traffic cost nothing per click.</p>
          ) : (
            <LineChart
              ariaLabel={`${metric} by ${g}`}
              labels={chart.buckets.map((b) => bucketLabel(b, g))}
              series={lineSeries}
              format={fmt}
              tickFormat={(v) => (money ? usd(v, true) : formatNumber(v, { compact: v >= 1000 }))}
              area={split === "total"}
              height={260}
            />
          )}
        </div>
      </ChartFrame>
      <p className={s.note}>
        Every count is an event inside the period: an SQL counts on the day it became an SQL, a customer on the day the deal was won. Revenue is first-year contract value
        booked on that day. To follow the leads created in the period through to revenue, use Funnel.
      </p>
    </>
  );
}
