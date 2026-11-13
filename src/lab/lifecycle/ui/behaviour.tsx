"use client";

import { useMemo } from "react";
import { frequencyBuckets, gapBuckets, gaps, median, recencyBuckets, repeatByChannel, repeatByProduct, segmentFlow, select, type Bucket, type RepeatRow } from "@/lab/lifecycle/metrics";
import { formatDays, formatNumber, formatPercent } from "@/lab/shared/lib/format";
import { SERIES } from "@/lab/shared/lib/palette";
import { ratio } from "@/lab/shared/lib/safe-math";
import { BarChart } from "@/lab/shared/charts/bar-chart";
import { ChartFrame } from "@/lab/shared/charts/chart-frame";
import { Heatmap } from "@/lab/shared/charts/heatmap";
import { DataTable } from "@/lab/shared/ui/data-table";
import { EmptyState } from "@/lab/shared/ui/notices";
import s from "@/lab/shared/ui/lab.module.css";
import { inr, type ModuleProps } from "./shared";

function BucketChart({ title, subtitle, buckets, total, color, note }: { title: string; subtitle: string; buckets: Bucket[]; total: number; color: string; note?: string }) {
  return (
    <ChartFrame
      title={title}
      subtitle={subtitle}
      table={
        <DataTable
          caption={title}
          rowKey={(r) => r.id}
          rows={buckets.map((b) => ({ ...b, share: ratio(b.value, total) }))}
          columns={[
            { key: "label", label: "Bucket", sortable: false },
            { key: "value", label: "Count", align: "right", sortable: false, render: (r) => formatNumber(r.value) },
            { key: "share", label: "Share", align: "right", sortable: false, render: (r) => formatPercent(r.share) },
          ]}
        />
      }
    >
      <BarChart ariaLabel={title} bars={buckets.map((b) => ({ ...b, color, detail: [{ label: "share", value: formatPercent(ratio(b.value, total)) }] }))} format={(v) => formatNumber(v, { compact: v >= 10000 })} />
      {note && <p className={s.note}>{note}</p>}
    </ChartFrame>
  );
}

const repeatColumns = (first: string) => [
  { key: "label", label: first },
  { key: "base", label: "Customers", align: "right" as const, render: (r: RepeatRow) => formatNumber(r.base) },
  { key: "rate", label: "Repeat rate", align: "right" as const, render: (r: RepeatRow) => formatPercent(r.rate) },
  { key: "firstYear", label: "First-year revenue", align: "right" as const, render: (r: RepeatRow) => inr(r.firstYear) },
];

export function Behaviour({ data, filter }: ModuleProps) {
  const v = useMemo(() => {
    const ps = select(data, filter);
    const gs = gaps(data, ps);
    return { ps, gs, freq: frequencyBuckets(ps), gap: gapBuckets(gs), rec: recencyBuckets(ps), flow: segmentFlow(data, ps, 90), product: repeatByProduct(data, ps), channel: repeatByChannel(data, ps) };
  }, [data, filter]);
  const { ps, gs, freq, gap, rec, flow, product, channel } = v;
  const med = median(gs);

  if (!ps.length) return <EmptyState title="No customers in this filter">Try another channel or segment, or reset the filters.</EmptyState>;

  return (
    <>
      <div className={s.grid3}>
        <BucketChart title="Orders per customer" subtitle={`${formatNumber(ps.length)} customers`} buckets={freq} total={ps.length} color={SERIES[0]} />
        <BucketChart
          title="Days between orders"
          subtitle={`${formatNumber(gs.length)} reorders`}
          buckets={gap}
          total={gs.length}
          color={SERIES[2]}
          note={med === null ? "Nobody in this filter has reordered yet." : `Median gap: ${formatDays(med)}. The replenishment reminder is timed from this.`}
        />
        <BucketChart title="Days since last order" subtitle="Recency, as of the last day of data" buckets={rec} total={ps.length} color={SERIES[3]} />
      </div>

      <ChartFrame
        title="Segment movement over the last 90 days"
        subtitle="Rows: where these customers were 90 days ago. Columns: where they are today."
        table={
          <DataTable
            caption="Segment movement"
            rowKey={(r) => String(r.from)}
            rows={flow.from.map((f, i) => ({ from: f, ...Object.fromEntries(flow.to.map((t, j) => [t, flow.counts[i][j]])) }))}
            columns={[{ key: "from", label: "90 days ago", sortable: false }, ...flow.to.map((t) => ({ key: t, label: t, align: "right" as const, sortable: false, render: (r: Record<string, unknown>) => formatNumber(r[t] as number) }))]}
          />
        }
      >
        <Heatmap ariaLabel="Customers by segment 90 days ago (rows) and today (columns)" rows={flow.from} cols={flow.to} values={flow.counts.map((row) => row.map((n) => (n ? n : null)))} format={(n) => formatNumber(n, { compact: n >= 10000 })} />
        <p className={s.note}>
          The diagonal is customers who stayed put. Read the Loyal and High-value rows for leaks: anything in their At-risk column is a regular who has stopped reordering. Empty cells mean no
          customers made that move.
        </p>
      </ChartFrame>

      <div className={s.grid2}>
        <div className={s.card}>
          <h3 className={s.cardTitle}>Repeat rate by first product</h3>
          <DataTable caption="Repeat rate by the product of the first order" rowKey={(r) => r.id} rows={product} initialSort={{ key: "rate", dir: "desc" }} columns={repeatColumns("First product")} />
          <p className={s.note} style={{ marginTop: "0.6rem" }}>
            Repeat rate counts customers acquired 90+ days ago; first-year revenue, customers acquired a year+ ago. A dash means fewer than 30 customers.
          </p>
        </div>
        <div className={s.card}>
          <h3 className={s.cardTitle}>Repeat rate by acquisition channel</h3>
          <DataTable caption="Repeat rate by acquisition channel" rowKey={(r) => r.id} rows={channel} initialSort={{ key: "rate", dir: "desc" }} columns={repeatColumns("Channel")} />
          <p className={s.note} style={{ marginTop: "0.6rem" }}>
            The cheapest channel to acquire on isn&rsquo;t always the cheapest per returning customer.
          </p>
        </div>
      </div>
    </>
  );
}
