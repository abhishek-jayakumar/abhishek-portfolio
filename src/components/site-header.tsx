"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { gsap, useGSAP, ScrollTrigger } from "@/lib/gsap-plugins";
import s from "./site-header.module.css";

/** The page as a route. Each stop is a section, in the order you meet it. */
const STOPS = [
  { id: "top", label: "Start", hint: "the growth system" },
  { id: "route", label: "Route", hint: "where I’ve been" },
  { id: "experience", label: "Experience", hint: "what each seat showed me" },
  { id: "pov", label: "Approach", hint: "how I think about the work" },
  { id: "work", label: "Work", hint: "things I’ve put into practice" },
  { id: "lab", label: "Lab", hint: "experiments" },
  { id: "about", label: "About", hint: "the person" },
  { id: "contact", label: "Contact", hint: "say hello" },
] as const;
const N = STOPS.length;
const WORK = STOPS.findIndex((st) => st.id === "work");

const clock = new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", hour: "numeric", minute: "2-digit", hour12: true });

/**
 * No bar. Three floating pieces:
 *   a name tag that folds into a monogram once you scroll,
 *   a journey dock that is the nav: the page's sections as stops on a line, with a traveller
 *   that rides along as you scroll and a label that flips to the section you are in; the label
 *   opens the full route as a sheet (the menu on phones),
 *   and a hello tag with the time in Bengaluru, which folds to just "Say hello".
 * Position is read from the sections themselves (through their pin spacers when pinned), on
 * ScrollTrigger's update, so it stays right however the page above is pinned or resized.
 */
export function SiteHeader() {
  const pathname = usePathname();
  const home = pathname === "/";
  const root = useRef<HTMLElement>(null);
  const [current, setCurrent] = useState(home ? 0 : WORK);
  const [open, setOpen] = useState(false);
  const [time, setTime] = useState("");

  // The time where Abhishek is. Filled in after hydration so server and client agree.
  useEffect(() => {
    const tick = () => setTime(clock.format(new Date()).replace(" ", " "));
    tick();
    const id = window.setInterval(tick, 20000);
    return () => window.clearInterval(id);
  }, []);

  useGSAP(
    () => {
      const el = root.current;
      if (!el) return;
      const traveller = el.querySelector<HTMLElement>("[data-traveller]");
      const walked = el.querySelector<HTMLElement>("[data-walked]");
      const label = el.querySelector<HTMLElement>("[data-label]");
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const place = (pos: number) => {
        const f = gsap.utils.clamp(0, 1, pos / (N - 1));
        if (traveller) gsap.to(traveller, { left: `${f * 100}%`, duration: reduced ? 0 : 0.35, ease: "power3.out", overwrite: true });
        if (walked) gsap.to(walked, { scaleX: f, duration: reduced ? 0 : 0.35, ease: "power3.out", overwrite: true });
      };

      let shown = -1;
      const show = (i: number) => {
        if (i === shown) return;
        const first = shown === -1;
        shown = i;
        setCurrent(i);
        if (!label) return;
        if (first || reduced) label.textContent = STOPS[i].label;
        else gsap.to(label, { duration: 0.6, overwrite: true, scrambleText: { text: STOPS[i].label, chars: "lowerCase", speed: 0.9 } });
      };

      if (!home) {
        place(WORK);
        show(WORK);
        return;
      }

      const sections = STOPS.map((st) => document.getElementById(st.id));
      const box = (sec: HTMLElement) => {
        const spacer = sec.parentElement?.classList.contains("pin-spacer") ? sec.parentElement : sec;
        return spacer.getBoundingClientRect();
      };
      const update = () => {
        const mid = window.innerHeight * 0.5;
        let at = 0;
        let pos = 0;
        sections.forEach((sec, i) => {
          if (!sec) return;
          const r = box(sec);
          if (r.top <= mid) {
            at = i;
            pos = i + gsap.utils.clamp(0, 1, (mid - r.top) / Math.max(1, r.height));
          }
        });
        // The last stop is reached when the page runs out, even if its section is short.
        if (ScrollTrigger.maxScroll(window) - window.scrollY < 4) {
          at = N - 1;
          pos = N - 1;
        }
        place(Math.min(pos, N - 1));
        show(at);
        el.toggleAttribute("data-compact", window.scrollY > 140);
      };
      const st = ScrollTrigger.create({ start: 0, end: "max", onUpdate: update, onRefresh: update });
      update();
      return () => st.kill();
    },
    { scope: root, dependencies: [home] },
  );

  // The sheet closes on Escape, on a choice, or on a press outside it.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const onDown = (e: PointerEvent) => {
      if (!root.current?.querySelector("[data-dock]")?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onDown);
    };
  }, [open]);

  return (
    <header ref={root} className={`site-header ${s.header}`}>
      <Link href="/" className={s.name} aria-label="Abhishek Jayakumar, home">
        <span className={s.mono} aria-hidden="true">AJ</span>
        <span className={s.full} aria-hidden="true">
          <strong>Abhishek Jayakumar</strong>
          <small>growth &amp; martech</small>
        </span>
      </Link>

      <nav className={s.dock} data-dock aria-label="Sections" data-open={open || undefined}>
        <button type="button" className={s.toggle} aria-expanded={open} aria-controls="route-sheet" onClick={() => setOpen((v) => !v)}>
          <span className={s.where} aria-hidden="true">{home ? "you are at" : "reading"}</span>
          <span className={s.label} data-label>{STOPS[current].label}</span>
          <span className="sr-only">, open the list of sections</span>
          <svg className={s.chev} viewBox="0 0 12 8" aria-hidden="true" focusable="false"><path d="M1 1.5l5 5 5-5" /></svg>
        </button>

        <div className={s.track} aria-hidden="true" onClick={() => window.matchMedia("(max-width: 47.99rem)").matches && setOpen((v) => !v)}>
          <span className={s.line} aria-hidden="true" />
          <span className={s.walked} data-walked aria-hidden="true" />
          <ol>
            {STOPS.map((st, i) => (
              <li key={st.id} style={{ left: `${(i / (N - 1)) * 100}%` }}>
                <Link href={`/#${st.id}`} className={i <= current ? `${s.stop} ${s.passed}` : s.stop} aria-current={i === current ? "location" : undefined} tabIndex={-1} onClick={() => setOpen(false)}>
                  <span className={s.tip}>{st.label}</span>
                </Link>
              </li>
            ))}
          </ol>
          <span className={s.traveller} data-traveller aria-hidden="true" />
        </div>

        <div id="route-sheet" className={s.sheet} hidden={!open}>
          <ol>
            {STOPS.map((st, i) => (
              <li key={st.id} className={i === current ? s.here : i < current ? s.done : undefined}>
                <Link href={`/#${st.id}`} aria-current={i === current ? "location" : undefined} onClick={() => setOpen(false)} data-track={`nav_${st.id}`}>
                  <strong>{st.label}</strong>
                  <span>{st.hint}</span>
                </Link>
              </li>
            ))}
          </ol>
        </div>
      </nav>

      <Link href="/#contact" className={s.hello} data-track="header_say_hello" data-burst aria-label={`Say hello. Open to roles${time ? `; it is ${time} in Bengaluru` : ""}`}>
        <span className={s.pulse} aria-hidden="true" />
        <span className={s.hi} aria-hidden="true">Hi</span>
        <strong>Say hello</strong>
        <small className={s.status}>
          open to roles{time && <>, {time} in Bengaluru</>}
        </small>
      </Link>
    </header>
  );
}
