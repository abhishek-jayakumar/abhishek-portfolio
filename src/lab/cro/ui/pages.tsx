"use client";

import { useMemo, useState } from "react";
import type { PageId } from "@/lab/cro/model";
import { DAYS } from "@/lab/cro/model";
import { pageStats, siteStats, type PageStats } from "@/lab/cro/metrics";
import { formatNumber, formatPercent } from "@/lab/shared/lib/format";
import { SERIES } from "@/lab/shared/lib/palette";
import { BarChart } from "@/lab/shared/charts/bar-chart";
import { ChartFrame } from "@/lab/shared/charts/chart-frame";
import { Segmented } from "@/lab/shared/ui/controls";
import { DataTable } from "@/lab/shared/ui/data-table";
import { MetricTile } from "@/lab/shared/ui/metric-tile";
import { EmptyState } from "@/lab/shared/ui/notices";
import s from "@/lab/shared/ui/lab.module.css";
import type { ModuleProps } from "./shared";

type Metric = "visitors" | "conversion" | "leadRate" | "ctaRate" | "bounce" | "formCompletion";

const METRICS: { value: Metric; label: string; long: string; lowerIsBetter?: boolean }[] = [
  { value: "conversion", label: "Conversion", long: "Conversion rate (form submissions ÷ visitors)" },
  { value: "leadRate", label: "Qualified", long: "Qualified lead rate (qualified leads ÷ visitors)" },
  { value: "ctaRate", label: "CTA clicks", long: "CTA click rate (CTA clicks ÷ visitors)" },
  { value: "bounce", label: "Bounce", long: "Bounce rate (left without engaging ÷ visitors), lower is better", lowerIsBetter: true },
  { value: "formCompletion", label: "Form completion", long: "Form completion (submissions ÷ form starts)" },
  { value: "visitors", label: "Traffic", long: "Visitors over the four weeks" },
];

export function Pages({ data, filter, page, onPage, onOpen }: ModuleProps & { page: PageId; onPage: (p: PageId) => void; onOpen: (module: string) => void }) {
  const [metric, setMetric] = useState<Metric>("conversion");
  const { rows, site } = useMemo(() => ({ rows: pageStats(data, filter), site: siteStats(data, filter) }), [data, filter]);
  const m = METRICS.find((x) => x.value === metric) as (typeof METRICS)[number];
  const fmt = (v: number) => (metric === "visitors" ? formatNumber(v, { compact: v >= 10000 }) : formatPercent(v, { dp: metric === "leadRate" || metric === "conversion" ? 2 : 1 }));
  const ref = metric === "visitors" ? null : site[metric];
  const sorted = [...rows].sort((a, b) => ((b[metric] as number | null) ?? -1) - ((a[metric] as number | null) ?? -1));
  if (m.lowerIsBetter) sorted.reverse();

  if (!site.visitors) return <EmptyState title="No visitors in this filter">Try All devices or All sources.</EmptyState>;

  return (
    <>
      <div className={s.tiles}>
        <MetricTile label="Visitors" hint={`${DAYS} days`} value={formatNumber(site.visitors)} />
        <MetricTile label="Visitors per day" value={formatNumber(site.daily)} />
        <MetricTile label="Conversion rate" hint="submissions ÷ visitors" value={formatPercent(site.conversion, { dp: 2 })} />
        <MetricTile label="Qualified lead rate" hint="qualified ÷ visitors" value={formatPercent(site.leadRate, { dp: 2 })} />
        <MetricTile label="Bounce rate" value={formatPercent(site.bounce)} />
        <MetricTile label="Form completion" hint="submissions ÷ starts" value={formatPercent(site.formCompletion)} />
      </div>

      <ChartFrame
        title={m.long}
        subtitle={`Selected page highlighted; the line is the site-wide figure${m.lowerIsBetter ? ". Ranked best (lowest) first" : ""}`}
        table={<PagesTable rows={rows} onOpen={(p) => { onPage(p); onOpen("journey"); }} />}
      >
        <Segmented label="Metric" value={metric} onChange={setMetric} options={METRICS.map((x) => ({ value: x.value, label: x.label }))} />
        <div style={{ marginTop: "0.8rem" }}>
          <BarChart
            ariaLabel={m.long}
            bars={sorted.map((r) => ({ id: r.id, label: r.label, value: r[metric] as number | null, color: SERIES[0], detail: [{ label: "visitors", value: formatNumber(r.visitors) }] }))}
            format={fmt}
            highlight={page}
            referenceValue={ref}
            referenceLabel="Site"
          />
        </div>
      </ChartFrame>

      <div className={s.card}>
        <h3 className={s.cardTitle}>Every landing page</h3>
        <PagesTable rows={rows} onOpen={(p) => { onPage(p); onOpen("journey"); }} />
        <p className={s.note} style={{ marginTop: "0.6rem" }}>
          Open a page&rsquo;s journey to see which step loses its visitors. Form completion shows a dash when fewer than 25 people started the form in this slice.
        </p>
      </div>
    </>
  );
}

function PagesTable({ rows, onOpen }: { rows: PageStats[]; onOpen: (p: PageId) => void }) {
  return (
    <DataTable
      caption="Landing pages"
      rowKey={(r) => r.id}
      rows={rows}
      initialSort={{ key: "visitors", dir: "desc" }}
      columns={[
        { key: "label", label: "Page", render: (r) => (<span>{r.label}<br /><span className={s.note}>{r.path}</span></span>) },
        { key: "visitors", label: "Visitors", align: "right", render: (r) => formatNumber(r.visitors) },
        { key: "bounce", label: "Bounce", align: "right", render: (r) => formatPercent(r.bounce) },
        { key: "scroll", label: "Scroll", align: "right", render: (r) => formatPercent(r.scroll, { dp: 0 }) },
        { key: "ctaRate", label: "CTA clicks", align: "right", render: (r) => formatPercent(r.ctaRate) },
        { key: "formCompletion", label: "Form compl.", align: "right", render: (r) => formatPercent(r.formCompletion) },
        { key: "conversion", label: "Conversion", align: "right", render: (r) => formatPercent(r.conversion, { dp: 2 }) },
        { key: "leadRate", label: "Qualified", align: "right", render: (r) => formatPercent(r.leadRate, { dp: 2 }) },
        {
          key: "open",
          label: "Journey",
          sortable: false,
          render: (r) => (
            <button type="button" className={s.linkBtn} onClick={() => onOpen(r.id)} aria-label={`Open the journey for ${r.label}`}>
              Open <span aria-hidden="true">→</span>
            </button>
          ),
        },
      ]}
    />
  );
}
