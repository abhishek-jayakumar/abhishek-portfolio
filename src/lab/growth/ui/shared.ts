/** Small helpers shared by the Growth Intelligence Workbench modules. */

import { formatCurrency, formatDay, formatMonth } from "@/lab/shared/lib/format";
import { SERIES } from "@/lab/shared/lib/palette";
import { CHANNELS, dayToIso, type ChannelId } from "@/lab/growth/model";
import type { Bucket, Granularity } from "@/lab/growth/metrics";

export const usd = (v: number | null | undefined, compact = false) => formatCurrency(v ?? null, "USD", { compact });

/** A channel keeps its colour everywhere, whatever is filtered (colour follows the entity, not its rank). */
export const CHANNEL_COLOR: Record<ChannelId, string> = Object.fromEntries(CHANNELS.map((c, i) => [c.id, SERIES[i]])) as Record<ChannelId, string>;

export function bucketLabel(b: Bucket, g: Granularity): string {
  if (g === "month") return formatMonth(b.label);
  return formatDay(b.label);
}

export function bucketTitle(b: Bucket, g: Granularity): string {
  if (g === "day") return formatDay(b.label);
  if (g === "month") return formatMonth(b.label);
  return `${formatDay(dayToIso(b.from))} – ${formatDay(dayToIso(b.to))}`;
}
