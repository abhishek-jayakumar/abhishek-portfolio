"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { QUEUED } from "@/content/site";
import { track } from "@/lib/track";
import { BurlChat } from "./burl-chat";
import { LeakFinder } from "./leak-finder";
import { MiniQuiz } from "./mini-quiz";
import { SeatDial } from "./seat-dial";

type Bench = {
  id: string;
  no: string;
  title: string;
  asks: string;
  status: string;
  area: string;
  from?: { slug: string; label: string };
  tone: "forest" | "sage" | "blush";
  body: ReactNode;
};

const BENCHES: Bench[] = [
  {
    id: "leak",
    no: "01",
    title: "The leak finder",
    asks: "Where is one extra point worth the most?",
    status: "Model, invented numbers",
    area: "Funnel analysis, CRO",
    tone: "forest",
    body: <LeakFinder />,
  },
  {
    id: "seats",
    no: "02",
    title: "The seat dial",
    asks: "What changes when capacity changes?",
    status: "From a real campaign",
    area: "Acquisition strategy",
    from: { slug: "cscp", label: "the CSCP campaign" },
    tone: "forest",
    body: <SeatDial />,
  },
  {
    id: "quiz",
    no: "03",
    title: "Three-question career quiz",
    asks: "Can a quiz do the work of a form?",
    status: "Real questions and scoring",
    area: "Interactive funnels, GA4",
    from: { slug: "career-discovery", label: "the Career Discovery Platform" },
    tone: "sage",
    body: <MiniQuiz />,
  },
  {
    id: "chat",
    no: "04",
    title: "The lead-qualifying chat",
    asks: "What can seven questions tell a team before they call?",
    status: "Working recreation",
    area: "Lead capture, event tracking",
    from: { slug: "burl-concepts", label: "the Burl Concepts site" },
    tone: "blush",
    body: <BurlChat />,
  },
];

export function Lab() {
  const [open, setOpen] = useState(BENCHES[0].id);
  const bench = BENCHES.find((b) => b.id === open) ?? BENCHES[0];

  return (
    <div className="lab">
      <div className="lab-index" role="tablist" aria-label="Experiments" aria-orientation="vertical">
        {BENCHES.map((b) => (
          <button
            key={b.id}
            type="button"
            role="tab"
            id={`lab-tab-${b.id}`}
            aria-selected={b.id === open}
            aria-controls="lab-bench"
            className="lab-tab"
            onClick={() => {
              setOpen(b.id);
              track("lab_open", b.id);
            }}
          >
            <span className="lab-no">{b.no}</span>
            <span className="lab-tab-text">
              <strong>{b.title}</strong>
              <small>{b.asks}</small>
            </span>
          </button>
        ))}

        <div className="lab-queue">
          <p className="lab-queue-h">On the list next</p>
          <ul>
            {QUEUED.map((q) => (
              <li key={q}>{q}</li>
            ))}
          </ul>
        </div>
      </div>

      <div className={`lab-bench bench-${bench.tone}`} id="lab-bench" role="tabpanel" aria-labelledby={`lab-tab-${bench.id}`}>
        <header>
          <p className="lab-meta">
            <span>Experiment {bench.no}</span>
            <span>{bench.status}</span>
            <span>{bench.area}</span>
          </p>
          <h3>{bench.asks}</h3>
          {bench.from && (
            <p className="lab-from">
              Built from <Link href={`/work/${bench.from.slug}`}>{bench.from.label}</Link>
            </p>
          )}
        </header>
        {bench.body}
      </div>
    </div>
  );
}
