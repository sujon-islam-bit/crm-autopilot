import Link from "next/link";
import { I, LogoMark } from "../components/icons";
import { ConfidencePill } from "../components/ProposalRow";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#fbfbfe]">
      <header className="mx-auto flex max-w-[1180px] items-center gap-8 px-8 py-5">
        <span className="flex items-center gap-2.5">
          <LogoMark size={30} />
          <span className="leading-tight">
            <span className="block text-[15.5px] font-bold tracking-tight">CleanPipe</span>
            <span className="block text-[10.5px] text-muted">CRM Autopilot</span>
          </span>
        </span>
        <nav className="ml-6 hidden items-center gap-7 text-[13.5px] font-medium text-ink2 md:flex">
          <a href="#how" className="text-ink2 hover:text-ink">How it works</a>
          <a href="#pricing" className="text-ink2 hover:text-ink">Pricing</a>
          <Link href="/help" className="text-ink2 hover:text-ink">Help</Link>
        </nav>
        <span className="ml-auto flex items-center gap-5">
          <Link href="/sign-in" className="text-[13.5px] font-medium text-ink2 hover:text-ink">
            Talk to Sales
          </Link>
          <Link
            href="/sign-in"
            className="rounded-full bg-ink px-5 py-2.5 text-[13.5px] font-semibold text-white transition hover:bg-black"
          >
            Get access
          </Link>
        </span>
      </header>

      <section className="relative mx-auto max-w-[1180px] px-8 pt-14 pb-20 text-center">
        <div
          className="pointer-events-none absolute inset-x-0 top-0 -z-0 h-[480px]"
          style={{
            background:
              "radial-gradient(560px 300px at 25% 20%, rgba(43,107,240,0.10), transparent 70%), radial-gradient(560px 300px at 78% 10%, rgba(139,92,246,0.10), transparent 70%)",
          }}
        />
        <h1 className="relative mx-auto max-w-[760px] text-[54px] leading-[1.06] font-extrabold tracking-tight">
          Your CRM, updated by AI.
          <br />
          Approved by you.
        </h1>
        <p className="relative mx-auto mt-5 max-w-[560px] text-[16.5px] leading-relaxed text-muted">
          CleanPipe reads your email, calendar and calls, keeps HubSpot or Salesforce up to date, and waits for your
          approval before anything changes.
        </p>
        <div className="relative mt-7">
          <Link
            href="/sign-in"
            className="inline-block rounded-full bg-ink px-7 py-3 text-[14.5px] font-semibold text-white transition hover:bg-black"
          >
            Get access
          </Link>
        </div>

        {/* Floating product cards */}
        <div className="relative mx-auto mt-14 grid max-w-[880px] grid-cols-2 gap-5 text-left">
          <div className="card rotate-[-1.2deg] p-4">
            <div className="flex items-center gap-2 text-[12px] font-bold tracking-wide text-muted uppercase">
              <I n="sparkle" size={13} className="text-purple" fill /> Autopilot Review Queue
            </div>
            <div className="mt-3 flex items-center gap-3">
              <ConfidencePill value={96} />
              <div className="min-w-0">
                <div className="truncate text-[13.5px] font-semibold">Update Deal Stage: Acme Corp</div>
                <div className="truncate text-[11.5px] text-muted">Src: Zoom • “Send MSA today”</div>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-3">
              <ConfidencePill value={88} />
              <div className="min-w-0">
                <div className="truncate text-[13.5px] font-semibold">Add Contact: Sara Lee (VP Ops)</div>
                <div className="truncate text-[11.5px] text-muted">Src: Gmail thread • Enriched</div>
              </div>
            </div>
          </div>
          <div className="card rotate-[1.2deg] p-4">
            <div className="flex items-center gap-2 text-[12px] font-bold tracking-wide text-muted uppercase">
              <I n="shield" size={13} className="text-primary" /> Data Health
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-[30px] font-extrabold">94</span>
              <span className="text-[13px] text-muted">/ 100 — healthy</span>
            </div>
            <div className="mt-2 flex flex-col gap-1.5 text-[12.5px] text-ink2">
              <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-[#22b573]" /> Duplicates cleaned weekly</span>
              <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-[#2b6bf0]" /> Every meeting logged</span>
              <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-[#8b5cf6]" /> Stale deals flagged early</span>
            </div>
          </div>
        </div>
      </section>

      <section id="how" className="mx-auto max-w-[1180px] px-8 pb-20">
        <h2 className="text-center text-[26px] font-extrabold tracking-tight">How it works</h2>
        <div className="mt-8 grid grid-cols-3 gap-5">
          {[
            ["1", "Connect", "Link your CRM and inbox in one click each. No admin project, no API keys."],
            ["2", "Review", "The AI proposes every update with its source and a confidence score. You approve or reject."],
            ["3", "Relax", "Your CRM stays clean and current — and every change can be rolled back."],
          ].map(([n, t, b]) => (
            <div key={n} className="card p-6 text-left">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-tint text-[14px] font-extrabold text-primary">
                {n}
              </span>
              <h3 className="mt-3.5 text-[16px] font-bold">{t}</h3>
              <p className="mt-1.5 text-[13.5px] leading-relaxed text-muted">{b}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="pricing" className="mx-auto max-w-[1180px] px-8 pb-24">
        <h2 className="text-center text-[26px] font-extrabold tracking-tight">One flat price. No credits.</h2>
        <div className="mx-auto mt-8 grid max-w-[680px] grid-cols-2 gap-5">
          {[
            ["Starter", "$19", "per rep / month", ["HubSpot or Salesforce", "Email + calendar capture", "Approvals with undo"]],
            ["Growth", "$29", "per rep / month", ["Everything in Starter", "Call & chat notes capture", "SignuDoc deal signing"]],
          ].map(([name, price, per, feats]) => (
            <div key={name as string} className="card p-6">
              <div className="text-[13px] font-bold tracking-wide text-muted uppercase">{name}</div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-[34px] font-extrabold">{price}</span>
                <span className="text-[12.5px] text-muted">{per}</span>
              </div>
              <ul className="mt-4 flex flex-col gap-2 text-[13.5px] text-ink2">
                {(feats as string[]).map((f) => (
                  <li key={f} className="flex items-center gap-2">
                    <I n="check" size={14} className="text-green" sw={2.4} /> {f}
                  </li>
                ))}
              </ul>
              <Link href="/sign-in" className="btn-primary mt-5 block py-2.5 text-center text-[13.5px]">
                Start free
              </Link>
            </div>
          ))}
        </div>
        <p className="mt-10 text-center text-[12px] text-faint">CleanPipe — CRM Autopilot. Built for 10–100-person B2B teams.</p>
      </section>
    </div>
  );
}
