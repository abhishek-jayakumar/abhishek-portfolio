"use client";

import { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(ScrollTrigger, useGSAP);

/**
 * A real number that counts up once when it scrolls into view. The server
 * renders the final value, so it reads correctly without JavaScript or with
 * reduced motion. If the number is already on screen when the page loads it
 * simply stays put.
 */
export function CountUp({ to, suffix = "", prefix = "", decimals = 0 }: { to: number; suffix?: string; prefix?: string; decimals?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const fmt = (n: number) =>
    `${prefix}${n.toLocaleString("en-IN", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}${suffix}`;

  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        if (el.getBoundingClientRect().top < window.innerHeight * 0.9) return;
        const state = { v: 0 };
        el.textContent = fmt(0);
        gsap.to(state, {
          v: to,
          duration: 1.4,
          ease: "power2.out",
          scrollTrigger: { trigger: el, start: "top 88%", once: true },
          onUpdate: () => {
            el.textContent = fmt(state.v);
          },
        });
      });
    },
    { scope: ref },
  );

  return <span ref={ref}>{fmt(to)}</span>;
}
