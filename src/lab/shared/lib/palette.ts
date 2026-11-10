/**
 * Chart colours for the Lab, derived from the site's violet and brass and validated with the
 * dataviz palette checker against the card surface (#fffdf8): every adjacent pair clears the
 * colour-blind separation target (worst ΔE 10.6) and the normal-vision floor (worst 18.3), and
 * every slot clears 3:1 contrast. The ORDER is part of that result: assign slots in order, never
 * cycle, and keep an entity's colour fixed when filters change.
 */

export const SERIES = [
  "#5b3fd0", // violet (the site's primary)
  "#e0703a", // orange
  "#1a9e8a", // teal
  "#b5801a", // deep brass
  "#d0588e", // pink
  "#3b8a2e", // green
  "#2a78d6", // blue
  "#d64545", // red
] as const;

/** Ordinal violet ramp (funnel stages, tiers): light → dark, the light end clears 2:1 on the card. */
export const ORDINAL = ["#a08ce6", "#7a5fdc", "#5b3fd0", "#3f2a9e", "#2a1b66"] as const;

/** Sequential violet ramp (heatmaps): the lightest step means "near zero" and may recede. */
export const SEQUENTIAL = ["#f1ecfb", "#d9cff6", "#bba9ee", "#9a83e3", "#7a5fdc", "#5b3fd0", "#41299f", "#2a1b66"] as const;

/** Status colours: reserved for state, never a series, always with an icon and a word. */
export const STATUS = {
  good: "#0ca30c",
  warning: "#fab219",
  serious: "#ec835a",
  critical: "#d03b3b",
  info: "#5b3fd0",
} as const;
export type Status = keyof typeof STATUS;

/** Text on top of a sequential cell: white on the dark half, ink on the light half. */
export function inkOn(fill: string): string {
  const i = SEQUENTIAL.indexOf(fill as (typeof SEQUENTIAL)[number]);
  return i >= 4 ? "#ffffff" : "#1d1736";
}

/** Pick a sequential step for a 0–1 value (null → the lightest, drawn as "no data" by callers). */
export function sequentialFor(t: number | null): string {
  if (t === null || !Number.isFinite(t)) return SEQUENTIAL[0];
  const i = Math.min(SEQUENTIAL.length - 1, Math.max(0, Math.round(t * (SEQUENTIAL.length - 1))));
  return SEQUENTIAL[i];
}
