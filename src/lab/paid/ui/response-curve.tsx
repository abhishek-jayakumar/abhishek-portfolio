"use client";

import { isNum } from "@/lab/shared/lib/safe-math";
import { formatNumber } from "@/lab/shared/lib/format";
import { linearScale, niceTicks } from "@/lab/shared/lib/scale";
import { useWidth } from "@/lab/shared/ui/use-width";
import { WEEKS_PER_MONTH, predictLeads, type Curve } from "@/lab/paid/metrics";
import c from "@/lab/shared/charts/charts.module.css";
import { usd } from "./shared";

/**
 * One campaign's weekly spend against weekly leads: the real weeks as dots, the fitted
 * diminishing-returns curve as a line, today's spend and the plan as marked points.
 */
export function ResponseCurve({ curve, plan, color }: { curve: Curve; plan: number; color: string }) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const height = 240;
  const m = { top: 14, right: 16, bottom: 40, left: 48 };
  const today = curve.weeklySpend;
  const planned = plan / WEEKS_PER_MONTH;
  const xMax = Math.max(curve.maxWeekly, planned, today) * 1.1;
  const atWeek = (sp: number) => predictLeads(curve, sp * WEEKS_PER_MONTH) / WEEKS_PER_MONTH;
  const yMax = Math.max(...curve.points.map((p) => p.leads), atWeek(xMax));
  const xt = niceTicks(0, xMax, 4);
  const yt = niceTicks(0, yMax || 1, 4);
  const x = linearScale(xt.domain, [m.left, width - m.right]);
  const y = linearScale(yt.domain, [height - m.bottom, m.top]);
  const steps = 60;
  let d = "";
  for (let i = 0; i <= steps; i++) {
    const sp = (xt.domain[1] * i) / steps;
    const v = atWeek(sp);
    if (isNum(v)) d += `${i ? "L" : "M"}${x(sp).toFixed(1)},${y(v).toFixed(1)}`;
  }
  return (
    <div ref={ref} className={c.plot}>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${curve.campaign}: weekly leads against weekly spend, ${curve.points.length} weeks and the fitted curve`}>
        {yt.ticks.map((t) => (
          <g key={`y${t}`}>
            <line x1={m.left} x2={width - m.right} y1={y(t)} y2={y(t)} className={t === 0 ? c.baseline : c.grid} />
            <text x={m.left - 8} y={y(t)} dy="0.32em" textAnchor="end" className={c.tick}>
              {formatNumber(t)}
            </text>
          </g>
        ))}
        {xt.ticks.map((t) => (
          <text key={`x${t}`} x={x(t)} y={height - m.bottom + 16} textAnchor="middle" className={c.tick}>
            {usd(t, t >= 1000)}
          </text>
        ))}
        <text x={(m.left + width - m.right) / 2} y={height - 4} textAnchor="middle" className={c.tick}>
          Spend per week → leads per week
        </text>
        {/* Range the curve was measured over */}
        <rect x={x(curve.minWeekly)} y={m.top} width={Math.max(1, x(curve.maxWeekly) - x(curve.minWeekly))} height={height - m.bottom - m.top} fill={color} opacity="0.06" />
        <path d={d} fill="none" stroke={color} strokeWidth="2" />
        {curve.points.map((p, i) => (
          <circle key={i} cx={x(p.spend)} cy={y(p.leads)} r="3.5" fill="#fffdf8" stroke={color} strokeWidth="1.5" />
        ))}
        <g>
          <circle cx={x(today)} cy={y(atWeek(today))} r="5" fill="#1d1736" stroke="#fffdf8" strokeWidth="2" />
          <text x={x(today)} y={y(atWeek(today)) + 18} textAnchor="middle" className={c.tick}>
            today
          </text>
        </g>
        {Math.abs(planned - today) > today * 0.02 && (
          <g>
            <circle cx={x(planned)} cy={y(atWeek(planned))} r="5.5" fill={color} stroke="#fffdf8" strokeWidth="2" />
            <text x={x(planned)} y={y(atWeek(planned)) - 10} textAnchor="middle" className={c.valueLabel}>
              plan
            </text>
          </g>
        )}
      </svg>
    </div>
  );
}
