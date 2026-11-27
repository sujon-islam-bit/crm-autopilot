"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import gsap from "gsap";

/**
 * Hero text entrance: the Fraunces headline rises word by word from behind
 * masks (video-2 style), then the sub, actions and hard-fact line settle in.
 * Runs once on load. Under reduced motion everything is simply present —
 * the words start visible in the DOM and GSAP never touches them.
 */
const WORDS: { t: string; accent?: boolean }[] = [
  { t: "Your" },
  { t: "CRM," },
  { t: "updated." },
  { t: "Nothing" },
  { t: "applied" },
  { t: "without" },
  { t: "your" },
  { t: "yes.", accent: true },
];

export default function HeroIntro({ children }: { children: React.ReactNode }) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: "expo.out" } });
      tl.from(".wword", { yPercent: 115, duration: 0.9, stagger: 0.055 }, 0.15)
        .from(".hero-fade", { y: 18, autoAlpha: 0, duration: 0.7, ease: "power2.out", stagger: 0.1 }, 0.55)
        .from(".hero-demo", { y: 34, autoAlpha: 0, duration: 0.9 }, 0.7);
    }, rootRef);
    return () => ctx.revert();
  }, []);

  return (
    <div ref={rootRef} className="grid items-center gap-14 lg:grid-cols-[1.05fr_1fr] lg:gap-12">
      <div className="[text-shadow:0_2px_34px_rgba(13,10,20,0.85)]">
        <p className="hero-fade inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.04] px-3.5 py-1.5 font-jbmono text-[11.5px] font-semibold tracking-wide text-d3-ivory2">
          AI LAYER FOR HUBSPOT + SALESFORCE
        </p>
        <h1 className="mt-7 font-fraunces text-[46px] leading-[1.04] font-medium tracking-tight text-d3-ivory md:text-[64px] lg:text-[68px]">
          {WORDS.map((w, i) => (
            <span key={i}>
              <span className="wmask">
                <span className={`wword ${w.accent ? "text-d3-pink-bright italic" : ""}`}>{w.t}</span>
              </span>{" "}
            </span>
          ))}
        </h1>
        <p className="hero-fade mt-6 max-w-[540px] text-[17px] leading-relaxed text-d3-ivory2">
          Vouchso reads your team’s email, calendar and calls, then drafts every CRM update with a
          confidence score and the source it came from. A person approves, edits or rejects each
          one. Nothing is written to HubSpot or Salesforce until someone says yes.
        </p>
        <div className="hero-fade mt-9 flex flex-col gap-3.5 sm:flex-row sm:items-center">
          <Link href="/sign-in" className="btn3d btn3d-primary">
            Start free
          </Link>
          <a href="#how" className="btn3d btn3d-ghost">
            Watch it work ↓
          </a>
        </div>
        <p className="hero-fade mt-8 font-jbmono text-[12.5px] font-semibold tracking-wide text-d3-ivory">
          0 CHANGES APPLIED WITHOUT A HUMAN APPROVAL. EVER.
        </p>
        <p className="hero-fade mt-2 text-[13.5px] text-d3-ivory2">
          Built for HubSpot and Salesforce teams of 10–100.
        </p>
      </div>
      <div className="hero-demo">{children}</div>
    </div>
  );
}
