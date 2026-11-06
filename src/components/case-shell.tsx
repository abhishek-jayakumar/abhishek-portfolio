"use client";

import { useRef } from "react";
import { gsap, useGSAP, ScrollTrigger, ScrollSmoother, SplitText } from "@/lib/gsap-plugins";

/**
 * The motion layer for a case study. The page itself is server-rendered markup; this wraps it
 * and reads data attributes, so every piece is plain, readable content without JavaScript.
 *
 * Each move has one job:
 *   data-cover-title   the problem rises line by line: it is the first thing to read
 *   data-cover-in      the supporting cover details follow it in
 *   data-cover-visual  the exhibit opens to full width as you scroll into it
 *   data-thesis        the summary fills in word by word, at reading pace
 *   data-count         figures count up to their value when they arrive
 *   data-toc           the chapter index stays beside the chapters and marks where you are
 *   data-rise          chapter headings rise into place
 *   data-points        a chapter's points arrive in sequence
 *   data-timeline      a sequence draws its line, lighting each step as you reach it
 *   data-unveil        figures are uncovered from the bottom
 *
 * Motion sits behind prefers-reduced-motion. Marking the current chapter is state, not motion,
 * so it runs for everyone.
 */
export function CaseShell({ children, className, tone }: { children: React.ReactNode; className?: string; tone: string }) {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const el = root.current;
      if (!el) return;
      const q = <T extends Element = HTMLElement>(sel: string) => gsap.utils.toArray<T>(sel, el);
      const mm = gsap.matchMedia();

      // Where you are: the index marks the current chapter and fills its thread.
      mm.add("all", () => {
        const links = q<HTMLAnchorElement>("[data-toc] a");
        const chapters = q("[data-chapter]");
        const setActive = (i: number) =>
          links.forEach((a, n) => (n === i ? a.setAttribute("aria-current", "true") : a.removeAttribute("aria-current")));
        chapters.forEach((ch, i) =>
          ScrollTrigger.create({
            trigger: ch,
            start: "top 45%",
            end: "bottom 45%",
            onToggle: (self) => self.isActive && setActive(i),
          }),
        );
        const fill = el.querySelector<HTMLElement>("[data-toc-fill]");
        const body = el.querySelector<HTMLElement>("[data-chapters]");
        if (fill && body)
          gsap.fromTo(fill, { scaleY: 0 }, { scaleY: 1, ease: "none", scrollTrigger: { trigger: body, start: "top 45%", end: "bottom 60%", scrub: true } });
      });

      // CSS sticky cannot work inside ScrollSmoother's moving content, so pin the index there instead.
      mm.add("(min-width: 64rem)", () => {
        const aside = el.querySelector<HTMLElement>("[data-toc]");
        const body = el.querySelector<HTMLElement>("[data-chapters]");
        if (!aside || !body || !ScrollSmoother.get()) return;
        aside.dataset.pinned = "true";
        const st = ScrollTrigger.create({ trigger: body, start: "top 112px", end: () => `bottom ${aside.offsetHeight + 112}px`, pin: aside, pinSpacing: false, invalidateOnRefresh: true });
        return () => {
          st.kill();
          delete aside.dataset.pinned;
        };
      });

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const splits: SplitText[] = [];

        // The cover: the problem first, then the details.
        const title = el.querySelector("[data-cover-title]");
        if (title)
          splits.push(
            SplitText.create(title, {
              type: "lines",
              mask: "lines",
              autoSplit: true,
              onSplit: (self) => gsap.from(self.lines, { yPercent: 110, duration: 1.15, ease: "power4.out", stagger: 0.09, delay: 0.05 }),
            }),
          );
        gsap.from(q("[data-cover-in]"), { autoAlpha: 0, y: 18, duration: 0.9, ease: "power3.out", stagger: 0.07, delay: 0.35 });

        // The exhibit opens out to full width and settles as it arrives.
        const visual = el.querySelector<HTMLElement>("[data-cover-visual]");
        if (visual) {
          gsap.fromTo(
            visual,
            { clipPath: "inset(0% 6% 0% 6% round 8px)" },
            { clipPath: "inset(0% 0% 0% 0% round 0px)", ease: "none", scrollTrigger: { trigger: visual, start: "top 90%", end: "top 20%", scrub: true } },
          );
          const media = visual.querySelector("[data-cover-media]");
          if (media)
            gsap.fromTo(media, { scale: 1.12 }, { scale: 1, ease: "none", scrollTrigger: { trigger: visual, start: "top bottom", end: "bottom top", scrub: true } });
        }

        // Live-site windows: they arrive on load, then drift at different depths as you scroll,
        // so the pair reads as layered. The screenshots are never cropped or zoomed.
        const mock = el.querySelector<HTMLElement>("[data-mock]");
        if (mock) {
          const [front, back] = [mock.querySelector('[data-win="0"]'), mock.querySelector('[data-win="1"]')];
          const intro = gsap.timeline({ delay: 0.25, defaults: { ease: "power4.out" } });
          if (front) intro.from(front, { y: 70, autoAlpha: 0, duration: 1.3 });
          if (back) intro.from(back, { y: 110, x: 30, autoAlpha: 0, duration: 1.3 }, 0.18);
          const drift = { trigger: mock, start: "top 60%", end: "bottom top", scrub: true };
          if (front) gsap.to(front, { yPercent: -4, ease: "none", scrollTrigger: drift });
          if (back) gsap.to(back, { yPercent: -22, ease: "none", scrollTrigger: drift });
        }

        // The summary fills in as you read it.
        const thesis = el.querySelector<HTMLElement>("[data-thesis]");
        if (thesis)
          splits.push(
            SplitText.create(thesis.querySelectorAll("[data-fill]"), {
              type: "words",
              autoSplit: true,
              onSplit: (self) =>
                gsap.fromTo(
                  self.words,
                  { opacity: 0.14 },
                  { opacity: 1, ease: "none", stagger: 0.1, scrollTrigger: { trigger: thesis, start: "top 78%", end: "bottom 50%", scrub: true } },
                ),
            }),
          );

        // Figures count up to their value.
        const counts = q("[data-count]");
        const finals = counts.map((c) => c.textContent);
        counts.forEach((c) => {
          const target = Number(c.dataset.count);
          const dec = Number(c.dataset.decimals || 0);
          const fmt = (n: number) =>
            n.toLocaleString(c.dataset.locale || "en-US", { minimumFractionDigits: dec, maximumFractionDigits: dec, useGrouping: c.dataset.group === "true" });
          const v = { n: 0 };
          c.textContent = fmt(0);
          gsap.to(v, {
            n: target,
            duration: 1.8,
            ease: "power3.out",
            scrollTrigger: { trigger: c, start: "top 92%", once: true },
            onUpdate: () => {
              c.textContent = fmt(v.n);
            },
          });
        });

        // Chapter headings rise into place.
        q("[data-rise]").forEach((h) =>
          splits.push(
            SplitText.create(h, {
              type: "lines",
              mask: "lines",
              autoSplit: true,
              onSplit: (self) =>
                gsap.from(self.lines, { yPercent: 105, duration: 1, ease: "power4.out", stagger: 0.08, scrollTrigger: { trigger: h, start: "top 88%", once: true } }),
            }),
          ),
        );

        // A chapter's points arrive in sequence.
        q("[data-points]").forEach((list) =>
          gsap.from(list.children, { autoAlpha: 0, y: 24, duration: 0.7, ease: "power3.out", stagger: 0.08, scrollTrigger: { trigger: list, start: "top 85%", once: true } }),
        );

        // A sequence draws its line, and each step lights up as the line reaches it.
        q("[data-timeline]").forEach((tl) => {
          const line = tl.querySelector("[data-line]");
          if (line)
            gsap.fromTo(line, { scaleY: 0 }, { scaleY: 1, ease: "none", scrollTrigger: { trigger: tl, start: "top 65%", end: "bottom 65%", scrub: true } });
          gsap.utils.toArray<HTMLElement>(tl.children).forEach((step) => {
            if (step.hasAttribute("data-line")) return;
            step.dataset.lit = "false";
            ScrollTrigger.create({ trigger: step, start: "top 65%", onEnter: () => (step.dataset.lit = "true"), onLeaveBack: () => (step.dataset.lit = "false") });
          });
        });

        // Figures are uncovered from the bottom.
        q("[data-unveil]").forEach((fig) => {
          const img = fig.querySelector("img");
          const t = gsap.timeline({ scrollTrigger: { trigger: fig, start: "top 85%", once: true } });
          t.fromTo(fig, { clipPath: "inset(100% 0% 0% 0%)" }, { clipPath: "inset(0% 0% 0% 0%)", duration: 1.25, ease: "power4.inOut" });
          if (img) t.fromTo(img, { scale: 1.25 }, { scale: 1, duration: 1.6, ease: "power3.out" }, 0);
        });

        void document.fonts?.ready.then(() => ScrollTrigger.refresh());

        return () => {
          splits.forEach((s) => s.revert());
          counts.forEach((c, i) => (c.textContent = finals[i]));
          q("[data-lit]").forEach((s) => delete s.dataset.lit);
        };
      });
    },
    { scope: root },
  );

  return (
    <article ref={root} className={className} data-tone={tone}>
      {children}
    </article>
  );
}
