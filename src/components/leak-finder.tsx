"use client";

import { useState } from "react";

/**
 * A small model for finding where a funnel leaks. The numbers are invented and
 * labelled as such. What it shows is real arithmetic: one extra percentage
 * point is worth a different number of customers depending on where it lands.
 */

const VISITORS = 1000;

const STAGES = [
  { key: "engage", label: "Stay and engage", hint: "of visitors do something on the page", start: 55 },
  { key: "enquire", label: "Enquire", hint: "of those who engage leave their details", start: 8 },
  { key: "qualify", label: "Qualify", hint: "of enquiries turn out to be a real fit", start: 40 },
  { key: "close", label: "Become customers", hint: "of qualified leads buy", start: 25 },
] as const;

type Rates = Record<(typeof STAGES)[number]["key"], number>;

const run = (r: Rates) => {
  const engaged = VISITORS * (r.engage / 100);
  const enquiries = engaged * (r.enquire / 100);
  const qualified = enquiries * (r.qualify / 100);
  const customers = qualified * (r.close / 100);
  return { engaged, enquiries, qualified, customers };
};

const f = (n: number) => (n >= 10 ? Math.round(n).toString() : n.toFixed(1));

export function LeakFinder() {
  const [rates, setRates] = useState<Rates>(() =>
    Object.fromEntries(STAGES.map((s) => [s.key, s.start])) as Rates,
  );
  const base = run(rates);

  const levers = STAGES.map((s) => {
    const bumped = { ...rates, [s.key]: Math.min(100, rates[s.key] + 1) };
    return { key: s.key, label: s.label, gain: run(bumped).customers - base.customers };
  });
  const best = levers.reduce((a, b) => (b.gain > a.gain ? b : a));
  const max = Math.max(...levers.map((l) => l.gain), 0.0001);

  const bars = [
    { label: "Visitors", n: VISITORS },
    { label: "Engaged", n: base.engaged },
    { label: "Enquiries", n: base.enquiries },
    { label: "Qualified", n: base.qualified },
    { label: "Customers", n: base.customers },
  ];

  return (
    <div className="leak">
      <div className="leak-grid">
        <div className="leak-controls">
          {STAGES.map((s) => (
            <div key={s.key} className="leak-row">
              <label htmlFor={`leak-${s.key}`}>
                <strong>{s.label}</strong>
                <span>
                  {rates[s.key]}% <small>{s.hint}</small>
                </span>
              </label>
              <input
                id={`leak-${s.key}`}
                type="range"
                min={1}
                max={100}
                value={rates[s.key]}
                onChange={(e) => setRates({ ...rates, [s.key]: Number(e.target.value) })}
              />
            </div>
          ))}
        </div>

        <div className="leak-out">
          <ol className="leak-bars" aria-label="Funnel from 1,000 visitors">
            {bars.map((b) => (
              <li key={b.label}>
                <span>{b.label}</span>
                <i style={{ width: `${Math.max(1.5, (b.n / VISITORS) * 100)}%` }} />
                <b>{f(b.n)}</b>
              </li>
            ))}
          </ol>

          <div className="leak-levers">
            <p className="leak-label">One extra point here is worth, in customers per 1,000 visitors:</p>
            <ul>
              {levers.map((l) => (
                <li key={l.key} className={l.key === best.key ? "best" : undefined}>
                  <span>{l.label}</span>
                  <i style={{ width: `${(l.gain / max) * 100}%` }} />
                  <b>+{l.gain.toFixed(2)}</b>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
      <p className="leak-read" aria-live="polite">
        Right now the largest modeled customer gain is at <strong>{best.label.toLowerCase()}</strong>. Move the sliders and
        watch it change. The same point is not worth the same everywhere, which is why I like to look at the
        whole journey before I touch the ads.
      </p>
      <p className="leak-note">A model with made-up rates, not data from any client.</p>
    </div>
  );
}
