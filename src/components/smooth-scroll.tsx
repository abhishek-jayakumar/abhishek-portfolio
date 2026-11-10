"use client";

import { useLayoutEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { gsap, useGSAP, ScrollSmoother, ScrollTrigger } from "@/lib/gsap-plugins";

/**
 * Eased, inertial page scroll (ScrollSmoother) for fine pointers when motion is welcome.
 * Touch devices, keyboards-only setups and reduced motion keep the browser's own scrolling, and
 * so do the Lab's experiment pages: they are tools (tables, sliders, a sticky module bar), where
 * precise native scrolling beats inertia.
 *
 * This renders nothing: the layout owns #smooth-wrapper / #smooth-content. It is placed
 * before them in the layout on purpose, so its effect runs before any page creates a
 * ScrollTrigger (the smoother has to exist first, or pins would be built against the wrong
 * scroller).
 */
export function SmoothScroll() {
  const pathname = usePathname();
  const native = pathname.startsWith("/lab/");
  const first = useRef(true);
  const fromHistory = useRef(false);

  useLayoutEffect(() => {
    const onPop = () => (fromHistory.current = true);
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  // A new page starts at its top. Next.js would normally do this, but the smoother keeps the
  // previous page's scroll position, so a click deep in the homepage landed at the bottom of a
  // case study. Back and forward are left to the browser; links to a section go to that section.
  // This is a layout effect placed before the page in the tree, so it runs before the new page
  // builds its ScrollTriggers.
  useLayoutEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (fromHistory.current) {
      fromHistory.current = false;
      return;
    }
    const smoother = ScrollSmoother.get();
    const target = window.location.hash ? document.getElementById(decodeURIComponent(window.location.hash.slice(1))) : null;
    if (smoother) smoother.scrollTop(0);
    window.scrollTo(0, 0);
    requestAnimationFrame(() => {
      ScrollTrigger.refresh();
      if (!target) return;
      if (smoother) smoother.scrollTo(target, false, "top 72px");
      else target.scrollIntoView();
    });
  }, [pathname]);

  useGSAP(
    () => {
      if (native) return;
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference) and (hover: hover) and (pointer: fine)", () => {
        // The wrapper is fixed, so it no longer sits below the sticky header in the flow. Give the
        // content the header's height as top space instead (kept in sync if the header resizes).
        const header = document.querySelector<HTMLElement>(".site-header");
        const content = document.getElementById("smooth-content");
        const sync = () => {
          if (content) content.style.paddingTop = `${header?.offsetHeight ?? 0}px`;
        };
        sync();
        const resize = header ? new ResizeObserver(() => sync()) : null;
        if (header) resize?.observe(header);

        const smoother = ScrollSmoother.create({
          wrapper: "#smooth-wrapper",
          content: "#smooth-content",
          smooth: 1.1,
          smoothTouch: false,
        });
        return () => {
          smoother.kill();
          resize?.disconnect();
          if (content) content.style.paddingTop = "";
        };
      });
    },
    // Rebuilt when moving between the Lab and the rest of the site.
    { dependencies: [native], revertOnUpdate: true },
  );
  return null;
}
