"use client";

import { useMemo, useState } from "react";
import { fill, goalOf, recommendedGoal, reorderPoint, templateSteps, varsFor } from "@/lab/lifecycle/journeys";
import { assistantPrompt, runAssistant } from "@/lab/lifecycle/insights";
import { SEGMENTS, select, segmentLabel, type Filter, type SegmentId } from "@/lab/lifecycle/metrics";
import { formatNumber } from "@/lab/shared/lib/format";
import type { Status } from "@/lab/shared/lib/palette";
import { Segmented, SelectField } from "@/lab/shared/ui/controls";
import { InsightCard } from "@/lab/shared/ui/insight-card";
import { EmptyState } from "@/lab/shared/ui/notices";
import { track } from "@/lib/track";
import s from "@/lab/shared/ui/lab.module.css";
import l from "./lifecycle.module.css";
import type { ModuleProps } from "./shared";

type Show = "all" | "act" | "good";
const ACT: Status[] = ["critical", "serious", "warning"];

/** Where to go next for each finding: a module, and sometimes a segment to filter to. */
const NEXT: Record<string, { module: string; label: string; segment?: SegmentId }> = {
  overdue: { module: "journeys", label: "Build a reactivation journey for At risk", segment: "risk" },
  festive: { module: "retention", label: "Open the cohort view" },
  subs: { module: "retention", label: "Open Retention" },
  marketplace: { module: "behaviour", label: "Open Behaviour" },
  "best-channel": { module: "behaviour", label: "Open Behaviour" },
  churn: { module: "behaviour", label: "See segment movement" },
  welcome: { module: "journeys", label: "Build the welcome journey", segment: "new" },
};

function useCopy() {
  const [state, setState] = useState<{ what: string; ok: boolean } | null>(null);
  const copy = async (what: string, text: string) => {
    let ok = true;
    try {
      await navigator.clipboard.writeText(text);
      track("lab_copy_prompt", `customer-lifecycle:${what}`);
    } catch {
      ok = false;
    }
    setState({ what, ok });
    window.setTimeout(() => setState(null), 3000);
    return ok;
  };
  return [state, copy] as const;
}

export function Assistant({ data, filter, onSegment, onOpen }: ModuleProps) {
  const findings = useMemo(() => runAssistant(data, filter), [data, filter]);
  const prompt = useMemo(() => assistantPrompt(findings, filter), [findings, filter]);
  const [show, setShow] = useState<Show>("all");
  const [promptOpen, setPromptOpen] = useState(false);
  const [copied, copy] = useCopy();

  // Drafted campaign for the selected segment: the suggested goal's first WhatsApp and first email step.
  const drafts = useMemo(() => {
    const ps = select(data, filter);
    if (!ps.length) return null;
    const goal = goalOf(recommendedGoal(filter.segment));
    const rp = reorderPoint(data, ps);
    const steps = templateSteps(goal.id, rp.send);
    const who = [...ps].sort((a, b) => b.spend - a.spend || a.ci - b.ci)[0];
    const vars = varsFor(who, rp.median, goal.offer);
    const wa = steps.find((st) => st.channel === "whatsapp");
    const em = steps.find((st) => st.channel === "email");
    return {
      goal,
      size: ps.length,
      waReach: ps.filter((p) => p.c.whatsapp).length,
      emailReach: ps.filter((p) => p.c.email).length,
      who,
      wa: wa ? fill(wa.body, vars).text : null,
      emailSubject: em ? fill(em.subject, vars).text : null,
      email: em ? fill(em.body, vars).text : null,
    };
  }, [data, filter]);

  const counts = { act: findings.filter((f) => ACT.includes(f.status)).length, good: findings.filter((f) => f.status === "good").length };
  const shown = findings.filter((f) => show === "all" || (show === "act" ? ACT.includes(f.status) : f.status === "good"));
  const go = (id: string) => {
    const n = NEXT[id];
    if (!n) return;
    if (n.segment) onSegment(n.segment as Filter["segment"]);
    onOpen(n.module);
  };

  return (
    <>
      <div className={s.card}>
        <h3 className={s.cardTitle}>A rules engine, not a language model</h3>
        <p className={s.note}>
          Each finding comes from a written rule applied to the same customer and order records as the other modules, with a minimum sample so it doesn&rsquo;t fire on noise. Messages are
          templates filled from real customer fields. Nothing is generated freely, so nothing can be invented. Open a finding&rsquo;s evidence to see what it rests on.
        </p>
        <div className={l.row} style={{ marginTop: "1rem" }}>
          <Segmented
            label="Show"
            value={show}
            onChange={setShow}
            options={[
              { value: "all", label: `All (${findings.length})` },
              { value: "act", label: `Needs action (${counts.act})` },
              { value: "good", label: `Working (${counts.good})` },
            ]}
          />
          <button
            type="button"
            className={s.btn}
            onClick={async () => {
              if (!(await copy("prompt", prompt))) setPromptOpen(true);
            }}
          >
            Copy as AI prompt
          </button>
          <button type="button" className={s.btnGhost} aria-expanded={promptOpen} onClick={() => setPromptOpen((v) => !v)}>
            {promptOpen ? "Hide prompt" : "Show prompt"}
          </button>
          <span role="status" aria-live="polite" className={s.note}>
            {copied?.what === "prompt" ? (copied.ok ? "Copied. Paste it into any AI assistant." : "Couldn't reach the clipboard; the prompt is shown below to copy by hand.") : ""}
          </span>
        </div>
        {promptOpen && (
          <pre className={s.prompt} tabIndex={0} aria-label="AI prompt text">
            {prompt}
          </pre>
        )}
      </div>

      {shown.length === 0 ? (
        <EmptyState title={show === "all" ? "Nothing stands out in this slice" : "No findings of this kind"}>
          {show === "all" ? "None of the rules found enough evidence here. Clear the segment filter or pick All channels for more data." : "Switch Show to All to see every finding."}
        </EmptyState>
      ) : (
        <div className={s.grid2}>
          {shown.map((f) => (
            <InsightCard
              key={f.id}
              finding={f}
              action={
                NEXT[f.id] ? (
                  <button type="button" className={s.linkBtn} onClick={() => go(f.id)}>
                    {NEXT[f.id].label} <span aria-hidden="true">→</span>
                  </button>
                ) : undefined
              }
            />
          ))}
        </div>
      )}

      <div className={s.card}>
        <h3 className={s.cardTitle}>Drafted campaign for {filter.segment === "all" ? "all customers" : `the ${segmentLabel(filter.segment)} segment`}</h3>
        <div className={l.row} style={{ marginBottom: "0.8rem" }}>
          <SelectField label="Segment" value={filter.segment} onChange={onSegment} options={[{ value: "all", label: "All customers" }, ...SEGMENTS.map((sg) => ({ value: sg.id, label: sg.label }))]} />
        </div>
        {!drafts ? (
          <EmptyState title="Nobody in this segment">Pick another segment or channel.</EmptyState>
        ) : (
          <>
            <p className={s.note}>
              Suggested goal: <strong>{drafts.goal.label}</strong>. {formatNumber(drafts.size)} customers; {formatNumber(drafts.waReach)} reachable on WhatsApp, {formatNumber(drafts.emailReach)} by email.
              Shown for {drafts.who.c.firstName} ({drafts.who.c.id}), the segment&rsquo;s highest spender; every customer gets their own name, product and dates.
            </p>
            <div className={l.drafts} style={{ marginTop: "0.8rem" }}>
              {drafts.wa && (
                <div className={l.stack}>
                  <span className={l.previewLabel}>WhatsApp</span>
                  <div className={`${l.preview} ${l.wa}`}>{drafts.wa}</div>
                  <button type="button" className={s.btnGhost} style={{ justifySelf: "start" }} onClick={() => copy("whatsapp", drafts.wa as string)}>
                    {copied?.what === "whatsapp" ? (copied.ok ? "Copied" : "Couldn't copy") : "Copy WhatsApp message"}
                  </button>
                </div>
              )}
              {drafts.email && (
                <div className={l.stack}>
                  <span className={l.previewLabel}>Email</span>
                  <div className={`${l.preview} ${l.mail}`}>
                    <strong className={l.mailSubject}>{drafts.emailSubject}</strong>
                    {drafts.email}
                  </div>
                  <button type="button" className={s.btnGhost} style={{ justifySelf: "start" }} onClick={() => copy("email", `Subject: ${drafts.emailSubject}\n\n${drafts.email}`)}>
                    {copied?.what === "email" ? (copied.ok ? "Copied" : "Couldn't copy") : "Copy email"}
                  </button>
                </div>
              )}
            </div>
            <button type="button" className={s.linkBtn} style={{ marginTop: "0.8rem" }} onClick={() => onOpen("journeys")}>
              Edit the full journey in Journey builder <span aria-hidden="true">→</span>
            </button>
          </>
        )}
      </div>
    </>
  );
}
