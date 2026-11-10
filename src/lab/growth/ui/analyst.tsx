"use client";

import { useMemo, useState } from "react";
import type { Dataset } from "@/lab/growth/generate";
import { analystPrompt, runAnalyst } from "@/lab/growth/insights";
import type { Assumptions, Filter } from "@/lab/growth/metrics";
import type { Status } from "@/lab/shared/lib/palette";
import { Segmented } from "@/lab/shared/ui/controls";
import { InsightCard } from "@/lab/shared/ui/insight-card";
import { EmptyState } from "@/lab/shared/ui/notices";
import { track } from "@/lib/track";
import s from "@/lab/shared/ui/lab.module.css";

type Props = { data: Dataset; filter: Filter; assumptions: Assumptions; onOpen: (module: string) => void };
type Show = "all" | "act" | "good";

const ACT: Status[] = ["critical", "serious", "warning"];

/** Where to look next for each kind of finding. */
function moduleFor(id: string): { id: string; label: string } | null {
  if (id.startsWith("funnel") || id === "leverage" || id === "immature") return { id: "funnel", label: "Open Funnel" };
  if (id.startsWith("quality")) return { id: "acquisition", label: "Open Acquisition" };
  if (id.startsWith("cac") || id.startsWith("cpl") || id.startsWith("best") || id === "realloc" || id.startsWith("few") || id.startsWith("anom") || id.startsWith("junk")) return { id: "channels", label: "Open Channels" };
  if (id === "unit-economics") return { id: "economics", label: "Open Unit economics" };
  if (id === "customers-trend") return { id: "overview", label: "Open Overview" };
  return null;
}

export function Analyst({ data, filter, assumptions, onOpen }: Props) {
  const findings = useMemo(() => runAnalyst(data, filter, assumptions), [data, filter, assumptions]);
  const [show, setShow] = useState<Show>("all");
  const [copied, setCopied] = useState<"idle" | "ok" | "fail">("idle");
  const [promptOpen, setPromptOpen] = useState(false);
  const prompt = useMemo(() => analystPrompt(findings, filter), [findings, filter]);

  const counts = { act: findings.filter((f) => ACT.includes(f.status)).length, good: findings.filter((f) => f.status === "good").length };
  const shown = findings.filter((f) => show === "all" || (show === "act" ? ACT.includes(f.status) : f.status === "good"));

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied("ok");
      track("lab_copy_prompt", "growth-intelligence");
    } catch {
      setCopied("fail");
      setPromptOpen(true);
    }
    window.setTimeout(() => setCopied("idle"), 3000);
  };

  return (
    <>
      <div className={s.card}>
        <h3 className={s.cardTitle}>A rules engine, not a language model</h3>
        <p className={s.note}>
          Every finding below comes from a written rule applied to the numbers in the other modules, with a minimum sample so it doesn&rsquo;t fire on noise. Nothing is generated
          freely, so it can&rsquo;t invent a metric. Open a finding&rsquo;s evidence to see exactly what it rests on. It follows the filters and the unit-economics assumptions.
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.8rem 1.2rem", alignItems: "end", marginTop: "1rem" }}>
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
          <button type="button" className={s.btn} onClick={copy}>
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
        <p className={s.note} style={{ marginTop: "0.6rem" }}>
          The prompt carries only these findings and their evidence, and tells the assistant not to introduce numbers of its own.
        </p>
      </div>

      {shown.length === 0 ? (
        <EmptyState title={show === "all" ? "Nothing stands out in this slice" : "No findings of this kind"}>
          {show === "all" ? "None of the rules found enough evidence here. Widen the date range or remove a filter for more data." : "Switch Show to All to see every finding."}
        </EmptyState>
      ) : (
        <div className={s.grid2}>
          {shown.map((f) => {
            const go = moduleFor(f.id);
            return (
              <InsightCard
                key={f.id}
                finding={f}
                action={
                  go ? (
                    <button type="button" className={s.linkBtn} onClick={() => onOpen(go.id)}>
                      {go.label} <span aria-hidden="true">→</span>
                    </button>
                  ) : undefined
                }
              />
            );
          })}
        </div>
      )}
    </>
  );
}
