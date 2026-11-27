"use client";

import { useEffect } from "react";

/**
 * v3 reveal-on-scroll: one observer for the whole page. Elements carrying
 * [data-reveal] start with .rv (set server-side) and gain .rv-in when they
 * enter the viewport. Reduced-motion users get the final state via CSS.
 */
export default function Reveal() {
  useEffect(() => {
    const els = [...document.querySelectorAll<HTMLElement>(".mkt [data-reveal]")];
    if (!("IntersectionObserver" in window)) {
      els.forEach((el) => el.classList.add("rv-in"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add("rv-in");
            io.unobserve(e.target);
          }
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -6% 0px" }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
  return null;
}
