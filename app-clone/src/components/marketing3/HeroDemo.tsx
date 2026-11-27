"use client";

import { useEffect, useRef, useState } from "react";

/**
 * The hero product visual — a HubSpot-style product screenshot panel holding
 * the LIVE Approvals demo: a proposal shows its confidence + source evidence,
 * the Approve button presses itself, the card stamps "✓ Applied", the queue
 * badge ticks 14 → 13 → 12 → 11, then resets. Pauses on hover / off-screen;
 * static under prefers-reduced-motion.
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
  const visibleRef = useRef(true);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => { visibleRef.current = entries[0]?.isIntersecting ?? true; },
      { threshold: 0.12 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let cancelled = false;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const wait = (ms: number) => new Promise<void>((res) => { timers.push(setTimeout(res, ms)); });
    (async () => {
      while (!cancelled) {
        const gate = async () => { while (!cancelled && (paused || !visibleRef.current)) await wait(300); };
        await gate();
        setPhase("show");
        await wait(2100);
        await gate();
        setPhase("press");
        await wait(650);
        if (cancelled) break;
        setPhase("applied");
        setQueue((q) => (q > 11 ? q - 1 : q));
        await wait(1900);
        if (cancelled) break;
        setIdx((i) => {
          const next = (i + 1) % PROPOSALS.length;
          if (next === 0) setQueue(14);
          return next;
        });
      }
    })();
    return () => { cancelled = true; timers.forEach(clearTimeout); };
  }, [paused]);

  const p = PROPOSALS[idx];

  return (
    <div
      ref={rootRef}
      role="img"
      aria-label="Live demo of the Vouchso Review Queue: a proposal for Acme Corp at 96% confidence is approved and stamped Applied, and the queue count goes down."
      className="hs-frame-shadow overflow-hidden rounded-[20px] border border-hs-line bg-white text-left"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Browser chrome */}
      <div className="flex items-center gap-3 border-b border-hs-line bg-hs-mist px-5 py-3">
        <span className="flex gap-1.5" aria-hidden="true">
          <span className="h-2.5 w-2.5 rounded-full bg-[#d8d3c8]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#d8d3c8]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#d8d3c8]" />
        </span>
        <span className="mx-auto inline-flex items-center gap-2 rounded-md bg-white px-3 py-1 font-jbmono text-[11.5px] text-hs-mute ring-1 ring-hs-line">
          app.vouchso.com/approvals
        </span>
        <span className="hidden font-jbmono text-[11px] font-semibold tracking-wide text-hs-green sm:block">● LIVE DEMO</span>
      </div>

      <div className="px-5 py-5 sm:px-7 sm:py-6">
        {/* Queue header */}
        <div className="flex flex-wrap items-center gap-3">
          <h3 className="font-jakarta text-[17px] font-bold text-hs-ink">Review Queue</h3>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-hs-tint px-2.5 py-0.5 font-jbmono text-[12px] font-semibold text-hs-brand-dark">
            <span data-queue-badge>{queue}</span> waiting
          </span>
          <span className="ml-auto hidden font-jbmono text-[11.5px] text-hs-mute sm:block">HubSpot · Salesforce</span>
        </div>

        {/* Proposal card */}
        <div key={idx} className="card-in relative mt-4 rounded-2xl border border-hs-line bg-white p-5 hs-card-shadow">
          <div className="flex flex-wrap items-start gap-3">
            <div className="min-w-0 flex-1">
              <p className="font-jakarta text-[16px] leading-snug font-bold text-hs-ink">{p.title}</p>
              <p className="mt-1.5 font-jbmono text-[12.5px] text-hs-body">{p.diff}</p>
            </div>
            <span className="inline-flex flex-col items-center rounded-xl bg-hs-mist px-3 py-1.5">
              <span className="font-jbmono text-[17px] leading-none font-semibold text-hs-ink">{p.confidence}%</span>
              <span className="mt-1 text-[10px] font-semibold tracking-wide text-hs-mute uppercase">confident</span>
            </span>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl bg-hs-mist px-3.5 py-2.5 text-[13px] text-hs-body">
            <span className="font-jakarta font-bold text-hs-ink">Source</span>
            <span>{p.source}</span>
            <span className="ml-auto font-jbmono text-[11px] font-semibold text-hs-mute">{p.sourceKind}</span>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2.5">
            <span
              className={`inline-flex items-center rounded-lg px-4 py-2 font-jakarta text-[14px] font-bold text-white transition-all duration-300 ${
                phase === "press" ? "scale-[0.96] bg-hs-brand-dark" : "bg-hs-brand"
              }`}
            >
              Approve
            </span>
            <span className="inline-flex items-center rounded-lg border border-hs-line bg-white px-4 py-2 font-jakarta text-[14px] font-semibold text-hs-body">
              Edit first
            </span>
            <span className="inline-flex items-center rounded-lg px-3 py-2 font-jakarta text-[14px] font-semibold text-hs-mute">
              Reject
            </span>
            <span className="ml-auto hidden text-[12.5px] text-hs-mute sm:block">Nothing applies until you say yes</span>
          </div>

          {phase === "applied" && (
            <span className="stamp-in absolute top-5 right-5 inline-flex rotate-[-9deg] items-center gap-1.5 rounded-lg border-2 border-hs-green bg-white/95 px-3 py-1.5 font-jakarta text-[14px] font-extrabold tracking-wide text-hs-green uppercase shadow-sm">
              ✓ Applied
            </span>
          )}
        </div>

        {/* Queue rows beneath */}
        <div className="mt-4 divide-y divide-hs-line rounded-2xl border border-hs-line">
          {[
            { t: "Globex — set next step: pricing call, Friday", c: 88, s: "Calendar · Fri 10:00 AM" },
            { t: "Initech — log discovery call outcome", c: 83, s: "Zoom · Wed 3:30 PM" },
          ].map((r) => (
            <div key={r.t} className="flex items-center gap-3 px-4 py-3">
              <span className="min-w-0 flex-1 truncate text-[13.5px] font-medium text-hs-body">{r.t}</span>
              <span className="hidden font-jbmono text-[11px] text-hs-mute md:block">{r.s}</span>
              <span className="font-jbmono text-[12px] font-semibold text-hs-ink">{r.c}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
