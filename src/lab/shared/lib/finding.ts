import type { Status } from "./palette.ts";

/** One piece of evidence behind a finding: the metric, its value, and what it is compared with. */
export type Evidence = { label: string; value: string; context?: string };

/** A rule-based finding. Every number in it comes from a calculation; `rule` says which. */
export type Finding = {
  id: string;
  status: Status;
  title: string;
  /** What the numbers show, in a sentence or two. */
  summary: string;
  /** What to do about it. */
  recommendation?: string;
  evidence: Evidence[];
  /** Which rule produced it, so the reasoning is inspectable. */
  rule: string;
};

const ORDER: Record<Status, number> = { critical: 0, serious: 1, warning: 2, info: 4, good: 3 };

/** Most urgent first; "working" and notes last. */
export function byUrgency(a: Finding, b: Finding): number {
  return ORDER[a.status] - ORDER[b.status];
}
