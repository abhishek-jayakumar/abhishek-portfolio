"use client";

import { useMemo, useState } from "react";
import { getExperiment } from "@/lab/experiments";
import { getDataset } from "@/lab/growth/generate";
import { CHANNELS, COUNTRIES, END_DAY, dayToIso } from "@/lab/growth/model";
import { DEFAULT_ASSUMPTIONS, RANGES, type Assumptions, type Filter, type RangeDays } from "@/lab/growth/metrics";
import { formatDay } from "@/lab/shared/lib/format";
import { FilterBar, Segmented, SelectField } from "@/lab/shared/ui/controls";
import { ModulePanel, ModuleTabs, useModule } from "@/lab/shared/ui/module-tabs";
import { track } from "@/lib/track";
import s from "@/lab/shared/ui/lab.module.css";
import { Overview } from "./overview";
import { Acquisition } from "./acquisition";
import { Channels } from "./channels";
import { Funnel } from "./funnel";
import { Economics } from "./economics";
import { Analyst } from "./analyst";

const EXP = getExperiment("growth-intelligence");
const DEFAULT_FILTER: Filter = { range: 90, channel: "all", country: "all" };

/**
 * The Growth Intelligence Workbench. One set of filters scopes every module, so the numbers on
 * every tab agree; the unit-economics assumptions are shared with the Analyst for the same reason.
 */
export function Workbench() {
  const data = useMemo(() => getDataset(), []);
  const [filter, setFilter] = useState<Filter>(DEFAULT_FILTER);
  const [assumptions, setAssumptions] = useState<Assumptions>(DEFAULT_ASSUMPTIONS);
  const [active, select] = useModule(EXP.modules, EXP.slug);

  const set = <K extends keyof Filter>(k: K, v: Filter[K]) => {
    setFilter((f) => ({ ...f, [k]: v }));
    track("lab_filter", `${k}:${String(v)}`);
  };
  const changed = filter.range !== DEFAULT_FILTER.range || filter.channel !== "all" || filter.country !== "all";
  const props = { data, filter, assumptions };

  return (
    <>
      <FilterBar label="Filters for every module">
        <Segmented label="Date range" options={RANGES.map((r) => ({ value: String(r.value), label: r.label }))} value={String(filter.range)} onChange={(v) => set("range", Number(v) as RangeDays)} />
        <SelectField label="Channel" value={filter.channel} onChange={(v) => set("channel", v)} options={[{ value: "all", label: "All channels" }, ...CHANNELS.map((c) => ({ value: c.id, label: c.label }))]} />
        <SelectField label="Country" value={filter.country} onChange={(v) => set("country", v)} options={[{ value: "all", label: "All countries" }, ...COUNTRIES.map((c) => ({ value: c.id, label: c.label }))]} />
        {changed && (
          <button type="button" className={s.btnGhost} onClick={() => setFilter(DEFAULT_FILTER)}>
            Reset filters
          </button>
        )}
        <p className={s.note} style={{ flexBasis: "100%" }}>
          Data runs to {formatDay(dayToIso(END_DAY))} 2026. Changes compare the selected {filter.range} days with the {filter.range} days before.
        </p>
      </FilterBar>

      <ModuleTabs modules={EXP.modules} active={active} onSelect={select} label="Workbench modules" />

      {EXP.modules.map((m) => (
        <ModulePanel key={m.id} module={m} active={active}>
          {m.id === "overview" && <Overview {...props} />}
          {m.id === "acquisition" && <Acquisition {...props} />}
          {m.id === "channels" && <Channels {...props} />}
          {m.id === "funnel" && <Funnel {...props} />}
          {m.id === "economics" && <Economics {...props} onAssumptions={setAssumptions} />}
          {m.id === "analyst" && <Analyst {...props} onOpen={select} />}
        </ModulePanel>
      ))}
    </>
  );
}
