"use client";

import { useMemo, useState } from "react";
import type { Dataset } from "@/lab/growth/generate";
import type { ChannelId } from "@/lab/growth/model";
import { breakdown, periods, totals, MATURE_DAYS, type Assumptions, type BreakdownRow, type Dimension, type Filter } from "@/lab/growth/metrics";
import { ratio } from "@/lab/shared/lib/safe-math";
import { formatNumber, formatPercent } from "@/lab/shared/lib/format";
import { SERIES } from "@/lab/shared/lib/palette";
import { ChartFrame } from "@/lab/shared/charts/chart-frame";
import { BarChart } from "@/lab/shared/charts/bar-chart";
import { Segmented } from "@/lab/shared/ui/controls";
import { DataTable, type Column } from "@/lab/shared/ui/data-table";
import s from "@/lab/shared/ui/lab.module.css";
import { CHANNEL_COLOR, usd } from "./shared";

type Props = { data: Dataset; filter: Filter; assumptions: Assumptions };

const DIMS: { value: Dimension; label: string; noun: string }[] = [
  { value: "channel", label: "Sources", noun: "source" },
  { value: "campaign", label: "Campaigns", noun: "campaign" },
  { value: "country", label: "Countries", noun: "country" },
  { value: "device", label: "Devices", noun: "device" },
  { value: "page", label: "Landing pages", noun: "landing page" },
];

type Row = BreakdownRow & { cvr: number | null; cpl: number | null };

export function Acquisition({ data, filter }: Props) {
  const [dim, setDim] = useState<Dimension>("channel");
  const { rows, overall } = useMemo(() => {
    const { current } = periods(filter.range);
    const t = totals(data, filter, current);
    const rs: Row[] = breakdown(data, filter, current, dim)
      .filter((r) => r.sessions > 0 || r.leads > 0)
      .map((r) => ({ ...r, cvr: ratio(r.leads, r.sessions), cpl: r.spend > 0 ? ratio(r.spend, r.leads) : null }));
    return { rows: rs, overall: { cvr: ratio(t.leads, t.sessions), leads: t.leads } };
  }, [data, filter, dim]);

  const noun = DIMS.find((d) => d.value === dim)?.noun ?? "";
  const colorFor = (r: Row) => (dim === "channel" ? CHANNEL_COLOR[r.key as ChannelId] : SERIES[0]);
  const byLeads = [...rows].sort((a, b) => b.leads - a.leads);
  const byCvr = [...rows].sort((a, b) => (b.cvr ?? -1) - (a.cvr ?? -1));
  const allocated = dim === "country" || dim === "device" || dim === "page";

  const columns: Column<Row>[] = [
    { key: "label", label: DIMS.find((d) => d.value === dim)?.label.replace(/s$/, "") ?? "", render: (r) => (r.sub ? <span title={r.sub}>{r.label} <span className={s.note}>· {r.sub}</span></span> : r.label) },
    { key: "sessions", label: "Sessions", align: "right", render: (r) => formatNumber(r.sessions) },
    { key: "leads", label: "Leads", align: "right", render: (r) => formatNumber(r.leads) },
    { key: "cvr", label: "Session → lead", align: "right", render: (r) => formatPercent(r.cvr, { dp: 2 }) },
    { key: "spend", label: allocated ? "Spend*" : "Spend", align: "right", render: (r) => (r.spend > 0 ? usd(r.spend) : "—") },
    { key: "cpl", label: "CPL", align: "right", render: (r) => usd(r.cpl) },
    { key: "sqls", label: "SQLs", align: "right", render: (r) => formatNumber(r.sqls) },
    { key: "leadToSql", label: `Lead → SQL†`, align: "right", render: (r) => formatPercent(r.leadToSql) },
    { key: "customers", label: "Customers", align: "right", render: (r) => formatNumber(r.customers) },
    { key: "revenue", label: "Revenue", align: "right", render: (r) => usd(r.revenue) },
  ];

  return (
    <>
      <Segmented label="Break down by" value={dim} onChange={setDim} options={DIMS.map((d) => ({ value: d.value, label: d.label }))} />
      <div className={s.grid2}>
        <ChartFrame title={`Leads by ${noun}`} subtitle={`${formatNumber(overall.leads)} leads created in the period`}>
          <BarChart ariaLabel={`Leads by ${noun}`} format={(v) => formatNumber(v)} bars={byLeads.map((r) => ({ id: r.key, label: r.label, value: r.leads, color: colorFor(r), detail: [{ label: "share of leads", value: formatPercent(ratio(r.leads, overall.leads), { dp: 0 }) }] }))} />
        </ChartFrame>
        <ChartFrame title={`Session → lead rate by ${noun}`} subtitle="The dashed line is the rate across everything in the filter">
          <BarChart
            ariaLabel={`Conversion rate by ${noun}`}
            format={(v) => formatPercent(v, { dp: 1 })}
            referenceValue={overall.cvr}
            referenceLabel="Overall"
            bars={byCvr.map((r) => ({ id: r.key, label: r.label, value: r.cvr, color: colorFor(r), detail: [{ label: "sessions", value: formatNumber(r.sessions) }, { label: "leads", value: formatNumber(r.leads) }] }))}
          />
        </ChartFrame>
      </div>
      <DataTable caption={`Acquisition by ${noun}`} rows={rows} columns={columns} rowKey={(r) => r.key} initialSort={{ key: "leads", dir: "desc" }} />
      <p className={s.note}>
        {allocated && "* Ad platforms report spend by campaign, so spend for a country, device or landing page is allocated in proportion to its sessions. "}† Share of the period&rsquo;s leads that are at least {MATURE_DAYS} days old and have reached SQL so far (shown when 20+ such leads). A high-converting row with a low Lead → SQL rate is bringing volume, not
        sales-ready leads.
      </p>
    </>
  );
}
