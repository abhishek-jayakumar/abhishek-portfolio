"use client";

import { useMemo } from "react";
import { F_ORDERS, M_SPEND, R_DAYS, SEGMENTS, rfmGrid, segmentSummary, select } from "@/lab/lifecycle/metrics";
import { formatNumber, formatPercent } from "@/lab/shared/lib/format";
import { BarChart } from "@/lab/shared/charts/bar-chart";
import { ChartFrame } from "@/lab/shared/charts/chart-frame";
import { Heatmap } from "@/lab/shared/charts/heatmap";
import { DataTable } from "@/lab/shared/ui/data-table";
import { EmptyState } from "@/lab/shared/ui/notices";
import s from "@/lab/shared/ui/lab.module.css";
import l from "./lifecycle.module.css";
import { SEGMENT_COLOR, inr, type ModuleProps } from "./shared";

export function Segments({ data, filter, onSegment }: ModuleProps) {
  const rows = useMemo(() => segmentSummary(data, filter.channel), [data, filter.channel]);
  const ps = useMemo(() => select(data, filter), [data, filter]);
  const grid = useMemo(() => rfmGrid(ps), [ps]);
  const total = rows.reduce((a, r) => a + r.customers, 0);

  if (!total) return <EmptyState title="No customers in this filter">Pick another acquisition channel.</EmptyState>;

  return (
    <>
      <div className={l.segGrid}>
        {rows.map((r) => {
          const sg = SEGMENTS.find((x) => x.id === r.id);
          const on = filter.segment === r.id;
          return (
            <button
              key={r.id}
              type="button"
              className={l.segCard}
              style={{ ["--seg" as string]: SEGMENT_COLOR[r.id] }}
              aria-pressed={on}
              onClick={() => onSegment(on ? "all" : r.id)}
            >
              <span className={l.segName}>
                {r.label}
                {on && <span className={l.selected}>Filtering</span>}
              </span>
              <span className={l.segCount}>{formatNumber(r.customers)}</span>
              <span className={l.segMeta}>
                {formatPercent(r.share)} of customers · {inr(r.revenue12, true)} in the last 12 months
              </span>
              <span className={l.segRule}>{sg?.short}</span>
            </button>
          );
        })}
      </div>
      <p className={s.note}>Click a card to filter every module to that segment; click it again to clear. {filter.segment !== "all" && "The cards always show every segment so you can compare."}</p>

      <div className={s.grid2}>
        <ChartFrame
          title="Revenue in the last 12 months, by segment"
          subtitle="Today's segment; revenue from all of that customer's orders in the last 365 days"
          table={
            <DataTable
              caption="Segments"
              rowKey={(r) => r.id}
              rows={rows}
              initialSort={{ key: "revenue12", dir: "desc" }}
              columns={[
                { key: "label", label: "Segment" },
                { key: "customers", label: "Customers", align: "right", render: (r) => formatNumber(r.customers) },
                { key: "revenue12", label: "Revenue 12 mo", align: "right", render: (r) => inr(r.revenue12) },
                { key: "avgSpend", label: "Avg lifetime spend", align: "right", render: (r) => inr(r.avgSpend) },
                { key: "avgOrders", label: "Avg orders", align: "right", render: (r) => formatNumber(r.avgOrders, { dp: 1 }) },
                { key: "avgRecency", label: "Avg days since order", align: "right", render: (r) => formatNumber(r.avgRecency) },
              ]}
            />
          }
        >
          <BarChart
            ariaLabel="Revenue in the last 12 months by segment"
            bars={rows.map((r) => ({
              id: r.id,
              label: r.label,
              value: r.revenue12,
              color: SEGMENT_COLOR[r.id],
              detail: [
                { label: "customers", value: formatNumber(r.customers) },
                { label: "avg lifetime spend", value: inr(r.avgSpend) },
              ],
            }))}
            format={(v) => inr(v, true)}
            highlight={filter.segment === "all" ? undefined : filter.segment}
          />
        </ChartFrame>

        <ChartFrame
          title="Customers on the recency × frequency grid"
          subtitle={`${formatNumber(ps.length)} customers in the current filter; darker = more customers`}
          table={
            <DataTable
              caption="Customers by R and F score"
              rowKey={(r) => String(r.r)}
              rows={grid.map((row, i) => ({ r: `R${5 - i}`, ...Object.fromEntries(row.map((v, j) => [`f${j + 1}`, v])) }))}
              columns={[{ key: "r", label: "Recency", sortable: false }, ...[1, 2, 3, 4, 5].map((f) => ({ key: `f${f}`, label: `F${f}`, align: "right" as const, sortable: false, render: (r: Record<string, unknown>) => formatNumber(r[`f${f}`] as number) }))]}
            />
          }
        >
          <Heatmap
            ariaLabel="Customers by recency score (rows) and frequency score (columns)"
            rows={["R5 · ≤30d", "R4 · ≤60d", "R3 · ≤90d", "R2 · ≤180d", "R1 · 180d+"]}
            cols={["F1", "F2", "F3", "F4", "F5"]}
            values={grid}
            format={(v) => formatNumber(v, { compact: v >= 10000 })}
          />
          <p className={s.note}>Top-right is where you want customers: recent and frequent. The bottom-left corner is one-time buyers who have gone quiet.</p>
        </ChartFrame>
      </div>

      <div className={s.card}>
        <h3 className={s.cardTitle}>How the segments are scored</h3>
        <p className={s.note}>
          RFM gives every customer three scores from 1 to 5, using only their own orders: Recency (days since the last order), Frequency (number of orders) and Monetary
          (total spent). The segment rules are then applied in order, and a customer takes the first one that matches.
        </p>
        <dl className={s.formulas}>
          <div>
            <dt>Recency score</dt>
            <dd>5: ≤{R_DAYS[0]} days · 4: ≤{R_DAYS[1]} · 3: ≤{R_DAYS[2]} · 2: ≤{R_DAYS[3]} · 1: more than {R_DAYS[3]} days</dd>
          </div>
          <div>
            <dt>Frequency score</dt>
            <dd>1: {F_ORDERS[0]} order · 2: {F_ORDERS[1]} · 3: 3–{F_ORDERS[2]} · 4: 5–{F_ORDERS[3]} · 5: 8 or more</dd>
          </div>
          <div>
            <dt>Monetary score</dt>
            <dd>
              1: under {inr(M_SPEND[0])} · 2: under {inr(M_SPEND[1])} · 3: under {inr(M_SPEND[2])} · 4: under {inr(M_SPEND[3])} · 5: {inr(M_SPEND[3])} or more
            </dd>
          </div>
          {SEGMENTS.map((sg, i) => (
            <div key={sg.id}>
              <dt>
                {i + 1}. {sg.label}
              </dt>
              <dd>
                {sg.rule}: {sg.short}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </>
  );
}
