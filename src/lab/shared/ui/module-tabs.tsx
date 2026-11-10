"use client";

import { useCallback, useEffect, useState, type KeyboardEvent } from "react";
import { track } from "@/lib/track";
import type { LabModule } from "@/lab/experiments";
import s from "./lab.module.css";

/** The active module, kept in the URL hash so a module can be linked to and survives a refresh. */
export function useModule(modules: LabModule[], experiment: string) {
  const [active, setActive] = useState(modules[0].id);

  useEffect(() => {
    const fromHash = () => {
      const id = decodeURIComponent(window.location.hash.slice(1));
      if (modules.some((m) => m.id === id)) setActive(id);
    };
    fromHash();
    window.addEventListener("hashchange", fromHash);
    return () => window.removeEventListener("hashchange", fromHash);
  }, [modules]);

  const select = useCallback(
    (id: string) => {
      setActive(id);
      history.replaceState(null, "", `#${id}`);
      track("lab_module", `${experiment}:${id}`);
    },
    [experiment],
  );

  return [active, select] as const;
}

/** The module bar: a tablist that sticks under the site header while you work. */
export function ModuleTabs({ modules, active, onSelect, label }: { modules: LabModule[]; active: string; onSelect: (id: string) => void; label: string }) {
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const i = modules.findIndex((m) => m.id === active);
    let next = -1;
    if (e.key === "ArrowRight") next = (i + 1) % modules.length;
    else if (e.key === "ArrowLeft") next = (i - 1 + modules.length) % modules.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = modules.length - 1;
    if (next < 0) return;
    e.preventDefault();
    onSelect(modules[next].id);
    document.getElementById(`tab-${modules[next].id}`)?.focus();
  };

  return (
    <div className={s.tabsBar}>
      <div className={s.tabs} role="tablist" aria-label={label} onKeyDown={onKey}>
        {modules.map((m) => {
          const on = m.id === active;
          return (
            <button
              key={m.id}
              id={`tab-${m.id}`}
              type="button"
              role="tab"
              aria-selected={on}
              aria-controls={`panel-${m.id}`}
              tabIndex={on ? 0 : -1}
              className={s.tab}
              onClick={() => onSelect(m.id)}
            >
              <span className={s.tabCode} aria-hidden="true">
                {m.code}
              </span>
              {m.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** One module's panel. Only the active one renders, so hidden charts don't measure or animate. */
export function ModulePanel({ module, active, children }: { module: LabModule; active: string; children: React.ReactNode }) {
  if (module.id !== active) return null;
  return (
    <section id={`panel-${module.id}`} role="tabpanel" aria-labelledby={`tab-${module.id}`} className={s.panel} tabIndex={-1}>
      <header className={s.panelHead}>
        <p className={s.eyebrow}>
          Module {module.code} · {module.label}
        </p>
        <p className={s.panelDoes}>{module.does}</p>
      </header>
      {children}
    </section>
  );
}
