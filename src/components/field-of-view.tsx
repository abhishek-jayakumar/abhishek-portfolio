"use client";

import { useRef, useState } from "react";
import { gsap, useGSAP, ScrollTrigger } from "@/lib/gsap-plugins";
import { JOURNEY, SEATS, TOGETHER } from "@/content/career";
import { track } from "@/lib/track";
import { Lines } from "./lines";
import s from "./field-of-view.module.css";

const VIEWS = [...SEATS, TOGETHER];
const ALL = JOURNEY.map((_, i) => i);
const ALL_SEATS = SEATS.map((_, i) => i);
const SVGNS = "http://www.w3.org/2000/svg";

const seesOf = (view: number): readonly number[] => (view === SEATS.length ? ALL : SEATS[view].sees);
const seatsOf = (view: number) => (view === SEATS.length ? ALL_SEATS : [view]);

/** Split a seat's stages into contiguous runs, so a beam never pretends to light a stage it skips. */
const runs = (stages: readonly number[]) => {
  const out: number[][] = [];
  [...stages].sort((a, b) => a - b).forEach((k) => {
    const last = out[out.length - 1];
    if (last && k === last[last.length - 1] + 1) last.push(k);
    else out.push([k]);
  });
  return out;
};

type Api = { show: (view: number, mode: "select" | "ghost" | "clear-ghost") => void };

/**
 * A wider field of view: one customer journey along the bottom, the five seats Abhishek has
 * worked from along the top. Choosing a seat shines a beam from it onto the stages that job let
 * him see; those stages light up and a meter counts them. "Put them together" fires every beam
 * at once and the whole journey is covered. Hovering a seat previews its beam faintly.
 *
 * The beams are measured from the real buttons and pins, so the drawing follows any layout.
 * It is a tablist: arrows, Home and End move between views. Reduced motion gets the same states
 * without the sweep.
 */
export function FieldOfView() {
  const [view, setView] = useState(0);
  const root = useRef<HTMLElement>(null);
  const api = useRef<Api | null>(null);
  const changed = useRef(false);
  const latest = useRef(0);
  const current = VIEWS[view];
  const sees = seesOf(view);
  const together = view === SEATS.length;

  useGSAP(
    () => {
      const el = root.current;
      if (!el) return;
      const one = <T extends Element = HTMLElement>(sel: string) => el.querySelector<T>(sel);
      const all = <T extends Element = HTMLElement>(sel: string) => gsap.utils.toArray<T>(sel, el);
      const stage = one("[data-stage]");
      const svg = one<SVGSVGElement>("[data-beams]");
      const beamLayer = one<SVGGElement>("[data-beam-layer]");
      const trackLayer = one<SVGGElement>("[data-track-layer]");
      const ghostLayer = one<SVGGElement>("[data-ghost-layer]");
      const seats = all("[data-seat]");
      const pins = all("[data-pin]");
      const stages = all("[data-stage-item]");
      const line = one("[data-line]");
      if (!stage || !svg || !beamLayer || !trackLayer || !ghostLayer) return;
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      // ---- Geometry, in real pixels of the stage --------------------------------------------
      let origin: { x: number; y: number }[] = [];
      let at: { x: number; y: number }[] = [];
      const measure = () => {
        const box = stage.getBoundingClientRect();
        svg.setAttribute("viewBox", `0 0 ${box.width} ${box.height}`);
        origin = seats.map((b) => {
          const lens = b.querySelector("[data-lens]")?.getBoundingClientRect() ?? b.getBoundingClientRect();
          return { x: lens.left + lens.width / 2 - box.left, y: lens.top + lens.height / 2 - box.top };
        });
        at = pins.map((p) => {
          const r = p.getBoundingClientRect();
          return { x: r.left + r.width / 2 - box.left, y: r.top + r.height / 2 - box.top };
        });
      };

      const spread = () => Math.max(14, (at[1]?.x - at[0]?.x || 60) * 0.3);
      const beamPoints = (seat: number, run: number[], t: number) => {
        const o = origin[seat];
        const a = at[run[0]];
        const b = at[run[run.length - 1]];
        const mid = (a.x + b.x) / 2;
        const left = mid - (mid - (a.x - spread())) * t;
        const right = mid + (b.x + spread() - mid) * t;
        return `${o.x},${o.y} ${right},${a.y} ${left},${a.y}`;
      };

      const draw = (layer: SVGGElement, v: number, animate: boolean, cls: string) => {
        const made: { poly: SVGPolygonElement; seat: number; run: number[] }[] = [];
        seatsOf(v).forEach((seat, n) => {
          runs(SEATS[seat].sees).forEach((run) => {
            const poly = document.createElementNS(SVGNS, "polygon");
            poly.setAttribute("class", cls);
            poly.setAttribute("points", beamPoints(seat, run, animate ? 0 : 1));
            layer.append(poly);
            made.push({ poly, seat, run });
            if (animate) {
              const p = { t: 0 };
              gsap.to(p, {
                t: 1,
                duration: 0.75,
                delay: n * 0.12,
                ease: "sunrise",
                onUpdate: () => poly.setAttribute("points", beamPoints(seat, run, p.t)),
              });
              gsap.fromTo(poly, { opacity: 0 }, { opacity: 1, duration: 0.35, delay: n * 0.12 });
            }
          });
        });
        return made;
      };

      // The walked part of the journey: a sun line under each run of lit stages.
      const drawTrack = (v: number, animate: boolean) => {
        trackLayer.replaceChildren();
        runs(seesOf(v)).forEach((run, n) => {
          if (run.length < 2) return;
          const a = at[run[0]];
          const b = at[run[run.length - 1]];
          const path = document.createElementNS(SVGNS, "path");
          path.setAttribute("d", `M${a.x},${a.y} L${b.x},${b.y}`);
          path.setAttribute("class", s.walk);
          trackLayer.append(path);
          if (animate) gsap.fromTo(path, { drawSVG: "50% 50%" }, { drawSVG: "0% 100%", duration: 0.7, delay: 0.25 + n * 0.1, ease: "power3.out" });
        });
      };

      let shown = -1;
      const show: Api["show"] = (v, mode) => {
        if (mode === "clear-ghost") {
          if (ghostLayer.children.length) gsap.to(ghostLayer.children, { opacity: 0, duration: 0.25, onComplete: () => ghostLayer.replaceChildren() });
          return;
        }
        if (mode === "ghost") {
          ghostLayer.replaceChildren();
          if (v === shown) return;
          draw(ghostLayer, v, !reduced, s.ghost);
          return;
        }
        shown = v;
        ghostLayer.replaceChildren();
        const old = Array.from(beamLayer.children);
        if (reduced) old.forEach((n) => n.remove());
        else if (old.length) gsap.to(old, { opacity: 0, duration: 0.3, onComplete: () => old.forEach((n) => n.remove()) });
        draw(beamLayer, v, !reduced, s.beam);
        drawTrack(v, !reduced);
        const lit = new Set(seesOf(v));
        stages.forEach((st, k) => {
          const on = lit.has(k);
          const was = st.classList.contains(s.lit);
          st.classList.toggle(s.lit, on);
          if (on && !was && !reduced) gsap.fromTo(pins[k], { scale: 0.4 }, { scale: 1, duration: 0.6, ease: "back.out(3)", delay: 0.2 + k * 0.04 });
        });
      };

      measure();
      api.current = { show };

      // ---- Arrival: the journey is drawn, the stops drop on, then the first beam opens -------
      if (reduced) {
        show(0, "select");
      } else {
        const items = all("[data-arrive]");
        gsap.set(items, { opacity: 0, y: 20 });
        if (line) gsap.set(line, { scaleX: 0, transformOrigin: "0 50%" });
        gsap.set(pins, { opacity: 0, y: -40 });
        const tl = gsap.timeline({ scrollTrigger: { trigger: stage, start: "top 78%", once: true } });
        tl.to(items, { opacity: 1, y: 0, duration: 0.8, ease: "power3.out", stagger: 0.06 }, 0)
          .to(line ?? {}, { scaleX: 1, duration: 1.1, ease: "power3.inOut" }, 0.15)
          .to(pins, { opacity: 1, y: 0, duration: 0.9, ease: "drop", stagger: 0.08 }, 0.35)
          .add(() => {
            gsap.set(pins, { clearProps: "y" });
            measure();
            show(latest.current, "select");
          }, 1.2);
      }

      // Keep the drawing on the real layout.
      let timer = 0;
      const relayout = () => {
        window.clearTimeout(timer);
        timer = window.setTimeout(() => {
          measure();
          beamLayer.replaceChildren();
          ghostLayer.replaceChildren();
          if (shown >= 0) {
            const v = shown;
            shown = -1;
            draw(beamLayer, v, false, s.beam);
            drawTrack(v, false);
            shown = v;
          }
        }, 120);
      };
      const ro = new ResizeObserver(relayout);
      ro.observe(stage);
      ScrollTrigger.addEventListener("refresh", relayout);
      return () => {
        ro.disconnect();
        window.clearTimeout(timer);
        ScrollTrigger.removeEventListener("refresh", relayout);
        api.current = null;
      };
    },
    { scope: root },
  );

  // A new choice re-composes the reading and re-aims the beams.
  useGSAP(
    () => {
      if (!changed.current) return;
      api.current?.show(view, "select");
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.fromTo("[data-read]", { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.55, ease: "power3.out", stagger: 0.06 });
      });
      return () => mm.revert();
    },
    { scope: root, dependencies: [view], revertOnUpdate: true },
  );

  const choose = (next: number, focus = false) => {
    changed.current = true;
    latest.current = next;
    setView(next);
    track("field_of_view", VIEWS[next].key);
    if (focus) document.getElementById(`seat-${next}`)?.focus();
  };
  const onKey = (e: React.KeyboardEvent, i: number) => {
    const n = VIEWS.length;
    const next = e.key === "ArrowRight" || e.key === "ArrowDown" ? (i + 1) % n : e.key === "ArrowLeft" || e.key === "ArrowUp" ? (i + n - 1) % n : e.key === "Home" ? 0 : e.key === "End" ? n - 1 : null;
    if (next === null) return;
    e.preventDefault();
    choose(next, true);
  };
  const ghost = (i: number, on: boolean) => {
    if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) api.current?.show(i, on ? "ghost" : "clear-ghost");
  };

  const seen = JOURNEY.filter((_, k) => sees.includes(k)).map((st) => st.label.toLowerCase());

  return (
    <section ref={root} id="experience" className={s.section} data-section="experience" aria-labelledby="fov-heading">
      <div className={s.inner}>
        <header className={s.head}>
          <p className={s.caption}>what each seat showed me</p>
          <Lines as="h2" id="fov-heading">A wider field<br />of view.</Lines>
          <p className={s.intro}>
            Every job put me in a different seat along the same customer journey. Pick one to see what it showed me,
            then put them together.
          </p>
        </header>

        <div className={s.stage} data-stage>
          <svg className={s.beams} data-beams aria-hidden="true" focusable="false">
            <defs>
              <linearGradient id="fov-beam" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#c8a45a" stopOpacity=".75" />
                <stop offset="1" stopColor="#c8a45a" stopOpacity=".16" />
              </linearGradient>
            </defs>
            <g data-ghost-layer />
            <g data-beam-layer />
            <g data-track-layer />
          </svg>

          <div className={s.seats} role="tablist" aria-label="Where I was sitting">
            {VIEWS.map((v, i) => {
              const isTogether = i === SEATS.length;
              return (
                <button
                  key={v.key}
                  id={`seat-${i}`}
                  type="button"
                  role="tab"
                  aria-selected={view === i}
                  aria-controls="fov-panel"
                  tabIndex={view === i ? 0 : -1}
                  className={isTogether ? `${s.seat} ${s.together}` : s.seat}
                  onClick={() => choose(i)}
                  onKeyDown={(e) => onKey(e, i)}
                  onPointerEnter={() => ghost(i, true)}
                  onPointerLeave={() => ghost(i, false)}
                  data-seat={isTogether ? undefined : true}
                  data-arrive
                >
                  <strong>{isTogether ? "Put them together" : v.company}</strong>
                  <span>{isTogether ? "all five seats" : v.seat}</span>
                  {!isTogether && <i className={s.lens} data-lens aria-hidden="true" />}
                </button>
              );
            })}
          </div>

          <div className={s.journey} aria-hidden="true">
            <span className={s.line} data-line />
            <ol>
              {JOURNEY.map((st) => (
                <li key={st.key} className={s.stageItem} data-stage-item>
                  <span className={s.pin} data-pin />
                  <b>{st.label}</b>
                  <small>{st.note}</small>
                </li>
              ))}
            </ol>
          </div>
        </div>

        <div id="fov-panel" role="tabpanel" aria-labelledby={`seat-${view}`} tabIndex={0} className={s.panel}>
          <div className={s.saw}>
            <p className={s.label} data-read>{together ? "Every seat at once" : `Seen from ${current.company}`}</p>
            <h3 data-read>{current.saw}</h3>
          </div>
          <div className={s.now}>
            <p className={s.label} data-read>What I do with it now</p>
            <p data-read>{current.now}</p>
          </div>
          <div className={s.meter} data-read>
            <p className={s.label}>
              Sees <strong>{sees.length}</strong> of {JOURNEY.length} stages
            </p>
            <ol className={s.cells} aria-hidden="true">
              {JOURNEY.map((st, k) => (
                <li key={st.key} className={sees.includes(k) ? s.on : undefined} />
              ))}
            </ol>
            <p className={s.seen}>{seen.join(", ")}</p>
            <p className={s.proof}>{current.proof}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
