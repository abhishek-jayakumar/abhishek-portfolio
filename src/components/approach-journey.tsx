"use client";

import Image from "next/image";
import { useRef } from "react";
import { gsap, useGSAP } from "@/lib/gsap-plugins";
import { DotGrid } from "./dot-grid";
import s from "./approach-journey.module.css";

// One glyph that changes shape with the stage: a point (position), a diamond (acquire),
// a funnel (convert), a star (learn and build). MorphSVG does the in-betweens.
const GLYPHS = [
  "M50,10 C72,10 90,28 90,50 C90,72 72,90 50,90 C28,90 10,72 10,50 C10,28 28,10 50,10Z",
  "M50,6 L94,50 L50,94 L6,50Z",
  "M8,14 L92,14 L58,54 L58,90 L42,82 L42,54Z",
  "M50,4 L62,38 L96,38 L68,59 L79,94 L50,73 L21,94 L32,59 L4,38 L38,38Z",
];

const STEPS = [
  { word: "Position", text: "Audience, offer, product story, GTM." },
  { word: "Acquire", text: "Paid media, content, search, demand generation." },
  { word: "Convert", text: "Landing pages, CRO, customer journeys." },
  { word: "Learn & build", text: "Analytics, automation, AI-assisted experiments." },
] as const;

function Visual({ index }: { index: number }) {
  if (index === 0)
    return (
      <figure className={s.visual} data-visual>
        <div className={s.shot}>
          <Image src="/img/work/sastrum-countdown-world.jpg" alt="A frame from the Sastrum launch countdown film: Born in India. Built for the world." width={1280} height={720} sizes="(min-width: 60rem) 42vw, 90vw" />
        </div>
        <figcaption>From the Sastrum go-to-market work. A global plan starts as a decision about who it is for and what to say first.</figcaption>
      </figure>
    );
  if (index === 1)
    return (
      <figure className={s.visual} data-visual>
        <div className={s.paper}>
          <p className={s.paperLabel}>Campaign record / capacity &amp; demand</p>
          <p className={s.paperBig}><strong>1,000+</strong> enquiries for 50 seats</p>
          <DotGrid label="1,000 enquiry dots, with the first 50 highlighted to show seat capacity, not attributed conversions" />
        </div>
        <figcaption>Reported volume and capacity, not a person-by-person conversion record.</figcaption>
      </figure>
    );
  if (index === 2)
    return (
      <figure className={s.visual} data-visual>
        <div className={s.shot}>
          <Image src="/img/work/sastrum-home.jpg" alt="The Sastrum homepage: GRC, simplified, with Book a demo as the one clear next step" width={1440} height={900} sizes="(min-width: 60rem) 42vw, 90vw" />
        </div>
        <figcaption>sastrum.ai. The next step, booking a demo, is part of the page from the first screen.</figcaption>
      </figure>
    );
  return (
    <figure className={s.visual} data-visual>
      <div className={s.paper}>
        <p className={s.paperLabel}>Measurement review / one event under the lens</p>
        <code className={s.event}>form_submit</code>
        <p className={s.flow}><span>Button pressed</span><span aria-hidden="true">↓</span><span>Request sent</span><span aria-hidden="true">↓</span><strong>Was it accepted?</strong></p>
      </div>
      <figcaption>Proposed: confirm the response before counting the conversion.</figcaption>
    </figure>
  );
}

/**
 * Position, Acquire, Convert, Learn & build as a walk. On every screen the section
 * pins and the four stages travel past you sideways, with a thread along the bottom
 * that fills as you go; phones get a portrait version of the same walk. With reduced motion it is the four
 * stages stacked, fully readable, nothing pinned.
 */
export function ApproachJourney() {
  const root = useRef<HTMLElement>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLOListElement>(null);
  const fill = useRef<HTMLElement>(null);
  const glyph = useRef<SVGPathElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const w = wrap.current;
        const t = track.current;
        if (!w || !t) return;
        const panels = gsap.utils.toArray<HTMLElement>("[data-panel]", t);
        const stops = gsap.utils.toArray<HTMLElement>("[data-stop]", w);
        w.dataset.pinned = "true";
        const distance = () => t.scrollWidth - w.clientWidth;
        let current = -1;
        const light = (i: number) => {
          if (i === current) return;
          current = i;
          panels.forEach((p, n) => p.classList.toggle(s.on, n === i));
          if (glyph.current) gsap.to(glyph.current, { morphSVG: GLYPHS[i], duration: 0.9, ease: "sunrise", overwrite: true });
          stops.forEach((d, n) => d.classList.toggle(s.reached, n <= i));
        };
        light(0);

        // Everything below is driven by the tween's own (smoothed) progress, so the panel,
        // the picture, the word and the thread all move as one piece. `lag` is how far a panel
        // is from the centre of the screen, in screens: 0 when it is the one you are reading.
        const visuals = panels.map((panel) => panel.querySelector<HTMLElement>("[data-visual]"));
        const words = panels.map((panel) => panel.querySelector<HTMLElement>("[data-word]"));
        const drift = (progress: number) => {
          panels.forEach((_, n) => {
            const lag = gsap.utils.clamp(-1, 1, n - progress * (panels.length - 1));
            if (visuals[n]) gsap.set(visuals[n], { x: lag * 110, rotate: lag * 2.5 });
            if (words[n]) gsap.set(words[n], { x: lag * -70 });
          });
          light(Math.round(progress * (panels.length - 1)));
          if (fill.current) gsap.set(fill.current, { scaleX: progress });
        };
        drift(0);

        gsap.to(t, {
          x: () => -distance(),
          ease: "none",
          onUpdate() {
            drift(this.progress());
          },
          scrollTrigger: {
            trigger: w,
            start: "top top",
            end: () => `+=${distance()}`,
            pin: true,
            scrub: 1,
            anticipatePin: 1,
            invalidateOnRefresh: true,
          },
        });

        return () => {
          delete w.dataset.pinned;
          panels.forEach((p) => p.classList.remove(s.on));
        };
      });
    },
    { scope: root },
  );

  return (
    <section id="capabilities" ref={root} className={s.journey} aria-label="How the work connects">
      <div className={s.wrap} ref={wrap}>
        <ol className={s.track} ref={track}>
          {STEPS.map((step, i) => (
            <li key={step.word} className={s.panel} data-panel>
              <div className={s.copy}>
                <h3 className={s.word} data-word><span>{step.word}</span></h3>
                <p className={s.blurb}>{step.text}</p>
              </div>
              <Visual index={i} />
            </li>
          ))}
        </ol>
        <svg className={s.glyph} viewBox="0 0 100 100" aria-hidden="true" focusable="false">
          <path ref={glyph} d={GLYPHS[0]} />
        </svg>
        <div className={s.rail} aria-hidden="true">
          <div className={s.railTrack}>
            <i className={s.railFill} ref={fill} />
            {STEPS.map((step, i) => (
              <b key={step.word} className={s.stop} data-stop style={{ left: `${(i / (STEPS.length - 1)) * 100}%` }}>
                <em>{step.word}</em>
              </b>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
