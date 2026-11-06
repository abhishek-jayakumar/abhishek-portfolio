"use client";

import { useRef, type ComponentPropsWithoutRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(ScrollTrigger, SplitText, useGSAP);

type LinesProps = { as?: "h1" | "h2" | "h3" } & ComponentPropsWithoutRef<"h2">;

/**
 * A heading that rises into view one line at a time. It owns its element, so the
 * split only happens once this heading has hydrated (splitting a node React has not
 * hydrated yet breaks hydration). Without JavaScript, or with reduced motion, it is
 * an ordinary heading.
 */
export function Lines({ as: Tag = "h2", children, ...rest }: LinesProps) {
  const ref = useRef<HTMLHeadingElement>(null);

  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        SplitText.create(el, {
          type: "lines",
          mask: "lines",
          linesClass: "split-line",
          autoSplit: true,
          onSplit(self) {
            // The mask clips at the line box; give descenders room.
            gsap.set(self.masks, { paddingBottom: "0.16em", marginBottom: "-0.16em" });
            return gsap.from(self.lines, {
              yPercent: 112,
              duration: 1.15,
              ease: "power4.out",
              stagger: 0.11,
              scrollTrigger: { trigger: el, start: "top 88%", once: true },
            });
          },
        });
      });
    },
    { scope: ref },
  );

  return (
    <Tag ref={ref} {...rest}>
      {children}
    </Tag>
  );
}
