"use client";

import { isNum } from "@/lab/shared/lib/safe-math";
import { linearScale, niceTicks } from "@/lab/shared/lib/scale";
import { useWidth } from "@/lab/shared/ui/use-width";
import c from "@/lab/shared/charts/charts.module.css";

export type IntervalRow = { id: string; label: string; low: number; mid: number; high: number; color: string };

/**
 * Point estimates with their confidence intervals on one horizontal scale: a 2px whisker for the
 * interval, a dot for the estimate, values written out at the right. With `zero`, a reference line
 * at 0 shows at a glance whether an interval for a difference rules out "no change".
 */
export function IntervalChart({ rows, format, ariaLabel, zero = false }: { rows: IntervalRow[]; format: (v: number) => string; ariaLabel: string; zero?: boolean }) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const real = rows.filter((r) => isNum(r.low) && isNum(r.high) && isNum(r.mid));
  if (!real.length) return <div ref={ref} className={c.noData}>No data to show.</div>;
  const narrow = width < 480;
  const labelW = narrow ? 0 : 120;
  const valueW = narrow ? 0 : 150;
  const band = narrow ? 52 : 38;
  const top = 6;
  const bottom = 24;
  const height = top + real.length * band + bottom;
  const lo = Math.min(...real.map((r) => r.low), zero ? 0 : Infinity);
  const hi = Math.max(...real.map((r) => r.high), zero ? 0 : -Infinity);
  const pad = (hi - lo) * 0.08 || Math.abs(hi) * 0.1 || 0.01;
  const { ticks, domain } = niceTicks(lo - pad, hi + pad, narrow ? 3 : 4);
  const x = linearScale(domain, [labelW + 10, width - valueW - 10]);

  return (
    <div ref={ref} className={c.plot}>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={ariaLabel}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={x(t)} x2={x(t)} y1={top} y2={height - bottom} className={zero && t === 0 ? c.baseline : c.grid} />
            <text x={x(t)} y={height - 6} textAnchor="middle" className={c.tick}>
              {format(t)}
            </text>
          </g>
        ))}
        {zero && !ticks.includes(0) && <line x1={x(0)} x2={x(0)} y1={top} y2={height - bottom} className={c.reference} />}
        {real.map((r, i) => {
          const yMid = top + i * band + (narrow ? band - 16 : band / 2);
          const text = `${format(r.mid)} (${format(r.low)} to ${format(r.high)})`;
          return (
            <g key={r.id} tabIndex={0} role="img" aria-label={`${r.label}: ${text}`} className={c.barGroup}>
              {narrow ? (
                <text x={0} y={top + i * band + 12} className={c.catLabelStart}>
                  {r.label} · {text}
                </text>
              ) : (
                <text x={labelW} y={yMid} dy="0.32em" textAnchor="end" className={c.catLabel}>
                  {r.label}
                </text>
              )}
              <line x1={x(r.low)} x2={x(r.high)} y1={yMid} y2={yMid} stroke={r.color} strokeWidth="2" strokeLinecap="round" />
              <line x1={x(r.low)} x2={x(r.low)} y1={yMid - 6} y2={yMid + 6} stroke={r.color} strokeWidth="2" />
              <line x1={x(r.high)} x2={x(r.high)} y1={yMid - 6} y2={yMid + 6} stroke={r.color} strokeWidth="2" />
              <circle cx={x(r.mid)} cy={yMid} r="5" fill={r.color} stroke="#fffdf8" strokeWidth="2" />
              {!narrow && (
                <text x={width - valueW} y={yMid} dy="0.32em" className={c.valueLabel}>
                  {text}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
