import type { ReactNode } from "react";
import type { Status } from "@/lab/shared/lib/palette";
import s from "./lab.module.css";

import type { Finding } from "@/lab/shared/lib/finding";
export type { Finding, Evidence } from "@/lab/shared/lib/finding";

const WORD: Record<Status, string> = { good: "Working", warning: "Watch", serious: "Act soon", critical: "Act now", info: "Note" };

/** Status is never colour alone: every card has an icon and a word. */
function StatusIcon({ status }: { status: Status }) {
  const common = { width: 16, height: 16, viewBox: "0 0 16 16", "aria-hidden": true, focusable: false } as const;
  if (status === "good")
    return (
      <svg {...common}>
        <circle cx="8" cy="8" r="7" fill="currentColor" />
        <path d="M4.6 8.2l2.2 2.2 4.6-4.8" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  if (status === "info")
    return (
      <svg {...common}>
        <circle cx="8" cy="8" r="7" fill="currentColor" />
        <path d="M8 7.2v4.2M8 4.6v.1" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  return (
    <svg {...common}>
      <path d="M8 1.2l7 12.6H1z" fill="currentColor" strokeLinejoin="round" />
      <path d="M8 6v3.6M8 11.6v.1" stroke={status === "warning" ? "#1d1736" : "#fff"} strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function InsightCard({ finding, action }: { finding: Finding; action?: ReactNode }) {
  return (
    <article className={`${s.insight} ${s[`st_${finding.status}`]}`} aria-labelledby={`f-${finding.id}`}>
      <p className={s.insightStatus}>
        <StatusIcon status={finding.status} />
        {WORD[finding.status]}
      </p>
      <h4 id={`f-${finding.id}`} className={s.insightTitle}>
        {finding.title}
      </h4>
      <p className={s.insightSummary}>{finding.summary}</p>
      {finding.recommendation && (
        <p className={s.insightRec}>
          <strong>Recommendation.</strong> {finding.recommendation}
        </p>
      )}
      <details className={s.evidence}>
        <summary>Evidence ({finding.evidence.length})</summary>
        <dl>
          {finding.evidence.map((e) => (
            <div key={e.label}>
              <dt>{e.label}</dt>
              <dd>
                {e.value}
                {e.context && <span> {e.context}</span>}
              </dd>
            </div>
          ))}
        </dl>
        <p className={s.rule}>Rule: {finding.rule}</p>
      </details>
      {action}
    </article>
  );
}
