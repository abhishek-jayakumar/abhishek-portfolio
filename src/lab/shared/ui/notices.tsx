import type { ReactNode } from "react";
import s from "./lab.module.css";

/** Shown on every experiment screen: the business is fictional and the numbers are synthetic. */
export function SyntheticBadge({ business }: { business: string }) {
  return (
    <p className={s.synthetic}>
      <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
        <circle cx="8" cy="8" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="2.4 2" />
        <circle cx="8" cy="8" r="2" fill="currentColor" />
      </svg>
      <span>
        <strong>Synthetic data.</strong> {business} is fictional; no figure here is real business performance.
      </span>
    </p>
  );
}

/** Marks a projection as a model output, not a forecast anyone should bank on. */
export function SimulationNote({ children }: { children: ReactNode }) {
  return (
    <p className={s.simulation} role="note">
      <strong>Simulation.</strong> {children}
    </p>
  );
}

/** A meaningful empty state: what is missing, why, and the one thing to do next. */
export function EmptyState({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <div className={s.empty}>
      <p className={s.emptyTitle}>{title}</p>
      <div className={s.emptyBody}>{children}</div>
      {action}
    </div>
  );
}
