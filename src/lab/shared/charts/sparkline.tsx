import { isNum } from "@/lab/shared/lib/safe-math";
import { linearScale } from "@/lab/shared/lib/scale";
import s from "./charts.module.css";

/** A 12-ish point trend for a stat tile: de-emphasised line, the latest point in the accent. */
export function Sparkline({ values, label, width = 120, height = 30 }: { values: (number | null)[]; label: string; width?: number; height?: number }) {
  const real = values.filter(isNum);
  if (real.length < 2) return null;
  const min = Math.min(...real);
  const max = Math.max(...real);
  const x = linearScale([0, values.length - 1], [3, width - 3]);
  const y = linearScale([min, max === min ? min + 1 : max], [height - 4, 4]);
  let d = "";
  let pen = false;
  values.forEach((v, i) => {
    if (!isNum(v)) {
      pen = false;
      return;
    }
    d += `${pen ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`;
    pen = true;
  });
  const lastIndex = values.map((v, i) => (isNum(v) ? i : -1)).filter((i) => i >= 0).pop() ?? 0;
  const last = values[lastIndex] as number;
  return (
    <svg className={s.spark} width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={label}>
      <path d={d} fill="none" stroke="#bdb5d6" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={x(lastIndex)} cy={y(last)} r="3" fill="#5b3fd0" stroke="#fffdf8" strokeWidth="1.5" />
    </svg>
  );
}
