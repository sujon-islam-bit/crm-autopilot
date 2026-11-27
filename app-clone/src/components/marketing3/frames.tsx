/* Static product-UI frames for the feature sections — real HTML in the app's
   own UI language, inside a HubSpot-style product screenshot panel. */

export function FrameShell({ url, children, label }: { url: string; children: React.ReactNode; label: string }) {
  return (
    <div role="img" aria-label={label} className="hs-frame-shadow overflow-hidden rounded-[20px] border border-hs-line bg-white text-left">
      <div className="flex items-center gap-3 border-b border-hs-line bg-hs-mist px-5 py-3">
        <span className="flex gap-1.5" aria-hidden="true">
          <span className="h-2.5 w-2.5 rounded-full bg-[#d8d3c8]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#d8d3c8]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#d8d3c8]" />
        </span>
        <span className="mx-auto rounded-md bg-white px-3 py-1 font-jbmono text-[11.5px] text-hs-mute ring-1 ring-hs-line">{url}</span>
        <span className="w-10" aria-hidden="true" />
      </div>
      <div className="p-5 sm:p-6">{children}</div>
    </div>
  );
}

function ConfChip({ v }: { v: number }) {
  return (
    <span className="inline-flex items-center rounded-md bg-hs-mist px-2 py-0.5 font-jbmono text-[12px] font-semibold text-hs-ink">
      {v}%
    </span>
  );
}

export function QueueFrame() {
  return (
    <FrameShell url="app.vouchso.com/approvals" label="The Review Queue: a proposal with its source evidence panel open, showing the email beside the field diff.">
      <div className="flex flex-wrap gap-2">
        {["Deal Updates", "New Contacts", "Enrichment", "Follow-ups", "Field Fixes"].map((t, i) => (
          <span
            key={t}
            className={`rounded-full px-3 py-1.5 font-jakarta text-[12.5px] font-semibold ${
              i === 0 ? "bg-hs-ink text-white" : "bg-hs-mist text-hs-body"
            }`}
          >
            {t}
          </span>
        ))}
      </div>
      <div className="mt-4 rounded-2xl border border-hs-line p-4 hs-card-shadow">
        <div className="flex items-start gap-3">
          <p className="flex-1 font-jakarta text-[15px] leading-snug font-bold text-hs-ink">
            Acme Corp — move deal to Proposal Sent
          </p>
          <ConfChip v={96} />
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl bg-hs-mist p-3.5">
            <p className="font-jbmono text-[10.5px] font-semibold tracking-wider text-hs-mute uppercase">Source · Email, Tue 9:41 AM</p>
            <p className="mt-1.5 text-[13px] leading-relaxed text-hs-body">
              “We’ll sign once legal clears the MSA — sending the proposal over today works for us.”
              <span className="mt-1 block font-medium text-hs-ink">— Sarah Lee, VP Operations</span>
            </p>
          </div>
          <div className="rounded-xl border border-hs-line p-3.5">
            <p className="font-jbmono text-[10.5px] font-semibold tracking-wider text-hs-mute uppercase">Field diff</p>
            <div className="mt-2 space-y-1.5 font-jbmono text-[12px]">
              <p className="flex justify-between gap-2"><span className="text-hs-mute">Stage (now)</span><span className="font-semibold text-hs-ink">Negotiation</span></p>
              <p className="flex justify-between gap-2"><span className="text-hs-mute">Stage (proposed)</span><span className="font-semibold text-hs-brand-dark">Proposal Sent</span></p>
              <p className="flex justify-between gap-2"><span className="text-hs-mute">Next step</span><span className="font-semibold text-hs-ink">MSA with legal</span></p>
            </div>
          </div>
        </div>
        <div className="mt-3.5 flex gap-2.5">
          <span className="rounded-lg bg-hs-brand px-4 py-2 font-jakarta text-[13.5px] font-bold text-white">Approve</span>
          <span className="rounded-lg border border-hs-line px-4 py-2 font-jakarta text-[13.5px] font-semibold text-hs-body">Edit first</span>
          <span className="rounded-lg px-3 py-2 font-jakarta text-[13.5px] font-semibold text-hs-mute">Reject</span>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-3 rounded-xl bg-hs-mist px-4 py-3">
        <span className="flex-1 truncate text-[13px] font-medium text-hs-body">NovaTech — enrich company record</span>
        <ConfChip v={91} />
      </div>
    </FrameShell>
  );
}

export function PipelineFrame() {
  const cols: { name: string; tone: string; chips: { t: string; v: string }[] }[] = [
    { name: "Progressed", tone: "text-hs-green", chips: [{ t: "Acme Corp", v: "$48,000" }, { t: "Globex", v: "$21,500" }] },
    { name: "New", tone: "text-hs-ink", chips: [{ t: "Umbrella Co", v: "$12,000" }] },
    { name: "Stalled", tone: "text-[#b97f10]", chips: [{ t: "Initech", v: "$34,200" }, { t: "Hooli", v: "$9,800" }] },
    { name: "Won · Lost", tone: "text-hs-brand-dark", chips: [{ t: "Stark Ltd ✓", v: "$56,000" }] },
  ];
  return (
    <FrameShell url="app.vouchso.com/pipeline" label="Pipeline Compare: deals grouped by how they moved this week — progressed, new, stalled, won and lost.">
      <div className="flex items-center justify-between">
        <p className="font-jakarta text-[15px] font-bold text-hs-ink">This week vs last week</p>
        <span className="font-jbmono text-[11.5px] text-hs-mute">OPEN PIPELINE $1,240,000</span>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cols.map((c) => (
          <div key={c.name} className="rounded-xl bg-hs-mist p-3">
            <p className={`font-jakarta text-[12.5px] font-bold ${c.tone}`}>{c.name}</p>
            <div className="mt-2.5 space-y-2">
              {c.chips.map((chip) => (
                <div key={chip.t} className="rounded-lg bg-white px-2.5 py-2 ring-1 ring-hs-line">
                  <p className="truncate text-[12.5px] font-semibold text-hs-ink">{chip.t}</p>
                  <p className="font-jbmono text-[11px] text-hs-mute">{chip.v}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <p className="mt-4 text-[12.5px] text-hs-mute">Movement is computed from changes your team approved — no board to maintain.</p>
    </FrameShell>
  );
}

export function CleanupFrame() {
  const R = 52;
  const C = 2 * Math.PI * R;
  const issues = [
    { name: "Duplicates", n: 19 },
    { name: "Missing fields", n: 24 },
    { name: "Unlogged activity", n: 31 },
  ];
  return (
    <FrameShell url="app.vouchso.com/data-cleanup" label="Data Cleanup: a health score of 98 with duplicate, missing-field and unlogged-activity issues, each with a propose-fix action.">
      <div className="flex flex-wrap items-center gap-6">
        <div className="relative h-[128px] w-[128px] shrink-0">
          <svg viewBox="0 0 128 128" className="h-full w-full -rotate-90">
            <circle cx="64" cy="64" r={R} fill="none" stroke="#eee9df" strokeWidth="11" />
            <circle
              cx="64" cy="64" r={R} fill="none" stroke="var(--color-hs-brand)" strokeWidth="11" strokeLinecap="round"
              strokeDasharray={C} strokeDashoffset={C * (1 - 0.98)}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-hsserif text-[34px] leading-none font-light text-hs-ink">98</span>
            <span className="mt-1 text-[10px] font-bold tracking-wider text-hs-mute uppercase">Health score</span>
          </div>
        </div>
        <div className="min-w-[220px] flex-1 space-y-2.5">
          {issues.map((i) => (
            <div key={i.name} className="flex items-center gap-3 rounded-xl border border-hs-line px-3.5 py-2.5">
              <span className="flex-1 text-[13.5px] font-medium text-hs-body">{i.name}</span>
              <span className="font-jbmono text-[13px] font-semibold text-hs-ink">{i.n}</span>
              <span className="rounded-md bg-hs-tint px-2 py-1 font-jakarta text-[11.5px] font-bold text-hs-brand-dark">Propose fix</span>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {["Guardrail: no invalid stage jumps", "Guardrail: next step required", "Guardrail: duplicate emails blocked"].map((g) => (
          <span key={g} className="rounded-full bg-hs-mist px-3 py-1.5 text-[12px] font-semibold text-hs-body">✓ {g}</span>
        ))}
      </div>
    </FrameShell>
  );
}

export function HistoryFrame() {
  const rows = [
    { id: "BATCH #1042", what: "6 changes · Acme stage, 2 contacts, 3 enrichments", who: "Approved by Md Yasses", st: "Synced" },
    { id: "BATCH #1041", what: "3 changes · next steps set from calendar", who: "Approved by Sarah (Manager)", st: "Synced" },
    { id: "BATCH #1039", what: "11 changes · duplicate merge", who: "Approved by Md Yasses", st: "Rolled back" },
  ];
  return (
    <FrameShell url="app.vouchso.com/history" label="History: applied batches with who approved them, and a three-step rollback — preview, confirm, verify.">
      <div className="space-y-2.5 font-jbmono">
        {rows.map((r) => (
          <div key={r.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-hs-line px-4 py-3">
            <span className="text-[12px] font-semibold text-hs-brand-dark">{r.id}</span>
            <span className="flex-1 text-[12.5px] text-hs-body" style={{ fontFamily: "var(--font-sans)" }}>{r.what}</span>
            <span className="hidden text-[11.5px] text-hs-mute lg:block">{r.who}</span>
            <span className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${r.st === "Synced" ? "bg-[#e2f6e9] text-[#157347]" : "bg-hs-tint text-hs-brand-dark"}`}>
              {r.st}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2 text-[12.5px] font-semibold text-hs-body">
        <span className="font-jakarta">Rollback:</span>
        {["1 · Preview what reverts", "2 · Confirm", "3 · Verify the CRM matches"].map((s) => (
          <span key={s} className="rounded-full bg-hs-mist px-3 py-1.5">{s}</span>
        ))}
        <span className="ml-auto font-jbmono text-[11.5px] text-hs-mute">7-DAY WINDOW</span>
      </div>
    </FrameShell>
  );
}

export function AssistantFrame() {
  return (
    <FrameShell url="app.vouchso.com/assistant" label="The AI Assistant answering which deals are stalled, from workspace data, and drafting a follow-up as a proposal.">
      <div className="flex items-center justify-between">
        <p className="font-jakarta text-[15px] font-bold text-hs-ink">AI Assistant</p>
        <span className="rounded-md bg-hs-mist px-2 py-1 font-jbmono text-[11px] font-semibold text-hs-mute">30 MSGS / DAY · PER USER</span>
      </div>
      <div className="mt-4 space-y-3">
        <div className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-md bg-hs-ink px-4 py-2.5 text-[13.5px] text-white">
          Which deals are stalled right now?
        </div>
        <div className="w-fit max-w-[92%] rounded-2xl rounded-bl-md bg-hs-mist px-4 py-3 text-[13.5px] leading-relaxed text-hs-body">
          <span className="font-semibold text-hs-ink">3 deals have had no activity in 10+ days:</span> Initech
          ($34,200, Discovery), Hooli ($9,800, Negotiation) and Globex ($21,500, Proposal Sent). Want me to
          draft follow-ups? They will arrive as proposals — nothing sends without your approval.
        </div>
        <div className="rounded-2xl border border-hs-brand/40 bg-hs-tint/50 p-3.5">
          <p className="font-jakarta text-[13px] font-bold text-hs-ink">Proposal · Follow-up draft for Initech</p>
          <p className="mt-1 text-[12.5px] text-hs-body">“Checking in on the security review — happy to send the one-pager your team asked for.”</p>
          <div className="mt-2.5 flex gap-2">
            <span className="rounded-md bg-hs-brand px-3 py-1.5 font-jakarta text-[12px] font-bold text-white">Approve</span>
            <span className="rounded-md border border-hs-line bg-white px-3 py-1.5 font-jakarta text-[12px] font-semibold text-hs-body">Dismiss</span>
          </div>
        </div>
      </div>
    </FrameShell>
  );
}
