"use client";

import { useId, useMemo, useState } from "react";
import { EMPTY_HYPOTHESIS, MAX_DAYS, detectableIn, hypothesisText, missingParts, plan, type Hypothesis } from "@/lab/cro/experiment";
import { TEST_METRICS, baselineFor, type TestMetric } from "@/lab/cro/metrics";
import { pageOf, type PageId } from "@/lab/cro/model";
import { formatDays, formatNumber, formatPercent } from "@/lab/shared/lib/format";
import { RangeField, Segmented, SelectField } from "@/lab/shared/ui/controls";
import { MetricTile } from "@/lab/shared/ui/metric-tile";
import { EmptyState, SimulationNote } from "@/lab/shared/ui/notices";
import { track } from "@/lib/track";
import s from "@/lab/shared/ui/lab.module.css";
import x from "./cro.module.css";
import { PAGE_OPTIONS, type Draft, type ModuleProps, type PlanHandoff } from "./shared";

const PARTS: { key: keyof Hypothesis; label: string; hint: string; long?: boolean }[] = [
  { key: "observation", label: "Because we saw…", hint: "The evidence: a number from the journey or the assistant.", long: true },
  { key: "change", label: "we believe…", hint: "The single change you will make.", long: true },
  { key: "audience", label: "for…", hint: "Which visitors see it (device, source, new or returning)." },
  { key: "metric", label: "will increase…", hint: "The one primary metric that decides the test." },
];

/**
 * The experiment builder. It starts from a draft (from the journey or the assistant) or empty; the
 * parent remounts it with a new key when a new draft arrives, so it never fights the visitor's edits.
 */
export function Builder({ data, filter, draft, page: startPage, onPlan }: ModuleProps & { draft: Draft | null; page: PageId; onPlan: (p: PlanHandoff) => void }) {
  const [page, setPage] = useState<PageId>(draft?.page ?? startPage);
  const [metric, setMetric] = useState<TestMetric>(draft?.metric ?? "conversion");
  const [h, setH] = useState<Hypothesis>(draft?.hypothesis ?? EMPTY_HYPOTHESIS);
  const [mde, setMde] = useState(0.15);
  const [share, setShare] = useState(1);
  const [alpha, setAlpha] = useState<"0.1" | "0.05" | "0.01">("0.05");
  const [power, setPower] = useState<"0.8" | "0.9">("0.8");
  const [sent, setSent] = useState(false);
  const id = useId();

  const base = useMemo(() => baselineFor(data, filter, page, metric), [data, filter, page, metric]);
  const input = { baseline: base.rate, mde, alpha: Number(alpha), power: Number(power), daily: base.daily, share };
  const result = plan(input);
  const fastest = result?.tooLong ? detectableIn({ baseline: base.rate, alpha: Number(alpha), power: Number(power), daily: base.daily, share }) : null;
  const missing = missingParts(h);
  const p = pageOf(page);
  const set = (k: keyof Hypothesis, v: string) => {
    setH((cur) => ({ ...cur, [k]: v }));
    setSent(false);
  };

  return (
    <>
      <div className={s.card}>
        <h3 className={s.cardTitle}>1. The hypothesis</h3>
        <p className={s.note}>
          {draft ? "Drafted from the numbers; edit any part." : "Write each part, or use “Build a test for this” in Conversion journey or CRO assistant to start from the data."} A good hypothesis names the evidence, one change, who sees it and the one metric that decides it.
        </p>
        <div className={s.grid2} style={{ marginTop: "0.8rem" }}>
          {PARTS.map((part) => (
            <div key={part.key} className={s.field}>
              <label htmlFor={`${id}-${part.key}`} className={s.fieldLabel}>
                {part.label}
              </label>
              {part.long ? (
                <textarea id={`${id}-${part.key}`} className={x.textarea} value={h[part.key]} onChange={(e) => set(part.key, e.target.value)} />
              ) : (
                <input id={`${id}-${part.key}`} className={x.input} value={h[part.key]} onChange={(e) => set(part.key, e.target.value)} />
              )}
              <span className={x.fieldHint}>{part.hint}</span>
            </div>
          ))}
        </div>
        <blockquote className={x.hypothesis} style={{ marginTop: "1rem" }} aria-live="polite">
          {hypothesisText(h)}
        </blockquote>
        {missing.length > 0 && <p className={s.note} style={{ marginTop: "0.5rem" }}>Still to fill in: {missing.join(", ")}.</p>}
      </div>

      <div className={s.card}>
        <h3 className={s.cardTitle}>2. Control and variation</h3>
        <div className={x.versus}>
          {(["control", "variation"] as const).map((k) => (
            <div key={k} className={s.field}>
              <label htmlFor={`${id}-${k}`} className={s.fieldLabel}>
                {k === "control" ? "A · Control (what runs today)" : "B · Variation (the one change)"}
              </label>
              <textarea id={`${id}-${k}`} className={x.textarea} value={h[k]} onChange={(e) => set(k, e.target.value)} placeholder={k === "control" ? `${p.label}: “${p.headline}”, CTA “${p.cta}”` : "Describe exactly what changes"} />
            </div>
          ))}
        </div>
      </div>

      <div className={s.card}>
        <h3 className={s.cardTitle}>3. Metric, audience and size</h3>
        <div className={x.row}>
          <SelectField label="Page" value={page} onChange={(v) => { setPage(v); setSent(false); }} options={PAGE_OPTIONS} />
          <SelectField label="Primary metric" value={metric} onChange={(v) => { setMetric(v); setSent(false); }} options={TEST_METRICS.map((m) => ({ value: m.value, label: m.label }))} />
          <Segmented label="Confidence" value={alpha} onChange={setAlpha} options={[{ value: "0.1", label: "90%" }, { value: "0.05", label: "95%" }, { value: "0.01", label: "99%" }]} />
          <Segmented label="Power" value={power} onChange={setPower} options={[{ value: "0.8", label: "80%" }, { value: "0.9", label: "90%" }]} />
        </div>
        <div className={s.grid2} style={{ marginTop: "1rem" }}>
          <RangeField label="Minimum detectable effect" value={mde} min={0.05} max={0.5} step={0.01} onChange={(v) => { setMde(v); setSent(false); }} format={(v) => `+${formatPercent(v, { dp: 0 })} relative`} note="The smallest lift worth acting on. Smaller effects need far more visitors." />
          <RangeField label="Traffic in the test" value={share} min={0.1} max={1} step={0.05} onChange={(v) => { setShare(v); setSent(false); }} format={(v) => formatPercent(v, { dp: 0 })} note="Split 50/50 between A and B. Less traffic is safer, but slower." />
        </div>
        <p className={s.note} style={{ marginTop: "0.6rem" }}>
          Audience follows the filters at the top ({filter.device === "all" ? "all devices" : filter.device}, {filter.source === "all" ? "all sources" : filter.source}): {formatNumber(base.daily)} visitors a day on {p.label}.
        </p>
      </div>

      {result ? (
        <div className={s.card}>
          <h3 className={s.cardTitle}>4. What this test needs</h3>
          <div className={s.tiles}>
            <MetricTile label="Baseline rate" hint="last 4 weeks" value={formatPercent(base.rate, { dp: 2 })} />
            <MetricTile label="Variation must reach" value={formatPercent(result.target, { dp: 2 })} />
            <MetricTile label="Visitors per variant" value={formatNumber(result.perVariant)} />
            <MetricTile label="Visitors in total" value={formatNumber(result.total)} />
            <MetricTile label="Days at today's traffic" value={formatDays(result.days)} />
            <MetricTile label="Recommended run" hint="whole weeks, min. 2" value={formatDays(result.recommendedDays)} />
          </div>
          {result.tooLong && (
            <p className={x.warn} role="alert" style={{ marginTop: "1rem" }}>
              <strong>Longer than six weeks.</strong> Over {MAX_DAYS} days, cookies expire and seasons change under the test, so the result gets less trustworthy.{" "}
              {fastest !== null
                ? `At this traffic, a test on ${p.label} can only reliably detect a lift of +${formatPercent(fastest, { dp: 0 })} or more within six weeks: test a bolder change, put more traffic in, or test on a busier page.`
                : "No realistic lift is detectable within six weeks at this traffic: test on a busier page or a metric higher up the journey."}
            </p>
          )}
          <div className={x.actions} style={{ marginTop: "1rem" }}>
            <button
              type="button"
              className={s.btn}
              onClick={() => {
                onPlan({ planned: result.perVariant, mde, alpha: Number(alpha), baseline: base.rate as number, page });
                setSent(true);
                track("lab_cro_plan", `${page}:${metric}:${Math.round(mde * 100)}`);
              }}
            >
              Use this plan in Experiment analysis
            </button>
            <span role="status" aria-live="polite" className={s.note}>
              {sent ? "Sent. Open Experiment analysis and choose “Your numbers”." : ""}
            </span>
          </div>
          <SimulationNote>Duration assumes the next weeks bring the same traffic as the last four. Run whole weeks, decide the stopping point now, and don&rsquo;t stop early because the result looks good.</SimulationNote>
        </div>
      ) : (
        <EmptyState title="This test can't be planned yet">There is no baseline rate for {p.label} with these filters, or the target rate would pass 100%. Pick another page, metric or a smaller effect.</EmptyState>
      )}
    </>
  );
}
