"use client";

import { useMemo, useRef, useState, useSyncExternalStore } from "react";
import { gsap, useGSAP, ScrollTrigger, Flip } from "@/lib/gsap-plugins";
import { track } from "@/lib/track";
import { startSessionPath } from "@/lib/session-path";
import s from "./growth-hero.module.css";

/**
 * The hero is the visitor's own journey, played back to them in three beats:
 *
 * 1. Search. A search bar types the query this visitor is most likely here for, and two results
 *    appear: a generic sponsored one, and Abhishek as the top organic result.
 * 2. Click. The result is "clicked" (or the visitor clicks it), and the search falls away.
 * 3. Land. A single brass line enters from the edge of the page, underlines the name while the
 *    letters trace themselves in, and leaves through the bottom of the hero toward the next section.
 *
 * The landing page is personalised from the link the visitor arrived on: ?for=company (or
 * utm_campaign) greets that company by name, LinkedIn and search arrivals get their own line.
 * A note says exactly which parameter set the headline, and the other versions are one click away.
 *
 * Underneath, a faint dot grid warms where the pointer goes (a heatmap of this visit); the same
 * visit is recorded in memory and replayed at the contact section (src/lib/session-path.ts).
 *
 * The intro plays once per tab session. Reduced motion, a return visit or scrolling away skips
 * straight to the landing state. Without JavaScript the landing state is plain markup.
 */

type Variant = { key: string; query: string; lede: string; how: string; code?: string };

const DEFAULT: Variant = {
  key: "default",
  query: "growth marketer who also builds the tracking",
  lede: "I bring the right people in, and build the tracking that shows what they did next.",
  how: "This headline changes with the link you arrive on.",
};
const LINKEDIN: Variant = {
  key: "linkedin",
  query: "abhishek jayakumar growth marketing",
  lede: "Hello from LinkedIn. Here is the work behind the profile: campaigns, landing pages and the tracking under them.",
  how: "Example version for",
  code: "utm_source=linkedin",
};
const SEARCH: Variant = {
  key: "search",
  query: "growth marketer bengaluru martech",
  lede: "You searched, clicked and landed. That path is my job: I plan it, build it and measure it.",
  how: "Example version for",
  code: "referrer: google.com",
};
const TEAM: Variant = {
  key: "team",
  query: "growth marketer for our team",
  lede: "Hi, hiring team. I bring the right people in, and build the tracking that shows what they did next.",
  how: "Example version for",
  code: "?for=your-team",
};
const EXAMPLES = [DEFAULT, LINKEDIN, SEARCH, TEAM];

/** "razorpay" or "acme-labs" becomes "Razorpay" / "Acme Labs". Anything odd is dropped. */
function cleanName(raw: string) {
  const t = raw
    .replace(/[-_+]+/g, " ")
    .replace(/[^\p{L}\p{N} &.']/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 32);
  if (!t) return "";
  return /\p{Lu}/u.test(t) ? t : t.replace(/(^|\s)(\p{L})/gu, (_, a: string, c: string) => a + c.toUpperCase());
}

function resolveVariant(): Variant {
  const q = new URLSearchParams(window.location.search);
  for (const key of ["for", "company", "utm_campaign"]) {
    const raw = q.get(key);
    const name = raw ? cleanName(raw) : "";
    if (raw && name) {
      return {
        key: "company",
        query: `growth marketer for ${name.toLowerCase()}`,
        lede: `Hi ${name}. I bring the right people to brands like yours, and build the tracking that shows what they did next.`,
        how: "Written for you, set by",
        code: `${key}=${raw.slice(0, 40)}`,
      };
    }
  }
  let host = "";
  try {
    host = document.referrer ? new URL(document.referrer).hostname.replace(/^www\./, "") : "";
  } catch {
    /* an unreadable referrer is treated as direct */
  }
  const source = (q.get("utm_source") ?? "").toLowerCase().slice(0, 30);
  if (source.includes("linkedin") || /(^|\.)linkedin\.com$|^lnkd\.in$/.test(host)) {
    return { ...LINKEDIN, how: "Written for you, set by", code: source ? `utm_source=${source}` : `referrer: ${host}` };
  }
  if (/(^|\.)(google|bing|duckduckgo|yahoo|ecosia)\./.test(host) || ["google", "bing"].includes(source)) {
    return { ...SEARCH, how: "Written for you, set by", code: source ? `utm_source=${source}` : `referrer: ${host}` };
  }
  return DEFAULT;
}

// The visitor's variant is read once, on the client. The server always renders the default.
let resolved: Variant | null = null;
const getResolved = () => (resolved ??= resolveVariant());
const subscribeNever = () => () => {};
const INTRO_KEY = "aj-hero-intro";
const NS = "http://www.w3.org/2000/svg";
let reported = false;

export function GrowthHero() {
  const root = useRef<HTMLElement>(null);
  const first = useSyncExternalStore(subscribeNever, getResolved, () => null);
  const variants = useMemo(() => (first ? [first, ...EXAMPLES.filter((v) => v.key !== first.key)] : [DEFAULT]), [first]);
  const [index, setIndex] = useState(0);
  const variant = variants[index % variants.length];
  const api = useRef({ land: () => {}, replay: () => {}, swap: () => {} });

  // ---- Search, click, land ------------------------------------------------------------------
  useGSAP(
    (_ctx, contextSafe) => {
      const el = root.current;
      if (!el || !first || !contextSafe) return;
      const one = <T extends Element = HTMLElement>(sel: string) => el.querySelector<T>(sel);
      const search = one("[data-search]");
      const queryEl = one("[data-query]");
      const hit = one("[data-hit]");
      const h1 = one("h1");
      const ink = one<SVGSVGElement>("[data-ink]");
      const thread = one<SVGPathElement>("[data-thread]");
      const trace = one<SVGGElement>("[data-trace]");
      if (!search || !queryEl || !hit || !h1 || !ink || !thread || !trace) return;
      const results = gsap.utils.toArray<HTMLElement>("[data-result]", el);
      const arrive = gsap.utils.toArray<HTMLElement>("[data-arrive]", el);
      const lines = Array.from(h1.querySelectorAll<HTMLElement>("[data-line]"));
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      startSessionPath();
      if (!reported) {
        reported = true;
        track("hero_variant", first.code ? `${first.key} (${first.code})` : first.key);
      }

      /** Wide screens keep the search, docked on the right, as the record of how the visitor got here. */
      const wide = () => window.matchMedia("(min-width: 75rem)").matches;

      /** One line: in from the left edge (or from the clicked result), under the name, and on. */
      const layoutThread = () => {
        const box = el.getBoundingClientRect();
        const W = box.width;
        const H = box.height;
        ink.setAttribute("viewBox", `0 0 ${W} ${H}`);
        let left = Infinity;
        let right = 0;
        for (const line of lines) {
          const r = line.getBoundingClientRect();
          left = Math.min(left, r.left - box.left);
          right = Math.max(right, r.right - box.left);
        }
        const r = h1.getBoundingClientRect();
        const top = r.top - box.top;
        const yb = top + r.height;
        const xr = Math.min(right, W - 96);
        const exit = Math.min(W - 16, xr + 46);
        // With the search docked on the right, the line starts at the result that was clicked,
        // swings down to the end of the name and underlines it from right to left.
        const link = hit.querySelector("button");
        const docked = el.hasAttribute("data-docked") && search.getBoundingClientRect().width > 0 && link;
        if (docked) {
          const hr = link.getBoundingClientRect();
          const sx = hr.left - box.left - 14;
          const sy = hr.top - box.top + hr.height / 2;
          thread.setAttribute(
            "d",
            [
              `M ${sx} ${sy}`,
              `C ${sx - 70} ${sy + 10}, ${xr + 70} ${yb - 30}, ${xr + 8} ${yb + 10}`,
              // The underline sits below the descenders (the J and the y), clear of the letters.
              `S ${left + (xr - left) * 0.42} ${yb + 38}, ${left + 34} ${yb + 40}`,
              `C ${left - 6} ${yb + 41}, ${left - 22} ${yb + 22}, ${left - 4} ${yb + 12}`,
            ].join(" "),
          );
          return;
        }
        // On narrow screens the copy fills the width, so the line leaves off the right edge instead.
        if (W < 768) {
          thread.setAttribute(
            "d",
            [
              `M -20 ${top + r.height * 0.42}`,
              `C ${left * 0.5} ${top + r.height * 0.42}, ${left - 16} ${yb + 34}, ${left + 30} ${yb + 30}`,
              `S ${W * 0.7} ${yb + 22}, ${W + 24} ${yb + 2}`,
            ].join(" "),
          );
          return;
        }
        thread.setAttribute(
          "d",
          [
            `M -20 ${top + r.height * 0.42}`,
            // The underline sits below the descenders (the J and the y), clear of the letters.
            `C ${left * 0.55} ${top + r.height * 0.42}, ${left - 24} ${yb + 46}, ${left + 36} ${yb + 40}`,
            `S ${left + (xr - left) * 0.72} ${yb + 28}, ${xr + 16} ${yb + 8}`,
            `C ${xr + 68} ${yb - 12}, ${xr + 72} ${yb + 64}, ${xr + 22} ${yb + 72}`,
            `C ${xr - 26} ${yb + 80}, ${exit} ${H - 150}, ${exit} ${H + 24}`,
          ].join(" "),
        );
      };

      /** The name's letters as outlines, laid exactly over the real h1, to be traced in. */
      const buildTrace = () => {
        trace.replaceChildren();
        const box = el.getBoundingClientRect();
        const cs = getComputedStyle(h1);
        const size = parseFloat(cs.fontSize);
        const measure = document.createElement("canvas").getContext("2d");
        if (measure) measure.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
        return lines.map((line) => {
          const r = line.getBoundingClientRect();
          const text = line.textContent ?? "";
          const ascent = measure?.measureText(text).fontBoundingBoxAscent || size * 0.9;
          const t = document.createElementNS(NS, "text");
          t.textContent = text;
          t.setAttribute("x", String(r.left - box.left));
          t.setAttribute("y", String(r.top - box.top + ascent));
          t.setAttribute("class", s.traceText);
          t.style.fontFamily = cs.fontFamily;
          t.style.fontSize = cs.fontSize;
          t.style.fontWeight = cs.fontWeight;
          t.style.letterSpacing = cs.letterSpacing;
          t.style.fontVariationSettings = cs.fontVariationSettings;
          trace.append(t);
          return t;
        });
      };

      let intro: gsap.core.Timeline | null = null;
      let landing: gsap.core.Timeline | null = null;
      let landed = false;

      const showLanding = (animate: boolean) => {
        landed = true;
        landing?.kill();
        if (!animate) {
          el.dataset.stage = "landing";
          if (wide()) {
            // Arriving straight at the landing page: the docked search is already filled in.
            el.dataset.docked = "";
            queryEl.textContent = search.dataset.q ?? DEFAULT.query;
            gsap.set([search, ...results], { autoAlpha: 1, y: 0 });
            gsap.set(hit, { backgroundColor: "rgba(91, 63, 208, 0.1)" });
          } else {
            gsap.set(search, { autoAlpha: 0 });
          }
          layoutThread();
          gsap.set(thread, { drawSVG: "100%" });
          gsap.set([h1, ...arrive], { clearProps: "opacity,visibility,transform,color" });
          trace.replaceChildren();
          return;
        }
        gsap.set(h1, { color: "rgba(42, 27, 102, 0)" });
        gsap.set(arrive, { autoAlpha: 0, y: 16 });
        gsap.set(thread, { drawSVG: "0%" });
        el.dataset.stage = "landing";
        layoutThread();
        const texts = buildTrace();
        landing = gsap
          .timeline()
          .to(thread, { drawSVG: "100%", duration: 2.4, ease: "power2.inOut" }, 0)
          .to(texts, { strokeDashoffset: 0, duration: 1.7, ease: "power1.inOut", stagger: 0.18 }, 0.25)
          .to(h1, { color: "rgba(42, 27, 102, 1)", duration: 0.7, ease: "power1.out" }, 1.5)
          .to(texts, { opacity: 0, duration: 0.6 }, 1.75)
          .to(arrive, { autoAlpha: 1, y: 0, duration: 0.8, ease: "sunrise", stagger: 0.1 }, 1.35)
          .add(() => {
            gsap.set(h1, { clearProps: "color" });
            trace.replaceChildren();
          });
      };

      const land = contextSafe(() => {
        if (landed) return;
        landed = true;
        intro?.kill();
        try {
          sessionStorage.setItem(INTRO_KEY, "1");
        } catch {
          /* private mode: the intro may play again, which is fine */
        }
        if (wide()) {
          // The search card glides to the right and shrinks into "How you got here".
          const state = Flip.getState(search);
          el.dataset.docked = "";
          Flip.from(state, { duration: 0.9, ease: "power3.inOut", scale: true, onComplete: () => showLanding(true) });
          return;
        }
        gsap.to(search, { autoAlpha: 0, y: -18, duration: 0.45, ease: "power2.in", onComplete: () => showLanding(true) });
      });

      const playSearch = contextSafe(() => {
        landed = false;
        landing?.kill();
        trace.replaceChildren();
        delete el.dataset.docked;
        el.dataset.stage = "search";
        gsap.set(search, { clearProps: "transform" });
        gsap.set(search, { autoAlpha: 1, y: 0 });
        gsap.set(results, { autoAlpha: 0, y: 10 });
        gsap.set(hit, { clearProps: "backgroundColor" });
        gsap.set(thread, { drawSVG: "0%" });
        queryEl.textContent = "";
        const query = search.dataset.q ?? DEFAULT.query; // the current version's query, from the markup
        intro = gsap
          .timeline({ onComplete: land })
          .to(queryEl, { text: { value: query }, duration: query.length * 0.045, ease: "none" }, 0.5)
          .to(results, { autoAlpha: 1, y: 0, duration: 0.5, stagger: 0.14, ease: "power2.out" }, "+=0.35")
          .to(hit, { backgroundColor: "rgba(91, 63, 208, 0.1)", duration: 0.3 }, "+=1.2")
          .to(hit, { scale: 0.985, duration: 0.12, yoyo: true, repeat: 1, ease: "power1.inOut" })
          .to({}, { duration: 0.25 });
      });

      const replay = contextSafe(() => {
        if (reduced) return;
        playSearch();
      });

      /** Show the next version of the headline: out, swap, back in. */
      const swap = contextSafe(() => {
        const parts = gsap.utils.toArray<HTMLElement>("[data-variant]", el);
        if (reduced) {
          setIndex((i) => i + 1);
          return;
        }
        gsap.to(parts, {
          autoAlpha: 0,
          y: -8,
          duration: 0.22,
          ease: "power1.in",
          onComplete: () => {
            setIndex((i) => i + 1);
            requestAnimationFrame(() => gsap.to(parts, { autoAlpha: 1, y: 0, duration: 0.45, ease: "sunrise" }));
          },
        });
      });

      api.current = { land, replay, swap };

      let seen = false;
      try {
        seen = sessionStorage.getItem(INTRO_KEY) === "1";
      } catch {
        /* no storage: play it */
      }
      if (new URLSearchParams(window.location.search).has("intro")) seen = false;

      const ready = document.fonts?.ready ?? Promise.resolve();
      let alive = true;
      void ready.then(() => {
        if (!alive) return;
        if (reduced || seen) showLanding(false);
        else playSearch();
        el.removeAttribute("data-intro");
      });

      // Scrolling away mid-intro skips to the landing page rather than leaving it half-told.
      const skipOnScroll = ScrollTrigger.create({ trigger: el, start: "top top-=40", onEnter: () => land() });

      let timer = 0;
      const ro = new ResizeObserver(() => {
        window.clearTimeout(timer);
        timer = window.setTimeout(() => {
          if (landed && !landing?.isActive()) layoutThread();
        }, 150);
      });
      ro.observe(el);

      return () => {
        alive = false;
        skipOnScroll.kill();
        ro.disconnect();
        window.clearTimeout(timer);
      };
    },
    { scope: root, dependencies: [first?.key ?? ""], revertOnUpdate: true },
  );

  // ---- The heat field ---------------------------------------------------------------------
  // A quiet dot grid that warms where the pointer goes (lilac, then violet, then brass) and cools.
  useGSAP(
    () => {
      const el = root.current;
      const canvas = el?.querySelector<HTMLCanvasElement>("[data-canvas]");
      const ctx = canvas?.getContext("2d");
      if (!el || !canvas || !ctx) return;
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const CELL = 22;
      const COLORS = [
        "rgba(150, 125, 232, 0.28)",
        "rgba(135, 108, 228, 0.36)",
        "rgba(112, 84, 220, 0.42)",
        "rgba(91, 63, 208, 0.48)",
        "rgba(140, 100, 185, 0.5)",
        "rgba(176, 130, 140, 0.54)",
        "rgba(200, 164, 90, 0.58)",
        "rgba(214, 172, 80, 0.66)",
      ];
      let W = 0;
      let H = 0;
      let cols = 0;
      let rows = 0;
      let heat = new Float32Array(0);
      let clock = 0;
      const pointer = { x: 0, y: 0, on: false };

      const size = () => {
        const b = el.getBoundingClientRect();
        W = b.width;
        H = b.height;
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = Math.round(W * dpr);
        canvas.height = Math.round(H * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        cols = Math.ceil(W / CELL);
        rows = Math.ceil(H / CELL);
        heat = new Float32Array(cols * rows);
      };

      const warm = (px: number, py: number, radius: number, amount: number) => {
        const c0 = Math.max(0, Math.floor((px - radius) / CELL));
        const c1 = Math.min(cols - 1, Math.ceil((px + radius) / CELL));
        const r0 = Math.max(0, Math.floor((py - radius) / CELL));
        const r1 = Math.min(rows - 1, Math.ceil((py + radius) / CELL));
        for (let r = r0; r <= r1; r++) {
          for (let c = c0; c <= c1; c++) {
            const d = Math.hypot((c + 0.5) * CELL - px, (r + 0.5) * CELL - py);
            if (d >= radius) continue;
            const k = 1 - d / radius;
            heat[r * cols + c] = Math.min(1, heat[r * cols + c] + k * k * amount);
          }
        }
      };

      const draw = () => {
        ctx.clearRect(0, 0, W, H);
        ctx.beginPath();
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            if (heat[r * cols + c] === 0) {
              const x = (c + 0.5) * CELL;
              const y = (r + 0.5) * CELL;
              ctx.moveTo(x + 1.1, y);
              ctx.arc(x, y, 1.1, 0, 6.2832);
            }
          }
        }
        ctx.fillStyle = "rgba(42, 27, 102, 0.11)";
        ctx.fill();
        const B = COLORS.length;
        for (let b = 0; b < B; b++) {
          const rad = 1.2 + ((b + 1) / B) * 2.2;
          ctx.beginPath();
          for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
              const h = heat[r * cols + c];
              if (h > 0 && Math.min(B - 1, Math.floor(h * B)) === b) {
                const x = (c + 0.5) * CELL;
                const y = (r + 0.5) * CELL;
                ctx.moveTo(x + rad, y);
                ctx.arc(x, y, rad, 0, 6.2832);
              }
            }
          }
          ctx.fillStyle = COLORS[b];
          ctx.fill();
        }
      };

      size();
      if (reduced) {
        warm(W * 0.7, H * 0.4, 220, 0.7); // a still sample of the heat
        draw();
        return;
      }

      const tick = (_t: number, dt: number) => {
        const f = Math.min(dt / 16.667, 3);
        clock += f / 60;
        if (pointer.on) warm(pointer.x, pointer.y, 110, 0.08 * f);
        else warm(W * (0.5 + 0.34 * Math.sin(clock * 0.21)), H * (0.5 + 0.3 * Math.sin(clock * 0.17 + 1)), 150, 0.025 * f);
        const cool = Math.pow(0.988, f);
        for (let k = 0; k < heat.length; k++) {
          const v = heat[k] * cool;
          heat[k] = v < 0.004 ? 0 : v;
        }
        draw();
      };

      const local = (e: PointerEvent) => {
        const b = el.getBoundingClientRect();
        pointer.x = e.clientX - b.left;
        pointer.y = e.clientY - b.top;
      };
      const onMove = (e: PointerEvent) => {
        local(e);
        pointer.on = true;
      };
      const onLeave = () => {
        pointer.on = false;
      };
      const onDown = (e: PointerEvent) => {
        local(e);
        warm(pointer.x, pointer.y, 170, 0.9);
      };
      const onUp = (e: PointerEvent) => {
        if (e.pointerType !== "mouse") onLeave(); // a lifted finger stops warming
      };
      el.addEventListener("pointermove", onMove);
      el.addEventListener("pointerleave", onLeave);
      el.addEventListener("pointerup", onUp);
      el.addEventListener("pointerdown", onDown);

      let running = false;
      const visible = ScrollTrigger.create({
        trigger: el,
        start: "top bottom",
        end: "bottom top",
        onToggle: (self) => {
          if (self.isActive && !running) gsap.ticker.add(tick);
          if (!self.isActive && running) gsap.ticker.remove(tick);
          running = self.isActive;
        },
      });
      if (visible.isActive) {
        gsap.ticker.add(tick);
        running = true;
      }

      let timer = 0;
      const ro = new ResizeObserver(() => {
        window.clearTimeout(timer);
        timer = window.setTimeout(size, 150);
      });
      ro.observe(el);

      return () => {
        gsap.ticker.remove(tick);
        visible.kill();
        ro.disconnect();
        window.clearTimeout(timer);
        el.removeEventListener("pointermove", onMove);
        el.removeEventListener("pointerleave", onLeave);
        el.removeEventListener("pointerup", onUp);
        el.removeEventListener("pointerdown", onDown);
      };
    },
    { scope: root },
  );

  return (
    <section ref={root} id="top" className={s.hero} data-section="hero" data-intro="pending" aria-labelledby="hero-name">
      <canvas className={s.canvas} data-canvas aria-hidden="true" />
      <svg className={s.ink} data-ink aria-hidden="true" focusable="false" preserveAspectRatio="none">
        <path className={s.thread} data-thread d="" />
        <g data-trace />
      </svg>

      <div className={s.stage}>
        <div className={s.search} data-search data-q={variant.query} role="group" aria-label="How you got here: a search for the right marketer">
          <p className={s.dockLabel}>How you got here</p>
          <p className={s.bar}>
            <span className={s.query} data-query />
            <span className={s.caret} aria-hidden="true" />
          </p>
          <ol className={s.results}>
            <li className={s.ad} data-result>
              <span className={s.adTag}>Sponsored</span>
              <span className={s.crumb}>ads.example › generic-portfolio</span>
              <span className={s.resTitle}>Results-driven marketer, passionate about synergy</span>
              <span className={s.snip}>Leveraging best-in-class solutions to move the needle since forever.</span>
            </li>
            <li data-result data-hit className={s.hit}>
              <span className={s.crumb}>abhishek-jayakumar › work</span>
              <button type="button" className={s.resLink} onClick={() => api.current.land()} data-track="hero_result_click">
                Abhishek Jayakumar: growth marketing and martech
              </button>
              <span className={s.snip}>{variant.lede}</span>
            </li>
          </ol>
          <button type="button" className={s.skip} onClick={() => api.current.land()} data-track="hero_skip_intro">
            Skip intro
          </button>
        </div>

        <div className={s.landing}>
          <h1 id="hero-name" className={s.name}>
            <span data-line>Abhishek</span>
            <br />
            <span data-line>Jayakumar</span>
          </h1>
          <p className={s.lede} data-arrive data-variant>
            {variant.lede}
          </p>
          <div className={s.actions} data-arrive>
            <a className={s.cta} href="#work" data-track="hero_explore_work" data-magnetic data-burst>
              Explore my work <span aria-hidden="true">↓</span>
            </a>
            <a className={s.ghost} href="#contact" data-track="hero_get_in_touch">
              Get in touch
            </a>
          </div>
          <p className={s.note} data-arrive>
            <span data-variant>
              {variant.how} {variant.code && <code>{variant.code}</code>}
            </span>
            <button type="button" onClick={() => api.current.swap()} data-track="hero_next_version">
              Show another version
            </button>
            <button type="button" className={s.replayButton} onClick={() => api.current.replay()} data-track="hero_replay_search">
              Replay the search
            </button>
          </p>
        </div>
      </div>
    </section>
  );
}
