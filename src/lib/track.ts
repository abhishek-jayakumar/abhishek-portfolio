/**
 * A tiny event layer for this site. Events are kept in the visitor's own
 * browser, shown back to them in the "case study zero" section, and pushed to
 * window.dataLayer in the shape Google Tag Manager expects. No tag is loaded
 * here, so nothing leaves the page.
 */

export type TrackEvent = { id: number; name: string; detail: string; at: number };

declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[];
  }
}

const EMPTY: TrackEvent[] = [];
let events: TrackEvent[] = EMPTY;
let nextId = 1;
const listeners = new Set<() => void>();

export function track(name: string, detail = "") {
  if (typeof window === "undefined") return;
  events = [...events, { id: nextId++, name, detail, at: Date.now() }];
  (window.dataLayer ??= []).push({ event: name, detail });
  listeners.forEach((l) => l());
}

export function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export const getEvents = () => events;
export const getServerEvents = () => EMPTY;
