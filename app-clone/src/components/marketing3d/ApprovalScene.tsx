"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

/**
 * Scene 4 — THE APPROVAL (the climax). A 320vh stage with a sticky viewport:
 * as the visitor scrolls, an email becomes a proposal, the proposal turns to
 * face them, Approve fills, the stamp lands, and the CRM rows flip — every
 * beat scrubbed to scroll position, reversing exactly on scroll-up.
 * Reduced motion / no JS: the static final state (see .appr-static in
 * marketing.css) — stamp down, new values in place, all captions listed.
 */
export default function ApprovalScene() {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      root.classList.add("appr-static");
      return;
    }
    gsap.registerPlugin(ScrollTrigger);
    const q = gsap.utils.selector(root);
    const ctx = gsap.context(() => {
      gsap.set(q(".appr-card"), { transformPerspective: 1100 });
      const tl = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: {
          trigger: root,
          start: "top top",
          end: "bottom bottom",
          scrub: 0.7,
        },
      });

      // Beat 1 — the email arrives. Caption 1.
      tl.fromTo(q(".appr-cap1"), { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.4 }, 0);
      tl.fromTo(
        q(".appr-email"),
        { autoAlpha: 0, x: -46, rotateY: 16 },
        { autoAlpha: 1, x: 0, rotateY: 7, duration: 1.2 },
        0
      );
      tl.to(q(".appr-cap1"), { autoAlpha: 0, duration: 0.4 }, 1.5);

      // Beat 2 — the pulse travels; the proposal assembles. Caption 2.
      tl.fromTo(q(".appr-cap2"), { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.4 }, 1.9);
      tl.fromTo(q(".appr-pulse-h"), { scaleX: 0 }, { scaleX: 1, duration: 1.0 }, 1.2);
      tl.fromTo(q(".appr-pulse-v"), { scaleY: 0 }, { scaleY: 1, duration: 1.0 }, 1.2);
      tl.fromTo(
        q(".appr-card"),
        { autoAlpha: 0.12, y: 46, rotateY: -18, rotateX: 7, scale: 0.93 },
        { autoAlpha: 1, y: 0, rotateY: -5, rotateX: 2, scale: 1, duration: 1.7 },
        1.6
      );
      tl.fromTo(
        q(".appr-ev"),
        { autoAlpha: 0, y: 12 },
        { autoAlpha: 1, y: 0, duration: 0.5, stagger: 0.18 },
        2.4
      );
      tl.to(q(".appr-cap2"), { autoAlpha: 0, duration: 0.4 }, 3.4);

      // Beat 3 — the card turns to face you; Approve fills; the stamp lands.
      tl.fromTo(q(".appr-cap3"), { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.4 }, 3.8);
      tl.to(q(".appr-card"), { rotateY: 0, rotateX: 0, scale: 1.045, duration: 1.3 }, 3.6);
      tl.fromTo(q(".appr-fill"), { scaleX: 0 }, { scaleX: 1, duration: 1.1, ease: "power1.inOut" }, 4.0);
      tl.fromTo(
        q(".appr-stamp"),
        { autoAlpha: 0, scale: 2.3, rotate: -17 },
        { autoAlpha: 1, scale: 1, rotate: -9, duration: 0.7, ease: "power2.in" },
        5.2
      );
      tl.to(q(".appr-cap3"), { autoAlpha: 0, duration: 0.4 }, 6.6);

      // Beat 4 — the CRM rows flip; the ledger writes itself. Caption 4.
      tl.fromTo(q(".appr-cap4"), { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.4 }, 7.0);
      tl.to(q(".appr-card"), { x: 22, scale: 1, duration: 1.2 }, 6.2);
      tl.fromTo(
        q(".appr-crm"),
        { autoAlpha: 0.25, x: 34 },
        { autoAlpha: 1, x: 0, duration: 1.0 },
        6.2
      );
      tl.to(q(".crm-old"), { autoAlpha: 0, y: -9, duration: 0.6, stagger: 0.15 }, 6.9);
      tl.fromTo(
        q(".crm-new"),
        { autoAlpha: 0, y: 9 },
        { autoAlpha: 1, y: 0, duration: 0.6, stagger: 0.15 },
        7.0
      );
      tl.fromTo(
        q(".appr-ledger-inner"),
        { clipPath: "inset(0 100% 0 0)" },
        { clipPath: "inset(0 0% 0 0)", duration: 1.3 },
        7.4
      );
      // settle hold
      tl.to({}, { duration: 1.2 }, 8.8);
    }, root);
    return () => ctx.revert();
  }, []);

  return (
    <div ref={rootRef} data-approval-scene className="relative" style={{ height: "320vh" }}>
      <div className="sticky top-0 flex h-screen flex-col justify-center overflow-hidden py-20">
        <div className="wrap w-full">
          <p className="text-center font-jbmono text-[12px] font-semibold tracking-[0.16em] text-d3-pink-bright">
            THE APPROVAL
          </p>
          <h2 className="mx-auto mt-3 max-w-[640px] text-center font-fraunces text-[30px] leading-[1.12] font-medium tracking-tight text-d3-ivory md:text-[42px]">
            Watch one proposal earn its place.
          </h2>

          {/* Stage */}
          <div className="relative mx-auto mt-10 flex max-w-[1080px] flex-col items-center gap-5 lg:mt-14 lg:flex-row lg:items-stretch lg:justify-center lg:gap-0">
            {/* Email */}
            <div className="appr-email panel3d w-full max-w-[330px] shrink-0 self-center rounded-2xl p-5 lg:mt-16">
              <p className="font-jbmono text-[10.5px] font-semibold tracking-[0.12em] text-d3-mute">
                GMAIL · TUE 9:41 AM
              </p>
              <p className="mt-2.5 text-[14px] font-bold text-d3-ivory">
                Sarah Lee <span className="font-normal text-d3-ivory2">· Acme Corp</span>
              </p>
              <p className="mt-1.5 text-[13.5px] leading-relaxed text-d3-ivory2">
                “Legal cleared the MSA this morning — please send the proposal over and we’ll sign
                this week.”
              </p>
            </div>

            {/* Pulse connector */}
            <div className="relative hidden w-[64px] shrink-0 items-center lg:flex" aria-hidden="true">
              <div className="appr-pulse-h h-[2px] w-full origin-left bg-d3-pink shadow-[0_0_14px_rgba(210,59,114,0.8)]" />
            </div>
            <div className="flex h-[26px] items-start justify-center lg:hidden" aria-hidden="true">
              <div className="appr-pulse-v h-full w-[2px] origin-top bg-d3-pink shadow-[0_0_14px_rgba(210,59,114,0.8)]" />
            </div>

            {/* Proposal card */}
            <div className="appr-card panel3d relative w-full max-w-[430px] shrink-0 rounded-[20px] p-6">
              <div className="appr-ev flex items-start justify-between gap-4">
                <h3 className="text-[16.5px] leading-snug font-bold text-d3-ivory">
                  Acme Corp — move deal to Proposal Sent
                </h3>
                <span className="shrink-0 rounded-lg bg-d3-pink px-2.5 py-1.5 font-jbmono text-[13px] font-semibold text-white">
                  96%
                </span>
              </div>
              <div className="appr-ev mt-4 space-y-2 font-jbmono text-[12.5px]">
                <p className="flex justify-between gap-3">
                  <span className="text-d3-mute">FIELD</span>
                  <span className="text-d3-ivory">Deal stage</span>
                </p>
                <p className="flex justify-between gap-3">
                  <span className="text-d3-mute">CURRENT</span>
                  <span className="text-d3-ivory2 line-through decoration-d3-pink/70">Negotiation</span>
                </p>
                <p className="flex justify-between gap-3">
                  <span className="text-d3-mute">PROPOSED</span>
                  <span className="font-semibold text-d3-pink-bright">Proposal Sent</span>
                </p>
              </div>
              <div className="appr-ev mt-4 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3">
                <p className="text-[10.5px] font-bold tracking-[0.1em] text-d3-mute uppercase">
                  Source evidence — attached
                </p>
                <p className="mt-1 text-[13px] font-medium text-d3-ivory">
                  Email from Sarah Lee · the MSA line, quoted
                </p>
              </div>
              <div className="appr-ev relative mt-5 overflow-hidden rounded-[11px]">
                <span className="flex min-h-[46px] items-center justify-center border border-white/20 text-[14.5px] font-semibold text-d3-ivory">
                  Approve
                </span>
                <span className="appr-fill absolute inset-0 origin-left bg-d3-pink" aria-hidden="true" />
                <span className="absolute inset-0 flex items-center justify-center text-[14.5px] font-semibold text-white">
                  Approve
                </span>
              </div>

              {/* Stamp */}
              <div className="appr-stamp pointer-events-none absolute top-[38%] left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0">
                <span className="inline-flex items-center gap-1.5 rounded-lg border-[2.5px] border-d3-green bg-d3-bg/85 px-4 py-1.5 font-fraunces text-[18px] font-semibold tracking-wide text-d3-green uppercase">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M4 12.5 9.5 18 20 6.5" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Applied
                </span>
              </div>
            </div>

            {/* CRM rows — neutral ivory/grey, text names only */}
            <div className="appr-crm panel3d w-full max-w-[330px] shrink-0 self-center rounded-2xl p-5 lg:mt-16 lg:ml-[54px]">
              <div>
                <p className="font-jbmono text-[10.5px] font-semibold tracking-[0.12em] text-d3-mute">
                  HUBSPOT — DEAL · ACME CORP
                </p>
                <p className="mt-2 flex items-center justify-between gap-3 text-[13.5px]">
                  <span className="text-d3-ivory2">Stage</span>
                  <span className="relative font-semibold">
                    <span className="crm-old block text-d3-ivory2">Negotiation</span>
                    <span className="crm-new absolute inset-0 text-d3-ivory opacity-0">Proposal Sent</span>
                  </span>
                </p>
              </div>
              <div className="mt-4 border-t border-white/10 pt-4">
                <p className="font-jbmono text-[10.5px] font-semibold tracking-[0.12em] text-d3-mute">
                  SALESFORCE — OPPORTUNITY
                </p>
                <p className="mt-2 flex items-center justify-between gap-3 text-[13.5px]">
                  <span className="text-d3-ivory2">Stage</span>
                  <span className="relative font-semibold">
                    <span className="crm-old block text-d3-ivory2">Negotiation</span>
                    <span className="crm-new absolute inset-0 text-d3-ivory opacity-0">Proposal Sent</span>
                  </span>
                </p>
              </div>
              <p className="mt-4 font-jbmono text-[10.5px] tracking-wide text-d3-mute">
                WRITES HAPPEN ONLY AFTER THE STAMP
              </p>
            </div>
          </div>

          {/* Ledger line */}
          <div className="mt-9 flex justify-center">
            <p className="appr-ledger overflow-hidden font-jbmono text-[12px] tracking-wide text-d3-ivory2 md:text-[12.5px]">
              <span className="appr-ledger-inner block whitespace-nowrap">
                <span className="text-d3-green">✓</span> APPLIED · BATCH #1042 · REVERSIBLE FOR 7
                DAYS
              </span>
            </p>
          </div>

          {/* Captions */}
          <div className="appr-caps relative mt-5 h-[30px] text-center">
            <p className="appr-cap appr-cap1 absolute inset-x-0 font-fraunces text-[17px] text-d3-ivory2 italic opacity-0 md:text-[19px]">
              1 · It starts as an email.
            </p>
            <p className="appr-cap appr-cap2 absolute inset-x-0 font-fraunces text-[17px] text-d3-ivory2 italic opacity-0 md:text-[19px]">
              2 · Vouchso drafts the change — with evidence.
            </p>
            <p className="appr-cap appr-cap3 absolute inset-x-0 font-fraunces text-[17px] text-d3-ivory2 italic opacity-0 md:text-[19px]">
              3 · A person approves.
            </p>
            <p className="appr-cap appr-cap4 absolute inset-x-0 font-fraunces text-[17px] text-d3-ivory2 italic opacity-0 md:text-[19px]">
              4 · Your CRM updates. Logged, and reversible.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
