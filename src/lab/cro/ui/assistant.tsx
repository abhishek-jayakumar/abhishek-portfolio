"use client";

import { useMemo, useState } from "react";
import { COPY, assistantPrompt, strongestPage, type Fix } from "@/lab/cro/insights";
import { pageOf, type PageId } from "@/lab/cro/model";
import { SelectField } from "@/lab/shared/ui/controls";
import { DataTable } from "@/lab/shared/ui/data-table";
import { InsightCard } from "@/lab/shared/ui/insight-card";
import { EmptyState } from "@/lab/shared/ui/notices";
import { track } from "@/lib/track";
import s from "@/lab/shared/ui/lab.module.css";
import x from "./cro.module.css";
import { PAGE_OPTIONS, type ModuleProps } from "./shared";

export function Assistant({ data, filter, fixes, page, onPage, onTest }: ModuleProps & { fixes: Fix[]; page: PageId; onPage: (p: PageId) => void; onTest: (fix: Fix) => void }) {
  const best = useMemo(() => strongestPage(data, filter), [data, filter]);
  const prompt = useMemo(() => assistantPrompt(fixes, filter), [fixes, filter]);
  const [copied, setCopied] = useState<"idle" | "ok" | "fail">("idle");
  const [promptOpen, setPromptOpen] = useState(false);
  const copy = COPY[page];
  const p = pageOf(page);

  const doCopy = async () => {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied("ok");
      track("lab_copy_prompt", "conversion-studio");
    } catch {
      setCopied("fail");
      setPromptOpen(true);
    }
    window.setTimeout(() => setCopied("idle"), 3000);
  };

  return (
    <>
      <div className={s.card}>
        <h3 className={s.cardTitle}>Prioritised with ICE, from rules not a language model</h3>
        <p className={s.note}>
          Each fix comes from a written rule applied to the journey numbers, with a minimum sample. It is scored 1–10 on <strong>Impact</strong> (qualified leads it could recover),{" "}
          <strong>Confidence</strong> (how surely the gap isn&rsquo;t chance) and <strong>Ease</strong> (how much work the change is), and ranked by the average. Every fix carries a hypothesis
          you can send straight to the builder. It follows the filters at the top.
        </p>
        <div className={x.actions} style={{ marginTop: "1rem" }}>
          <button type="button" className={s.btn} onClick={doCopy}>
            Copy as AI prompt
          </button>
          <button type="button" className={s.btnGhost} aria-expanded={promptOpen} onClick={() => setPromptOpen((v) => !v)}>
            {promptOpen ? "Hide prompt" : "Show prompt"}
          </button>
          <span role="status" aria-live="polite" className={s.note}>
            {copied === "ok" ? "Copied. Paste it into any AI assistant." : copied === "fail" ? "Couldn't reach the clipboard; the prompt is shown below to copy by hand." : ""}
          </span>
        </div>
        {promptOpen && (
          <pre className={s.prompt} tabIndex={0} aria-label="AI prompt text">
            {prompt}
          </pre>
        )}
      </div>

      {fixes.length === 0 ? (
        <EmptyState title="No fix clears the rules in this slice">There isn&rsquo;t enough evidence here. Set the filters back to All devices and All sources for more data.</EmptyState>
      ) : (
        <>
          <div className={s.card}>
            <h3 className={s.cardTitle}>The backlog, highest ICE first</h3>
            <DataTable
              caption="Fixes ranked by ICE score"
              rowKey={(r) => r.id}
              rows={fixes.map((f, i) => ({ id: f.finding.id, rank: i + 1, title: f.finding.title, impact: f.ice.impact, confidence: f.ice.confidence, ease: f.ice.ease, score: f.ice.score }))}
              initialSort={{ key: "score", dir: "desc" }}
              columns={[
                { key: "rank", label: "#", align: "right", render: (r) => r.rank },
                { key: "title", label: "Fix" },
                { key: "impact", label: "I", align: "right", render: (r) => r.impact },
                { key: "confidence", label: "C", align: "right", render: (r) => r.confidence },
                { key: "ease", label: "E", align: "right", render: (r) => r.ease },
                { key: "score", label: "ICE", align: "right", render: (r) => <strong>{r.score}</strong> },
              ]}
            />
          </div>
          <div className={s.grid2}>
            {fixes.map((f) => (
              <InsightCard
                key={f.finding.id}
                finding={f.finding}
                action={
                  <div className={x.actions}>
                    <span className={x.ice}>
                      ICE {f.ice.score}
                      <span className="sr-only">
                        : impact {f.ice.impact}, confidence {f.ice.confidence}, ease {f.ice.ease}
                      </span>
                    </span>
                    <button type="button" className={s.linkBtn} onClick={() => onTest(f)}>
                      Build a test for this <span aria-hidden="true">→</span>
                    </button>
                  </div>
                }
              />
            ))}
            {best && <InsightCard finding={best} />}
          </div>
        </>
      )}

      <div className={s.card}>
        <h3 className={s.cardTitle}>Headline and CTA ideas to test</h3>
        <div className={x.row}>
          <SelectField label="Page" value={page} onChange={onPage} options={PAGE_OPTIONS} />
          <p className={x.current}>
            Today: &ldquo;{p.headline}&rdquo; · CTA &ldquo;{p.cta}&rdquo;
          </p>
        </div>
        <div className={s.grid2} style={{ marginTop: "1rem" }}>
          <div>
            <p className={s.fieldLabel} style={{ marginBottom: "0.5rem" }}>
              Headlines
            </p>
            <ul className={x.copyList}>
              {copy.headlines.map((c) => (
                <li key={c.text}>
                  <q>{c.text}</q>
                  <span>{c.why}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className={s.fieldLabel} style={{ marginBottom: "0.5rem" }}>
              Calls to action
            </p>
            <ul className={x.copyList}>
              {copy.ctas.map((c) => (
                <li key={c.text}>
                  <q>{c.text}</q>
                  <span>{c.why}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <p className={s.note} style={{ marginTop: "0.6rem" }}>
          Written from per-page templates around the page&rsquo;s purpose ({p.purpose}). They are ideas for a variation, not predictions: only a test says which works.
        </p>
      </div>
    </>
  );
}
