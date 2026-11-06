/**
 * A tiny session recorder for the replay at the end of the page.
 *
 * It keeps the visitor's pointer path (or, on touch screens, where they were reading) and their
 * clicks, in memory, in this tab only. Nothing is stored or sent anywhere; a reload forgets it.
 * Positions are in page coordinates: x as a share of the page width, y in pixels from the top.
 */

export type PathPoint = { x: number; y: number; t: number; click?: boolean };

let points: PathPoint[] = [];
let startedAt = 0;
let running = false;

const MAX_POINTS = 4000;
const SAMPLE_MS = 120;

export function startSessionPath() {
  if (running || typeof window === "undefined") return;
  running = true;
  startedAt = performance.now();

  let px = -1;
  let py = -1;
  let movedAt = 0;

  const push = (clientX: number, clientY: number, click = false) => {
    const width = document.documentElement.clientWidth || 1;
    points.push({ x: clientX / width, y: clientY + window.scrollY, t: performance.now() - startedAt, click });
    // Long visits keep their shape at half the detail; clicks are always kept.
    if (points.length > MAX_POINTS) points = points.filter((p, i) => p.click || i % 2 === 0);
  };

  window.addEventListener(
    "pointermove",
    (e) => {
      px = e.clientX;
      py = e.clientY;
      movedAt = performance.now();
    },
    { passive: true },
  );
  window.addEventListener("pointerdown", (e) => push(e.clientX, e.clientY, true), { passive: true });

  // Sample on a clock rather than on every event: a calm, even line, and no scroll listener.
  // Without a recent pointer (touch, or reading), the middle of the screen stands in for attention.
  window.setInterval(() => {
    if (document.hidden) return;
    const pointer = px >= 0 && performance.now() - movedAt < 1500;
    push(pointer ? px : document.documentElement.clientWidth / 2, pointer ? py : window.innerHeight / 2);
  }, SAMPLE_MS);
}

export function getSessionPath() {
  return { points, duration: running ? performance.now() - startedAt : 0 };
}
