import Link from "next/link";
import type { ReactNode } from "react";
import { nextExperiment, type Experiment } from "@/lab/experiments";
import { SyntheticBadge } from "./notices";
import s from "./lab.module.css";

/**
 * The frame every experiment sits in: a cover that says what it is and what question it answers,
 * the synthetic-data notice, short instructions, the experiment itself, and the way on to the next.
 */
export function LabShell({ experiment: e, children }: { experiment: Experiment; children: ReactNode }) {
  const next = nextExperiment(e.slug);
  return (
    <div className={s.page}>
      <header className={s.cover}>
        <div className={s.coverInner}>
          <div>
            <Link href="/#lab" className={s.back}>
              <span aria-hidden="true">←</span> The lab
            </Link>
            <p className={s.eyebrow}>
              Experiment {e.no} · {e.category}
            </p>
            <h1 className={s.coverTitle}>{e.title}</h1>
            <p className={s.coverText}>{e.description}</p>
            <p className={s.question}>
              <span>The question</span>
              {e.question}
            </p>
          </div>
          <dl className={s.facts}>
            <div>
              <dt>Business</dt>
              <dd>
                {e.business.name}: {e.business.what}
              </dd>
            </div>
            <div>
              <dt>Data</dt>
              <dd>Synthetic, generated from a fixed seed so every visit sees the same numbers</dd>
            </div>
            <div>
              <dt>Currency</dt>
              <dd>{e.business.currency === "INR" ? "Indian rupees (₹)" : "US dollars ($)"}</dd>
            </div>
            <div>
              <dt>Built with</dt>
              <dd>{e.tools.join(", ")}</dd>
            </div>
          </dl>
        </div>
      </header>

      <div className={s.workspace}>
        <SyntheticBadge business={e.business.name} />
        <details className={s.howTo}>
          <summary>How to use this</summary>
          <ol>
            {e.howTo.map((h) => (
              <li key={h}>{h}</li>
            ))}
          </ol>
        </details>
        {children}
      </div>

      <nav className={s.next} aria-label="Next experiment">
        <Link href={`/lab/${next.slug}`} className={s.nextLink} data-track={`lab_next_${next.slug}`}>
          <span>Next experiment · {next.no}</span>
          <strong>
            {next.title} <span aria-hidden="true">→</span>
          </strong>
        </Link>
      </nav>
    </div>
  );
}
