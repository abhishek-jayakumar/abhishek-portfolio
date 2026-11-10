"use client";

import { useState } from "react";
import { isNum, ratio } from "@/lab/shared/lib/safe-math";
import { formatNumber, formatPercent } from "@/lab/shared/lib/format";
import { ORDINAL } from "@/lab/shared/lib/palette";
import { useWidth } from "@/lab/shared/ui/use-width";
import { Tooltip } from "./tooltip";
import s from "./charts.module.css";

export type Stage = { id: string; label: string; value: number };

/**
 * A funnel as ranked horizontal bars on one scale (the first stage = full width), coloured with
 * the ordinal violet ramp. Between stages: the step conversion rate and how many dropped out.
 * `flag` marks the step the analysis cares about (e.g. the biggest drop-off), with a word, not
 * only colour.
 */
export function FunnelChart({ stages, ariaLabel, flag, format = (v) => formatNumber(v) }: { stages: Stage[]; ariaLabel: string; flag?: number; format?: (v: number) => string }) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  if (!stages.length || !isNum(stages[0]?.value) || stages[0].value <= 0) return <div ref={ref} className={s.noData}>No data for this selection.</div>;
  const narrow = width < 520;
  const labelW = narrow ? 0 : 140;
  const rowH = narrow ? 64 : 46;
  const thick = 22;
  const gapH = narrow ? 30 : 22;
  const top = narrow ? 18 : 4;
  const height = top + stages.length * rowH + (stages.length - 1) * gapH + 6;
  const x0 = labelW + (narrow ? 0 : 10);
  const full = Math.max(40, width - x0 - 96);
  const first = stages[0].value;

  const yOf = (i: number) => top + i * (rowH + gapH);
  return (
    <div ref={ref} className={s.plot}>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={ariaLabel}>
        {stages.map((st, i) => {
          const len = Math.max(2, (st.value / first) * full);
          const yTop = yOf(i) + (narrow ? 18 : (rowH - thick) / 2);
          const color = ORDINAL[Math.min(ORDINAL.length - 1, Math.round((i / Math.max(1, stages.length - 1)) * (ORDINAL.length - 1)))];
          const r = Math.min(4, len / 2);
          const conv = i > 0 ? ratio(st.value, stages[i - 1].value) : null;
          return (
            <g key={st.id}>
              {i > 0 && (
                <g>
                  <text x={x0} y={yOf(i) - gapH / 2} dy="0.32em" className={flag === i ? s.stepFlag : s.step}>
                    {flag === i ? "▼ Biggest drop · " : "↓ "}
                    {formatPercent(conv)} convert · {formatNumber(stages[i - 1].value - st.value)} drop out
                  </text>
                </g>
              )}
              <g
                tabIndex={0}
                role="img"
                aria-label={`${st.label}: ${format(st.value)}${conv !== null ? `, ${formatPercent(conv)} of the previous stage` : ""}`}
                className={s.barGroup}
                onPointerEnter={() => setHover(i)}
                onPointerLeave={() => setHover(null)}
                onFocus={() => setHover(i)}
                onBlur={() => setHover(null)}
              >
                <rect x={0} y={yOf(i)} width={width} height={rowH} fill="transparent" />
                {narrow ? (
                  <text x={0} y={yOf(i) + 8} className={s.catLabelStart}>
                    {st.label}
                  </text>
                ) : (
                  <text x={labelW} y={yTop + thick / 2} dy="0.32em" textAnchor="end" className={s.catLabel}>
                    {st.label}
                  </text>
                )}
                <path
                  d={`M${x0},${yTop}H${x0 + len - r}A${r},${r} 0 0 1 ${x0 + len},${yTop + r}V${yTop + thick - r}A${r},${r} 0 0 1 ${x0 + len - r},${yTop + thick}H${x0}Z`}
                  fill={color}
                  opacity={hover === i ? 0.85 : 1}
                />
                <text x={x0 + len + 8} y={yTop + thick / 2} dy="0.32em" className={s.valueLabel}>
                  {format(st.value)}
                </text>
              </g>
            </g>
          );
        })}
      </svg>
      {hover !== null && (
        <Tooltip
          x={x0 + 24}
          y={yOf(hover) + rowH}
          width={width}
          title={stages[hover].label}
          rows={[
            { label: "count", value: format(stages[hover].value) },
            { label: "of the first stage", value: formatPercent(ratio(stages[hover].value, first)) },
            ...(hover > 0 ? [{ label: "of the previous stage", value: formatPercent(ratio(stages[hover].value, stages[hover - 1].value)) }] : []),
          ]}
        />
      )}
    </div>
  );
}
