"use client";

import { useId, useState } from "react";
import { PRESETS, PRESET_MDE, PRESET_PLANNED, analyse, formatP, presetResults, type Results } from "@/lab/cro/experiment";
import { pageOf } from "@/lab/cro/model";
import { isNum } from "@/lab/shared/lib/safe-math";
import { formatNumber, formatPercent, formatPoints } from "@/lab/shared/lib/format";
import { SERIES } from "@/lab/shared/lib/palette";
import { ChartFrame } from "@/lab/shared/charts/chart-frame";
import { Segmented } from "@/lab/shared/ui/controls";
import { DataTable } from "@/lab/shared/ui/data-table";
import { InsightCard } from "@/lab/shared/ui/insight-card";
import { MetricTile } from "@/lab/shared/ui/metric-tile";
import { EmptyState } from "@/lab/shared/ui/notices";
import { track } from "@/lib/track";
import s from "@/lab/shared/ui/lab.module.css";
import x from "./cro.module.css";
import { IntervalChart } from "./interval-chart";
import type { PlanHandoff } from "./shared";

type Source = (typeof PRESETS)[number]["id"] | "custom";

const FIELDS: { key: keyof Results; label: string; hint?: string; percent?: boolean }[] = [
  { key: "visitorsA", label: "A · visitors" },
  { key: "convA", label: "A · conversions" },
  { key: "visitorsB", label: "B · visitors" },
  { key: "convB", label: "B · conversions" },
  { key: "daysRun", label: "Days run" },
  { key: "planned", label: "Planned per variant", hint: "from the builder" },
  { key: "mde", label: "Planned MDE (%)", hint: "relative lift", percent: true },
];

function customFrom(plan: PlanHandoff | null, prev: Results): Results {
  if (!plan) return prev;
  return { ...prev, planned: plan.planned, mde: plan.mde, alpha: plan.alpha };
}

export function Analysis({ plan }: { plan: PlanHandoff | null }) {
  const [source, setSource] = useState<Source>(plan ? "custom" : "winner");
  const [custom, setCustom] = useState<Results>(() => customFrom(plan, { ...presetResults(PRESETS[1]) }));
  const id = useId();
  const preset = PRESETS.find((p) => p.id === source);
  const res = preset ? presetResults(preset) : custom;
  const out = analyse(res);

  const choose = (v: Source) => {
    setSource(v);
    if (v === "custom") setCustom((c) => customFrom(plan, c));
    track("lab_cro_preset", v);
  };
  const edit = (k: keyof Results, raw: string, percent?: boolean) => {
    const n = raw.trim() === "" ? NaN : Number(raw);
    const base = preset ? presetResults(preset) : custom;
    setCustom({ ...base, [k]: percent ? n / 100 : n });
    setSource("custom");
  };

  return (
    <>
      <div className={s.card}>
        <h3 className={s.cardTitle}>The results</h3>
        <Segmented
          label="Example"
          value={source}
          onChange={choose}
          options={[...PRESETS.map((p) => ({ value: p.id as Source, label: p.label })), { value: "custom" as Source, label: "Your numbers" }]}
        />
        <p className={s.note} style={{ marginTop: "0.6rem" }}>
          {preset
            ? `${preset.story} Planned for a 4% baseline and a +${formatPercent(PRESET_MDE, { dp: 0 })} lift at 95% confidence and 80% power: ${formatNumber(PRESET_PLANNED)} visitors per variant.`
            : plan
              ? `Planned in the builder for ${pageOf(plan.page).label}: ${formatNumber(plan.planned)} visitors per variant to detect +${formatPercent(plan.mde, { dp: 0 })} on a ${formatPercent(plan.baseline, { dp: 2 })} baseline. Enter what the test has collected.`
              : "Enter what your test collected. Plan it in the Experiment builder first to fill in the planned sample."}
        </p>
        <div className={x.numbers} style={{ marginTop: "0.9rem" }}>
          {FIELDS.map((f) => {
            const v = res[f.key];
            const shown = isNum(v) ? (f.percent ? Math.round(v * 1000) / 10 : v) : "";
            return (
              <div key={f.key} className={s.field}>
                <label htmlFor={`${id}-${f.key}`} className={s.fieldLabel}>
                  {f.label}
                </label>
                <input id={`${id}-${f.key}`} className={x.input} type="number" inputMode="numeric" min={0} step={f.percent ? 1 : 1} value={shown} onChange={(e) => edit(f.key, e.target.value, f.percent)} />
                {f.hint && <span className={x.fieldHint}>{f.hint}</span>}
              </div>
            );
          })}
        </div>
        <p className={s.note} style={{ marginTop: "0.6rem" }}>Editing any number switches to &ldquo;Your numbers&rdquo;. The split is assumed to be 50/50; confidence is {formatPercent(1 - res.alpha, { dp: 0 })}.</p>
      </div>

      {"error" in out ? (
        <EmptyState title="These numbers can't be analysed">{out.error}</EmptyState>
      ) : (
        <>
          <InsightCard
            finding={{
              id: "verdict",
              status: out.status,
              title: out.headline,
              summary: out.body,
              evidence: [
                { label: "A conversion", value: formatPercent(out.test.rateA, { dp: 2 }), context: `${formatNumber(res.convA)} of ${formatNumber(res.visitorsA)}` },
                { label: "B conversion", value: formatPercent(out.test.rateB, { dp: 2 }), context: `${formatNumber(res.convB)} of ${formatNumber(res.visitorsB)}` },
                { label: "z", value: out.test.z.toFixed(2) },
                { label: "p-value", value: formatP(out.test.pValue) },
                { label: "Sample-ratio check", value: `p = ${formatP(out.srmP)}` },
                { label: "Power for the planned MDE", value: formatPercent(out.powerReached, { dp: 0 }) },
              ],
              rule: "Checks run in order: traffic split, planned sample and a full week, then significance, then power. A winner is only called when every earlier check passes.",
            }}
          />

          <div className={s.tiles}>
            <MetricTile label="A · control" value={formatPercent(out.test.rateA, { dp: 2 })} hint={`${formatPercent(out.ciA.low, { dp: 2 })}–${formatPercent(out.ciA.high, { dp: 2 })}`} />
            <MetricTile label="B · variation" value={formatPercent(out.test.rateB, { dp: 2 })} hint={`${formatPercent(out.ciB.low, { dp: 2 })}–${formatPercent(out.ciB.high, { dp: 2 })}`} />
            <MetricTile label="Relative uplift" value={formatPercent(out.test.relativeLift, { signed: true })} />
            <MetricTile label="Absolute difference" value={formatPoints(out.test.absoluteLift, 2)} hint={`${formatPoints(out.test.diffInterval.low, 2)} to ${formatPoints(out.test.diffInterval.high, 2)}`} />
            <MetricTile label="p-value" value={formatP(out.test.pValue)} hint={`needs < ${res.alpha}`} />
            <MetricTile label="Power reached" value={formatPercent(out.powerReached, { dp: 0 })} hint="80% is the usual bar" />
          </div>

          <div className={s.grid2}>
            <div className={x.stack}>
              <ChartFrame
                title="Conversion rate with its likely range"
                subtitle={`Wilson ${formatPercent(1 - res.alpha, { dp: 0 })} intervals: where each true rate probably lies`}
                table={<RatesTable rows={[["A · control", out.test.rateA, out.ciA.low, out.ciA.high], ["B · variation", out.test.rateB, out.ciB.low, out.ciB.high]]} />}
              >
                <IntervalChart
                  ariaLabel="Conversion rate of A and B with confidence intervals"
                  format={(v) => formatPercent(v, { dp: 2 })}
                  rows={[
                    { id: "a", label: "A · control", mid: out.test.rateA, low: out.ciA.low, high: out.ciA.high, color: SERIES[6] },
                    { id: "b", label: "B · variation", mid: out.test.rateB, low: out.ciB.low, high: out.ciB.high, color: SERIES[0] },
                  ]}
                />
              </ChartFrame>
              <ChartFrame
                title="Difference, B minus A"
                subtitle="If the range crosses the zero line, “no difference” is still plausible"
                table={<RatesTable points rows={[["B − A", out.test.absoluteLift, out.test.diffInterval.low, out.test.diffInterval.high]]} />}
              >
                <IntervalChart
                  zero
                  ariaLabel="Difference between B and A with confidence interval"
                  format={(v) => formatPoints(v, 1)}
                  rows={[{ id: "d", label: "B − A", mid: out.test.absoluteLift, low: out.test.diffInterval.low, high: out.test.diffInterval.high, color: out.test.diffInterval.low > 0 ? SERIES[5] : out.test.diffInterval.high < 0 ? SERIES[7] : SERIES[3] }]}
                />
              </ChartFrame>
            </div>

            <div className={s.card}>
              <h3 className={s.cardTitle}>Before you believe it</h3>
              <ul className={x.checks}>
                {out.checks.map((c) => (
                  <li key={c.id}>
                    <span className={c.ok ? x.pass : x.fail} aria-hidden="true">
                      {c.ok ? "✓" : "✗"}
                    </span>
                    <span>
                      <strong>{c.label}</strong> <span className="sr-only">{c.ok ? "passed" : "failed"}</span>
                    </span>
                    <p>{c.detail}</p>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </>
      )}
    </>
  );
}

function RatesTable({ rows, points }: { rows: [string, number, number, number][]; points?: boolean }) {
  const f = (v: number) => (points ? formatPoints(v, 2) : formatPercent(v, { dp: 2 }));
  return (
    <DataTable
      caption="Estimates and intervals"
      rowKey={(r) => r.label}
      rows={rows.map(([label, mid, low, high]) => ({ label, mid, low, high }))}
      columns={[
        { key: "label", label: "", sortable: false },
        { key: "mid", label: "Estimate", align: "right", sortable: false, render: (r) => f(r.mid) },
        { key: "low", label: "Low", align: "right", sortable: false, render: (r) => f(r.low) },
        { key: "high", label: "High", align: "right", sortable: false, render: (r) => f(r.high) },
      ]}
    />
  );
}
