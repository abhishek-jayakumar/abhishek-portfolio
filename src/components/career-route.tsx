"use client";

import { useRef } from "react";
import { gsap, useGSAP, ScrollTrigger, SplitText, loadDevTools } from "@/lib/gsap-plugins";
import { ROUTE, STAMPS, buildRoad, buildSegments } from "@/content/route";
import s from "./career-route.module.css";

const CIRCLE = "M50,10 C72,10 90,28 90,50 C90,72 72,90 50,90 C28,90 10,72 10,50 C10,28 28,10 50,10Z";
const PLANE = "M96,50 L6,14 L28,50 L6,86 Z";
const STAR = "M50,4 L62,38 L96,38 L68,59 L79,94 L50,73 L21,94 L32,59 L4,38 L38,38Z";
const FLAP_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

/** Same conditions the stylesheet uses: the map whenever motion is welcome, drawn landscape on wide screens and portrait on phones. */
const MOTION = "(prefers-reduced-motion: no-preference)";
const WIDE = "(min-width: 62rem)";

const N = ROUTE.length;
const SEGS = buildSegments(1300, 500);
/** Where each label sits against its pin, chosen so neighbouring labels, arcs and stamps never collide. */
const PLACE = ["down", "down", "down", "down", "up flip", "down", "down", "down"] as const;
const meta = (st: (typeof ROUTE)[number]) => [st.when, st.place].filter(Boolean).join(", ");

/**
 * The career, drawn as a journey. It starts on ledger paper (where it started: finance), the line
 * leaves in right angles and learns to curve, and the two border crossings (to the UK for the MSc,
 * then back home) are flight arcs. The section pins and scrolling rides a
 * traveller along it: the walked road fills in, the traveller becomes a paper plane in the air,
 * a passport stamp lands in each country, the paper loosens from ruled lines into a dot grid,
 * and the world darkens for the last stop. A split-flap board names where you are.
 * Wide screens get a landscape map; phones a portrait one whose road snakes down the screen, so
 * scrolling down walks it. With reduced motion it is the same story as a plain list.
 *
 *   SplitText / ScrambleText  the heading, numbers resolving into words
 *   DrawSVG     the road, the walked line, the flight masks
 *   MotionPath  the traveller riding the road        MorphSVG  circle, plane, star
 *   CustomBounce  stops drop onto the map, stamps press down
 */
export function CareerRoute() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const el = root.current;
      if (!el) return;
      const mm = gsap.matchMedia();

      mm.add({ motion: MOTION, wide: WIDE }, (ctx) => {
        const { motion, wide } = ctx.conditions as { motion: boolean; wide: boolean };
        // Reduced motion keeps the plain, fully readable list.
        if (!motion) return;
        const mobile = !wide;
        const one = <T extends Element = HTMLElement>(sel: string) => el.querySelector<T>(sel);
        const all = <T extends Element = HTMLElement>(sel: string) => gsap.utils.toArray<T>(sel, el);

        const h2 = one("h2");
        const split = h2 ? SplitText.create(h2, { type: "lines", mask: "lines", linesClass: "split-line" }) : null;
        if (split) gsap.set(split.masks, { paddingBottom: "0.16em", marginBottom: "-0.16em" });

        gsap.set(all("[data-intro-item]"), { opacity: 1 });
        if (split) gsap.set(split.lines, { yPercent: 112 });
        gsap.set(all("[data-intro-fade]"), { opacity: 0 });
        el.removeAttribute("data-intro");

        // The heading plays as the section comes up from under the hero.
        const tl = gsap.timeline({ defaults: { ease: "sunrise" }, scrollTrigger: { trigger: el, start: "top 72%", once: true } });
        tl.to(all("[data-intro-fade]"), { opacity: 1, duration: 0.9, stagger: 0.08 }, 0);
        if (split) {
          tl.to(split.lines, { yPercent: 0, duration: 1.25, stagger: 0.13 }, 0.1);
          // The first line starts as numbers, because that is where it started.
          tl.to(split.lines[0], { duration: 1.6, scrambleText: { text: "Numbers first.", chars: "0123456789", speed: 0.35, revealDelay: 0.4 } }, 0.1);
        }

        // ---- The journey (landscape on wide screens, portrait on phones) ---------------------------
        el.dataset.pinned = "true";
        const ledger = one("[data-ledger]");
        const dots = one("[data-dots]");
        const field = one("[data-field]");
        const svg = one<SVGSVGElement>("[data-road-svg]");
        const road = one<SVGPathElement>("[data-road]");
        const bases = all<SVGPathElement>("[data-base]");
        // Walked road is a drawn line; a walked flight is a row of dots that light up behind the plane.
        const walks = all<SVGPathElement>("[data-walk]");
        const walkBy: (SVGPathElement | undefined)[] = [];
        walks.forEach((w) => (walkBy[Number(w.dataset.walk)] = w));
        const skyBy: (SVGGElement | undefined)[] = [];
        all<SVGGElement>("[data-sky]").forEach((g) => (skyBy[Number(g.dataset.sky)] = g));
        const skyLit: number[] = [];
        const traveller = one<SVGElement>("[data-traveller]");
        const glyph = one<SVGPathElement>("[data-traveller] path");
        const hint = one("[data-hint]");
        const readout = one("[data-readout]");
        const rCount = one("[data-r-count]");
        const rKind = one("[data-r-kind]");
        const rBoard = one("[data-r-board]");
        const rMeta = one("[data-r-meta]");
        const rLine = one("[data-r-line]");
        const stops = all("[data-stop]");
        const pins = all("[data-pin]");
        const labels = all("[data-label]");
        const stamps = all("[data-stamp]");
        if (!field || !svg || !road || !traveller || !ledger || !dots || bases.length !== N) return;

        // Real-pixel map (viewBox = the field's size), redrawn when the layout changes. Stop i
        // sits at the end of segment i, so the traveller arrives at each stop exactly when its
        // chapter becomes current.
        let starts: number[] = [];
        let lengths: number[] = [];
        let total = 1;
        let fractions: number[] = [];
        const layout = () => {
          const { width, height } = field.getBoundingClientRect();
          svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
          road.setAttribute("d", buildRoad(width, height, mobile));
          buildSegments(width, height, mobile).forEach((seg, i) => {
            bases[i].setAttribute("d", seg.d);
            walkBy[i]?.setAttribute("d", seg.d);
          });
          lengths = bases.map((b) => b.getTotalLength());
          skyBy.forEach((g, i) => {
            if (!g) return;
            g.replaceChildren();
            const count = Math.max(2, Math.floor(lengths[i] / 13));
            for (let k = 1; k < count; k++) {
              const pt = bases[i].getPointAtLength((lengths[i] * k) / count);
              const c = document.createElementNS("http://www.w3.org/2000/svg", "circle");
              c.setAttribute("cx", pt.x.toFixed(1));
              c.setAttribute("cy", pt.y.toFixed(1));
              c.setAttribute("r", "3.2");
              g.append(c);
            }
            skyLit[i] = -1;
          });
          starts = lengths.map((_, i) => lengths.slice(0, i).reduce((a, b) => a + b, 0));
          total = lengths.reduce((a, b) => a + b, 0) || 1;
          fractions = lengths.map((len, i) => (starts[i] + len) / total);
        };
        layout();
        const toFraction = (p: number) => {
          const at = gsap.utils.clamp(0, N - 1, p * (N - 1));
          const i = Math.min(N - 2, Math.floor(at));
          return fractions[i] + (fractions[i + 1] - fractions[i]) * (at - i);
        };

        const ride = gsap.to(traveller, { motionPath: { path: road, align: road, alignOrigin: [0.5, 0.5], autoRotate: true }, ease: "none", paused: true });

        // Intro: the paper is ruled, the road is drawn, the stops drop onto it.
        const roads = bases.filter((_, i) => !SEGS[i].flight);
        const skies = bases.filter((_, i) => SEGS[i].flight);
        gsap.set(ledger, { clipPath: "inset(0% 100% 0% 0%)" });
        gsap.set(roads, { drawSVG: "0%" });
        gsap.set(skies, { opacity: 0 });
        gsap.set(walks, { drawSVG: "0% 0%" });
        gsap.set(pins, { opacity: 0, y: -70 });
        gsap.set(labels, { opacity: 0, y: 12 });
        gsap.set(stamps, { opacity: 0, scale: 1.9 });
        gsap.set(traveller, { opacity: 0, scale: 0 });
        if (readout) gsap.set(readout, { opacity: 0, y: 16 });
        if (hint) gsap.set(hint, { opacity: 0 });

        tl.to(ledger, { clipPath: "inset(0% 0% 0% 0%)", duration: 1.7, ease: "power3.inOut" }, 0)
          .to(roads, { drawSVG: "100%", duration: 0.45, ease: "none", stagger: 0.28 }, 0.5)
          .to(skies, { opacity: 1, duration: 0.6, stagger: 0.84 }, 1.0)
          .to(pins, { opacity: 1, y: 0, duration: 1, ease: "drop", stagger: 0.17 }, 0.8)
          .to(pins, { scaleX: 1.3, scaleY: 0.7, duration: 1, ease: "drop-squash", transformOrigin: "50% 100%", stagger: 0.17 }, 0.8)
          .to(labels, { opacity: 1, y: 0, duration: 0.7, ease: "power3.out", stagger: 0.17 }, 1.1)
          .to(traveller, { opacity: 1, scale: 1, duration: 0.7, ease: "back.out(2.4)" }, 2.0);
        if (readout) tl.to(readout, { opacity: 1, y: 0, duration: 0.9, ease: "power3.out" }, 1.6);
        if (hint) tl.to(hint, { opacity: 1, duration: 0.8 }, 2.5);
        tl.add(() => {
          gsap.set(labels, { clearProps: "opacity,y" });
          gsap.set(pins, { clearProps: "opacity,y,scaleX,scaleY,transformOrigin" });
          introDone = true;
          render(latest, true);
        }, ">");
        let introDone = false;
        void loadDevTools({ dot: traveller, path: road, timeline: tl });

        // The split-flap board: each letter flips through a few others before it lands.
        let flaps: gsap.core.Timeline[] = [];
        const flapTo = (text: string, animate: boolean) => {
          if (!rBoard) return;
          flaps.forEach((f) => f.kill());
          flaps = [];
          rBoard.textContent = "";
          let n = 0;
          text.split(" ").forEach((word, wi, words) => {
            const w = document.createElement("span");
            w.className = s.flapWord;
            for (const ch of word) {
              const tile = document.createElement("span");
              tile.className = s.flap;
              tile.textContent = ch;
              w.append(tile);
              if (animate) {
                const f = gsap.timeline({ delay: n * 0.03 });
                const turns = 2 + Math.floor(Math.random() * 3);
                for (let k = 0; k < turns; k++) {
                  const next = k === turns - 1 ? ch : FLAP_CHARS[Math.floor(Math.random() * FLAP_CHARS.length)];
                  f.to(tile, { rotationX: -90, duration: 0.055, ease: "power1.in" })
                    .add(() => {
                      tile.textContent = next;
                    })
                    .set(tile, { rotationX: 90 })
                    .to(tile, { rotationX: 0, duration: 0.07, ease: "power1.out" });
                }
                flaps.push(f);
              }
              n++;
            }
            rBoard.append(w);
            if (wi < words.length - 1) rBoard.append(" ");
          });
        };

        let shown = -1;
        const showStop = (index: number) => {
          const stop = ROUTE[index];
          const first = shown === -1;
          shown = index;
          if (rCount) rCount.textContent = `Stop ${index + 1} of ${N}`;
          if (rMeta) rMeta.textContent = meta(stop);
          if (rLine) {
            rLine.textContent = stop.line;
            if (!first) gsap.fromTo(rLine, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.55, ease: "power3.out", overwrite: true });
          }
          flapTo(stop.title, !first);
        };

        // Passport stamps press down once, and lift again if you scroll back past the border.
        const pressed = STAMPS.map(() => false);
        const pressStamps = (index: number, instant: boolean) => {
          STAMPS.forEach((st, k) => {
            const on = index >= st.at;
            if (on === pressed[k]) return;
            pressed[k] = on;
            if (instant) gsap.set(stamps[k], { opacity: on ? 0.9 : 0, scale: on ? 1 : 1.9 });
            else if (on) gsap.to(stamps[k], { opacity: 0.9, scale: 1, duration: 0.55, ease: "back.out(3)", overwrite: true });
            else gsap.to(stamps[k], { opacity: 0, scale: 1.9, duration: 0.35, ease: "power2.in", overwrite: true });
          });
        };

        let shape = "circle";
        const setShape = (next: string) => {
          if (next === shape || !glyph) return;
          shape = next;
          gsap.to(glyph, { morphSVG: next === "plane" ? PLANE : next === "star" ? STAR : CIRCLE, duration: 0.5, ease: "power2.inOut", overwrite: true });
        };

        let latest = 0;
        let lastKind = "";
        const render = (p: number, force = false) => {
          latest = p;
          const f = toFraction(p);
          ride.progress(f);
          const at = f * total;
          let flying = -1;
          SEGS.forEach((seg, i) => {
            const local = gsap.utils.clamp(0, 1, (at - starts[i]) / (lengths[i] || 1));
            const w = walkBy[i];
            if (w) gsap.set(w, { drawSVG: `0% ${local * 100}%` });
            const g = skyBy[i];
            if (g) {
              const lit = Math.floor(local * (g.children.length + 1));
              if (lit !== skyLit[i]) {
                skyLit[i] = lit;
                Array.from(g.children).forEach((c, k) => c.classList.toggle(s.lit, k < lit));
              }
            }
            if (seg.flight && local > 0.02 && local < 0.98) flying = i;
          });
          const index = Math.round(p * (N - 1));
          stops.forEach((stop, i) => {
            stop.classList.toggle(s.reached, i <= index);
            stop.classList.toggle(s.current, i === index);
          });
          setShape(flying >= 0 ? "plane" : index === N - 1 ? "star" : "circle");
          // In the air, the board says so.
          const kind = flying >= 0 ? `In the air: ${ROUTE[flying].flight}` : ROUTE[index].kind;
          if (rKind && kind !== lastKind) {
            lastKind = kind;
            rKind.textContent = kind;
          }
          // Ruled ledger paper loosens into a dot grid as the work goes digital...
          const evolve = gsap.utils.clamp(0, 1, (p - 0.4) / 0.4);
          gsap.set(ledger, { opacity: 1 - evolve });
          gsap.set(dots, { opacity: evolve });
          // ...and the world darkens for the last stop: what I am building now.
          const night = gsap.utils.clamp(0, 1, (p - 0.8) / 0.2);
          gsap.set(el, {
            "--hero-bg": gsap.utils.interpolate("#faf7f0", "#2a1b66", night),
            "--hero-fg": gsap.utils.interpolate("#1d1736", "#faf7f0", night),
            "--stamp-ink": gsap.utils.interpolate("#5b3fd0", "#c8a45a", night),
          });
          if (hint && introDone) gsap.set(hint, { opacity: p > 0.015 ? 0 : 1 });
          if (introDone) pressStamps(index, force);
          if (index !== shown) showStop(index);
        };

        const proxy = { p: 0 };
        gsap.to(proxy, {
          p: 1,
          ease: "none",
          onUpdate: () => render(proxy.p),
          scrollTrigger: {
            trigger: el,
            start: "top top",
            end: `+=${(N - 1) * 62}%`,
            pin: true,
            scrub: 0.8,
            anticipatePin: 1,
            invalidateOnRefresh: true,
          },
        });
        render(0);

        const relayout = () => {
          layout();
          if (tl.progress() === 1) gsap.set(roads, { drawSVG: "100%" });
          ride.invalidate();
          render(latest, true);
        };
        ScrollTrigger.addEventListener("refreshInit", relayout);

        return () => {
          ScrollTrigger.removeEventListener("refreshInit", relayout);
          flaps.forEach((f) => f.kill());
          tl.scrollTrigger?.kill();
          delete el.dataset.pinned;
        };
      });
    },
    { scope: root },
  );

  return (
    <section ref={root} id="route" className={s.hero} data-section="route" data-intro="pending" aria-labelledby="route-heading">
      <div className={s.paper} aria-hidden="true">
        <div className={s.ledger} data-ledger data-intro-item />
        <div className={s.dots} data-dots />
      </div>

      <div className={s.stage}>
        <p className={s.top} data-intro-item data-intro-fade>The route so far</p>

        <h2 id="route-heading" className={s.title} data-intro-item>
          Numbers first.<br />Then people.<br />Now, what I build.
        </h2>

        <div className={s.field} data-field data-intro-item>
          <svg className={s.road} data-road-svg viewBox="0 0 1300 500" aria-hidden="true" focusable="false">
            <path className={s.ride} data-road d={buildRoad(1300, 500)} />
            {SEGS.map((seg, i) => (
              <path key={i} className={seg.flight ? s.skyBase : s.roadBase} data-base d={seg.d} />
            ))}
            {SEGS.map((seg, i) =>
              seg.flight ? (
                <g key={i} className={s.skyWalked} data-sky={i} />
              ) : (
                <path key={i} className={s.roadWalked} data-walk={i} d={seg.d} />
              ),
            )}
          </svg>

          {STAMPS.map((st) => (
            <div key={st.country + st.at} className={s.stamp} style={{ "--x": `${st.x}%`, "--y": `${st.y}%`, "--mx": `${st.mx}%`, "--my": `${st.my}%`, "--tilt": `${st.tilt}deg` } as React.CSSProperties} data-stamp aria-hidden="true">
              <strong>{st.country}</strong>
              <span>{st.note}</span>
            </div>
          ))}

          <div className={s.listWrap}>
            <span className={s.fill} data-fill aria-hidden="true" />
            <ol className={s.stops} aria-label="My career, in order">
              {ROUTE.map((stop, i) => (
                <li key={stop.key} className={`${s.stop} ${PLACE[i].split(" ").map((c) => s[c]).join(" ")} ${stop.mx > 50 ? s.mLeft : s.mRight} ${i === 0 ? `${s.reached} ${s.current}` : ""}`} style={{ "--x": `${stop.x}%`, "--y": `${stop.y}%`, "--mx": `${stop.mx}%`, "--my": `${stop.my}%` } as React.CSSProperties} data-stop>
                  {stop.flight && <p className={s.flight}><span aria-hidden="true">✈</span> {stop.flight}</p>}
                  <span className={s.pin} data-pin aria-hidden="true" />
                  <div className={s.label} data-label>
                    <p className={s.kind}>{stop.kind}</p>
                    <h3>{stop.title}</h3>
                    <p className={s.meta}>{meta(stop)}</p>
                    <p className={s.line}>{stop.line}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          <svg className={s.traveller} data-traveller viewBox="0 0 100 100" aria-hidden="true" focusable="false">
            <path d={CIRCLE} />
          </svg>
          <p className={s.hint} data-hint aria-hidden="true">scroll to follow the line</p>
        </div>

        <div className={s.readout} data-readout data-intro-item aria-hidden="true">
          <p className={s.rTop}>
            <span data-r-count>Stop 1 of {N}</span>
            <span data-r-kind>{ROUTE[0].kind}</span>
          </p>
          <p className={s.rBoard} data-r-board>{ROUTE[0].title}</p>
          <p className={s.rMeta} data-r-meta>{meta(ROUTE[0])}</p>
          <p className={s.rLine} data-r-line>{ROUTE[0].line}</p>
        </div>
      </div>
    </section>
  );
}
