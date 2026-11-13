"use client";

import { useMemo, useState } from "react";
import { getExperiment } from "@/lab/experiments";
import { demoAccount } from "@/lab/paid/generate";
import { PLATFORMS, dayToIso, type Account } from "@/lab/paid/model";
import { RANGES, periods, span, type Filter, type RangeDays } from "@/lab/paid/metrics";
import type { ImportResult } from "@/lab/paid/import";
import { formatDay } from "@/lab/shared/lib/format";
import { FilterBar, Segmented, SelectField } from "@/lab/shared/ui/controls";
import { ModulePanel, ModuleTabs, useModule } from "@/lab/shared/ui/module-tabs";
import { track } from "@/lib/track";
import s from "@/lab/shared/ui/lab.module.css";
import p from "./paid.module.css";
import { ImportPanel } from "./import-panel";
import { Analytics } from "./analytics";
import { Compare } from "./compare";
import { Budget } from "./budget";
import { Analyst } from "./analyst";

const EXP = getExperiment("paid-media-studio");
const DEFAULT_FILTER: Filter = { range: 90, platform: "all" };

/**
 * The Paid Media Optimisation Studio. One account (the demo, or the visitor's imported exports)
 * and one set of filters feed every module, so the numbers on every tab agree.
 */
export function Studio() {
  const demo = useMemo(() => demoAccount(), []);
  const [account, setAccount] = useState<Account>(demo);
  const [imports, setImports] = useState<ImportResult[]>([]);
  const [filter, setFilter] = useState<Filter>(DEFAULT_FILTER);
  const [active, select] = useModule(EXP.modules, EXP.slug);

  const set = <K extends keyof Filter>(k: K, v: Filter[K]) => {
    setFilter((f) => ({ ...f, [k]: v }));
    track("lab_filter", `${k}:${String(v)}`);
  };
  const applyAccount = (a: Account) => {
    setAccount(a);
    // An import may not have the platform that was selected.
    setFilter((f) => (f.platform === "all" || a.rows.some((r) => r.platform === f.platform) ? f : { ...f, platform: "all" }));
  };
  const backToDemo = () => {
    applyAccount(demo);
    track("lab_paid_source", "demo");
  };

  const present = PLATFORMS.filter((pl) => account.rows.some((r) => r.platform === pl.id));
  const sp = span(account.rows);
  const per = periods(account.rows, filter.range);
  const changed = filter.range !== DEFAULT_FILTER.range || filter.platform !== "all";
  const props = { account, filter };
  // Remount the stateful modules when the data underneath them changes.
  const dataKey = `${account.source}-${account.label}-${account.rows.length}`;

  return (
    <>
      <FilterBar label="Filters for every module">
        <Segmented label="Date range" options={RANGES.map((r) => ({ value: String(r.value), label: r.label }))} value={String(filter.range)} onChange={(v) => set("range", Number(v) as RangeDays)} />
        <SelectField
          label="Platform"
          value={filter.platform}
          onChange={(v) => set("platform", v)}
          options={[{ value: "all", label: "All platforms" }, ...present.map((pl) => ({ value: pl.id, label: pl.label }))]}
        />
        {changed && (
          <button type="button" className={s.btnGhost} onClick={() => setFilter(DEFAULT_FILTER)}>
            Reset filters
          </button>
        )}
        <div className={p.source}>
          <span className={account.source === "demo" ? p.pill : p.pillImport}>{account.source === "demo" ? "Demo account" : "Your import"}</span>
          {sp && (
            <span className={s.note}>
              {account.source === "import" ? `${account.label}. ` : ""}Data runs {formatDay(dayToIso(sp.from))} to {formatDay(dayToIso(sp.to))} {dayToIso(sp.to).slice(0, 4)}.
              {per?.previous ? ` Changes compare the selected ${filter.range} days with the ${filter.range} days before.` : " No earlier period of the same length to compare with."}
            </span>
          )}
          {account.source === "import" && (
            <button type="button" className={s.linkBtn} onClick={backToDemo}>
              Back to demo data <span aria-hidden="true">↺</span>
            </button>
          )}
        </div>
      </FilterBar>

      <ModuleTabs modules={EXP.modules} active={active} onSelect={select} label="Studio modules" />

      {EXP.modules.map((m) => (
        <ModulePanel key={m.id} module={m} active={active}>
          {m.id === "import" && <ImportPanel demo={demo} account={account} imports={imports} onImports={setImports} onUse={applyAccount} onDemo={backToDemo} onOpen={select} />}
          {m.id === "analytics" && <Analytics {...props} />}
          {m.id === "compare" && <Compare {...props} />}
          {m.id === "budget" && <Budget key={`${dataKey}-${filter.platform}`} {...props} />}
          {m.id === "analyst" && <Analyst {...props} onOpen={select} />}
        </ModulePanel>
      ))}
    </>
  );
}
