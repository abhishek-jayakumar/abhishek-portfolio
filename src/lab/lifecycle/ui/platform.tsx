"use client";

import { useMemo, useState } from "react";
import { getExperiment } from "@/lab/experiments";
import { getDataset } from "@/lab/lifecycle/generate";
import { CHANNELS, END_DAY, dayToIso } from "@/lab/lifecycle/model";
import { ALL, SEGMENTS, type Filter } from "@/lab/lifecycle/metrics";
import { formatDay } from "@/lab/shared/lib/format";
import { FilterBar, SelectField } from "@/lab/shared/ui/controls";
import { ModulePanel, ModuleTabs, useModule } from "@/lab/shared/ui/module-tabs";
import { track } from "@/lib/track";
import s from "@/lab/shared/ui/lab.module.css";
import { Segments } from "./segments";
import { Retention } from "./retention";
import { Behaviour } from "./behaviour";
import { Journeys } from "./journeys";
import { Assistant } from "./assistant";

const EXP = getExperiment("customer-lifecycle");

/**
 * Customer Lifecycle Intelligence. One filter (acquisition channel and segment) scopes every
 * module, and picking a segment anywhere (a segment card, the journey builder, an assistant
 * finding) sets that same filter, so every tab is always talking about the same customers.
 */
export function Platform() {
  const data = useMemo(() => getDataset(), []);
  const [filter, setFilter] = useState<Filter>(ALL);
  const [active, select] = useModule(EXP.modules, EXP.slug);

  const set = <K extends keyof Filter>(k: K, v: Filter[K]) => {
    setFilter((f) => ({ ...f, [k]: v }));
    track("lab_filter", `${k}:${String(v)}`);
  };
  const onSegment = (v: Filter["segment"]) => set("segment", v);
  const changed = filter.channel !== "all" || filter.segment !== "all";
  const props = { data, filter, onSegment, onOpen: select };

  return (
    <>
      <FilterBar label="Filters for every module">
        <SelectField label="Acquisition channel" value={filter.channel} onChange={(v) => set("channel", v)} options={[{ value: "all", label: "All channels" }, ...CHANNELS.map((c) => ({ value: c.id, label: c.label }))]} />
        <SelectField label="Segment" value={filter.segment} onChange={onSegment} options={[{ value: "all", label: "All customers" }, ...SEGMENTS.map((sg) => ({ value: sg.id, label: sg.label }))]} />
        {changed && (
          <button type="button" className={s.btnGhost} onClick={() => setFilter(ALL)}>
            Reset filters
          </button>
        )}
        <p className={s.note} style={{ flexBasis: "100%" }}>
          Data runs from 1 Jan 2025 to {formatDay(dayToIso(END_DAY))} 2026. Segments are each customer&rsquo;s segment today; click a segment card to filter every module to it.
        </p>
      </FilterBar>

      <ModuleTabs modules={EXP.modules} active={active} onSelect={select} label="Platform modules" />

      {EXP.modules.map((m) => (
        <ModulePanel key={m.id} module={m} active={active}>
          {m.id === "segments" && <Segments {...props} />}
          {m.id === "retention" && <Retention {...props} />}
          {m.id === "behaviour" && <Behaviour {...props} />}
          {m.id === "journeys" && <Journeys {...props} />}
          {m.id === "assistant" && <Assistant {...props} />}
        </ModulePanel>
      ))}
    </>
  );
}
