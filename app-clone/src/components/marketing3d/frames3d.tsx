/**
 * Dark product-UI frames for the Product page — the app's real mechanics,
 * demo-workspace data (labelled in each frame's title bar where it matters).
 * Server components: no client JS needed.
 */

export function FrameShell3d({
  title,
  right,
  children,
}: {
  title: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="panel3d overflow-hidden rounded-[20px]">
      <div className="flex items-center gap-3 border-b border-white/10 bg-white/[0.04] px-5 py-3">
        <span className="flex gap-1.5" aria-hidden="true">
          <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
          <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
          <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
        </span>
        <span className="text-[12.5px] font-semibold text-d3-ivory2">{title}</span>
        {right && <span className="ml-auto">{right}</span>}
      </div>
      <div className="p-5 md:p-6">{children}</div>
    </div>
  );
}

export function MiniRing({ value }: { value: number }) {
  const size = 54;
  const stroke = 5;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }} role="img" aria-label={`${value}% confidence`}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#2b2140" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="#d23b72"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - value / 100)}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center font-jbmono text-[12px] font-semibold text-d3-ivory">
        {value}
      </span>
    </div>
  );
}

/* ---------- Approvals ---------- */

export function ApprovalsFrame3d() {
  const tabs = ["Deal Updates", "New Contacts", "Enrichment", "Follow-ups", "Field Corrections"];
  return (
    <FrameShell3d
      title="Review Queue — demo workspace"
      right={
        <span className="rounded-full bg-d3-pink/15 px-2.5 py-1 font-jbmono text-[11px] font-semibold text-d3-pink-bright">
          14 pending
        </span>
      }
    >
      <div className="flex flex-wrap gap-1.5" role="presentation">
        {tabs.map((t, i) => (
          <span
            key={t}
            className={`rounded-full px-3 py-1.5 text-[12px] font-semibold ${
              i === 0 ? "bg-d3-pink text-white" : "bg-white/[0.05] text-d3-ivory2"
            }`}
          >
            {t}
          </span>
        ))}
      </div>

      <div className="mt-5 grid gap-5 md:grid-cols-2">
        <div>
          <div className="flex items-start justify-between gap-3">
            <h4 className="text-[15.5px] leading-snug font-bold text-d3-ivory">
              Acme Corp — move deal to Proposal Sent
            </h4>
            <MiniRing value={96} />
          </div>
          <div className="mt-3 overflow-hidden rounded-xl border border-white/10 text-[13px]">
            <div className="grid grid-cols-[86px_1fr] border-b border-white/10">
              <span className="bg-white/[0.04] px-3 py-2 font-semibold text-d3-mute">Field</span>
              <span className="px-3 py-2 font-semibold text-d3-ivory">Deal stage</span>
            </div>
            <div className="grid grid-cols-[86px_1fr] border-b border-white/10">
              <span className="bg-white/[0.04] px-3 py-2 font-semibold text-d3-mute">Current</span>
              <span className="px-3 py-2 text-d3-ivory2 line-through decoration-d3-pink/60">Negotiation</span>
            </div>
            <div className="grid grid-cols-[86px_1fr]">
              <span className="bg-white/[0.04] px-3 py-2 font-semibold text-d3-mute">Proposed</span>
              <span className="px-3 py-2 font-bold text-d3-pink-bright">Proposal Sent</span>
            </div>
          </div>
          <div className="mt-4 flex gap-2.5">
            <span className="inline-flex min-h-[38px] items-center rounded-[10px] bg-d3-pink px-4 text-[13.5px] font-semibold text-white">
              Approve
            </span>
            <span className="inline-flex min-h-[38px] items-center rounded-[10px] border border-white/15 px-4 text-[13.5px] font-semibold text-d3-ivory2">
              Edit first
            </span>
            <span className="inline-flex min-h-[38px] items-center rounded-[10px] border border-white/15 px-4 text-[13.5px] font-semibold text-d3-ivory2">
              Reject
            </span>
          </div>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <p className="text-[11px] font-bold tracking-[0.1em] text-d3-mute uppercase">Source evidence</p>
          <p className="mt-2 text-[13px] font-semibold text-d3-ivory">
            Sarah Lee <span className="font-normal text-d3-ivory2">· Acme Corp · Tue 9:41 AM · Gmail</span>
          </p>
          <p className="mt-2 text-[13.5px] leading-relaxed text-d3-ivory2">
            “Legal cleared the MSA this morning — please send the proposal over and we’ll sign this
            week.”
          </p>
          <p className="mt-3 font-jbmono text-[11px] text-d3-mute">ALSO LOGGED: CALENDAR · CALL NOTES</p>
        </div>
      </div>
    </FrameShell3d>
  );
}

/* ---------- AI Assistant ---------- */

export function AssistantFrame3d() {
  return (
    <FrameShell3d
      title="AI Assistant"
      right={
        <span className="rounded-full bg-white/[0.06] px-2.5 py-1 font-jbmono text-[11px] font-semibold text-d3-ivory2">
          30 MESSAGES/DAY · PER USER
        </span>
      }
    >
      <div className="flex flex-col gap-3.5">
        <div className="ml-auto max-w-[78%] rounded-2xl rounded-br-md bg-d3-pink px-4 py-2.5 text-[13.5px] font-medium text-white">
          Which deals are stalled?
        </div>
        <div className="max-w-[92%] rounded-2xl rounded-bl-md border border-white/10 bg-white/[0.03] px-4 py-3">
          <p className="text-[13.5px] font-medium text-d3-ivory">
            3 of your deals have had no movement in 14+ days:
          </p>
          <div className="mt-2 overflow-hidden rounded-lg border border-white/10 bg-d3-bg/60 font-jbmono text-[12px]">
            {[
              ["Vertex Co", "$18,750", "21 days"],
              ["Kite & Co", "$9,300", "17 days"],
              ["Marlin Inc", "$15,200", "14 days"],
            ].map((r) => (
              <div key={r[0]} className="grid grid-cols-3 border-b border-white/[0.07] px-3 py-1.5 last:border-0">
                <span className="font-semibold text-d3-ivory">{r[0]}</span>
                <span className="text-d3-ivory2">{r[1]}</span>
                <span className="text-right text-d3-pink-bright">{r[2]}</span>
              </div>
            ))}
          </div>
          <p className="mt-2 text-[13px] text-d3-ivory2">Want a follow-up drafted for Vertex Co?</p>
        </div>
        <div className="max-w-[92%] rounded-2xl rounded-bl-md border-2 border-dashed border-d3-pink/40 bg-d3-pink/[0.06] px-4 py-3">
          <p className="text-[11px] font-bold tracking-[0.1em] text-d3-pink-bright uppercase">
            Proposal — not applied
          </p>
          <p className="mt-1 text-[13.5px] font-semibold text-d3-ivory">
            Follow-up email to Vertex Co — draft ready
          </p>
          <div className="mt-2.5 flex gap-2">
            <span className="inline-flex min-h-[34px] items-center rounded-lg bg-d3-pink px-3.5 text-[12.5px] font-semibold text-white">
              Approve
            </span>
            <span className="inline-flex min-h-[34px] items-center rounded-lg border border-white/15 px-3.5 text-[12.5px] font-semibold text-d3-ivory2">
              Dismiss
            </span>
          </div>
        </div>
      </div>
    </FrameShell3d>
  );
}
