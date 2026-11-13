"use client";

import { useMemo, useState } from "react";
import { PLATFORMS, dayToIso, platformLabel, type Account, type PlatformId } from "@/lab/paid/model";
import { breakdown, periods, rates, scope, totals, weekly, type BreakdownRow, type Filter } from "@/lab/paid/metrics";
import { change, isNum } from "@/lab/shared/lib/safe-math";
import { formatDay } from "@/lab/shared/lib/format";
import { SERIES } from "@/lab/shared/lib/palette";
import { ChartFrame } from "@/lab/shared/charts/chart-frame";
import { LineChart } from "@/lab/shared/charts/line-chart";
import { Segmented } from "@/lab/shared/ui/controls";
import { DataTable, type Column } from "@/lab/shared/ui/data-table";
import { MetricTile } from "@/lab/shared/ui/metric-tile";
import { EmptyState } from "@/lab/shared/ui/notices";
import s from "@/lab/shared/ui/lab.module.css";
import { METRICS, PLATFORM_COLOR, available, hasFields, metric, valueOf, type MetricKey } from "./shared";

type Props = { account: Account; filter: Filter };

const TILES: MetricKey[] = ["spend", "impressions", "clicks", "ctr", "cpc", "cpm", "leads", "cpl", "qualified", "cpa", "roas"];
const TREND: MetricKey[] = ["spend", "leads", "cpl", "ctr", "cpm", "cpa", "roas"];
const COLUMNS: MetricKey[] = ["spend", "impressions", "clicks", "ctr", "cpc", "cpm", "leads", "cvr", "cpl", "qualRate", "cpa", "roas"];

export function Analytics({ account, filter }: Props) {
  const [trend, setTrend] = useState<MetricKey>("cpl");
  const [split, setSplit] = useState<"total" | "platform">("total");

  const view = useMemo(() => {
    const per = periods(account.rows, filter.range);
    if (!per) return null;
    const cur = scope(account.rows, filter, per.current);
    const prev = per.previous ? scope(account.rows, filter, per.previous) : null;
    const t = totals(cur);
    const weeks = weekly(cur, per.current);
    const byPlatform = PLATFORMS.filter((p) => cur.some((r) => r.platform === p.id)).map((p) => ({
      id: p.id,
      weeks: weekly(
        cur.filter((r) => r.platform === p.id),
        per.current,
      ),
    }));
    return {
      per,
      cur: { ...t, ...rates(t) },
      prev: prev ? (() => { const pt = totals(prev); return { ...pt, ...rates(pt) }; })() : null,
      weeks,
      byPlatform,
      campaigns: breakdown(cur, "campaign"),
    };
  }, [account, filter]);

  if (!view || view.cur.rows === 0) {
    return <EmptyState title="No rows in this selection">Choose a longer date range or All platforms.</EmptyState>;
  }
  const has = hasFields(view.cur);
  const m = metric(available(metric(trend), has) ? trend : "cpl");
  const tiles = TILES.map(metric).filter((d) => available(d, has));
  const series =
    split === "platform"
      ? view.byPlatform.map((p) => ({ id: p.id, label: platformLabel(p.id), color: PLATFORM_COLOR[p.id], values: p.weeks.map((w) => valueOf({ ...w.totals, ...rates(w.totals) }, m.key)) }))
      : [{ id: "total", label: m.label, color: SERIES[0], values: view.weeks.map((w) => valueOf({ ...w.totals, ...rates(w.totals) }, m.key)) }];
  const labels = view.weeks.map((w) => formatDay(w.label));

  const cols: Column<BreakdownRow>[] = [
    { key: "label", label: "Campaign", render: (r) => r.label },
    { key: "platform", label: "Platform", render: (r) => platformLabel(r.platform as PlatformId), sortValue: (r) => r.platform },
    ...COLUMNS.map(metric)
      .filter((d) => available(d, has))
      .map((d) => ({ key: d.key, label: d.label, align: "right" as const, render: (r: BreakdownRow) => { const v = valueOf(r, d.key); return isNum(v) ? d.fmt(v) : "—"; }, sortValue: (r: BreakdownRow) => valueOf(r, d.key) })),
  ];

  return (
    <>
      <div className={s.tiles}>
        {tiles.map((d) => {
          const v = valueOf(view.cur, d.key);
          return (
            <MetricTile
              key={d.key}
              label={d.label}
              hint={d.key === "cpa" ? "per qualified lead" : d.key === "roas" ? "pipeline ÷ spend" : undefined}
              value={isNum(v) ? d.fmt(v) : "—"}
              delta={view.prev ? { value: change(v, valueOf(view.prev, d.key)), upIsGood: d.upIsGood, vs: `vs previous ${filter.range} days` } : undefined}
              trend={view.weeks.map((w) => valueOf({ ...w.totals, ...rates(w.totals) }, d.key))}
            />
          );
        })}
      </div>

      <ChartFrame
        title={`${m.long} by week`}
        subtitle={`${m.formula}. Weeks end on ${formatDay(dayToIso(view.per.current.to))}.`}
        legend={split === "platform" ? series.map((x) => ({ label: x.label, color: x.color })) : undefined}
        actions={
          <Segmented
            label="Split"
            hideLabel
            value={split}
            onChange={setSplit}
            options={[
              { value: "total", label: "Total" },
              { value: "platform", label: "By platform" },
            ]}
          />
        }
        table={
          <DataTable
            caption={`${m.long} by week`}
            rowKey={(r) => String(r.week)}
            columns={[{ key: "week", label: "Week starting", sortable: false }, ...series.map((x) => ({ key: x.id, label: x.label, align: "right" as const, sortable: false, render: (r: Record<string, unknown>) => (isNum(r[x.id]) ? m.fmt(r[x.id] as number) : "—") }))]}
            rows={view.weeks.map((w, i) => ({ week: formatDay(w.label), ...Object.fromEntries(series.map((x) => [x.id, x.values[i]])) }))}
          />
        }
      >
        <Segmented label="Metric" value={m.key} onChange={setTrend} options={TREND.map(metric).filter((d) => available(d, has)).map((d) => ({ value: d.key, label: d.label }))} />
        <div style={{ marginTop: "0.8rem" }}>
          <LineChart ariaLabel={`${m.long} by week`} labels={labels} series={series} format={m.fmt} height={250} area={split === "total"} />
        </div>
      </ChartFrame>

      <div className={s.card}>
        <h3 className={s.cardTitle}>Every campaign, on the same definitions</h3>
        <DataTable caption="Campaign performance" rowKey={(r) => r.key} rows={view.campaigns} columns={cols} initialSort={{ key: "spend", dir: "desc" }} maxHeight="32rem" />
        <p className={s.note} style={{ marginTop: "0.6rem" }}>A dash means the metric can&rsquo;t be calculated (no clicks, no leads, or the column isn&rsquo;t in the data), never zero.</p>
      </div>

      <div className={s.card}>
        <h3 className={s.cardTitle}>How each metric is calculated</h3>
        <p className={s.note}>Platforms define some of these differently in their own dashboards. Here every platform goes through the same formula, from the raw counts.</p>
        <dl className={s.formulas}>
          {METRICS.filter((d) => available(d, has)).map((d) => (
            <div key={d.key}>
              <dt>
                {d.label} · {d.long}
              </dt>
              <dd>{d.formula}</dd>
            </div>
          ))}
        </dl>
      </div>
    </>
  );
}
