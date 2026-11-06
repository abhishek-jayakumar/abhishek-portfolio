"use client";

import { gsap, useGSAP, ScrollTrigger, ScrollSmoother } from "@/lib/gsap-plugins";
import { burst } from "@/lib/burst";

// Phones resize the viewport when the address bar hides; refreshing on that
// would make pinned sections jump.
ScrollTrigger.config({ ignoreMobileResize: true });

/** Where each curtain starts. Both end fully open, so the section is never clipped once it has arrived. */
const CURTAINS: Record<string, string> = {
  section: "inset(9vh 5vw 0vw 5vw round 3.5rem 3.5rem 0rem 0rem)",
  block: "inset(5vh 6vw 0vw 6vw round 2rem 2rem 0rem 0rem)",
};
const CURTAIN_OPEN = "inset(0vh 0vw 0vw 0vw round 0rem 0rem 0rem 0rem)";

/**
 * The page-wide motion layer. Each behaviour is opt-in through a data attribute,
 * so Server Components stay plain markup:
 *
 *   data-reveal           below-the-fold content fades up, in a stagger when it arrives together
 *   data-clip             image is uncovered like a blind going up
 *   data-parallax-img     the picture inside a frame drifts against the scroll
 *   data-world-enter      the section widens into full bleed, like stepping into a new room
 *   data-magnetic         the control leans toward a fine pointer
 *
 * It is mounted by each page (not the layout) so that it runs only after that page has
 * hydrated; touching server-rendered markup earlier would trip React's hydration checks.
 *
 * The header keeps its own scroll position (the journey dock). All of this sits behind
 * prefers-reduced-motion, and everything is ordinary visible content without it.
 */
export function PageMotion() {
  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        // 4. Images are uncovered, then drift inside their frame
        gsap.utils.toArray<HTMLElement>("[data-clip]").forEach((frame) => {
          const img = frame.querySelector("img");
          const tl = gsap.timeline({ scrollTrigger: { trigger: frame, start: "top 86%", once: true } });
          tl.fromTo(frame, { clipPath: "inset(100% 0% 0% 0%)" }, { clipPath: "inset(0% 0% 0% 0%)", duration: 1.3, ease: "power4.inOut" });
          if (img) tl.fromTo(img, { scale: 1.35 }, { scale: 1, duration: 1.7, ease: "power3.out" }, 0);
        });
        gsap.utils.toArray<HTMLElement>("[data-parallax-img]").forEach((img) => {
          const frame = img.parentElement ?? img;
          gsap.fromTo(
            img,
            { yPercent: -7 },
            { yPercent: 7, ease: "none", scrollTrigger: { trigger: frame, start: "top bottom", end: "bottom top", scrub: true } },
          );
        });

        // 6. Stepping into a new room: the section widens from a card to full bleed
        gsap.utils.toArray<HTMLElement>("[data-world-enter]").forEach((el) => {
          const from = CURTAINS[el.dataset.worldEnter || "section"] ?? CURTAINS.section;
          gsap.fromTo(
            el,
            { clipPath: from },
            { clipPath: CURTAIN_OPEN, ease: "none", scrollTrigger: { trigger: el, start: "top 96%", end: "top 18%", scrub: true } },
          );
        });

        // 7. Everything marked data-reveal below the fold fades up as it arrives (a batch, so a
        // row of items arrives as a stagger). Only elements that start below the fold are touched,
        // so nothing above the fold flashes; opacity only, so links inside stay focusable.
        const below = gsap.utils
          .toArray<HTMLElement>("[data-reveal]")
          .filter((el) => el.getBoundingClientRect().top > window.innerHeight * 0.92);
        if (below.length) {
          gsap.set(below, { opacity: 0, y: 26 });
          ScrollTrigger.batch(below, {
            start: "top 90%",
            once: true,
            onEnter: (batch) =>
              gsap.to(batch, { opacity: 1, y: 0, duration: 0.7, ease: "power3.out", stagger: 0.09, overwrite: true }),
          });
        }

        void document.fonts?.ready.then(() => ScrollTrigger.refresh());

        // 8. Feedback for the main calls to action: a burst of dots where you pressed.
        const onBurstClick = (e: MouseEvent) => {
          const t = (e.target as Element | null)?.closest<HTMLElement>("[data-burst]");
          if (!t) return;
          const r = t.getBoundingClientRect();
          burst(e.detail === 0 ? r.left + r.width / 2 : e.clientX, e.detail === 0 ? r.top + r.height / 2 : e.clientY);
        };
        document.addEventListener("click", onBurstClick, true); // capture, and before the anchor handler, which stops propagation

        // 9. Anchor links glide (ScrollTo, or the smoother when it is running) instead of jumping.
        // Native smooth scrolling is switched off while this is in charge so the two do not fight.
        const root = document.documentElement;
        const previousBehavior = root.style.scrollBehavior;
        root.style.scrollBehavior = "auto";
        const onAnchorClick = (e: MouseEvent) => {
          if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
          const a = (e.target as Element | null)?.closest<HTMLAnchorElement>("a[href]");
          if (!a || !a.hash || a.pathname !== window.location.pathname || a.origin !== window.location.origin) return;
          const target = document.getElementById(decodeURIComponent(a.hash.slice(1)));
          if (!target) return;
          e.preventDefault();
          e.stopPropagation();
          history.pushState(null, "", a.hash);
          const smoother = ScrollSmoother.get();
          if (smoother) smoother.scrollTo(target, true, "top 72px");
          else gsap.to(window, { duration: 1.3, ease: "sunrise", scrollTo: { y: target, offsetY: 72, autoKill: true } });
        };
        document.addEventListener("click", onAnchorClick, true);

        // 10. Hand-drawn marks draw themselves when they arrive.
        gsap.utils.toArray<SVGPathElement>("[data-draw]").forEach((path) => {
          gsap.fromTo(
            path,
            { drawSVG: "0%" },
            { drawSVG: "100%", duration: 1.4, ease: "power2.inOut", scrollTrigger: { trigger: path.ownerSVGElement ?? path, start: "top 88%", once: true } },
          );
        });

        return () => {
          document.removeEventListener("click", onAnchorClick, true);
          document.removeEventListener("click", onBurstClick, true);
          root.style.scrollBehavior = previousBehavior;
        };
      });

      // 10b. Touch screens have no hover: whatever crosses the middle of the screen gets it instead.
      mm.add("(prefers-reduced-motion: no-preference) and (hover: none)", () => {
        gsap.utils.toArray<HTMLElement>("[data-touch-focus]").forEach((el) => {
          ScrollTrigger.create({ trigger: el, start: "top 58%", end: "bottom 42%", toggleClass: { targets: el, className: "is-focus" } });
        });
      });

      // 11. Controls that lean toward the pointer. Fine pointers only.
      mm.add("(prefers-reduced-motion: no-preference) and (hover: hover) and (pointer: fine)", () => {
        const cleanups: Array<() => void> = [];

        gsap.utils.toArray<HTMLElement>("[data-magnetic]").forEach((el) => {
          const x = gsap.quickTo(el, "x", { duration: 0.6, ease: "power3.out" });
          const y = gsap.quickTo(el, "y", { duration: 0.6, ease: "power3.out" });
          const move = (e: PointerEvent) => {
            const r = el.getBoundingClientRect();
            x((e.clientX - (r.left + r.width / 2)) * 0.28);
            y((e.clientY - (r.top + r.height / 2)) * 0.28);
          };
          const leave = () => {
            x(0);
            y(0);
          };
          el.addEventListener("pointermove", move);
          el.addEventListener("pointerleave", leave);
          cleanups.push(() => {
            el.removeEventListener("pointermove", move);
            el.removeEventListener("pointerleave", leave);
          });
        });
        return () => cleanups.forEach((fn) => fn());
      });
    },
  );

  return null;
}
