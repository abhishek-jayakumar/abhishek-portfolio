"use client";

import { useState, type KeyboardEvent, type PointerEvent } from "react";
import { isNum } from "@/lab/shared/lib/safe-math";
import { linearScale, niceTicks } from "@/lab/shared/lib/scale";
import { useWidth } from "@/lab/shared/ui/use-width";
import { Tooltip } from "./tooltip";
import s from "./charts.module.css";

export type LineSeries = { id: string; label: string; color: string; values: (number | null)[] };

/**
 * Lines over ordered categories (days, weeks, months). 2px lines, one y-axis, recessive grid.
 * A crosshair snaps to the nearest x on hover (or arrow keys when focused) and the tooltip lists
 * every series there. With up to four series, ends are labelled directly where they don't collide.
 */
export function LineChart({
  series,
  labels,
  format,
  tickFormat,
  height = 240,
  area = false,
  ariaLabel,
  zeroBased = true,
}: {
  series: LineSeries[];
  labels: string[];
  format: (v: number) => string;
  tickFormat?: (v: number) => string;
  height?: number;
  area?: boolean;
  ariaLabel: string;
  zeroBased?: boolean;
}) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const n = labels.length;
  const values = series.flatMap((sr) => sr.values.filter(isNum));
  const endLabels = series.length <= 4 && width >= 420;
  const m = { top: 12, right: endLabels ? 92 : 14, bottom: 28, left: 52 };
  const innerW = Math.max(10, width - m.left - m.right);
  const innerH = height - m.top - m.bottom;

  if (!n || !values.length) return <div ref={ref} className={s.noData}>No data for this selection.</div>;

  const lo = zeroBased ? Math.min(0, ...values) : Math.min(...values);
  const { ticks, domain } = niceTicks(lo, Math.max(...values), 4);
  const y = linearScale(domain, [m.top + innerH, m.top]);
  const x = linearScale([0, Math.max(1, n - 1)], [m.left, m.left + innerW]);
  const tf = tickFormat ?? format;

  const pathFor = (vals: (number | null)[]) => {
    let d = "";
    let pen = false;
    vals.forEach((v, i) => {
      if (!isNum(v)) {
        pen = false;
        return;
      }
      d += `${pen ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`;
      pen = true;
    });
    return d;
  };

  // X labels: as many as fit without crowding.
  const every = Math.max(1, Math.ceil(n / Math.max(2, Math.floor(innerW / 64))));

  // End labels, skipped where two would collide (the legend still carries identity).
  const placed: number[] = [];
  const ends = endLabels
    ? series
        .map((sr) => {
          const i = sr.values.map((v, k) => (isNum(v) ? k : -1)).filter((k) => k >= 0).pop();
          return i === undefined ? null : { sr, yPos: y(sr.values[i] as number), xPos: x(i) };
        })
        .filter((e): e is { sr: LineSeries; yPos: number; xPos: number } => e !== null)
        .sort((a, b) => a.yPos - b.yPos)
        .filter((e) => {
          if (placed.some((p) => Math.abs(p - e.yPos) < 14)) return false;
          placed.push(e.yPos);
          return true;
        })
    : [];

  const locate = (e: PointerEvent<SVGRectElement>) => {
    const box = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - box.left + m.left;
    setHover(Math.max(0, Math.min(n - 1, Math.round(((px - m.left) / innerW) * (n - 1)))));
  };
  const onKey = (e: KeyboardEvent<SVGRectElement>) => {
    if (e.key === "ArrowRight") setHover((h) => Math.min(n - 1, (h ?? -1) + 1));
    else if (e.key === "ArrowLeft") setHover((h) => Math.max(0, (h ?? n) - 1));
    else if (e.key === "Escape") setHover(null);
    else return;
    e.preventDefault();
  };

  return (
    <div ref={ref} className={s.plot}>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={ariaLabel}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={m.left} x2={m.left + innerW} y1={y(t)} y2={y(t)} className={t === 0 ? s.baseline : s.grid} />
            <text x={m.left - 8} y={y(t)} dy="0.32em" textAnchor="end" className={s.tick}>
              {tf(t)}
            </text>
          </g>
        ))}
        {labels.map((l, i) =>
          i % every === 0 || i === n - 1 ? (
            <text key={l + i} x={x(i)} y={height - 8} textAnchor={i === 0 ? "start" : i === n - 1 ? "end" : "middle"} className={s.tick}>
              {i !== n - 1 && i % every === 0 && n - 1 - i < every * 0.6 ? "" : l}
            </text>
          ) : null,
        )}
        {area &&
          series.length === 1 &&
          (() => {
            // One wash per unbroken run of values, so the shading never bridges missing data.
            const sr = series[0];
            const runs: number[][] = [];
            let cur: number[] = [];
            sr.values.forEach((v, i) => {
              if (isNum(v)) cur.push(i);
              else if (cur.length) {
                runs.push(cur);
                cur = [];
              }
            });
            if (cur.length) runs.push(cur);
            const base = y(Math.max(domain[0], 0));
            return runs
              .filter((r) => r.length > 1)
              .map((r) => (
                <path
                  key={r[0]}
                  d={`M${x(r[0])},${base}L${r.map((i) => `${x(i).toFixed(1)},${y(sr.values[i] as number).toFixed(1)}`).join("L")}L${x(r[r.length - 1])},${base}Z`}
                  fill={sr.color}
                  opacity="0.1"
                />
              ));
          })()}
        {series.map((sr) => (
          <path key={sr.id} d={pathFor(sr.values)} fill="none" stroke={sr.color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        ))}
        {ends.map((e) => (
          <g key={e.sr.id}>
            <circle cx={e.xPos} cy={e.yPos} r="4" fill={e.sr.color} stroke="#fffdf8" strokeWidth="2" />
            <text x={e.xPos + 9} y={e.yPos} dy="0.32em" className={s.endLabel}>
              {e.sr.label}
            </text>
          </g>
        ))}
        {hover !== null && (
          <g pointerEvents="none">
            <line x1={x(hover)} x2={x(hover)} y1={m.top} y2={m.top + innerH} className={s.crosshair} />
            {series.map((sr) =>
              isNum(sr.values[hover]) ? <circle key={sr.id} cx={x(hover)} cy={y(sr.values[hover] as number)} r="4.5" fill={sr.color} stroke="#fffdf8" strokeWidth="2" /> : null,
            )}
          </g>
        )}
        <rect
          x={m.left}
          y={m.top}
          width={innerW}
          height={innerH}
          fill="transparent"
          tabIndex={0}
          className={s.hit}
          aria-label={`${ariaLabel}. Use the left and right arrow keys to read values.`}
          onPointerMove={locate}
          onPointerDown={locate}
          onPointerLeave={() => setHover(null)}
          onFocus={() => setHover((h) => h ?? n - 1)}
          onBlur={() => setHover(null)}
          onKeyDown={onKey}
        />
      </svg>
      {hover !== null && (
        <Tooltip
          x={x(hover)}
          y={m.top}
          width={width}
          title={labels[hover]}
          rows={series.map((sr) => ({ label: sr.label, color: sr.color, value: isNum(sr.values[hover]) ? format(sr.values[hover] as number) : "—" }))}
        />
      )}
    </div>
  );
}
