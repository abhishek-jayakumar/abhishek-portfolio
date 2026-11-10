import type { Experiment } from "@/lab/experiments";
import { EmptyState } from "./notices";
import s from "./lab.module.css";

/** Shown until an experiment's modules are built: honest about it, and specific about what is coming. */
export function LabPlaceholder({ experiment: e }: { experiment: Experiment }) {
  return (
    <>
      <EmptyState title="This experiment is still on the bench">
        <p>
          The {e.title} is being built module by module. Here is what each part will let you do. Every module will run on
          synthetic data for {e.business.name}, with every number traceable to the calculation behind it.
        </p>
      </EmptyState>
      <ul className={s.planned} aria-label="Modules">
        {e.modules.map((m) => (
          <li key={m.id}>
            <strong>
              <span className={s.tabCode} aria-hidden="true">
                {m.code}
              </span>
              {m.label}
            </strong>
            <p>{m.does}</p>
          </li>
        ))}
      </ul>
    </>
  );
}
