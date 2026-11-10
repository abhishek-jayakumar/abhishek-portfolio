"use client";

import { useId, type KeyboardEvent, type ReactNode } from "react";
import s from "./lab.module.css";

export type Option<V extends string> = { value: V; label: string };

/** A segmented control (single choice), built as a radio group with arrow-key support. */
export function Segmented<V extends string>({ label, options, value, onChange, hideLabel }: { label: string; options: Option<V>[]; value: V; onChange: (v: V) => void; hideLabel?: boolean }) {
  const id = useId();
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const i = options.findIndex((o) => o.value === value);
    let n = -1;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") n = (i + 1) % options.length;
    if (e.key === "ArrowLeft" || e.key === "ArrowUp") n = (i - 1 + options.length) % options.length;
    if (n < 0) return;
    e.preventDefault();
    onChange(options[n].value);
    (e.currentTarget.querySelectorAll("button")[n] as HTMLButtonElement | undefined)?.focus();
  };
  return (
    <div className={s.field}>
      <span id={id} className={hideLabel ? "sr-only" : s.fieldLabel}>
        {label}
      </span>
      <div className={s.segmented} role="radiogroup" aria-labelledby={id} onKeyDown={onKey}>
        {options.map((o) => {
          const on = o.value === value;
          return (
            <button key={o.value} type="button" role="radio" aria-checked={on} tabIndex={on ? 0 : -1} className={s.segment} onClick={() => onChange(o.value)}>
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function SelectField<V extends string>({ label, options, value, onChange }: { label: string; options: Option<V>[]; value: V; onChange: (v: V) => void }) {
  const id = useId();
  return (
    <div className={s.field}>
      <label htmlFor={id} className={s.fieldLabel}>
        {label}
      </label>
      <select id={id} className={s.select} value={value} onChange={(e) => onChange(e.target.value as V)}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

/** A labelled slider with its current value always visible (never only in a tooltip). */
export function RangeField({
  label,
  value,
  min,
  max,
  step,
  onChange,
  format,
  note,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  format: (v: number) => string;
  note?: ReactNode;
}) {
  const id = useId();
  return (
    <div className={s.range}>
      <div className={s.rangeTop}>
        <label htmlFor={id} className={s.fieldLabel}>
          {label}
        </label>
        <output htmlFor={id} className={s.rangeValue}>
          {format(value)}
        </output>
      </div>
      <input id={id} type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} aria-valuetext={format(value)} />
      {note && <p className={s.rangeNote}>{note}</p>}
    </div>
  );
}

/** A row of filters above the content they scope (one row, left-aligned, wraps on phones). */
export function FilterBar({ children, label = "Filters" }: { children: ReactNode; label?: string }) {
  return (
    <div className={s.filterBar} role="group" aria-label={label}>
      {children}
    </div>
  );
}
