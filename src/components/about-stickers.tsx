"use client";

import { useRef } from "react";
import { gsap, useGSAP, ScrollTrigger, Draggable } from "@/lib/gsap-plugins";

// Facts that are already in the About copy, pinned to the photo like stickers on a laptop.
const STICKERS = [
  { text: "Based in Bengaluru", tone: "sun", left: "3%", top: "6%", rotate: -6 },
  { text: "Google Ads and Analytics certified, 2024", tone: "sage", left: "30%", top: "58%", rotate: 4 },
  { text: "Open to remote roles", tone: "blush", left: "40%", top: "88%", rotate: -3 },
] as const;

const ROUGH = "rough({strength: 1, points: 10, template: none.inOut, taper: both, randomize: true, clamp: false})";

/**
 * Three stickers on the photo. They drop in when you arrive (CustomBounce, with a squash),
 * wiggle when you point at them (CustomWiggle), shake a little when picked up (RoughEase),
 * and can be thrown: Draggable with Inertia, kept inside the photo. Purely a toy, so it is
 * hidden from assistive tech and does nothing under reduced motion.
 */
export function AboutStickers() {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const box = root.current;
      if (!box) return;
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const stickers = gsap.utils.toArray<HTMLElement>("[data-sticker]", box);

        gsap.set(stickers, { opacity: 0 });
        ScrollTrigger.create({
          trigger: box,
          start: "top 70%",
          once: true,
          onEnter: () => {
            gsap.set(stickers, { opacity: 1 });
            gsap.from(stickers, { y: -320, duration: 1.4, ease: "drop", stagger: 0.22 });
            gsap.to(stickers, { scaleX: 1.25, scaleY: 0.75, duration: 1.4, ease: "drop-squash", transformOrigin: "50% 100%", stagger: 0.22 });
          },
        });

        const drags = Draggable.create(stickers, {
          type: "x,y",
          bounds: box,
          inertia: true,
          edgeResistance: 0.85,
          onPress() {
            gsap.to(this.target, { scale: 1.1, duration: 0.45, ease: ROUGH, overwrite: "auto" });
          },
          onRelease() {
            gsap.to(this.target, { scale: 1, duration: 0.9, ease: "slow(0.3, 0.7, false)", overwrite: "auto" });
          },
        });

        const cleanups: Array<() => void> = [];
        stickers.forEach((el) => {
          const wiggle = () => {
            if (!el.classList.contains("is-dragging")) gsap.to(el, { rotation: "+=9", duration: 0.9, ease: "wiggle" });
          };
          el.addEventListener("pointerenter", wiggle);
          cleanups.push(() => el.removeEventListener("pointerenter", wiggle));
        });

        return () => {
          drags.forEach((d) => d.kill());
          cleanups.forEach((fn) => fn());
        };
      });
    },
    { scope: root },
  );

  return (
    <div className="about-stickers" ref={root} aria-hidden="true">
      {STICKERS.map((s) => (
        <span
          key={s.text}
          data-sticker
          className={`sticker about-sticker about-sticker-${s.tone}`}
          style={{ left: s.left, top: s.top, transform: `rotate(${s.rotate}deg)` }}
        >
          {s.text}
        </span>
      ))}
    </div>
  );
}
