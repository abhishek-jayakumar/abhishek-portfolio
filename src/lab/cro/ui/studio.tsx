"use client";

import { useMemo, useState } from "react";
import { getExperiment } from "@/lab/experiments";
import { getDataset } from "@/lab/cro/generate";
import { runAssistant, type Fix } from "@/lab/cro/insights";
import { ALL, type Filter } from "@/lab/cro/metrics";
import { DEVICES, SOURCES, END_ISO, DAYS, type PageId } from "@/lab/cro/model";
import { formatDay } from "@/lab/shared/lib/format";
import { FilterBar, SelectField } from "@/lab/shared/ui/controls";
import { ModulePanel, ModuleTabs, useModule } from "@/lab/shared/ui/module-tabs";
import { track } from "@/lib/track";
import s from "@/lab/shared/ui/lab.module.css";
import { Pages } from "./pages";
import { Journey } from "./journey";
import { Builder } from "./builder";
import { Analysis } from "./analysis";
import { Assistant } from "./assistant";
import type { Draft, PlanHandoff } from "./shared";

const EXP = getExperiment("conversion-studio");

/**
 * The Conversion Experiment Studio. One device/source filter scopes every module; the selected page
 * is shared, so picking it in one module carries to the next. A hypothesis flows from the journey or
 * the assistant into the builder, and a plan flows from the builder into the analysis.
 */
export function Studio() {
  const data = useMemo(() => getDataset(), []);
  const [filter, setFilter] = useState<Filter>(ALL);
  const [page, setPage] = useState<PageId>("trial");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [plan, setPlan] = useState<PlanHandoff | null>(null);
  const [active, select] = useModule(EXP.modules, EXP.slug);
  const fixes = useMemo(() => runAssistant(data, filter), [data, filter]);

  const set = <K extends keyof Filter>(k: K, v: Filter[K]) => {
    setFilter((f) => ({ ...f, [k]: v }));
    track("lab_filter", `${k}:${String(v)}`);
  };
  const test = (fix: Fix) => {
    setDraft((d) => ({ v: (d?.v ?? 0) + 1, page: fix.page, metric: fix.metric, hypothesis: fix.hypothesis }));
    setPage(fix.page);
    select("builder");
    track("lab_cro_draft", fix.finding.id);
  };
  const changed = filter.device !== "all" || filter.source !== "all";
  const props = { data, filter };

  return (
    <>
      <FilterBar label="Filters for every module">
        <SelectField label="Device" value={filter.device} onChange={(v) => set("device", v)} options={[{ value: "all", label: "All devices" }, ...DEVICES.map((d) => ({ value: d.id, label: d.label }))]} />
        <SelectField label="Traffic source" value={filter.source} onChange={(v) => set("source", v)} options={[{ value: "all", label: "All sources" }, ...SOURCES.map((x) => ({ value: x.id, label: x.label }))]} />
        {changed && (
          <button type="button" className={s.btnGhost} onClick={() => setFilter(ALL)}>
            Reset filters
          </button>
        )}
        <p className={s.note} style={{ flexBasis: "100%" }}>
          The last {DAYS} days of landing-page traffic, to {formatDay(END_ISO)} 2026.
        </p>
      </FilterBar>

      <ModuleTabs modules={EXP.modules} active={active} onSelect={select} label="Studio modules" />

      {EXP.modules.map((m) => (
        <ModulePanel key={m.id} module={m} active={active}>
          {m.id === "pages" && <Pages {...props} page={page} onPage={setPage} onOpen={select} />}
          {m.id === "journey" && <Journey {...props} page={page} onPage={setPage} fixes={fixes} onTest={test} />}
          {m.id === "builder" && (
            <Builder
              key={draft?.v ?? 0}
              {...props}
              draft={draft}
              page={page}
              onPlan={(p) => {
                setPlan(p);
              }}
            />
          )}
          {m.id === "analysis" && <Analysis key={plan ? `${plan.page}-${plan.planned}` : "none"} plan={plan} />}
          {m.id === "assistant" && <Assistant {...props} fixes={fixes} page={page} onPage={setPage} onTest={test} />}
        </ModulePanel>
      ))}
    </>
  );
}
