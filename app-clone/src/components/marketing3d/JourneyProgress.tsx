"use client";

import { useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { journeyProgress } from "./progress";

/**
 * The master timeline's conductor: one ScrollTrigger spanning the whole
 * homepage journey (#journey). Its progress (0..1) is the single source of
 * truth the Three.js world reads — scrubbed by native scroll, so it reverses
 * exactly on scroll-up and matches after jumps or reloads.
 */
export default function JourneyProgress() {
  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const el = document.getElementById("journey");
    if (!el) return;
    const st = ScrollTrigger.create({
      trigger: el,
      start: "top top",
      end: "bottom bottom",
      onUpdate: (self) => {
        journeyProgress.value = self.progress;
        (window as unknown as Record<string, unknown>).__vouchsoProgress = self.progress;
      },
    });
    journeyProgress.value = st.progress;
    return () => {
      st.kill();
    };
  }, []);
  return null;
}
