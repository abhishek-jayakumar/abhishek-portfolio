import s from "./charts.module.css";

export type TipRow = { label: string; value: string; color?: string };

/**
 * One tooltip for every chart: values lead (strong), labels follow; series are keyed by a short
 * line in the series colour; it stays inside the chart's box. React escapes the text, so labels
 * from an uploaded CSV can't inject markup.
 */
export function Tooltip({ x, y, width, title, rows }: { x: number; y: number; width: number; title?: string; rows: TipRow[] }) {
  const w = 190;
  const left = Math.min(Math.max(8, x + 14), Math.max(8, width - w - 8));
  return (
    <div className={s.tip} style={{ left, top: Math.max(4, y - 10), width: w }} role="status" aria-live="polite">
      {title && <p className={s.tipTitle}>{title}</p>}
      <ul>
        {rows.map((r) => (
          <li key={r.label}>
            {r.color && <span className={s.tipKey} style={{ background: r.color }} aria-hidden="true" />}
            <strong>{r.value}</strong>
            <span>{r.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
