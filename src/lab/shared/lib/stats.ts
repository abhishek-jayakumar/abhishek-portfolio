/**
 * Statistics for reading experiments honestly. Two-proportion z-test, Wilson intervals and the
 * classic sample-size formula: enough to say "B converts better" only when the data supports it,
 * and to say "not enough data yet" when it doesn't. Tested against textbook values.
 */

/** Standard normal CDF, Φ(z) (Abramowitz–Stegun 7.1.26 erf approximation, |error| < 1.5e-7). */
export function normalCdf(z: number): number {
  const sign = z < 0 ? -1 : 1;
  const x = Math.abs(z) / Math.SQRT2;
  const t = 1 / (1 + 0.3275911 * x);
  const y = 1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
  return 0.5 * (1 + sign * y);
}

/** Inverse of Φ (Acklam's rational approximation, relative error < 1.2e-9). */
export function normalQuantile(p: number): number {
  if (p <= 0 || p >= 1) throw new RangeError("p must be between 0 and 1");
  const a = [-39.69683028665376, 220.9460984245205, -275.9285104469687, 138.357751867269, -30.66479806614716, 2.506628277459239];
  const b = [-54.47609879822406, 161.5858368580409, -155.6989798598866, 66.80131188771972, -13.28068155288572];
  const c = [-0.007784894002430293, -0.3223964580411365, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
  const d = [0.007784695709041462, 0.3224671290700398, 2.445134137142996, 3.754408661907416];
  const lo = 0.02425;
  if (p < lo) {
    const q = Math.sqrt(-2 * Math.log(p));
    return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }
  if (p > 1 - lo) return -normalQuantile(1 - p);
  const q = p - 0.5;
  const r = q * q;
  return ((((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q) / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
}

/** Wilson score interval for a proportion x / n. Null when n is 0. */
export function wilsonInterval(x: number, n: number, confidence = 0.95): { low: number; high: number } | null {
  if (n <= 0 || x < 0 || x > n) return null;
  const z = normalQuantile(1 - (1 - confidence) / 2);
  const p = x / n;
  const denom = 1 + (z * z) / n;
  const centre = (p + (z * z) / (2 * n)) / denom;
  const half = (z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n))) / denom;
  return { low: Math.max(0, centre - half), high: Math.min(1, centre + half) };
}

export type ProportionTest = {
  rateA: number;
  rateB: number;
  /** rateB − rateA, as a fraction (0.02 = two percentage points). */
  absoluteLift: number;
  /** (rateB − rateA) ÷ rateA; null when A converted nobody. */
  relativeLift: number | null;
  z: number;
  /** Two-sided p-value. */
  pValue: number;
  /** Confidence interval for the absolute difference (unpooled standard error). */
  diffInterval: { low: number; high: number };
};

/** Two-sided two-proportion z-test (pooled SE for the test, unpooled for the interval). Null if undefined. */
export function twoProportionTest(convA: number, nA: number, convB: number, nB: number, confidence = 0.95): ProportionTest | null {
  if (nA <= 0 || nB <= 0 || convA < 0 || convB < 0 || convA > nA || convB > nB) return null;
  const rateA = convA / nA;
  const rateB = convB / nB;
  const pooled = (convA + convB) / (nA + nB);
  const sePooled = Math.sqrt(pooled * (1 - pooled) * (1 / nA + 1 / nB));
  const diff = rateB - rateA;
  const z = sePooled === 0 ? 0 : diff / sePooled;
  const pValue = sePooled === 0 ? 1 : 2 * (1 - normalCdf(Math.abs(z)));
  const seDiff = Math.sqrt((rateA * (1 - rateA)) / nA + (rateB * (1 - rateB)) / nB);
  const zc = normalQuantile(1 - (1 - confidence) / 2);
  return {
    rateA,
    rateB,
    absoluteLift: diff,
    relativeLift: rateA === 0 ? null : diff / rateA,
    z,
    pValue,
    diffInterval: { low: diff - zc * seDiff, high: diff + zc * seDiff },
  };
}

/**
 * Visitors needed per variant to detect a relative lift `mde` on a baseline rate, two-sided.
 * Classic formula with separate variances. Null for impossible inputs.
 */
export function sampleSizePerVariant(baseline: number, mde: number, alpha = 0.05, power = 0.8): number | null {
  const p1 = baseline;
  const p2 = baseline * (1 + mde);
  if (p1 <= 0 || p1 >= 1 || p2 <= 0 || p2 >= 1 || mde === 0) return null;
  const za = normalQuantile(1 - alpha / 2);
  const zb = normalQuantile(power);
  const pBar = (p1 + p2) / 2;
  const n = (za * Math.sqrt(2 * pBar * (1 - pBar)) + zb * Math.sqrt(p1 * (1 - p1) + p2 * (1 - p2))) ** 2 / (p2 - p1) ** 2;
  return Math.ceil(n);
}
