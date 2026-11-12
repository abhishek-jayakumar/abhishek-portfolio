"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { gsap, useGSAP, ScrollTrigger } from "@/lib/gsap-plugins";
import { EXPERIMENTS, type Experiment } from "@/lab/experiments";
import { Instrument, INSTRUMENT_LABEL, type InstrumentApi } from "./lab-instruments";
import s from "./lab-bench.module.css";

const WIDE = "(min-width: 64rem)";
const HOVER = "(hover: hover) and (pointer: fine) and (min-width: 64rem)";
const REDUCE = "(prefers-reduced-motion: reduce)";
const now = () => performance.now();

/**
 * The Lab on the homepage, laid out as a bench of four tools. One is open at a time: on wide
 * screens the open panel widens and the others fold into narrow strips that ask their question;
 * on phones it is an accordion. Each open panel has a small instrument to play with, which runs
 * a slow demo until someone takes over with the pointer, a finger or the arrow keys.
 */
export function Lab() {
  const root = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const [onScreen, setOnScreen] = useState(false);
  const lockUntil = useRef(0);
  const hoverTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const first = useRef(true);

  const open = (i: number) => {
    if (i === active) return;
    lockUntil.current = now() + 700;
    setActive(i);
  };

  // Entrance, and whether the bench is on screen (the demos pause when it is not).
  useGSAP(
    () => {
      const el = root.current;
      if (!el) return;
      const st = ScrollTrigger.create({
        trigger: el,
        start: "top 78%",
        end: "bottom top",
        onToggle: (self) => setOnScreen(self.isActive),
      });
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.from("[data-panel]", {
          y: 70,
          opacity: 0,
          duration: 1.1,
          ease: "sunrise",
          stagger: 0.09,
          scrollTrigger: { trigger: el, start: "top 85%", once: true },
        });
      });
      return () => st.kill();
    },
    { scope: root },
  );

  // When a panel opens, its contents arrive in order.
  useGSAP(
    () => {
      if (first.current) {
        first.current = false;
        return;
      }
      if (window.matchMedia(REDUCE).matches) return;
      const panel = root.current?.querySelector<HTMLElement>(`[data-panel="${active}"]`);
      if (!panel) return;
      gsap.from(panel.querySelectorAll("[data-rise]"), {
        y: 18,
        opacity: 0,
        duration: 0.6,
        ease: "power3.out",
        stagger: 0.06,
        delay: window.matchMedia(WIDE).matches ? 0.2 : 0.1,
        clearProps: "transform,opacity",
      });
    },
    { scope: root, dependencies: [active] },
  );

  useEffect(() => () => clearTimeout(hoverTimer.current), []);

  // On a mouse, resting on a folded panel opens it. The short wait and the lock stop panels
  // flickering open as the pointer crosses them, or as they slide under a still pointer.
  const onEnter = (i: number) => {
    if (i === active || !window.matchMedia(HOVER).matches) return;
    clearTimeout(hoverTimer.current);
    const wait = Math.max(170, lockUntil.current - now());
    hoverTimer.current = setTimeout(() => open(i), wait);
  };
  const onLeave = () => clearTimeout(hoverTimer.current);

  return (
    <div ref={root} className={s.bench}>
      {EXPERIMENTS.map((e, i) => (
        <Panel
          key={e.slug}
          e={e}
          i={i}
          active={i === active}
          onScreen={onScreen}
          onOpen={() => open(i)}
          onEnter={() => onEnter(i)}
          onLeave={onLeave}
        />
      ))}
    </div>
  );
}

function Panel({
  e,
  i,
  active,
  onScreen,
  onOpen,
  onEnter,
  onLeave,
}: {
  e: Experiment;
  i: number;
  active: boolean;
  onScreen: boolean;
  onOpen: () => void;
  onEnter: () => void;
  onLeave: () => void;
}) {
  const live = e.status === "live";
  const id = `lab-${e.slug}`;
  return (
    <article className={s.panel} data-panel={i} data-active={active} onPointerEnter={onEnter} onPointerLeave={onLeave}>
      <h3 className={s.head}>
        <button type="button" id={`${id}-tab`} className={s.toggle} aria-expanded={active} aria-controls={id} onClick={onOpen}>
          <span className={s.no} aria-hidden="true">
            {e.no}
          </span>
          <span className={s.name}>{e.title}</span>
          <span className={s.kind}>{e.category}</span>
          <span className={`${s.status} ${live ? s.live : ""}`}>{live ? "Live" : "In progress"}</span>
        </button>
      </h3>
      <ol className={s.peek} aria-hidden="true">
        {e.modules.map((m) => (
          <li key={m.id}>
            <span>{m.code}</span>
            {m.label}
          </li>
        ))}
      </ol>
      <p className={`hand ${s.hook}`} aria-hidden="true">
        {e.hook}
      </p>
      <div className={s.body}>
        <div id={id} role="region" aria-labelledby={`${id}-tab`} className={s.clip} inert={!active}>
          <div className={s.content}>
            <Stage kind={e.preview} active={active} onScreen={onScreen} />
            <p className={s.question} data-rise>
              {e.question}
            </p>
            <div className={s.foot} data-rise>
              <Link href={`/lab/${e.slug}`} className={`${s.cta} ${live ? "" : s.ctaQuiet}`} data-track={`lab_open_${e.slug}`}>
                {live ? e.cta : "See what's coming"} <span aria-hidden="true">→</span>
              </Link>
              <span className={s.modules}>
                {e.modules.length} modules{live ? "" : ", being built now"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

/**
 * Hosts one instrument and decides who drives it: a slow demo sweep while nobody is touching
 * it, the pointer or finger while someone is, and the arrow keys (it is a slider to assistive
 * tech). The control value lives in a plain object that GSAP tweens; React never re-renders
 * for it.
 */
function Stage({ kind, active, onScreen }: { kind: Experiment["preview"]; active: boolean; onScreen: boolean }) {
  const api = useRef<InstrumentApi>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const readout = useRef<HTMLParagraphElement>(null);
  const st = useRef({ t: 0, played: false, held: false, demo: null as gsap.core.Tween | null, resume: undefined as ReturnType<typeof setTimeout> | undefined });

  const render = (t: number) => {
    const a = api.current;
    if (!a) return;
    const text = a.apply(t);
    if (readout.current) readout.current.textContent = text;
    wrap.current?.setAttribute("aria-valuetext", text);
    wrap.current?.setAttribute("aria-valuenow", String(Math.round(t * 100)));
  };

  // Draw the resting state once, before anything animates.
  useEffect(() => {
    const a = api.current;
    if (!a) return;
    st.current.t = a.rest;
    render(a.rest);
     
  }, []);

  const sweep = () => {
    const a = api.current;
    const s_ = st.current;
    if (!a || s_.held) return;
    const [lo, hi] = a.demo;
    const target = s_.t < (lo + hi) / 2 ? hi : lo;
    s_.demo?.kill();
    s_.demo = gsap.to(s_, {
      t: target,
      duration: a.sweep * Math.max(0.3, Math.abs(target - s_.t) / (hi - lo)),
      ease: a.ease,
      delay: 0.9,
      onUpdate: () => render(s_.t),
      onComplete: sweep,
    });
  };

  useEffect(() => {
    const a = api.current;
    const s_ = st.current;
    if (!a || !active || !onScreen || window.matchMedia(REDUCE).matches) {
      s_.demo?.pause();
      return;
    }
    let intro: gsap.core.Timeline | null = null;
    if (!s_.played) {
      s_.played = true;
      intro = gsap.timeline({ delay: 0.25, onComplete: sweep });
      a.intro(intro);
    } else if (s_.demo && !s_.held) {
      s_.demo.resume();
    } else {
      sweep();
    }
    return () => {
      intro?.progress(1).kill();
      s_.demo?.pause();
      clearTimeout(s_.resume);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, onScreen]);

  useEffect(() => {
    const s_ = st.current;
    return () => {
      s_.demo?.kill();
      clearTimeout(s_.resume);
    };
  }, []);

  const take = () => {
    const s_ = st.current;
    s_.held = true;
    s_.demo?.kill();
    s_.demo = null;
    clearTimeout(s_.resume);
  };
  const release = () => {
    const s_ = st.current;
    s_.held = false;
    clearTimeout(s_.resume);
    if (!window.matchMedia(REDUCE).matches) s_.resume = setTimeout(sweep, 1800);
  };
  const follow = (ev: PointerEvent<HTMLDivElement>) => {
    if (ev.pointerType !== "mouse" && ev.buttons === 0 && ev.type === "pointermove") return;
    take();
    const box = ev.currentTarget.getBoundingClientRect();
    const t = Math.min(1, Math.max(0, (ev.clientX - box.left) / box.width));
    const s_ = st.current;
    if (window.matchMedia(REDUCE).matches) {
      s_.t = t;
      render(t);
      return;
    }
    gsap.to(s_, { t, duration: 0.45, ease: "power3.out", overwrite: true, onUpdate: () => render(s_.t) });
  };
  const keys = (ev: KeyboardEvent<HTMLDivElement>) => {
    const a = api.current;
    if (!a) return;
    const s_ = st.current;
    const map: Record<string, number> = { ArrowRight: a.step, ArrowUp: a.step, ArrowLeft: -a.step, ArrowDown: -a.step };
    let t = s_.t;
    if (ev.key in map) t += map[ev.key];
    else if (ev.key === "Home") t = 0;
    else if (ev.key === "End") t = 1;
    else return;
    ev.preventDefault();
    take();
    s_.t = Math.min(1, Math.max(0, t));
    render(s_.t);
  };

  return (
    <div className={s.stage} data-rise>
      <div
        ref={wrap}
        className={s.instrument}
        role="slider"
        tabIndex={0}
        aria-label={INSTRUMENT_LABEL[kind]}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={0}
        onPointerMove={follow}
        onPointerDown={follow}
        onPointerLeave={release}
        onPointerCancel={release}
        onFocus={take}
        onBlur={release}
        onKeyDown={keys}
      >
        <Instrument kind={kind} api={api} />
        <span className={s.illus}>Illustration</span>
      </div>
      <div className={s.readoutRow}>
        <p ref={readout} className={s.readout} aria-hidden="true" />
        <span className={`hand ${s.hint}`} aria-hidden="true">
          <span className={s.hintMouse}>move across it</span>
          <span className={s.hintTouch}>drag across it</span>
        </span>
      </div>
    </div>
  );
}
