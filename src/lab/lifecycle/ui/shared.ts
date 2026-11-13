/** Small helpers shared by the Customer Lifecycle Intelligence modules. */

import { formatCurrency } from "@/lab/shared/lib/format";
import { SERIES } from "@/lab/shared/lib/palette";
import type { Dataset } from "@/lab/lifecycle/generate";
import { SEGMENTS, type Filter, type SegmentId } from "@/lab/lifecycle/metrics";

export const inr = (v: number | null | undefined, compact = false) => formatCurrency(v ?? null, "INR", { compact });

/** A segment keeps its colour everywhere, whatever is filtered. */
export const SEGMENT_COLOR: Record<SegmentId, string> = Object.fromEntries(SEGMENTS.map((s, i) => [s.id, SERIES[i]])) as Record<SegmentId, string>;

export type ModuleProps = {
  data: Dataset;
  filter: Filter;
  onSegment: (s: Filter["segment"]) => void;
  onOpen: (module: string) => void;
};
