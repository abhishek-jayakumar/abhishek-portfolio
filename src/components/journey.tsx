"use client";

import Link from "next/link";
import { useState } from "react";
import { STAGES } from "@/content/site";
import { track } from "@/lib/track";

/**
 * The point of view as an interface: five stages, and a bracket showing how far
 * an ad platform's own reporting reaches. Pick a stage to see what the
 * dashboard shows, what I look at instead, and a piece of work that shows it.
 */
export function Journey() {
  const [i, setI] = useState(0);
  const s = STAGES[i];

  return (
    <div className="jr">
      <div className="jr-track" role="tablist" aria-label="Stages of the journey">
        {STAGES.map((st, n) => (
          <button
            key={st.key}
            type="button"
            role="tab"
            id={`jr-tab-${n}`}
            aria-selected={n === i}
            aria-controls="jr-panel"
            tabIndex={n === i ? 0 : -1}
            className={n <= 1 ? "jr-node jr-ads" : "jr-node"}
            onClick={() => {
              setI(n);
              track("journey_stage", st.key);
            }}
            onKeyDown={(e) => {
              if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
              e.preventDefault();
              const next = (n + (e.key === "ArrowRight" ? 1 : STAGES.length - 1)) % STAGES.length;
              setI(next);
              track("journey_stage", STAGES[next].key);
              document.getElementById(`jr-tab-${next}`)?.focus();
            }}
          >
            <span className="jr-n" aria-hidden="true">
              {n + 1}
            </span>
            {st.key}
          </button>
        ))}
      </div>
      <p className="jr-bracket" aria-hidden="true">
        <span>What the ad dashboard mostly shows</span>
        <span>The journey around the ad</span>
      </p>

      <div className="jr-panel" id="jr-panel" role="tabpanel" aria-labelledby={`jr-tab-${i}`}>
        <h3>{s.question}</h3>
        <div className="jr-cols">
          <div>
            <p className="jr-label">The dashboard says</p>
            <p>{s.adView}</p>
          </div>
          <div>
            <p className="jr-label jr-label-me">I also ask</p>
            <p>{s.myView}</p>
          </div>
        </div>
        <p className="jr-example">
          <span className="hand">for example</span> {s.example.text}{" "}
          <Link href={`/work/${s.example.slug}`} data-track={`pov_example_${s.key.toLowerCase()}`}>
            {s.example.label} <span aria-hidden="true">→</span>
          </Link>
        </p>
      </div>
    </div>
  );
}
