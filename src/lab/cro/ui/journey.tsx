"use client";

import { useMemo } from "react";
import type { Fix } from "@/lab/cro/insights";
import { journey } from "@/lab/cro/metrics";
import { STAGES, STEPS, pageOf, type PageId } from "@/lab/cro/model";
import { isNum } from "@/lab/shared/lib/safe-math";
import { formatNumber, formatPercent } from "@/lab/shared/lib/format";
import { ChartFrame } from "@/lab/shared/charts/chart-frame";
import { FunnelChart } from "@/lab/shared/charts/funnel-chart";
import { SelectField } from "@/lab/shared/ui/controls";
import { DataTable } from "@/lab/shared/ui/data-table";
import { MetricTile } from "@/lab/shared/ui/metric-tile";
import { EmptyState } from "@/lab/shared/ui/notices";
import s from "@/lab/shared/ui/lab.module.css";
import x from "./cro.module.css";
import { PAGE_OPTIONS, type ModuleProps } from "./shared";

export function Journey({ data, filter, page, onPage, fixes, onTest }: ModuleProps & { page: PageId; onPage: (p: PageId) => void; fixes: Fix[]; onTest: (fix: Fix) => void }) {
  const j = useMemo(() => journey(data, filter, page), [data, filter, page]);
  const p = pageOf(page);
  const [v, , , , submit, qualified] = j.counts.stages;
  const worst = j.worst === null ? null : j.steps[j.worst];
  // The assistant's best fix for this page: the flagged step's if it has one, otherwise the page's top fix.
  const fix = fixes.find((f) => f.page === page && f.step === j.worst) ?? fixes.find((f) => f.page === page) ?? null;

  return (
    <>
      <div className={x.row}>
        <SelectField label="Landing page" value={page} onChange={onPage} options={PAGE_OPTIONS} />
        <p className={s.note}>
          {p.path} · headline &ldquo;{p.headline}&rdquo; · CTA &ldquo;{p.cta}&rdquo; · {p.fields}-field form
        </p>
      </div>

      {!v ? (
        <EmptyState title="No visitors on this page in this filter">Try All devices or All sources.</EmptyState>
      ) : (
        <>
          <div className={s.tiles}>
            <MetricTile label="Visitors" hint="4 weeks" value={formatNumber(v)} />
            <MetricTile label="Form submissions" value={formatNumber(submit)} hint={formatPercent(submit / v, { dp: 2 })} />
            <MetricTile label="Qualified leads" value={formatNumber(qualified)} hint={formatPercent(qualified / v, { dp: 2 })} />
            <MetricTile label="Average scroll depth" value={formatPercent(j.counts.scrollSum / v, { dp: 0 })} />
          </div>

          <div className={s.grid2}>
            <ChartFrame
              title={`${p.label}: from visit to qualified lead`}
              subtitle={worst ? "Flagged: the step furthest below the site median" : "No step is more than 10% below the site median"}
              table={
                <DataTable
                  caption="Journey counts"
                  rowKey={(r) => String(r.stage)}
                  columns={[
                    { key: "stage", label: "Stage", sortable: false },
                    { key: "count", label: "People", align: "right", sortable: false, render: (r) => formatNumber(r.count as number) },
                  ]}
                  rows={STAGES.map((st, i) => ({ stage: st.label, count: j.counts.stages[i] }))}
                />
              }
            >
              <FunnelChart ariaLabel={`Conversion journey for ${p.label}`} stages={STAGES.map((st, i) => ({ id: st.id, label: st.short, value: j.counts.stages[i] }))} flag={j.worst === null ? undefined : j.worst + 1} />
            </ChartFrame>

            <div className={s.card}>
              <h3 className={s.cardTitle}>The biggest drop-off</h3>
              {worst ? (
                <div className={x.stack}>
                  <p>
                    <strong>{STEPS[worst.index]}</strong>: {formatPercent(worst.rate)} get through, against a site median of {formatPercent(worst.median)} ({formatPercent(worst.gap, { dp: 0 })} below).
                  </p>
                  <MetricTile label="Qualified leads recovered at the median" hint="over 4 weeks, later steps unchanged" value={formatNumber(worst.recovered, { dp: 0 })} />
                  {fix && (
                    <div className={x.actions}>
                      <button type="button" className={s.btn} onClick={() => onTest(fix)}>
                        Build a test for this
                      </button>
                      <span className={s.note}>Opens the experiment builder with a hypothesis drafted from these numbers.</span>
                    </div>
                  )}
                </div>
              ) : (
                <p className={s.note}>Every step on this page is within 10% of the site median or better. Look at the device split below for a narrower problem.</p>
              )}
              <p className={s.note} style={{ marginTop: "0.8rem" }}>
                The benchmark is the median of the six pages for each step, so one very large page can&rsquo;t set it. Steps with fewer than 100 people entering aren&rsquo;t judged.
              </p>
            </div>
          </div>

          <div className={s.card}>
            <h3 className={s.cardTitle}>Step by step against the site</h3>
            <DataTable
              caption="Step conversion against the site median"
              rowKey={(r) => r.step}
              rows={j.steps}
              columns={[
                { key: "step", label: "Step", sortable: false, render: (r) => (r.index === j.worst ? <strong>▼ {r.step}</strong> : r.step) },
                { key: "entered", label: "Entered", align: "right", render: (r) => formatNumber(r.entered) },
                { key: "rate", label: "This page", align: "right", render: (r) => formatPercent(r.rate) },
                { key: "median", label: "Site median", align: "right", render: (r) => formatPercent(r.median) },
                { key: "gap", label: "Below median", align: "right", render: (r) => (isNum(r.gap) ? (r.gap > 0 ? formatPercent(r.gap, { dp: 0 }) : "at or above") : "—") },
                { key: "recovered", label: "Leads recovered", align: "right", render: (r) => formatNumber(r.recovered, { dp: 0 }) },
              ]}
            />
          </div>

          <div className={s.card}>
            <h3 className={s.cardTitle}>The same journey by device</h3>
            <DataTable
              caption="Step conversion by device"
              rowKey={(r) => r.id}
              rows={j.devices.map((d) => ({ id: d.id, label: d.label, visitors: d.counts.stages[0], r0: d.rates[0], r1: d.rates[1], r2: d.rates[2], r3: d.rates[3], r4: d.rates[4], conversion: d.conversion, scroll: d.scroll }))}
              initialSort={{ key: "visitors", dir: "desc" }}
              columns={[
                { key: "label", label: "Device" },
                { key: "visitors", label: "Visitors", align: "right", render: (r) => formatNumber(r.visitors) },
                ...STEPS.map((st, i) => ({ key: `r${i}`, label: st.replace("Form start", "Start").replace("CTA click", "CTA"), align: "right" as const, render: (r: Record<string, unknown>) => formatPercent(r[`r${i}`] as number | null) })),
                { key: "conversion", label: "Conversion", align: "right", render: (r) => formatPercent(r.conversion, { dp: 2 }) },
                { key: "scroll", label: "Scroll", align: "right", render: (r) => formatPercent(r.scroll, { dp: 0 }) },
              ]}
            />
            <p className={s.note} style={{ marginTop: "0.6rem" }}>
              A dash means fewer than 100 people on that device entered the step. Mobile loads this page&rsquo;s main content in {p.mobileLcp} s (good is under 2.5 s).
            </p>
          </div>
        </>
      )}
    </>
  );
}
