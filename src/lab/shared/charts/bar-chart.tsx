"use client";

import { useState } from "react";
import { isNum } from "@/lab/shared/lib/safe-math";
import { linearScale, niceTicks } from "@/lab/shared/lib/scale";
import { SERIES } from "@/lab/shared/lib/palette";
import { useWidth } from "@/lab/shared/ui/use-width";
import { Tooltip, type TipRow } from "./tooltip";
import s from "./charts.module.css";

export type Bar = {
  id: string;
  label: string;
  value: number | null;
  color?: string;
  /** Extra lines for the tooltip (e.g. the spend behind a CPL). */
  detail?: TipRow[];
};

/**
 * Horizontal bars: ranked categories with readable labels. Bars are at most 20px thick with a
 * 4px rounded data end and a square baseline; the value sits at the tip. Each bar is its own
 * hover and focus target. A missing value draws no bar and says "no data".
 */
export function BarChart({ bars, format, ariaLabel, highlight, referenceValue, referenceLabel }: { bars: Bar[]; format: (v: number) => string; ariaLabel: string; highlight?: string; referenceValue?: number | null; referenceLabel?: string }) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<string | null>(null);
  const labelW = Math.min(170, Math.max(96, width * 0.3));
  const valueW = 74;
  const band = 34;
  const thick = 18;
  const m = { top: referenceValue != null ? 18 : 4, bottom: 22 };
  const height = m.top + bars.length * band + m.bottom;
  const max = Math.max(0, ...bars.map((b) => (isNum(b.value) ? b.value : 0)), isNum(referenceValue) ? referenceValue : 0);
  if (!bars.length) return <div ref={ref} className={s.noData}>No data for this selection.</div>;
  const { ticks, domain } = niceTicks(0, max || 1, 3);
  const x0 = labelW + 8;
  const x = linearScale(domain, [x0, Math.max(x0 + 40, width - valueW)]);
  const hovered = bars.find((b) => b.id === hover);
  const hoveredIndex = bars.findIndex((b) => b.id === hover);

  const barPath = (len: number, yTop: number) => {
    const r = Math.min(4, len / 2, thick / 2);
    return `M${x0},${yTop}H${x0 + len - r}A${r},${r} 0 0 1 ${x0 + len},${yTop + r}V${yTop + thick - r}A${r},${r} 0 0 1 ${x0 + len - r},${yTop + thick}H${x0}Z`;
  };

  return (
    <div ref={ref} className={s.plot}>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={ariaLabel}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={x(t)} x2={x(t)} y1={m.top} y2={height - m.bottom} className={t === 0 ? s.baseline : s.grid} />
            <text x={x(t)} y={height - 6} textAnchor="middle" className={s.tick}>
              {format(t)}
            </text>
          </g>
        ))}
        {isNum(referenceValue) && (
          <g>
            <line x1={x(referenceValue)} x2={x(referenceValue)} y1={m.top - 4} y2={height - m.bottom} className={s.reference} />
            <text x={x(referenceValue)} y={10} textAnchor="middle" className={s.refLabel}>
              {referenceLabel ?? "Average"} {format(referenceValue)}
            </text>
          </g>
        )}
        {bars.map((b, i) => {
          const yTop = m.top + i * band + (band - thick) / 2;
          const len = isNum(b.value) ? Math.max(0, x(Math.max(0, b.value)) - x0) : 0;
          const color = b.color ?? SERIES[0];
          const dim = highlight && highlight !== b.id;
          return (
            <g
              key={b.id}
              className={s.barGroup}
              tabIndex={0}
              role="img"
              aria-label={`${b.label}: ${isNum(b.value) ? format(b.value) : "no data"}`}
              onPointerEnter={() => setHover(b.id)}
              onPointerLeave={() => setHover(null)}
              onFocus={() => setHover(b.id)}
              onBlur={() => setHover(null)}
            >
              <rect x={0} y={m.top + i * band} width={width} height={band} fill="transparent" />
              <text x={labelW} y={yTop + thick / 2} dy="0.32em" textAnchor="end" className={s.catLabel}>
                {b.label.length > 26 ? `${b.label.slice(0, 25)}…` : b.label}
              </text>
              {len > 0 && <path d={barPath(len, yTop)} fill={color} opacity={dim ? 0.35 : hover === b.id ? 0.85 : 1} />}
              <text x={x0 + len + 6} y={yTop + thick / 2} dy="0.32em" className={s.valueLabel}>
                {isNum(b.value) ? format(b.value) : "no data"}
              </text>
            </g>
          );
        })}
      </svg>
      {hovered && (
        <Tooltip
          x={x0 + 20}
          y={m.top + hoveredIndex * band + band}
          width={width}
          title={hovered.label}
          rows={[{ label: "value", value: isNum(hovered.value) ? format(hovered.value) : "no data" }, ...(hovered.detail ?? [])]}
        />
      )}
    </div>
  );
}
