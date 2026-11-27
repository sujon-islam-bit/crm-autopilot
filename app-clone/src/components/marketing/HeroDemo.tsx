"use client";

import { useEffect, useRef, useState } from "react";

/**
 * The hero visual: a live Review Queue window running the product's real loop.
 * A proposal is shown with its confidence + source evidence; the Approve
 * button presses itself, the card stamps "✓ Applied", the queue ticks down,
 * and the next proposal slides in. Pauses on hover and off-screen; static
 * under prefers-reduced-motion.
 */

type Proposal = {
  title: string;
  diff: string;
  confidence: number;
  source: string;
  sourceKind: string;
};

const PROPOSALS: Proposal[] = [
  {
    title: "Acme Corp — move deal to Proposal Sent",
    diff: "Stage: Negotiation → Proposal Sent",
    confidence: 96,
    source: "Email from Sarah Lee · Tue 9:41 AM",
    sourceKind: "Gmail",
  },
  {
    title: "Add contact — Sarah Lee, VP Operations",
    diff: "New contact · Acme Corp · from signature + thread",
    confidence: 94,
    source: "Gmail thread · 12 messages",
    sourceKind: "Gmail",
  },
  {
    title: "NovaTech — enrich company record",
    diff: "Industry: Logistics · Size: 51–200 · from call notes",
    confidence: 91,
    source: "Zoom call · Thu 2:15 PM",
    sourceKind: "Zoom",
  },
];

type Phase = "show" | "press" | "applied";

export default function HeroDemo() {
  const [idx, setIdx] = useState(0);
  const [queue, setQueue] = useState(14);
  const [phase, setPhase] = useState<Phase>("show");
  const [paused, setPaused] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const visibleRef = useRef(true);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        visibleRef.current = entries[0]?.isIntersecting ?? true;
      },
      { threshold: 0.15 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let cancelled = false;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const wait = (ms: number) =>
      new Promise<void>((res) => {
        timers.push(setTimeout(res, ms));
      });

    (async () => {
      while (!cancelled) {
        // Wait while hovered or off-screen (checked each 300ms tick).
        const gate = async () => {
          while (!cancelled && (paused || !visibleRef.current)) await wait(300);
        };
        await gate();
        if (cancelled) return;
        setPhase("show");
        await wait(1900);
        await gate();
        if (cancelled) return;
        setPhase("press");
        await wait(340);
        if (cancelled) return;
        setPhase("applied");
        setQueue((q) => (q > 11 ? q - 1 : 14));
        await wait(1500);
        await gate();
        if (cancelled) return;
        setIdx((i) => (i + 1) % PROPOSALS.length);
        await wait(420);
      }
    })();

    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
    };
  }, [paused]);

  const p = PROPOSALS[idx];
  const applied = phase === "applied";

  return (
    <div
      ref={rootRef}
      className="mkt-lift relative overflow-hidden rounded-[20px] border border-mkt-border bg-white"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      role="img"
      aria-label="Vouchso Review Queue: a proposal for Acme Corp at 96% confidence is approved and stamped Applied, and the pending queue counts down."
    >
      {/* Window chrome */}
      <div className="flex items-center gap-3 border-b border-mkt-border bg-mkt-card px-5 py-3">
        <span className="flex gap-1.5" aria-hidden="true">
          <span className="h-2.5 w-2.5 rounded-full bg-[#e0d9f2]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#e0d9f2]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#e0d9f2]" />
        </span>
        <span className="text-[12.5px] font-semibold text-mkt-body">Vouchso — Review Queue</span>
        <span className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-mkt-violet/10 px-2.5 py-1 font-jbmono text-[11px] font-semibold text-mkt-violet">
          {queue} pending
        </span>
      </div>

      <div className="relative p-5 md:p-6">
        <div key={idx} className="mkt-card-in">
          <div className="flex items-start justify-between gap-4">
            <h3 className="text-[16px] leading-snug font-bold text-mkt-ink md:text-[17px]">{p.title}</h3>
            <span className="shrink-0 rounded-lg bg-mkt-violet px-2.5 py-1.5 font-jbmono text-[13px] font-semibold text-white">
              {p.confidence}%
            </span>
          </div>
          <p className="mt-2 font-jbmono text-[12.5px] text-mkt-body">{p.diff}</p>

          <div className="mt-4 rounded-xl border border-mkt-border bg-mkt-ground px-4 py-3">
            <p className="text-[11px] font-bold tracking-[0.1em] text-mkt-body uppercase">Source evidence</p>
            <p className="mt-1 flex items-center gap-2 text-[13.5px] font-medium text-mkt-ink">
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-md bg-[#fdeef4] font-jbmono text-[10px] font-bold text-mkt-pink">
                {p.sourceKind === "Zoom" ? "Z" : "G"}
              </span>
              {p.source}
            </p>
          </div>

          <div className="mt-5 flex items-center gap-2.5">
            <span
              className={`inline-flex min-h-[40px] items-center rounded-[10px] bg-mkt-violet px-5 text-[14px] font-semibold text-white ${
                phase === "press" ? "mkt-pressing" : ""
              }`}
            >
              Approve
            </span>
            <span className="inline-flex min-h-[40px] items-center rounded-[10px] border border-mkt-border bg-white px-4 text-[14px] font-semibold text-mkt-body">
              Edit
            </span>
            <span className="inline-flex min-h-[40px] items-center rounded-[10px] border border-mkt-border bg-white px-4 text-[14px] font-semibold text-mkt-body">
              Reject
            </span>
            <span className="ml-auto hidden font-jbmono text-[11px] text-mkt-body sm:block">
              NOTHING APPLIES BEFORE THIS
            </span>
          </div>
        </div>

        {applied && (
          <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
            <span className="mkt-stamp inline-flex items-center gap-1.5 rounded-lg border-[2.5px] border-mkt-green bg-white/85 px-4 py-1.5 font-jakarta text-[17px] font-extrabold tracking-wide text-mkt-green uppercase">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M4 12.5 9.5 18 20 6.5" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Applied
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
