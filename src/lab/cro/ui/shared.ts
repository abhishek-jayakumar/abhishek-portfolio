/** Small helpers shared by the Conversion Experiment Studio modules. */

import type { Hypothesis } from "@/lab/cro/experiment";
import type { Filter, TestMetric } from "@/lab/cro/metrics";
import type { Dataset } from "@/lab/cro/generate";
import { PAGES, type PageId } from "@/lab/cro/model";

export const PAGE_OPTIONS = PAGES.map((p) => ({ value: p.id, label: p.label }));

/** A hypothesis handed to the builder (from the journey or the assistant). `v` remounts the builder with it. */
export type Draft = { v: number; page: PageId; metric: TestMetric; hypothesis: Hypothesis };

/** A plan handed from the builder to the analysis. */
export type PlanHandoff = { planned: number; mde: number; alpha: number; baseline: number; page: PageId };

export type ModuleProps = { data: Dataset; filter: Filter };
