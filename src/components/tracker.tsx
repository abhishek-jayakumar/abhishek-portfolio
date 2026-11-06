"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { track } from "@/lib/track";

/**
 * Declarative tracking, the same idea as on the Burl build: any element can
 * carry data-track="name" and one listener reports it. Sections carry
 * data-section and are reported once, the first time they are mostly in view.
 * Scroll depth is reported at 25, 50, 75 and 100 per cent.
 */
export function Tracker() {
  const pathname = usePathname();

  useEffect(() => {
    track("page_view", pathname);

    const onClick = (e: MouseEvent) => {
      const el = (e.target as Element | null)?.closest<HTMLElement>("[data-track]");
      if (el) track("cta_click", el.dataset.track ?? "");
    };
    document.addEventListener("click", onClick);

    const seen = new Set<string>();
    const io = new IntersectionObserver(
      (entries) => {
        for (const en of entries) {
          const id = (en.target as HTMLElement).dataset.section ?? "";
          if (en.isIntersecting && !seen.has(id)) {
            seen.add(id);
            track("section_view", id);
          }
        }
      },
      { threshold: 0.35 },
    );
    document.querySelectorAll("[data-section]").forEach((el) => io.observe(el));

    const marks = new Set<number>();
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      if (max <= 0) return;
      const pct = (window.scrollY / max) * 100;
      for (const m of [25, 50, 75, 100]) {
        if (pct >= m - 1 && !marks.has(m)) {
          marks.add(m);
          track("scroll_depth", `${m}%`);
        }
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      document.removeEventListener("click", onClick);
      window.removeEventListener("scroll", onScroll);
      io.disconnect();
    };
  }, [pathname]);

  return null;
}
