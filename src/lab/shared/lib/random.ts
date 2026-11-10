/**
 * A small seeded random generator (mulberry32). The synthetic datasets are generated from a fixed
 * seed, so every visitor sees the same fictional business, IDs stay stable between renders, and
 * a finding the analyst makes today is still true tomorrow.
 */

export type Rng = {
  /** Uniform in [0, 1). */
  next: () => number;
  float: (min: number, max: number) => number;
  /** Integer in [min, max], inclusive. */
  int: (min: number, max: number) => number;
  chance: (p: number) => boolean;
  /** Normally distributed (Box–Muller). */
  normal: (mean: number, sd: number) => number;
  /** Poisson-distributed count (Knuth for small λ, normal approximation above 30). */
  poisson: (lambda: number) => number;
  /** Binomial count of successes out of n trials with probability p. */
  binomial: (n: number, p: number) => number;
  pick: <T>(items: readonly T[]) => T;
  weighted: <T>(items: readonly T[], weights: readonly number[]) => T;
};

export function createRng(seed: number): Rng {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const normal = (mean: number, sd: number) => {
    let u = 0;
    while (u === 0) u = next();
    const v = next();
    return mean + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };
  const poisson = (lambda: number) => {
    if (lambda <= 0) return 0;
    if (lambda > 30) return Math.max(0, Math.round(normal(lambda, Math.sqrt(lambda))));
    const limit = Math.exp(-lambda);
    let k = 0;
    let p = 1;
    do {
      k++;
      p *= next();
    } while (p > limit);
    return k - 1;
  };
  const binomial = (n: number, p: number) => {
    if (n <= 0 || p <= 0) return 0;
    if (p >= 1) return n;
    if (n > 60) {
      const m = n * p;
      const sd = Math.sqrt(n * p * (1 - p));
      return Math.min(n, Math.max(0, Math.round(normal(m, sd))));
    }
    let k = 0;
    for (let i = 0; i < n; i++) if (next() < p) k++;
    return k;
  };
  return {
    next,
    float: (min, max) => min + (max - min) * next(),
    int: (min, max) => Math.floor(min + (max - min + 1) * next()),
    chance: (p) => next() < p,
    normal,
    poisson,
    binomial,
    pick: (items) => items[Math.floor(next() * items.length)],
    weighted: (items, weights) => {
      const total = weights.reduce((s, w) => s + w, 0);
      let r = next() * total;
      for (let i = 0; i < items.length; i++) {
        r -= weights[i];
        if (r < 0) return items[i];
      }
      return items[items.length - 1];
    },
  };
}

/** A stable, readable ID: prefix + zero-padded counter ("LD-000042"). */
export function makeId(prefix: string, n: number, width = 6): string {
  return `${prefix}-${String(n).padStart(width, "0")}`;
}
