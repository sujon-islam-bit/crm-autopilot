"use client";

import { useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

/**
 * Shared reveal motion for the dark marketing pages: small, calm —
 * y 14px, 300–600ms, power1/expo out, staggered groups. Elements are visible
 * by default; GSAP "from" tweens run only when JS + motion are available, so
 * no-JS and reduced-motion visitors always see final states.
 */
export default function Reveals3d() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    gsap.registerPlugin(ScrollTrigger);
    const ctx = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>("[data-reveal]").forEach((el) => {
        gsap.from(el, {
          y: 16,
          autoAlpha: 0,
          duration: 0.6,
          ease: "power1.out",
          scrollTrigger: { trigger: el, start: "top 88%" },
        });
      });
      gsap.utils.toArray<HTMLElement>("[data-reveal-group]").forEach((group) => {
        gsap.from(group.children, {
          y: 16,
          autoAlpha: 0,
          duration: 0.55,
          ease: "power1.out",
          stagger: 0.09,
          scrollTrigger: { trigger: group, start: "top 86%" },
        });
      });
    });
    return () => ctx.revert();
  }, []);
  return null;
}
