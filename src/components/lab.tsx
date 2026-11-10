"use client";

import Link from "next/link";
import { useRef } from "react";
import { gsap, useGSAP } from "@/lib/gsap-plugins";
import { EXPERIMENTS } from "@/lab/experiments";
import { LabPreview } from "./lab-previews";
import s from "./lab-cards.module.css";

/**
 * The Lab on the homepage: four experiments, each a card that opens a working tool on its own
 * page. The previews play once when the cards arrive and again on hover or focus; with reduced
 * motion they are simply still pictures.
 */
export function Lab() {
  const root = useRef<HTMLUListElement>(null);

  useGSAP(
    () => {
      const el = root.current;
      if (!el) return;
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const cards = gsap.utils.toArray<HTMLElement>("[data-card]", el);
        const timelines = cards.map((card) => {
          const q = gsap.utils.selector(card);
          const tl = gsap.timeline({ paused: true, defaults: { ease: "power3.out" } });
          // Each preview has only some of these parts; animate the ones this card has.
          const part = (sel: string, vars: gsap.TweenVars, at: number) => {
            const els = q(sel);
            if (els.length) tl.from(els, vars, at);
          };
          part("[data-grow]", { scaleX: 0, transformOrigin: "0% 50%", duration: 0.7, stagger: 0.07 }, 0);
          part("[data-draw]", { drawSVG: "0%", duration: 1.1, ease: "power2.inOut" }, 0.2);
          part("[data-wash]", { opacity: 0, duration: 0.6 }, 0.7);
          part("[data-pop]", { scale: 0, transformOrigin: "50% 50%", duration: 0.5, ease: "back.out(3)" }, 1.1);
          part("[data-seg]", { scaleX: 0, transformOrigin: "0% 50%", duration: 0.55, stagger: 0.06 }, 0);
          part("[data-knob]", { x: -60, opacity: 0, duration: 0.8, stagger: 0.1 }, 0.3);
          part("[data-cell]", { opacity: 0, scale: 0.6, transformOrigin: "50% 50%", duration: 0.35, stagger: 0.018 }, 0);
          part("[data-bar]", { scaleY: 0, transformOrigin: "50% 100%", duration: 0.8, stagger: 0.15 }, 0);
          part("[data-whisker]", { scaleY: 2.2, opacity: 0, transformOrigin: "50% 50%", duration: 0.9, stagger: 0.15 }, 0.5);
          return tl;
        });

        // Play each preview once as the cards come into view.
        const io = new IntersectionObserver(
          (entries) => {
            entries.forEach((en) => {
              if (!en.isIntersecting) return;
              const i = cards.indexOf(en.target as HTMLElement);
              timelines[i]?.play(0);
              io.unobserve(en.target);
            });
          },
          { threshold: 0.35 },
        );
        cards.forEach((c) => io.observe(c));

        // Replay on hover or keyboard focus.
        const offs = cards.map((card, i) => {
          const replay = () => {
            if (!timelines[i].isActive()) timelines[i].play(0);
          };
          card.addEventListener("pointerenter", replay);
          card.addEventListener("focusin", replay);
          return () => {
            card.removeEventListener("pointerenter", replay);
            card.removeEventListener("focusin", replay);
          };
        });

        return () => {
          io.disconnect();
          offs.forEach((off) => off());
        };
      });
    },
    { scope: root },
  );

  return (
    <ul ref={root} className={s.cards}>
      {EXPERIMENTS.map((e) => (
        <li key={e.slug} data-card>
          <Link href={`/lab/${e.slug}`} className={s.card} data-track={`lab_open_${e.slug}`}>
            <div className={`${s.preview} ${s[`pv_${e.preview}`]}`}>
              <LabPreview kind={e.preview} />
            </div>
            <div className={s.body}>
              <p className={s.meta}>
                <span className={s.no}>Experiment {e.no}</span>
                <span>{e.category}</span>
              </p>
              <h3 className={s.title}>{e.title}</h3>
              <p className={s.short}>{e.short}</p>
              <ul className={s.tools} aria-label="Built with">
                {e.tools.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
              <span className={s.cta}>
                {e.cta} <span aria-hidden="true">→</span>
              </span>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
