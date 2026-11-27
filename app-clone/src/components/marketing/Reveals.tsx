"use client";

import { useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

/**
 * Shared motion scale for the marketing pages (plan §2): small reveals only —
 * y 8–16px, 300–600ms, power1/expo out. Elements are visible by default;
 * GSAP "from" tweens run only when JS + motion are available, so no-JS and
 * reduced-motion visitors always see final states.
 */
export default function Reveals() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    gsap.registerPlugin(ScrollTrigger);
    const ctx = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>("[data-reveal]").forEach((el) => {
        gsap.from(el, {
          y: 14,
          autoAlpha: 0,
          duration: 0.55,
          ease: "power1.out",
          scrollTrigger: { trigger: el, start: "top 86%" },
        });
      });
      gsap.utils.toArray<HTMLElement>("[data-reveal-group]").forEach((group) => {
        gsap.from(group.children, {
          y: 14,
          autoAlpha: 0,
          duration: 0.5,
          ease: "power1.out",
          stagger: 0.09,
          scrollTrigger: { trigger: group, start: "top 84%" },
        });
      });
    });
    return () => ctx.revert();
  }, []);
  return null;
}
