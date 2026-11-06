"use client";

import { useRef, useState } from "react";
import { gsap, useGSAP, ScrollTrigger } from "@/lib/gsap-plugins";
import { getSessionPath, type PathPoint } from "@/lib/session-path";
import s from "./session-replay.module.css";

/** Plain names for the page's sections, in the order they appear. */
const LABELS: Record<string, string> = {
  hero: "Start",
  route: "Route",
  experience: "Field of view",
  "point-of-view": "Approach",
  "selected-work": "Work",
  lab: "Lab",
  about: "About",
  contact: "Contact",
};

type Band = { label: string; top: number; bottom: number };
type Stats = { time: string; clicks: number; seen: number; total: number };
/** "map": the page on its side with the pointer path (desktop). "time": reading position over time (phones). */
type Mode = "map" | "time";

const fmtTime = (ms: number) => {
  const sec = Math.max(0, Math.round(ms / 1000));
  return sec < 60 ? `${sec}s` : `${Math.floor(sec / 60)}m ${String(sec % 60).padStart(2, "0")}s`;
};

/**
 * The ending: this visit, played back. On a desktop the whole page is laid on its side (top of the
 * page on the left, this section on the right), its sections shown as bands, and the pointer's path
 * drawn across it in brass, with a ring for every click. Phones have no pointer, so there it becomes
 * a reading timeline instead: time runs left to right, the page runs top to bottom, and flat
 * stretches show where the visitor stopped to read. The data comes from src/lib/session-path.ts and
 * never leaves the tab.
 */
export function SessionReplay() {
  const root = useRef<HTMLDivElement>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [mode, setMode] = useState<Mode>("map");
  const api = useRef({ play: () => {} });

  useGSAP(
    (_ctx, contextSafe) => {
      const el = root.current;
      const canvas = el?.querySelector<HTMLCanvasElement>("[data-replay]");
      const ctx = canvas?.getContext("2d");
      if (!el || !canvas || !ctx || !contextSafe) return;
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      let points: PathPoint[] = [];
      let bands: Band[] = [];
      let pageH = 1;
      let tMax = 1;
      let view: Mode = "map";
      let progress = 0;
      let W = 0;
      let H = 0;
      const PAD = 18;

      const snapshot = () => {
        const { points: all, duration } = getSessionPath();
        points = all.slice();
        pageH = Math.max(1, document.documentElement.scrollHeight);
        const sections = Array.from(document.querySelectorAll<HTMLElement>("[data-section]"));
        bands = sections
          .map((sec) => {
            const r = sec.getBoundingClientRect();
            const top = r.top + window.scrollY;
            return { label: LABELS[sec.dataset.section ?? ""] ?? "", top, bottom: top + r.height };
          })
          .filter((b, i, all) => b.label && all.findIndex((o) => o.label === b.label) === i)
          .sort((a, b) => a.top - b.top);
        // Pinned sections overlap their neighbours; each band simply runs until the next one starts.
        bands.forEach((b, i) => {
          b.bottom = i < bands.length - 1 ? bands[i + 1].top : pageH;
        });
        tMax = Math.max(1, points.at(-1)?.t ?? 1);
        const seen = bands.filter((b) => points.some((p) => p.y >= b.top && p.y <= b.bottom)).length;
        setStats({ time: fmtTime(duration), clicks: points.filter((p) => p.click).length, seen, total: bands.length });
      };

      const size = () => {
        const b = canvas.getBoundingClientRect();
        W = b.width;
        H = b.height;
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = Math.round(W * dpr);
        canvas.height = Math.round(H * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        // The map only says something if a pointer actually moved around; otherwise (phones, tablets,
        // keyboard or scroll-only visits) show the reading timeline.
        const moved = points.filter((p) => Math.abs(p.x - 0.5) > 0.002).length;
        const next: Mode = W < 560 || moved < points.length * 0.3 ? "time" : "map";
        if (next !== view) {
          view = next;
          setMode(next);
        }
      };

      // map: the page on its side, page depth left to right, page width top to bottom.
      // time: time left to right, page depth top to bottom.
      const depth = (y: number) => PAD + (y / pageH) * (H - PAD * 2);
      const px = (p: PathPoint) => (view === "map" ? (p.y / pageH) * W : 10 + (p.t / tMax) * (W - 20));
      const py = (p: PathPoint) => (view === "map" ? PAD + Math.min(1, Math.max(0, p.x)) * (H - PAD * 2 - 14) : depth(p.y));

      const draw = () => {
        ctx.clearRect(0, 0, W, H);
        ctx.font = "600 10.5px ui-monospace, Consolas, monospace";
        ctx.textBaseline = "alphabetic";
        bands.forEach((b, i) => {
          ctx.fillStyle = i % 2 ? "rgba(250, 247, 240, 0.035)" : "rgba(250, 247, 240, 0.07)";
          if (view === "map") {
            const x0 = (b.top / pageH) * W;
            const x1 = (b.bottom / pageH) * W;
            ctx.fillRect(x0, 0, x1 - x0, H);
            if (ctx.measureText(b.label).width + 14 < x1 - x0) {
              ctx.fillStyle = "rgba(250, 247, 240, 0.55)";
              ctx.fillText(b.label, x0 + 7, H - 8);
            }
          } else {
            // Sections as rows, named on the right where the line has usually moved on.
            const y0 = i === 0 ? 0 : depth(b.top);
            const y1 = i === bands.length - 1 ? H : depth(b.bottom);
            ctx.fillRect(0, y0, W, y1 - y0);
            if (y1 - y0 > 13) {
              ctx.fillStyle = "rgba(250, 247, 240, 0.55)";
              ctx.textAlign = "right";
              ctx.fillText(b.label, W - 8, Math.min(y1 - 4, y0 + 13));
              ctx.textAlign = "left";
            }
          }
        });

        const n = Math.floor(progress * points.length);
        if (n < 2) return;
        ctx.beginPath();
        ctx.moveTo(px(points[0]), py(points[0]));
        for (let i = 1; i < n; i++) ctx.lineTo(px(points[i]), py(points[i]));
        ctx.strokeStyle = "rgba(200, 164, 90, 0.9)";
        ctx.lineWidth = 1.5;
        ctx.lineJoin = "round";
        ctx.lineCap = "round";
        ctx.stroke();

        ctx.strokeStyle = "rgba(250, 247, 240, 0.8)";
        ctx.lineWidth = 1.2;
        for (let i = 0; i < n; i++) {
          if (!points[i].click) continue;
          ctx.beginPath();
          ctx.arc(px(points[i]), py(points[i]), 5, 0, 6.2832);
          ctx.stroke();
        }

        const head = points[n - 1];
        ctx.beginPath();
        ctx.arc(px(head), py(head), 4.5, 0, 6.2832);
        ctx.fillStyle = "#fffdf8";
        ctx.fill();
        ctx.beginPath();
        ctx.arc(px(head), py(head), 9, 0, 6.2832);
        ctx.strokeStyle = "rgba(200, 164, 90, 0.7)";
        ctx.lineWidth = 1.5;
        ctx.stroke();
      };

      let tween: gsap.core.Tween | null = null;
      const play = contextSafe(() => {
        snapshot();
        size();
        tween?.kill();
        if (reduced) {
          progress = 1;
          draw();
          return;
        }
        const state = { p: 0 };
        tween = gsap.to(state, {
          p: 1,
          duration: Math.min(6, 2.5 + points.length / 400),
          ease: "power1.inOut",
          onUpdate: () => {
            progress = state.p;
            draw();
          },
        });
      });
      api.current.play = play;

      size();
      draw();
      const arrive = ScrollTrigger.create({ trigger: el, start: "top 75%", once: true, onEnter: () => play() });

      let timer = 0;
      const ro = new ResizeObserver(() => {
        window.clearTimeout(timer);
        timer = window.setTimeout(() => {
          size();
          draw();
        }, 150);
      });
      ro.observe(canvas);

      return () => {
        arrive.kill();
        tween?.kill();
        ro.disconnect();
        window.clearTimeout(timer);
      };
    },
    { scope: root },
  );

  const quiet = stats !== null && stats.seen === 0;

  return (
    <div ref={root} className={s.replay}>
      <div className={s.head}>
        <h3>Here is how you moved through this page.</h3>
        <p>
          {mode === "map"
            ? "The brass line is your pointer as it crossed the page, from the top on the left to here on the right. Each ring is a click."
            : "Read it left to right: the brass line is where you were on the page over time, and the flat stretches are where you stopped to read. Each ring is a click or tap."}{" "}
          I study real visitors the same way. This was recorded only in this tab and is never sent anywhere.
        </p>
      </div>
      <canvas className={s.canvas} data-replay aria-hidden="true" />
      <div className={s.foot}>
        {stats && !quiet ? (
          <dl className={s.stats}>
            <div><dt>Time on page</dt><dd>{stats.time}</dd></div>
            <div><dt>Clicks</dt><dd>{stats.clicks}</dd></div>
            <div><dt>Sections seen</dt><dd>{stats.seen} of {stats.total}</dd></div>
          </dl>
        ) : (
          <p className={s.empty}>Your visit appears here once you have looked around the page.</p>
        )}
        <button type="button" className={s.again} onClick={() => api.current.play()} data-track="replay_session">
          Replay my visit
        </button>
      </div>
    </div>
  );
}
