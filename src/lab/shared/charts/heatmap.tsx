"use client";

import { useState } from "react";
import { isNum } from "@/lab/shared/lib/safe-math";
import { inkOn, sequentialFor } from "@/lab/shared/lib/palette";
import { useWidth } from "@/lab/shared/ui/use-width";
import { Tooltip } from "./tooltip";
import s from "./charts.module.css";

/**
 * A grid of values on the sequential violet ramp (cohort retention, day × hour, …). Cells carry
 * their value as text when it fits; empty cells (not yet observable) draw as a hairline outline,
 * never as a misleading "0". Every cell is hoverable and focusable.
 */
export function Heatmap({
  rows,
  cols,
  values,
  format,
  ariaLabel,
  max,
  rowNote,
}: {
  rows: string[];
  cols: string[];
  values: (number | null)[][];
  format: (v: number) => string;
  ariaLabel: string;
  /** Value that maps to the darkest step (defaults to the largest value). */
  max?: number;
  rowNote?: string[];
}) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<[number, number] | null>(null);
  const flat = values.flat().filter(isNum);
  if (!rows.length || !cols.length || !flat.length) return <div ref={ref} className={s.noData}>No data for this selection.</div>;
  const top = Math.max(...flat);
  const ceiling = max ?? (top || 1);
  const labelW = Math.min(118, Math.max(78, width * 0.18));
  const gap = 2;
  const cell = Math.max(18, Math.min(52, Math.floor((width - labelW - 8) / cols.length) - gap));
  const headH = 22;
  const height = headH + rows.length * (cell + gap);
  const svgW = labelW + cols.length * (cell + gap);

  return (
    <div ref={ref} className={s.plotScroll}>
      <svg width={Math.max(svgW, 10)} height={height} viewBox={`0 0 ${svgW} ${height}`} role="img" aria-label={ariaLabel}>
        {cols.map((c, j) => (
          <text key={c} x={labelW + j * (cell + gap) + cell / 2} y={14} textAnchor="middle" className={s.tick}>
            {c}
          </text>
        ))}
        {rows.map((r, i) => (
          <g key={r}>
            <text x={labelW - 8} y={headH + i * (cell + gap) + cell / 2} dy="0.32em" textAnchor="end" className={s.catLabel}>
              {r}
            </text>
            {cols.map((c, j) => {
              const v = values[i]?.[j];
              const cx = labelW + j * (cell + gap);
              const cy = headH + i * (cell + gap);
              if (!isNum(v)) return <rect key={c} x={cx + 0.5} y={cy + 0.5} width={cell - 1} height={cell - 1} rx="3" className={s.emptyCell} />;
              const fill = sequentialFor(v / ceiling);
              const text = format(v);
              const fits = cell >= 34 && text.length * 6.4 + 6 <= cell;
              return (
                <g
                  key={c}
                  tabIndex={0}
                  role="img"
                  aria-label={`${r}, ${c}: ${text}${rowNote?.[i] ? ` (${rowNote[i]})` : ""}`}
                  className={s.barGroup}
                  onPointerEnter={() => setHover([i, j])}
                  onPointerLeave={() => setHover(null)}
                  onFocus={() => setHover([i, j])}
                  onBlur={() => setHover(null)}
                >
                  <rect x={cx} y={cy} width={cell} height={cell} rx="4" fill={fill} stroke={hover?.[0] === i && hover?.[1] === j ? "#1d1736" : "none"} strokeWidth="1.5" />
                  {fits && (
                    <text x={cx + cell / 2} y={cy + cell / 2} dy="0.32em" textAnchor="middle" className={s.cellLabel} fill={inkOn(fill)}>
                      {text}
                    </text>
                  )}
                </g>
              );
            })}
          </g>
        ))}
      </svg>
      {hover && isNum(values[hover[0]]?.[hover[1]]) && (
        <Tooltip
          x={Math.min(labelW + hover[1] * (cell + gap), width - 200)}
          y={headH + (hover[0] + 1) * (cell + gap)}
          width={width}
          title={`${rows[hover[0]]} · ${cols[hover[1]]}`}
          rows={[{ label: rowNote?.[hover[0]] ?? "value", value: format(values[hover[0]][hover[1]] as number) }]}
        />
      )}
    </div>
  );
}
