"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

/* ---------- Pipeline Compare: deal chips physically move columns ---------- */

type Chip = { name: string; val: string; tone?: string };

const COLS: { head: string; delta: string; chips: Chip[] }[] = [
  {
    head: "Progressed",
    delta: "+6",
    chips: [
      { name: "Acme Corp", val: "$48,000" },
      { name: "Helios Ltd", val: "$21,500", tone: "mover-slot-a" },
      { name: "Vertex Co", val: "$18,750", tone: "mover-slot-b" },
    ],
  },
  { head: "New", delta: "+4", chips: [{ name: "Northbeam", val: "$12,000" }, { name: "Helios Ltd", val: "$21,500", tone: "ghost-a" }] },
  { head: "Stalled", delta: "3", chips: [{ name: "Vertex Co", val: "$18,750", tone: "ghost-b" }, { name: "Kite & Co", val: "$9,300" }] },
  { head: "Slipped", delta: "2", chips: [{ name: "Marlin Inc", val: "$15,200" }] },
  { head: "Won–Lost", delta: "2 · 1", chips: [{ name: "Orbital", val: "Won $26,000", tone: "text-d3-green" }] },
];

function ChipView({ chip, ghost = false }: { chip: Chip; ghost?: boolean }) {
  return (
    <div
      className={`rounded-lg border px-2.5 py-2 ${
        ghost ? "border-dashed border-white/15 bg-transparent" : "border-white/10 bg-white/[0.05]"
      }`}
    >
      <p className={`truncate text-[12.5px] font-semibold ${ghost ? "text-d3-mute" : "text-d3-ivory"}`}>
        {chip.name}
      </p>
      <p className={`font-jbmono text-[11px] ${ghost ? "text-d3-mute" : chip.tone ?? "text-d3-ivory2"}`}>
        {ghost ? "moved ↑" : chip.val}
      </p>
    </div>
  );
}

export function PipelineScene() {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    gsap.registerPlugin(ScrollTrigger);
    const q = gsap.utils.selector(root);
    const ctx = gsap.context(() => {
      const movers: { el: HTMLElement; from: HTMLElement; to: HTMLElement }[] = [
        { el: q(".mover-a")[0], from: q(".ghost-a")[0], to: q(".slot-a")[0] },
        { el: q(".mover-b")[0], from: q(".ghost-b")[0], to: q(".slot-b")[0] },
      ];
      // Function-based positions, re-evaluated on every ScrollTrigger refresh
      // (invalidateOnRefresh) so font loads / resizes can't stale the flight.
      const fx = (ref: HTMLElement) => () =>
        ref.getBoundingClientRect().left - root.getBoundingClientRect().left;
      const fy = (ref: HTMLElement) => () =>
        ref.getBoundingClientRect().top - root.getBoundingClientRect().top;
      const tl = gsap.timeline({
        defaults: { ease: "power1.inOut" },
        scrollTrigger: {
          trigger: root,
          start: "top 82%",
          end: "top 22%",
          scrub: 0.6,
          invalidateOnRefresh: true,
          onRefresh: () => {
            movers.forEach(({ el, from }) => {
              if (!el || !from) return;
              const r = from.getBoundingClientRect();
              gsap.set(el, { width: r.width, height: r.height });
            });
          },
        },
      });
      movers.forEach(({ el, from, to }, i) => {
        if (!el || !from || !to) return;
        const at = i * 0.25;
        tl.fromTo(
          el,
          { x: fx(from), y: fy(from), autoAlpha: 1 },
          { x: () => (fx(from)() + fx(to)()) / 2, y: () => (fy(from)() + fy(to)()) / 2 - 38, duration: 0.5 },
          at
        );
        tl.to(el, { x: fx(to), y: fy(to), duration: 0.5 }, at + 0.5);
        // The destination slot's own chip fades out as the flyer lands on it.
        tl.fromTo(to, { autoAlpha: 1 }, { autoAlpha: 0, duration: 0.3 }, at + 0.75);
      });
      tl.fromTo(q(".ghost-a, .ghost-b"), { autoAlpha: 1 }, { autoAlpha: 0.3, duration: 0.5 }, 0.7);
    }, root);
    return () => ctx.revert();
  }, []);

  return (
    <div ref={rootRef} className="panel3d relative overflow-hidden rounded-[20px]">
      <div className="flex items-center gap-3 border-b border-white/10 bg-white/[0.04] px-5 py-3">
        <span className="flex gap-1.5" aria-hidden="true">
          <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
          <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
          <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
        </span>
        <span className="text-[12.5px] font-semibold text-d3-ivory2">
          Pipeline Compare — this week vs last week · demo workspace
        </span>
      </div>
      <div className="relative p-5 md:p-6">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {COLS.map((col) => (
            <div key={col.head} className="rounded-xl bg-white/[0.03] p-3">
              <div className="flex items-baseline justify-between">
                <h4 className="text-[12px] font-bold tracking-wide text-d3-ivory uppercase">{col.head}</h4>
                <span className="font-jbmono text-[11px] font-semibold text-d3-pink-bright">{col.delta}</span>
              </div>
              <div className="mt-2.5 flex flex-col gap-2">
                {col.chips.map((chip) => {
                  if (chip.tone === "mover-slot-a")
                    return (
                      <div key={chip.name} className="slot-a">
                        <ChipView chip={chip} />
                      </div>
                    );
                  if (chip.tone === "mover-slot-b")
                    return (
                      <div key={chip.name} className="slot-b">
                        <ChipView chip={chip} />
                      </div>
                    );
                  if (chip.tone === "ghost-a")
                    return (
                      <div key={chip.name} className="ghost-a hidden lg:block">
                        <ChipView chip={chip} ghost />
                      </div>
                    );
                  if (chip.tone === "ghost-b")
                    return (
                      <div key={chip.name} className="ghost-b hidden lg:block">
                        <ChipView chip={chip} ghost />
                      </div>
                    );
                  return <ChipView key={chip.name} chip={chip} />;
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Flying chips (desktop only — measured against the ghost slots) */}
        <div className="mover-a pointer-events-none absolute top-0 left-0 z-10 hidden opacity-0 lg:block" aria-hidden="true">
          <div className="rounded-lg border border-d3-pink/60 bg-d3-panel px-2.5 py-2 shadow-[0_14px_30px_-10px_rgba(210,59,114,0.5)]">
            <p className="truncate text-[12.5px] font-semibold text-d3-ivory">Helios Ltd</p>
            <p className="font-jbmono text-[11px] text-d3-ivory2">$21,500</p>
          </div>
        </div>
        <div className="mover-b pointer-events-none absolute top-0 left-0 z-10 hidden opacity-0 lg:block" aria-hidden="true">
          <div className="rounded-lg border border-d3-pink/60 bg-d3-panel px-2.5 py-2 shadow-[0_14px_30px_-10px_rgba(210,59,114,0.5)]">
            <p className="truncate text-[12.5px] font-semibold text-d3-ivory">Vertex Co</p>
            <p className="font-jbmono text-[11px] text-d3-ivory2">$18,750</p>
          </div>
        </div>

        <p className="mt-4 font-jbmono text-[11px] text-d3-mute">
          OPEN PIPELINE $1,240,000 · MOVEMENT COMPUTED FROM APPROVED CHANGES ONLY
        </p>
      </div>
    </div>
  );
}

/* ---------- Data Cleanup: the health ring draws itself to 98 ---------- */

export function CleanupScene() {
  const rootRef = useRef<HTMLDivElement>(null);
  const issues = [
    { name: "Duplicates", count: 19, note: "Same company or contact, twice" },
    { name: "Missing fields", count: 24, note: "No next step, no owner, no close date" },
    { name: "Unlogged activity", count: 31, note: "Calls and emails not in the CRM" },
    { name: "Stale deals", count: 8, note: "No movement in 14+ days" },
  ];
  const guardrails = ["Prevent invalid stage changes", "Require a next-step date", "Detect duplicate emails"];

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const ringEl = root.querySelector<SVGCircleElement>(".ring-arc");
    const numEl = root.querySelector<HTMLElement>(".ring-num");
    if (!ringEl || !numEl) return;
    const C = 2 * Math.PI * 84;
    const setFinal = () => {
      ringEl.style.strokeDashoffset = String(C * (1 - 0.98));
      numEl.textContent = "98";
    };
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setFinal();
      return;
    }
    gsap.registerPlugin(ScrollTrigger);
    const state = { v: 0 };
    const ctx = gsap.context(() => {
      gsap.fromTo(
        state,
        { v: 0 },
        {
          v: 98,
          ease: "none",
          scrollTrigger: { trigger: root, start: "top 78%", end: "top 30%", scrub: 0.6 },
          onUpdate: () => {
            const v = state.v;
            ringEl.style.strokeDashoffset = String(C * (1 - v / 100));
            numEl.textContent = String(Math.round(v));
          },
        }
      );
    }, root);
    return () => ctx.revert();
  }, []);

  const C = 2 * Math.PI * 84;
  return (
    <div ref={rootRef} className="panel3d overflow-hidden rounded-[20px]">
      <div className="flex items-center gap-3 border-b border-white/10 bg-white/[0.04] px-5 py-3">
        <span className="flex gap-1.5" aria-hidden="true">
          <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
          <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
          <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
        </span>
        <span className="text-[12.5px] font-semibold text-d3-ivory2">Data Cleanup — demo workspace</span>
      </div>
      <div className="flex flex-col gap-8 p-6 md:flex-row md:p-8">
        <div className="flex items-center gap-5">
          <div className="relative shrink-0" style={{ width: 188, height: 188 }} role="img" aria-label="Health score 98 of 100">
            <svg width="188" height="188" className="-rotate-90">
              <circle cx="94" cy="94" r="84" fill="none" stroke="#2b2140" strokeWidth="10" />
              <circle
                className="ring-arc"
                cx="94"
                cy="94"
                r="84"
                fill="none"
                stroke="#d23b72"
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={C}
                strokeDashoffset={C}
              />
            </svg>
            <span className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="ring-num font-fraunces text-[54px] leading-none font-semibold text-d3-ivory">0</span>
              <span className="mt-1 font-jbmono text-[10.5px] tracking-[0.14em] text-d3-mute">HEALTH SCORE</span>
            </span>
          </div>
          <div>
            <p className="font-jbmono text-[11.5px] font-semibold text-d3-green">▲ +11 THIS MONTH</p>
            <p className="mt-2 max-w-[190px] text-[13px] leading-snug text-d3-ivory2">
              Found continuously — fixes are proposed, never applied silently.
            </p>
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <ul className="divide-y divide-white/[0.07] rounded-xl border border-white/10">
            {issues.map((i) => (
              <li key={i.name} className="flex items-center gap-3 px-4 py-3">
                <span className="min-w-0">
                  <span className="block truncate text-[13.5px] font-semibold text-d3-ivory">{i.name}</span>
                  <span className="block truncate text-[12px] text-d3-ivory2">{i.note}</span>
                </span>
                <span className="ml-auto font-jbmono text-[13px] font-semibold text-d3-ivory">{i.count}</span>
                <span className="shrink-0 rounded-full bg-d3-pink/15 px-2.5 py-1 text-[11.5px] font-bold text-d3-pink-bright">
                  Propose fix
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-bold tracking-[0.1em] text-d3-mute uppercase">Guardrails</span>
            {guardrails.map((g) => (
              <span
                key={g}
                className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.04] px-3 py-1.5 text-[12px] font-medium text-d3-ivory"
              >
                <span className="relative h-4 w-7 shrink-0 rounded-full bg-d3-pink" aria-hidden="true">
                  <span className="absolute top-0.5 right-0.5 h-3 w-3 rounded-full bg-white" />
                </span>
                {g}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- History: batches check themselves off on scroll ---------- */

export function LedgerScene() {
  const rootRef = useRef<HTMLDivElement>(null);
  const batches = [
    { id: "Batch #1042", meta: "6 changes · Approved by Md Yasses · Today 10:02 AM", state: "Synced" },
    { id: "Batch #1041", meta: "3 changes · Approved by Md Yasses · Yesterday 4:47 PM", state: "Synced" },
    { id: "Batch #1039", meta: "11 changes · Approved by A. Rahman · Mon 9:15 AM", state: "Rolled back" },
  ];
  const steps = [
    "Preview — see exactly what reverts",
    "Confirm — one deliberate click",
    "Verify — CRM matches the old values",
  ];

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    gsap.registerPlugin(ScrollTrigger);
    const ctx = gsap.context(() => {
      gsap.from(root.querySelectorAll(".ledger-check"), {
        scale: 0.4,
        autoAlpha: 0.25,
        duration: 0.4,
        ease: "back.out(2)",
        stagger: 0.35,
        scrollTrigger: { trigger: root, start: "top 70%", end: "top 30%", scrub: 0.6 },
      });
    }, root);
    return () => ctx.revert();
  }, []);

  return (
    <div ref={rootRef} className="panel3d overflow-hidden rounded-[20px]">
      <div className="flex items-center gap-3 border-b border-white/10 bg-white/[0.04] px-5 py-3">
        <span className="flex gap-1.5" aria-hidden="true">
          <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
          <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
          <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
        </span>
        <span className="text-[12.5px] font-semibold text-d3-ivory2">History — every applied batch, with its undo</span>
      </div>
      <div className="p-5 md:p-6">
        <ul className="flex flex-col gap-2.5 font-jbmono text-[12.5px]">
          {batches.map((b) => (
            <li
              key={b.id}
              className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3"
            >
              <span className="ledger-check flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-d3-green text-d3-bg">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M4 12.5 9.5 18 20 6.5" stroke="currentColor" strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              <span className="font-semibold text-d3-ivory">{b.id}</span>
              <span className="text-d3-ivory2">{b.meta}</span>
              <span className={`ml-auto font-semibold ${b.state === "Synced" ? "text-d3-green" : "text-d3-pink-bright"}`}>
                {b.state === "Synced" ? "✓ SYNCED" : "↩ ROLLED BACK"}
              </span>
              {b.state === "Synced" && (
                <span className="rounded-lg border border-white/15 px-2.5 py-1 font-sans text-[11.5px] font-bold text-d3-ivory">
                  Revert batch
                </span>
              )}
            </li>
          ))}
        </ul>
        <div className="mt-5 grid gap-2.5 sm:grid-cols-3">
          {steps.map((s, i) => (
            <div key={s} className="flex items-start gap-2.5 rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-3">
              <span className="ledger-check flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-d3-green text-d3-bg">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M4 12.5 9.5 18 20 6.5" stroke="currentColor" strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              <p className="text-[12.5px] leading-snug font-medium text-d3-ivory">
                <span className="font-jbmono text-[11px] text-d3-mute">{i + 1} · </span>
                {s}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
