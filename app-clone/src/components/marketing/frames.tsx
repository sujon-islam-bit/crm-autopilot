"use client";

import { useEffect, useRef, useState } from "react";

/* Static product-UI frames in the app's own visual language — real mechanics,
   demo-workspace data (labelled in each frame's title bar where it matters). */

export function FrameShell({
  title,
  right,
  children,
  dark = false,
}: {
  title: string;
  right?: React.ReactNode;
  children: React.ReactNode;
  dark?: boolean;
}) {
  return (
    <div
      className={`mkt-lift overflow-hidden rounded-[20px] border ${
        dark ? "border-white/10 bg-[#1c1729] text-white" : "border-mkt-border bg-white"
      }`}
    >
      <div
        className={`flex items-center gap-3 border-b px-5 py-3 ${
          dark ? "border-white/10 bg-white/5" : "border-mkt-border bg-mkt-card"
        }`}
      >
        <span className="flex gap-1.5" aria-hidden="true">
          <span className={`h-2.5 w-2.5 rounded-full ${dark ? "bg-white/20" : "bg-[#e0d9f2]"}`} />
          <span className={`h-2.5 w-2.5 rounded-full ${dark ? "bg-white/20" : "bg-[#e0d9f2]"}`} />
          <span className={`h-2.5 w-2.5 rounded-full ${dark ? "bg-white/20" : "bg-[#e0d9f2]"}`} />
        </span>
        <span className={`text-[12.5px] font-semibold ${dark ? "text-white/70" : "text-mkt-body"}`}>{title}</span>
        {right && <span className="ml-auto">{right}</span>}
      </div>
      <div className="p-5 md:p-6">{children}</div>
    </div>
  );
}

export function Ring({
  value,
  size = 92,
  stroke = 8,
  color = "#6C3CE9",
  track = "#EDE9F8",
  label,
}: {
  value: number;
  size?: number;
  stroke?: number;
  color?: string;
  track?: string;
  label?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [on, setOn] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setOn(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setOn(true);
          io.disconnect();
        }
      },
      { threshold: 0.4 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div ref={ref} className="relative shrink-0" style={{ width: size, height: size }} role="img" aria-label={label ?? `${value}%`}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={on ? c * (1 - value / 100) : c}
          style={{ transition: "stroke-dashoffset 1.1s cubic-bezier(0.16,1,0.3,1)" }}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center font-jakarta text-[20px] font-extrabold text-mkt-ink">
        {value}
      </span>
    </div>
  );
}

/* ---------- Approvals ---------- */

export function ApprovalsFrame() {
  const tabs = ["Deal Updates", "New Contacts", "Enrichment", "Follow-ups", "Field Corrections"];
  return (
    <FrameShell
      title="Review Queue — demo workspace"
      right={<span className="rounded-full bg-mkt-violet/10 px-2.5 py-1 font-jbmono text-[11px] font-semibold text-mkt-violet">14 pending</span>}
    >
      <div className="flex flex-wrap gap-1.5" role="presentation">
        {tabs.map((t, i) => (
          <span
            key={t}
            className={`rounded-full px-3 py-1.5 text-[12px] font-semibold ${
              i === 0 ? "bg-mkt-violet text-white" : "bg-mkt-ground text-mkt-body"
            }`}
          >
            {t}
          </span>
        ))}
      </div>

      <div className="mt-5 grid gap-5 md:grid-cols-[1fr_1fr]">
        <div>
          <div className="flex items-start justify-between gap-3">
            <h4 className="text-[15.5px] leading-snug font-bold text-mkt-ink">Acme Corp — move deal to Proposal Sent</h4>
            <Ring value={96} size={54} stroke={5} label="96% confidence" />
          </div>
          <div className="mt-3 overflow-hidden rounded-xl border border-mkt-border text-[13px]">
            <div className="grid grid-cols-[86px_1fr] border-b border-mkt-border">
              <span className="bg-mkt-ground px-3 py-2 font-semibold text-mkt-body">Field</span>
              <span className="px-3 py-2 font-semibold text-mkt-ink">Deal stage</span>
            </div>
            <div className="grid grid-cols-[86px_1fr] border-b border-mkt-border">
              <span className="bg-mkt-ground px-3 py-2 font-semibold text-mkt-body">Current</span>
              <span className="px-3 py-2 text-mkt-body line-through decoration-mkt-pink/60">Negotiation</span>
            </div>
            <div className="grid grid-cols-[86px_1fr]">
              <span className="bg-mkt-ground px-3 py-2 font-semibold text-mkt-body">Proposed</span>
              <span className="px-3 py-2 font-bold text-mkt-violet">Proposal Sent</span>
            </div>
          </div>
          <div className="mt-4 flex gap-2.5">
            <span className="inline-flex min-h-[38px] items-center rounded-[10px] bg-mkt-violet px-4 text-[13.5px] font-semibold text-white">Approve</span>
            <span className="inline-flex min-h-[38px] items-center rounded-[10px] border border-mkt-border px-4 text-[13.5px] font-semibold text-mkt-body">Edit first</span>
            <span className="inline-flex min-h-[38px] items-center rounded-[10px] border border-mkt-border px-4 text-[13.5px] font-semibold text-mkt-body">Reject</span>
          </div>
        </div>
        <div className="rounded-xl border border-mkt-border bg-mkt-ground p-4">
          <p className="text-[11px] font-bold tracking-[0.1em] text-mkt-body uppercase">Source evidence</p>
          <p className="mt-2 text-[13px] font-semibold text-mkt-ink">
            Sarah Lee <span className="font-normal text-mkt-body">· Acme Corp · Tue 9:41 AM · Gmail</span>
          </p>
          <p className="mt-2 text-[13.5px] leading-relaxed text-mkt-body">
            “Legal cleared the MSA this morning — please send the proposal over and we’ll sign this
            week.”
          </p>
          <p className="mt-3 font-jbmono text-[11px] text-mkt-body">ALSO LOGGED: CALENDAR · CALL NOTES</p>
        </div>
      </div>
    </FrameShell>
  );
}

/* ---------- Pipeline Compare ---------- */

const PIPE_COLS: { head: string; delta: string; chips: { name: string; val: string; tone?: string }[] }[] = [
  { head: "Progressed", delta: "+6", chips: [{ name: "Acme Corp", val: "$48,000" }, { name: "Helios Ltd", val: "$21,500" }] },
  { head: "New", delta: "+4", chips: [{ name: "Northbeam", val: "$12,000" }] },
  { head: "Stalled", delta: "3", chips: [{ name: "Vertex Co", val: "$18,750" }, { name: "Kite & Co", val: "$9,300" }] },
  { head: "Slipped", delta: "2", chips: [{ name: "Marlin Inc", val: "$15,200" }] },
  { head: "Won–Lost", delta: "2 · 1", chips: [{ name: "Orbital", val: "Won $26,000", tone: "text-mkt-green" }] },
];

export function PipelineFrame() {
  return (
    <FrameShell title="Pipeline Compare — this week vs last week · demo workspace">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {PIPE_COLS.map((col) => (
          <div key={col.head} className="rounded-xl bg-mkt-ground p-3">
            <div className="flex items-baseline justify-between">
              <h4 className="text-[12px] font-bold tracking-wide text-mkt-ink uppercase">{col.head}</h4>
              <span className="font-jbmono text-[11px] font-semibold text-mkt-violet">{col.delta}</span>
            </div>
            <div className="mt-2.5 flex flex-col gap-2">
              {col.chips.map((chip) => (
                <div key={chip.name} className="rounded-lg border border-mkt-border bg-white px-2.5 py-2">
                  <p className="truncate text-[12.5px] font-semibold text-mkt-ink">{chip.name}</p>
                  <p className={`font-jbmono text-[11px] ${chip.tone ?? "text-mkt-body"}`}>{chip.val}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <p className="mt-4 font-jbmono text-[11px] text-mkt-body">
        OPEN PIPELINE $1,240,000 · MOVEMENT COMPUTED FROM APPROVED CHANGES ONLY
      </p>
    </FrameShell>
  );
}

/* ---------- Data Cleanup ---------- */

export function CleanupFrame() {
  const issues = [
    { name: "Duplicates", count: 19, note: "Same company or contact, twice" },
    { name: "Missing fields", count: 24, note: "No next step, no owner, no close date" },
    { name: "Unlogged activity", count: 31, note: "Calls and emails not in the CRM" },
    { name: "Stale deals", count: 8, note: "No movement in 14+ days" },
  ];
  const guardrails = ["Prevent invalid stage changes", "Require a next-step date", "Detect duplicate emails"];
  return (
    <FrameShell title="Data Cleanup — demo workspace">
      <div className="flex flex-col gap-6 md:flex-row">
        <div className="flex items-center gap-4">
          <Ring value={98} size={104} stroke={9} label="Health score 98 of 100" />
          <div>
            <p className="text-[15px] font-bold text-mkt-ink">Health score</p>
            <p className="font-jbmono text-[11.5px] text-mkt-green">▲ +11 THIS MONTH</p>
            <p className="mt-1 max-w-[180px] text-[12.5px] leading-snug text-mkt-body">
              Found continuously — fixes are proposed, never applied silently.
            </p>
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <ul className="divide-y divide-mkt-border rounded-xl border border-mkt-border">
            {issues.map((i) => (
              <li key={i.name} className="flex items-center gap-3 px-4 py-2.5">
                <span className="min-w-0">
                  <span className="block truncate text-[13.5px] font-semibold text-mkt-ink">{i.name}</span>
                  <span className="block truncate text-[12px] text-mkt-body">{i.note}</span>
                </span>
                <span className="ml-auto font-jbmono text-[13px] font-semibold text-mkt-ink">{i.count}</span>
                <span className="shrink-0 rounded-full bg-mkt-violet/10 px-2.5 py-1 text-[11.5px] font-bold text-mkt-violet">
                  Propose fix
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-bold tracking-[0.1em] text-mkt-body uppercase">Guardrails</span>
            {guardrails.map((g) => (
              <span key={g} className="inline-flex items-center gap-2 rounded-full border border-mkt-border bg-white px-3 py-1.5 text-[12px] font-medium text-mkt-ink">
                <span className="relative h-4 w-7 rounded-full bg-mkt-violet" aria-hidden="true">
                  <span className="absolute top-0.5 right-0.5 h-3 w-3 rounded-full bg-white" />
                </span>
                {g}
              </span>
            ))}
          </div>
        </div>
      </div>
    </FrameShell>
  );
}

/* ---------- History & Rollback ---------- */

export function HistoryFrame() {
  const batches = [
    { id: "Batch #1042", meta: "6 changes · Approved by Md Yasses · Today 10:02 AM", state: "Synced" },
    { id: "Batch #1041", meta: "3 changes · Approved by Md Yasses · Yesterday 4:47 PM", state: "Synced" },
    { id: "Batch #1039", meta: "11 changes · Approved by A. Rahman · Mon 9:15 AM", state: "Rolled back" },
  ];
  const steps = ["Preview — see exactly what reverts", "Confirm — one deliberate click", "Verify — CRM matches the old values"];
  return (
    <FrameShell title="History — every applied batch, with its undo">
      <ul className="flex flex-col gap-2.5 font-jbmono text-[12.5px]">
        {batches.map((b) => (
          <li
            key={b.id}
            className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-mkt-border bg-mkt-ground px-4 py-3"
          >
            <span className="font-semibold text-mkt-ink">{b.id}</span>
            <span className="text-mkt-body">{b.meta}</span>
            <span className={`ml-auto font-semibold ${b.state === "Synced" ? "text-mkt-green" : "text-mkt-pink"}`}>
              {b.state === "Synced" ? "✓ SYNCED" : "↩ ROLLED BACK"}
            </span>
            {b.state === "Synced" && (
              <span className="rounded-lg border border-mkt-border bg-white px-2.5 py-1 font-jakarta text-[11.5px] font-bold text-mkt-ink">
                Revert batch
              </span>
            )}
          </li>
        ))}
      </ul>
      <div className="mt-5 grid gap-2.5 sm:grid-cols-3" data-reveal-group>
        {steps.map((s, i) => (
          <div key={s} className="flex items-start gap-2.5 rounded-xl border border-mkt-border bg-white px-3.5 py-3">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-mkt-green text-white">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M4 12.5 9.5 18 20 6.5" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <p className="text-[12.5px] leading-snug font-medium text-mkt-ink">
              <span className="font-jbmono text-[11px] text-mkt-body">{i + 1} · </span>
              {s}
            </p>
          </div>
        ))}
      </div>
    </FrameShell>
  );
}

/* ---------- AI Assistant ---------- */

export function AssistantFrame() {
  return (
    <FrameShell
      title="AI Assistant"
      right={<span className="rounded-full bg-mkt-ground px-2.5 py-1 font-jbmono text-[11px] font-semibold text-mkt-body">30 MESSAGES/DAY · PER USER</span>}
    >
      <div className="flex flex-col gap-3.5">
        <div className="ml-auto max-w-[78%] rounded-2xl rounded-br-md bg-mkt-violet px-4 py-2.5 text-[13.5px] font-medium text-white">
          Which deals are stalled?
        </div>
        <div className="max-w-[92%] rounded-2xl rounded-bl-md border border-mkt-border bg-mkt-ground px-4 py-3">
          <p className="text-[13.5px] font-medium text-mkt-ink">3 of your deals have had no movement in 14+ days:</p>
          <div className="mt-2 overflow-hidden rounded-lg border border-mkt-border bg-white font-jbmono text-[12px]">
            {[
              ["Vertex Co", "$18,750", "21 days"],
              ["Kite & Co", "$9,300", "17 days"],
              ["Marlin Inc", "$15,200", "14 days"],
            ].map((r) => (
              <div key={r[0]} className="grid grid-cols-3 border-b border-mkt-border px-3 py-1.5 last:border-0">
                <span className="font-semibold text-mkt-ink">{r[0]}</span>
                <span className="text-mkt-body">{r[1]}</span>
                <span className="text-right text-mkt-pink">{r[2]}</span>
              </div>
            ))}
          </div>
          <p className="mt-2 text-[13px] text-mkt-body">Want a follow-up drafted for Vertex Co?</p>
        </div>
        <div className="max-w-[92%] rounded-2xl rounded-bl-md border-2 border-dashed border-mkt-violet/40 bg-mkt-violet/5 px-4 py-3">
          <p className="text-[11px] font-bold tracking-[0.1em] text-mkt-violet uppercase">Proposal — not applied</p>
          <p className="mt-1 text-[13.5px] font-semibold text-mkt-ink">Follow-up email to Vertex Co — draft ready</p>
          <div className="mt-2.5 flex gap-2">
            <span className="inline-flex min-h-[34px] items-center rounded-lg bg-mkt-violet px-3.5 text-[12.5px] font-semibold text-white">Approve</span>
            <span className="inline-flex min-h-[34px] items-center rounded-lg border border-mkt-border bg-white px-3.5 text-[12.5px] font-semibold text-mkt-body">Dismiss</span>
          </div>
        </div>
      </div>
    </FrameShell>
  );
}
