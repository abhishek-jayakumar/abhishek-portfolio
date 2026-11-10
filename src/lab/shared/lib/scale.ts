/** Scales and tick generation for the hand-built SVG charts. */

export type LinearScale = ((v: number) => number) & { domain: [number, number]; range: [number, number] };

export function linearScale(domain: [number, number], range: [number, number]): LinearScale {
  const [d0, d1] = domain;
  const [r0, r1] = range;
  const span = d1 - d0;
  const fn = ((v: number) => (span === 0 ? (r0 + r1) / 2 : r0 + ((v - d0) / span) * (r1 - r0))) as LinearScale;
  fn.domain = domain;
  fn.range = range;
  return fn;
}

/** "Nice" step for a span: 1, 2, 2.5 or 5 × 10^k. */
function niceStep(span: number, count: number): number {
  const raw = span / Math.max(1, count);
  const mag = 10 ** Math.floor(Math.log10(raw));
  const f = raw / mag;
  const nice = f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10;
  return nice * mag;
}

/**
 * Round ticks covering [min, max]. The domain grows to the outer ticks so bars and lines never
 * run off the axis. A zero-span domain still gets a usable axis.
 */
export function niceTicks(min: number, max: number, count = 4): { ticks: number[]; domain: [number, number] } {
  if (!Number.isFinite(min) || !Number.isFinite(max)) return { ticks: [0, 1], domain: [0, 1] };
  if (min === max) {
    if (min === 0) return { ticks: [0, 1], domain: [0, 1] };
    const pad = Math.abs(min) * 0.5;
    return niceTicks(Math.min(0, min - pad), max + pad, count);
  }
  const step = niceStep(max - min, count);
  const lo = Math.floor(min / step) * step;
  const hi = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  for (let v = lo; v <= hi + step / 2; v += step) ticks.push(Number(v.toPrecision(12)));
  return { ticks, domain: [lo, hi] };
}
