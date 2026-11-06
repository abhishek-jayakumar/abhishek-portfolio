"use client";

import { useSyncExternalStore } from "react";
import { getEvents, getServerEvents, subscribe } from "@/lib/track";

/** Shows the visitor the events their own visit has produced. Nothing is sent anywhere. */
export function SessionLog() {
  const events = useSyncExternalStore(subscribe, getEvents, getServerEvents);
  const recent = events.slice(-7).reverse();
  const count = (n: string) => events.filter((e) => e.name === n).length;
  const sections = new Set(events.filter((e) => e.name === "section_view").map((e) => e.detail)).size;

  return (
    <div className="slog" role="region" aria-label="Events from your visit">
      <dl className="slog-stats">
        <div>
          <dt>Events so far</dt>
          <dd>{events.length}</dd>
        </div>
        <div>
          <dt>Sections seen</dt>
          <dd>{sections}</dd>
        </div>
        <div>
          <dt>Clicks tracked</dt>
          <dd>{count("cta_click")}</dd>
        </div>
      </dl>
      <ol className="slog-feed" aria-live="off">
        {recent.length === 0 && <li className="slog-empty">Scroll or click anything. Events appear here.</li>}
        {recent.map((e) => (
          <li key={e.id}>
            <code>{e.name}</code>
            <span>{e.detail}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
