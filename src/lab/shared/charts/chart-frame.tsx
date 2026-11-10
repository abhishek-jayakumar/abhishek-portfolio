"use client";

import { useId, useState, type ReactNode } from "react";
import s from "./charts.module.css";

export type LegendItem = { label: string; color: string; shape?: "line" | "rect" };

/**
 * The frame around every chart: title, optional subtitle, legend (only for two or more series),
 * and a "Table" toggle that shows the same numbers as a table, so no value is reachable only by
 * hovering or only by colour.
 */
export function ChartFrame({
  title,
  subtitle,
  legend,
  table,
  children,
  actions,
}: {
  title: string;
  subtitle?: string;
  legend?: LegendItem[];
  table?: ReactNode;
  children: ReactNode;
  actions?: ReactNode;
}) {
  const [showTable, setShowTable] = useState(false);
  const id = useId();
  return (
    <figure className={s.frame} aria-labelledby={`${id}-t`}>
      <div className={s.frameHead}>
        <div>
          <figcaption id={`${id}-t`} className={s.title}>
            {title}
          </figcaption>
          {subtitle && <p className={s.subtitle}>{subtitle}</p>}
        </div>
        <div className={s.frameActions}>
          {actions}
          {table && (
            <button type="button" className={s.toggle} aria-pressed={showTable} onClick={() => setShowTable((v) => !v)}>
              {showTable ? "Chart" : "Table"}
            </button>
          )}
        </div>
      </div>
      {legend && legend.length > 1 && !showTable && (
        <ul className={s.legend} aria-label="Legend">
          {legend.map((l) => (
            <li key={l.label}>
              <span className={l.shape === "rect" ? s.keyRect : s.keyLine} style={{ background: l.color }} aria-hidden="true" />
              {l.label}
            </li>
          ))}
        </ul>
      )}
      {showTable ? table : children}
    </figure>
  );
}
