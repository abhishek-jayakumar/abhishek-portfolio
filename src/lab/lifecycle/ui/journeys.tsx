"use client";

import { useMemo, useState } from "react";
import { CHANNEL_RATES, GOALS, PLACEHOLDERS, STEP_DECAY, audienceOf, fill, goalOf, newStep, recommendedGoal, reorderPoint, simulateJourney, templateSteps, varsFor, type GoalId, type JourneyChannel, type Step } from "@/lab/lifecycle/journeys";
import { SEGMENTS, select, segmentLabel } from "@/lab/lifecycle/metrics";
import { clamp } from "@/lab/shared/lib/safe-math";
import { formatNumber, formatPercent } from "@/lab/shared/lib/format";
import { Segmented, SelectField } from "@/lab/shared/ui/controls";
import { DataTable } from "@/lab/shared/ui/data-table";
import { MetricTile } from "@/lab/shared/ui/metric-tile";
import { EmptyState, SimulationNote } from "@/lab/shared/ui/notices";
import { track } from "@/lib/track";
import s from "@/lab/shared/ui/lab.module.css";
import l from "./lifecycle.module.css";
import { inr, type ModuleProps } from "./shared";

const CHANNEL_OPTIONS: { value: JourneyChannel; label: string }[] = [
  { value: "whatsapp", label: "WhatsApp" },
  { value: "email", label: "Email" },
];

export function Journeys({ data, filter, onSegment }: ModuleProps) {
  const ps = useMemo(() => select(data, filter), [data, filter]);
  const reorder = useMemo(() => reorderPoint(data, ps), [data, ps]);
  const audience = useMemo(() => audienceOf(ps), [ps]);
  const samples = useMemo(() => [...ps].sort((a, b) => b.spend - a.spend || a.ci - b.ci).slice(0, 20), [ps]);

  const [goals, setGoals] = useState<Record<string, GoalId>>({});
  const [edited, setEdited] = useState<Record<string, Step[]>>({});
  const [offers, setOffers] = useState<Record<string, string>>({});
  const [sample, setSample] = useState(0);

  const goal = goals[filter.segment] ?? recommendedGoal(filter.segment);
  const g = goalOf(goal);
  const key = `${filter.segment}:${filter.channel}:${goal}`;
  const defaults = useMemo(() => templateSteps(goal, reorder.send), [goal, reorder.send]);
  const steps = edited[key] ?? defaults;
  const offer = offers[key] ?? g.offer;
  const who = samples.length ? samples[sample % samples.length] : null;
  const vars = who ? varsFor(who, reorder.median, offer) : null;
  const sim = simulateJourney(steps, audience, goal);

  const setSteps = (next: Step[]) => setEdited((e) => ({ ...e, [key]: next }));
  const update = (id: string, patch: Partial<Step>) => setSteps(steps.map((st) => (st.id === id ? { ...st, ...patch } : st)));
  const move = (i: number, by: number) => {
    const next = [...steps];
    const [st] = next.splice(i, 1);
    next.splice(i + by, 0, st);
    setSteps(next);
  };

  return (
    <>
      <div className={s.card}>
        <h3 className={s.cardTitle}>1. Audience and goal</h3>
        <div className={l.row}>
          <SelectField label="Audience (segment)" value={filter.segment} onChange={onSegment} options={[{ value: "all", label: "All customers" }, ...SEGMENTS.map((sg) => ({ value: sg.id, label: sg.label }))]} />
          <SelectField
            label="Goal"
            value={goal}
            onChange={(v) => {
              setGoals((x) => ({ ...x, [filter.segment]: v }));
              track("lab_journey_goal", v);
            }}
            options={GOALS.map((x) => ({ value: x.id, label: `${x.label}${x.id === recommendedGoal(filter.segment) ? " (suggested)" : ""}` }))}
          />
          <div className={s.field} style={{ flex: "1 1 18rem" }}>
            <label htmlFor="journey-offer" className={s.fieldLabel}>
              Offer, used as {"{offer}"}
            </label>
            <input id="journey-offer" className={l.input} value={offer} onChange={(e) => setOffers((o) => ({ ...o, [key]: e.target.value }))} />
          </div>
        </div>
        <p className={s.note} style={{ marginTop: "0.8rem" }}>
          Trigger: {g.trigger}. Audience: {formatNumber(audience.size)} customers ({filter.segment === "all" ? "everyone" : segmentLabel(filter.segment)}
          {filter.channel === "all" ? "" : `, acquired via ${filter.channel}`}), {formatNumber(audience.whatsapp)} opted in to WhatsApp and {formatNumber(audience.email)} to email.{" "}
          {goal === "replenish" && `The reminder goes on day ${reorder.send}, five days before this audience's median reorder gap of ${reorder.median} days${reorder.fromData ? "" : " (a default: nobody here has reordered yet)"}.`}
        </p>
      </div>

      {!audience.size ? (
        <EmptyState title="Nobody in this audience">Pick another segment or channel.</EmptyState>
      ) : (
        <>
          <div className={s.card}>
            <div className={l.row} style={{ justifyContent: "space-between" }}>
              <h3 className={s.cardTitle} style={{ margin: 0 }}>
                2. Steps and messages
              </h3>
              <div className={l.row}>
                <span className={s.note}>
                  Previewing as {who?.c.firstName} ({who?.c.id}), {sample % Math.max(1, samples.length) + 1} of {samples.length} top customers
                </span>
                <button type="button" className={s.btnGhost} onClick={() => setSample((x) => x + 1)}>
                  Next customer
                </button>
                {edited[key] && (
                  <button type="button" className={s.btnGhost} onClick={() => setEdited((e) => Object.fromEntries(Object.entries(e).filter(([k]) => k !== key)))}>
                    Reset to template
                  </button>
                )}
              </div>
            </div>
            <p className={s.note} style={{ margin: "0.6rem 0" }}>Placeholders you can use (filled from each customer&rsquo;s own record):</p>
            <ul className={l.chips} aria-label="Placeholders">
              {PLACEHOLDERS.map((p) => (
                <li key={p}>
                  <code>{`{${p}}`}</code>
                </li>
              ))}
            </ul>
          </div>

          <ol className={l.steps}>
            {steps.map((st, i) => {
              const day = sim.steps[i]?.day ?? 0;
              const body = vars ? fill(st.body, vars) : { text: st.body, unknown: [] };
              const subject = vars ? fill(st.subject, vars) : { text: st.subject, unknown: [] };
              const unknown = [...new Set([...body.unknown, ...subject.unknown])];
              const r = sim.steps[i];
              return (
                <li key={st.id} className={l.step}>
                  <div className={l.stepHead}>
                    <p className={l.stepTitle}>
                      Step {i + 1} · Day {day}
                      <span>
                        {i === 0 ? `${st.delay} days after the trigger` : `${st.delay} days after step ${i}`} · simulated: {formatNumber(r?.sent ?? 0)} sent, {formatNumber(r?.orders ?? 0, { dp: 1 })} orders
                      </span>
                    </p>
                    <Segmented label={`Step ${i + 1} channel`} hideLabel value={st.channel} onChange={(v) => update(st.id, { channel: v })} options={CHANNEL_OPTIONS} />
                    <div className={s.field}>
                      <label htmlFor={`${st.id}-delay`} className={s.fieldLabel}>
                        Wait (days)
                      </label>
                      <input
                        id={`${st.id}-delay`}
                        type="number"
                        min={0}
                        max={180}
                        className={`${l.input} ${l.narrow}`}
                        value={st.delay}
                        onChange={(e) => update(st.id, { delay: clamp(Math.round(Number(e.target.value) || 0), 0, 180) })}
                      />
                    </div>
                    <button type="button" className={s.btnGhost} onClick={() => move(i, -1)} disabled={i === 0} aria-label={`Move step ${i + 1} up`}>
                      ↑
                    </button>
                    <button type="button" className={s.btnGhost} onClick={() => move(i, 1)} disabled={i === steps.length - 1} aria-label={`Move step ${i + 1} down`}>
                      ↓
                    </button>
                    <button type="button" className={s.btnGhost} onClick={() => setSteps(steps.filter((x) => x.id !== st.id))} disabled={steps.length === 1}>
                      Remove
                    </button>
                  </div>
                  <div className={l.stack}>
                    {st.channel === "email" && (
                      <div className={s.field}>
                        <label htmlFor={`${st.id}-subject`} className={s.fieldLabel}>
                          Subject line
                        </label>
                        <input id={`${st.id}-subject`} className={l.input} value={st.subject} onChange={(e) => update(st.id, { subject: e.target.value })} />
                      </div>
                    )}
                    <div className={s.field}>
                      <label htmlFor={`${st.id}-body`} className={s.fieldLabel}>
                        Message template
                      </label>
                      <textarea id={`${st.id}-body`} className={l.textarea} value={st.body} onChange={(e) => update(st.id, { body: e.target.value })} />
                    </div>
                  </div>
                  <div className={l.stack} aria-live="polite">
                    <span className={l.previewLabel}>Preview · {st.channel === "whatsapp" ? "WhatsApp" : "Email"}</span>
                    <div className={`${l.preview} ${st.channel === "whatsapp" ? l.wa : l.mail}`}>
                      {st.channel === "email" && <strong className={l.mailSubject}>{subject.text || "(no subject)"}</strong>}
                      {body.text}
                    </div>
                    {unknown.length > 0 && <p className={l.warn}>Unknown placeholder{unknown.length > 1 ? "s" : ""}: {unknown.map((u) => `{${u}}`).join(", ")}. It will be sent as written.</p>}
                    {st.channel === "whatsapp" && body.text.length > 1024 && <p className={l.warn}>WhatsApp template messages are limited to 1,024 characters ({formatNumber(body.text.length)} now).</p>}
                    {st.channel === "email" && !st.subject.trim() && <p className={l.warn}>This email has no subject line.</p>}
                  </div>
                </li>
              );
            })}
          </ol>
          <div className={l.row}>
            <button type="button" className={s.btnGhost} onClick={() => setSteps([...steps, newStep("whatsapp")])} disabled={steps.length >= 6}>
              Add a WhatsApp step
            </button>
            <button type="button" className={s.btnGhost} onClick={() => setSteps([...steps, newStep("email")])} disabled={steps.length >= 6}>
              Add an email step
            </button>
          </div>

          <div className={s.card}>
            <h3 className={s.cardTitle}>3. Simulated outcome</h3>
            <div className={s.tiles}>
              <MetricTile label="Audience" value={formatNumber(audience.size)} hint={filter.segment === "all" ? "all customers" : segmentLabel(filter.segment)} />
              <MetricTile label="Projected orders" value={formatNumber(sim.orders, { dp: 0 })} hint={`${formatPercent(sim.conversion)} of the audience`} />
              <MetricTile label="Projected revenue" value={inr(sim.revenue)} hint="after the offer's discount" />
              <MetricTile label="Message cost" value={inr(sim.messageCost)} hint={`discounts given: ${inr(sim.discountCost)}`} />
            </div>
            <div style={{ marginTop: "1rem" }}>
              <DataTable
                caption="Simulated journey by step"
                rowKey={(r) => r.id}
                rows={sim.steps.map((r, i) => ({ ...r, n: i + 1, channel: CHANNEL_RATES[steps[i].channel].label }))}
                columns={[
                  { key: "n", label: "Step", sortable: false },
                  { key: "day", label: "Day", align: "right", sortable: false },
                  { key: "channel", label: "Channel", sortable: false },
                  { key: "sent", label: "Sent", align: "right", sortable: false, render: (r) => formatNumber(r.sent) },
                  { key: "read", label: "Read / opened", align: "right", sortable: false, render: (r) => formatNumber(r.read) },
                  { key: "orders", label: "Orders", align: "right", sortable: false, render: (r) => formatNumber(r.orders, { dp: 1 }) },
                ]}
              />
            </div>
            <div style={{ marginTop: "1rem" }}>
              <SimulationNote>
                Assumptions, not results: WhatsApp messages are read {formatPercent(CHANNEL_RATES.whatsapp.read, { dp: 0 })} of the time and emails opened{" "}
                {formatPercent(CHANNEL_RATES.email.read, { dp: 0 })}; {formatPercent(g.conversion)} of readers order on a {g.label.toLowerCase()} message, and each later step converts{" "}
                {formatPercent(1 - STEP_DECAY, { dp: 0 })} less than the one before. Only opted-in customers who haven&rsquo;t ordered yet get each step. Orders are valued at this audience&rsquo;s
                average order value ({inr(audience.aov)}). A real journey should be tested against a holdout group before anyone banks on these numbers.
              </SimulationNote>
            </div>
          </div>
        </>
      )}
    </>
  );
}
