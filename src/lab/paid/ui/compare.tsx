"use client";

import { useMemo, useState } from "react";
import { platformLabel, type Account } from "@/lab/paid/model";
import { DIMENSIONS, breakdown, hasDimension, periods, rates, scope, totals, type BreakdownRow, type Dimension, type Filter } from "@/lab/paid/metrics";
import { isNum, ratio } from "@/lab/shared/lib/safe-math";
import { formatMultiple, formatPercent } from "@/lab/shared/lib/format";
import { SERIES } from "@/lab/shared/lib/palette";
import { BarChart } from "@/lab/shared/charts/bar-chart";
import { ChartFrame } from "@/lab/shared/charts/chart-frame";
import { Segmented, SelectField } from "@/lab/shared/ui/controls";
import { DataTable, type Column } from "@/lab/shared/ui/data-table";
import { EmptyState } from "@/lab/shared/ui/notices";
import s from "@/lab/shared/ui/lab.module.css";
import { PLATFORM_COLOR, available, hasFields, metric, valueOf, type MetricKey } from "./shared";

type Props = { account: Account; filter: Filter };
type Row = BreakdownRow & { spendShare: number | null; leadShare: number | null; index: number | null };

const CHOICES: MetricKey[] = ["cpl", "cpa", "roas", "ctr", "cpc", "cpm", "cvr", "qualRate", "spend", "leads", "frequency"];

export function Compare({ account, filter }: Props) {
  const [dim, setDim] = useState<Dimension>("platform");
  const [key, setKey] = useState<MetricKey>("cpl");

  const view = useMemo(() => {
    const per = periods(account.rows, filter.range);
    const cur = scope(account.rows, filter, per?.current ?? null);
    const t = totals(cur);
    return { cur, t, blended: { ...t, ...rates(t) } };
  }, [account, filter]);

  const dims = DIMENSIONS.filter((d) => hasDimension(view.cur, d.value));
  const d = dims.some((x) => x.value === dim) ? dim : "platform";
  const has = hasFields(view.t);
  const m = metric(available(metric(key), has) ? key : "cpl");

  const rows = useMemo<Row[]>(() => {
    const b = breakdown(view.cur, d);
    return b.map((r) => {
      const spendShare = ratio(r.spend, view.t.spend);
      const leadShare = ratio(r.leads, view.t.leads);
      return { ...r, spendShare, leadShare, index: ratio(leadShare, spendShare) };
    });
  }, [view, d]);

  if (!view.cur.length) return <EmptyState title="No rows in this selection">Choose a longer date range or All platforms.</EmptyState>;

  const colour = (r: BreakdownRow) => ((d === "platform" || d === "campaign") && r.platform ? PLATFORM_COLOR[r.platform] : SERIES[0]);
  const lowerIsBetter = m.upIsGood === false;
  const ranked = [...rows].sort((a, b) => {
    const va = valueOf(a, m.key);
    const vb = valueOf(b, m.key);
    if (!isNum(va)) return 1;
    if (!isNum(vb)) return -1;
    return lowerIsBetter ? va - vb : vb - va;
  });
  const reference = valueOf(view.blended, m.key);
  const isRate = !["spend", "leads"].includes(m.key);
  const dimLabel = DIMENSIONS.find((x) => x.value === d)?.label ?? "";

  const cols: Column<Row>[] = [
    { key: "label", label: dimLabel, render: (r) => r.label },
    ...(d === "campaign" ? [{ key: "platform", label: "Platform", render: (r: Row) => (r.platform ? platformLabel(r.platform) : "—"), sortValue: (r: Row) => r.platform } as Column<Row>] : []),
    { key: "spendShare", label: "% spend", align: "right", render: (r) => formatPercent(r.spendShare, { dp: 0 }) },
    { key: "leadShare", label: "% leads", align: "right", render: (r) => formatPercent(r.leadShare, { dp: 0 }) },
    { key: "index", label: "Lead index", align: "right", render: (r) => formatMultiple(r.index, 2) },
    ...(["cpl", "cpa", "roas", "ctr", "cpm", "cvr", "qualRate"] as MetricKey[])
      .map(metric)
      .filter((x) => available(x, has))
      .map((x) => ({ key: x.key, label: x.label, align: "right" as const, render: (r: Row) => { const v = valueOf(r, x.key); return isNum(v) ? x.fmt(v) : "—"; }, sortValue: (r: Row) => valueOf(r, x.key) })),
  ];

  return (
    <>
      <div className={s.filterBar} role="group" aria-label="What to compare">
        <Segmented label="Compare by" value={d} onChange={setDim} options={dims.map((x) => ({ value: x.value, label: x.label }))} />
        <SelectField label="Metric" value={m.key} onChange={setKey} options={CHOICES.map(metric).filter((x) => available(x, has)).map((x) => ({ value: x.key, label: `${x.label} · ${x.long}` }))} />
      </div>
      {dims.length < DIMENSIONS.length && <p className={s.note}>This data has no {DIMENSIONS.filter((x) => !dims.includes(x)).map((x) => x.label.toLowerCase()).join(" or ")} column, so it can&rsquo;t be compared that way.</p>}

      <ChartFrame
        title={`${m.long} by ${dimLabel.toLowerCase()}`}
        subtitle={`${m.formula}. Ranked ${lowerIsBetter ? "lowest" : "highest"} first${isRate && isNum(reference) ? "; the line is the whole selection" : ""}.`}
        legend={d === "campaign" ? [...new Set(rows.map((r) => r.platform))].filter((x) => x !== null).map((x) => ({ label: platformLabel(x), color: PLATFORM_COLOR[x], shape: "rect" as const })) : undefined}
        table={
          <DataTable
            caption={`${m.long} by ${dimLabel}`}
            rowKey={(r) => r.key}
            rows={ranked}
            columns={[
              { key: "label", label: dimLabel, sortable: false, render: (r) => r.label },
              { key: m.key, label: m.label, align: "right", sortable: false, render: (r) => { const v = valueOf(r, m.key); return isNum(v) ? m.fmt(v) : "—"; } },
            ]}
          />
        }
      >
        <BarChart
          ariaLabel={`${m.long} by ${dimLabel}`}
          bars={ranked.map((r) => ({
            id: r.key,
            label: r.label,
            value: valueOf(r, m.key),
            color: colour(r),
            detail: [
              { label: "spend", value: metric("spend").fmt(r.spend) },
              { label: "leads", value: metric("leads").fmt(r.leads) },
            ],
          }))}
          format={m.fmt}
          referenceValue={isRate ? reference : null}
          referenceLabel="All"
        />
      </ChartFrame>

      <div className={s.card}>
        <h3 className={s.cardTitle}>Share of spend against share of leads</h3>
        <p className={s.note}>
          The lead index is share of leads ÷ share of spend. Above 1.0, a {dimLabel.toLowerCase()} brings more than its share of leads for its money; below 1.0, less. It says nothing about
          lead quality{has.qualified ? ", so read it next to the qualified rate and CPA" : ""}.
        </p>
        <DataTable caption={`Spend and lead share by ${dimLabel}`} rowKey={(r) => r.key} rows={rows} columns={cols} initialSort={{ key: "spendShare", dir: "desc" }} />
      </div>
    </>
  );
}
