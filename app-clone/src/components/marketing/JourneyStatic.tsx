/* Static 4-panel version of "One proposal's journey" — shown for
   prefers-reduced-motion, no-WebGL, and while the live scene loads. */

const CAPTIONS = [
  "1 · It starts as an email.",
  "2 · Vouchso drafts the change — with evidence.",
  "3 · A person approves.",
  "4 · Your CRM updates. Logged, and reversible.",
];

export default function JourneyStatic() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <div className="rounded-2xl border border-white/12 bg-white/[0.06] p-5">
        <div className="rounded-xl bg-white p-4 text-mkt-ink">
          <p className="text-[12px] font-bold text-mkt-body">Gmail · Sarah Lee, Acme Corp</p>
          <p className="mt-1.5 text-[13.5px] leading-relaxed font-medium">
            “We’ll sign once legal clears the MSA — send the proposal over.”
          </p>
        </div>
        <p className="mt-4 text-[14px] font-semibold text-white/85">{CAPTIONS[0]}</p>
      </div>

      <div className="rounded-2xl border border-white/12 bg-white/[0.06] p-5">
        <div className="rounded-xl bg-white p-4 text-mkt-ink">
          <div className="flex items-start justify-between gap-3">
            <p className="text-[13.5px] leading-snug font-bold">Acme Corp — move deal to Proposal Sent</p>
            <span className="rounded-md bg-mkt-violet px-2 py-1 font-jbmono text-[11.5px] font-semibold text-white">96%</span>
          </div>
          <p className="mt-2 font-jbmono text-[11.5px] text-mkt-body">STAGE: NEGOTIATION → PROPOSAL SENT</p>
          <p className="mt-1 font-jbmono text-[11.5px] text-mkt-body">EVIDENCE ATTACHED ✓</p>
        </div>
        <p className="mt-4 text-[14px] font-semibold text-white/85">{CAPTIONS[1]}</p>
      </div>

      <div className="rounded-2xl border border-white/12 bg-white/[0.06] p-5">
        <div className="relative rounded-xl bg-white p-4 text-mkt-ink">
          <span className="inline-flex min-h-[38px] items-center rounded-[10px] bg-mkt-violet px-5 text-[13.5px] font-semibold text-white">
            Approve
          </span>
          <span className="absolute right-4 bottom-3 inline-flex -rotate-9 items-center gap-1 rounded-md border-2 border-mkt-green bg-white/85 px-2.5 py-1 text-[12.5px] font-extrabold tracking-wide text-mkt-green uppercase">
            ✓ Applied
          </span>
          <p className="mt-3 text-[12.5px] text-mkt-body">The longest beat — because it’s the human one.</p>
        </div>
        <p className="mt-4 text-[14px] font-semibold text-white/85">{CAPTIONS[2]}</p>
      </div>

      <div className="rounded-2xl border border-white/12 bg-white/[0.06] p-5">
        <div className="rounded-xl bg-white p-4 text-mkt-ink">
          <p className="flex items-center gap-2 text-[12.5px] font-bold">
            <span className="h-2.5 w-2.5 rounded-full bg-[#FF7A59]" /> HubSpot — Deal stage
            <span className="ml-auto font-jbmono text-[11.5px] font-semibold text-mkt-violet">Proposal Sent</span>
          </p>
          <p className="mt-2.5 flex items-center gap-2 text-[12.5px] font-bold">
            <span className="h-2.5 w-2.5 rounded-full bg-[#00A1E0]" /> Salesforce — Stage
            <span className="ml-auto font-jbmono text-[11.5px] font-semibold text-mkt-violet">Proposal Sent</span>
          </p>
          <p className="mt-3 border-t border-mkt-border pt-2.5 font-jbmono text-[11px] text-mkt-body">
            APPLIED · BATCH #1042 · REVERSIBLE FOR 7 DAYS
          </p>
        </div>
        <p className="mt-4 text-[14px] font-semibold text-white/85">{CAPTIONS[3]}</p>
      </div>
    </div>
  );
}
