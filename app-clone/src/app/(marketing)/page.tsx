import type { Metadata } from "next";
import Link from "next/link";
import HeroDemo from "../../components/marketing3/HeroDemo";
import Faq from "../../components/marketing3/Faq";
import { CapsLabel, Check, CtaBand, Eyebrow } from "../../components/marketing3/chrome";
import { AssistantFrame, CleanupFrame, HistoryFrame, PipelineFrame, QueueFrame } from "../../components/marketing3/frames";

export const metadata: Metadata = {
  title: "Vouchso — Your CRM, updated. Nothing applied without your yes.",
  description:
    "Vouchso reads your team's email, calendar and calls, then drafts every CRM update with a confidence score and the source it came from. A person approves, edits or rejects each one — nothing is written to HubSpot or Salesforce until someone says yes.",
  openGraph: {
    title: "Vouchso — Your CRM, updated. Nothing applied without your yes.",
    description: "The AI drafts. You decide. Proposals with evidence for HubSpot and Salesforce — approved by a person before anything applies.",
    type: "website",
  },
  other: { "page-type": "software", "site-kind": "software" },
};

const SERIF_H2 = "font-hsserif text-[34px] leading-[1.14] font-light tracking-[-0.01em] text-hs-ink md:text-[40px]";

/* ---------- small building blocks ---------- */

function FeatureText({
  eyebrow, title, body, bullets, href,
}: { eyebrow: string; title: string; body: string; bullets: string[]; href: string }) {
  return (
    <div data-reveal>
      <CapsLabel className="text-hs-brand">{eyebrow}</CapsLabel>
      <h2 className={`mt-4 ${SERIF_H2}`}>{title}</h2>
      <p className="mt-5 max-w-[520px] text-[16.5px] leading-relaxed text-hs-body">{body}</p>
      <ul className="mt-6 space-y-3">
        {bullets.map((b) => (
          <li key={b} className="flex items-start gap-2.5 text-[15px] leading-relaxed font-medium text-hs-body">
            <Check /> {b}
          </li>
        ))}
      </ul>
      <Link href={href} className="link-u mt-7 inline-block text-[15.5px]">See it in detail →</Link>
    </div>
  );
}

const VALUE_CARDS = [
  {
    caption: "Every update drafted — with the evidence attached.",
    vignette: (
      <div className="rounded-xl bg-white/10 p-3.5 ring-1 ring-white/15">
        <p className="truncate text-[13px] font-semibold text-white">Acme Corp · Stage → Proposal Sent</p>
        <p className="mt-1.5 font-jbmono text-[11.5px] text-white/70">Source: email from Sarah Lee · 96% confident</p>
      </div>
    ),
  },
  {
    caption: "Nothing applies until a person says yes.",
    vignette: (
      <div className="flex items-center gap-2.5">
        <span className="rounded-lg bg-hs-brand px-4 py-2 font-jakarta text-[13.5px] font-bold text-white">Approve</span>
        <span className="inline-flex rotate-[-8deg] items-center rounded-md border-2 border-[#2fbf71] px-2.5 py-1 font-jakarta text-[12px] font-extrabold tracking-wide text-[#2fbf71] uppercase">
          ✓ Applied
        </span>
      </div>
    ),
  },
  {
    caption: "Every change logged — and reversible for 7 days.",
    vignette: (
      <div className="rounded-xl bg-white/10 p-3.5 font-jbmono ring-1 ring-white/15">
        <p className="text-[12px] text-white/85">BATCH #1042 · 6 CHANGES · SYNCED</p>
        <p className="mt-1.5 text-[11.5px] text-white/60">Revert batch — available for 7 days</p>
      </div>
    ),
  },
];

const STEPS = [
  { n: "1", name: "Reads", bullets: ["Gmail, Calendar and calls land as captures", "Only from the sources you connect"], icon: "M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5v-15z M4 20.5A2.5 2.5 0 0 1 6.5 18H20" },
  { n: "2", name: "Proposes", bullets: ["Every change drafted with a confidence score", "The source evidence attached to each one"], icon: "M12 20h9 M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" },
  { n: "3", name: "You approve", bullets: ["Approve it, edit it first, or reject it", "Bulk-approve the obvious ones"], icon: "M4 12.5 9.5 18 20 6.5" },
  { n: "4", name: "Applied + logged", bullets: ["Written to HubSpot or Salesforce", "Reversible for 7 days from History"], icon: "M3 12a9 9 0 1 0 3-6.7 M3 4v5h5" },
];

const HOME_FAQ = [
  { q: "What does Vouchso change without asking?", a: "Nothing. Reads are on by default; writes are off until you enable them per app, and even then every change is a proposal a person approves first." },
  { q: "Which CRMs does it work with?", a: "HubSpot and Salesforce, from the same queue." },
  { q: "What does it read?", a: "Gmail or Outlook, Google Calendar, and call notes or transcripts you connect (Zoom). It drafts only from evidence it can show you." },
  { q: "Can I undo a change?", a: "Yes. Every applied batch can be rolled back for 7 days, in three steps: preview, confirm, verify." },
  { q: "Who can approve?", a: "Your workspace has five roles — Owner, Admin, Manager, Sales Rep, Viewer. Owners and Admins control connections and billing; Reps see and approve only their own deals; Viewers are read-only." },
];

const INTEGRATIONS = [
  { name: "HubSpot", status: "CRM — read & propose" },
  { name: "Salesforce", status: "CRM — read & propose" },
  { name: "Gmail", status: "Reads" },
  { name: "Google Calendar", status: "Reads" },
  { name: "Outlook", status: "Reads" },
  { name: "Slack", status: "Notifications" },
  { name: "Zoom", status: "Call transcripts" },
  { name: "SignuDoc", status: "Signed → deal-won proposal" },
];

export default function HomePage() {
  return (
    <>
      {/* ============ HERO (HubSpot anatomy: centred serif hero + dual CTA + media band) ============ */}
      <section className="bg-white">
        <div className="wrap pt-14 pb-16 md:pt-20 md:pb-20">
          <div className="mx-auto max-w-[1020px] text-center" data-reveal>
            <CapsLabel className="text-hs-ink">Vouchso — the AI CRM layer for HubSpot &amp; Salesforce</CapsLabel>
            <h1 className="mt-6 font-hsserif text-[42px] leading-[1.13] font-light tracking-[-0.01em] text-hs-ink md:text-[64px] md:leading-[1.12]">
              Your CRM, updated. Nothing applied without your yes<span className="text-hs-brand">.</span>
            </h1>
            <p className="mx-auto mt-6 max-w-[680px] text-[17px] leading-relaxed text-hs-body md:text-[18px]">
              Vouchso reads your team&rsquo;s email, calendar and calls, then drafts every CRM update with a
              confidence score and the source it came from. A person approves, edits or rejects each one.
              Nothing is written to HubSpot or Salesforce until someone says yes.
            </p>
            <div className="mt-9 flex flex-wrap items-center justify-center gap-4">
              <Link href="/sign-in" className="btn btn-primary">Start free</Link>
              <a href="#demo" className="btn btn-outline">Watch it work</a>
            </div>
            <p className="mt-6 font-jbmono text-[12.5px] font-medium tracking-wide text-hs-mute">
              0 CHANGES APPLIED WITHOUT A HUMAN APPROVAL. EVER.
            </p>
          </div>

          <div id="demo" className="mx-auto mt-14 max-w-[1060px] scroll-mt-32" data-reveal>
            <HeroDemo />
          </div>

          {/* Value cards — the reference's 3 photo cards, as product-truth panels */}
          <div className="mt-6 grid gap-6 md:grid-cols-3" data-reveal>
            {VALUE_CARDS.map((c) => (
              <div key={c.caption} className="flex min-h-[240px] flex-col justify-between rounded-2xl bg-[#232329] p-6">
                <div>{c.vignette}</div>
                <p className="mt-8 font-hsserif text-[24px] leading-snug font-light text-white">{c.caption}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ WHAT IS VOUCHSO (2-col: serif H2 left, paragraph right) ============ */}
      <section className="bg-white">
        <div className="wrap grid gap-8 py-16 md:grid-cols-2 md:py-24" data-reveal>
          <h2 className={SERIF_H2}>What is Vouchso?</h2>
          <div className="max-w-[540px] text-[16.5px] leading-relaxed text-hs-body md:justify-self-end">
            <p>
              Vouchso is an AI layer that sits on the CRM you already have. It connects to HubSpot or
              Salesforce, reads the email, calendar and calls where your deals actually move, and keeps
              the CRM true — as proposals your team approves, not edits an AI makes behind your back.
            </p>
            <p className="mt-4">
              Every proposal carries a confidence score and the exact source it came from, and every
              applied change is logged and reversible for 7 days. Built for HubSpot and Salesforce
              teams of 10–100.
            </p>
          </div>
        </div>
      </section>

      {/* ============ TRUSTED-BY MARQUEE ============ */}
      <section className="border-y border-hs-line bg-white" aria-label="Works with">
        <div className="wrap flex items-center gap-8 py-8">
          <p className="max-w-[210px] shrink-0 font-jakarta text-[13.5px] leading-snug font-bold tracking-wide text-hs-ink uppercase">
            Built for teams on
          </p>
          <div className="relative flex-1 overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]">
            <div className="marquee-track items-center gap-14 pr-14">
              {[...INTEGRATIONS, ...INTEGRATIONS].map((t, i) => (
                <span key={i} className="font-jakarta text-[19px] font-bold whitespace-nowrap text-hs-mute">
                  {t.name}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ============ HOW IT WORKS (sticky left + hub-card grid) ============ */}
      <section className="bg-hs-mist">
        <div className="wrap grid gap-12 py-20 md:py-[110px] lg:grid-cols-[1fr_1.4fr]">
          <div data-reveal>
            <Eyebrow>How it works</Eyebrow>
            <h2 className={`mt-6 ${SERIF_H2}`}>From inbox to updated CRM in four steps — one of them is yours.</h2>
            <p className="mt-5 max-w-[460px] text-[16.5px] leading-relaxed text-hs-body">
              The first two steps are the AI&rsquo;s. The fourth is the CRM&rsquo;s. The third — the one
              that matters — belongs to a person on your team.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link href="/sign-in" className="btn btn-primary">Start free</Link>
              <Link href="/product" className="btn btn-outline">See the product</Link>
            </div>
          </div>
          <div className="grid gap-6 sm:grid-cols-2" data-reveal>
            {STEPS.map((s) => (
              <article key={s.n} className="hs-card-shadow flex flex-col rounded-2xl border border-hs-line bg-white p-7">
                <div className="flex items-center gap-3">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="text-hs-brand">
                    <path d={s.icon} stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <h3 className="font-jakarta text-[18px] font-bold text-hs-ink">{s.n} · {s.name}</h3>
                </div>
                <div className="mt-4 border-t border-dashed border-hs-line pt-4">
                  <ul className="space-y-2.5">
                    {s.bullets.map((b) => (
                      <li key={b} className="flex items-start gap-2.5 text-[14.5px] leading-relaxed text-hs-body">
                        <Check /> {b}
                      </li>
                    ))}
                  </ul>
                </div>
                <Link href="/product#how" className="mt-auto inline-block pt-5 font-jakarta text-[14.5px] font-semibold text-hs-ink hover:text-hs-brand">
                  Learn more →
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ============ FEATURE — APPROVALS ============ */}
      <section className="bg-white">
        <div className="wrap grid items-center gap-12 py-20 md:py-[110px] lg:grid-cols-2">
          <FeatureText
            eyebrow="Review Queue"
            title="The AI drafts. You decide."
            body="Every proposal shows what changes, the confidence score, and the exact email, meeting or call it came from. Approve it, edit it first, or reject it. Bulk-approve the obvious ones."
            bullets={[
              "Field diff, confidence score and source evidence on every proposal",
              "Edit the value before you approve — the applied value is the one a person settled on",
              "Five tabs: deal updates, new contacts, enrichment, follow-ups, field fixes",
            ]}
            href="/product#approvals"
          />
          <div data-reveal><QueueFrame /></div>
        </div>
      </section>

      {/* ============ FEATURE — PIPELINE COMPARE ============ */}
      <section className="bg-hs-mist">
        <div className="wrap grid items-center gap-12 py-20 md:py-[110px] lg:grid-cols-2">
          <div className="order-2 lg:order-1" data-reveal><PipelineFrame /></div>
          <div className="order-1 lg:order-2">
            <FeatureText
              eyebrow="Pipeline Compare"
              title="See what actually moved this week."
              body="Progressed, new, stalled, slipped, won and lost — compared against last week, per rep and per deal value. No board to maintain; the movement is computed from the changes your team approved."
              bullets={[
                "Movement, not another board to keep up by hand",
                "Stalled deals surface themselves — with the deal value attached",
                "Export the week as CSV for your pipeline review",
              ]}
              href="/product#pipeline"
            />
          </div>
        </div>
      </section>

      {/* ============ FEATURE — DATA CLEANUP ============ */}
      <section className="bg-white">
        <div className="wrap grid items-center gap-12 py-20 md:py-[110px] lg:grid-cols-2">
          <FeatureText
            eyebrow="Data Cleanup"
            title="A health score your reps don't maintain by hand."
            body="Duplicates, missing fields and unlogged activity, found continuously. Vouchso proposes the fix with its evidence; guardrails stop the same mess coming back."
            bullets={[
              "One health score for the whole CRM, trending over time",
              "Fixes arrive as proposals — compare duplicates side by side before merging",
              "Guardrails you control: stage rules, required next steps, duplicate checks",
            ]}
            href="/product#cleanup"
          />
          <div data-reveal><CleanupFrame /></div>
        </div>
      </section>

      {/* ============ FEATURE — HISTORY & ROLLBACK ============ */}
      <section className="bg-hs-mist">
        <div className="wrap grid items-center gap-12 py-20 md:py-[110px] lg:grid-cols-2">
          <div className="order-2 lg:order-1" data-reveal><HistoryFrame /></div>
          <div className="order-1 lg:order-2">
            <FeatureText
              eyebrow="History & Rollback"
              title="Every change has an undo."
              body="Approvals land in batches, each one stamped with who approved it and when. Changed your mind? Preview, confirm, verify — any batch from the last 7 days rolls back."
              bullets={[
                "Batch-level audit trail — what changed, who approved it, what it synced to",
                "Rollback restores the exact previous values, then verifies them",
                "Rolled-back batches stay visible, marked as rolled back",
              ]}
              href="/product#history"
            />
          </div>
        </div>
      </section>

      {/* ============ AI ASSISTANT BAND (tint band anatomy) ============ */}
      <section className="bg-hs-tint">
        <div className="wrap py-20 md:py-[110px]">
          <div className="flex items-center gap-5" data-reveal>
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white hs-card-shadow" aria-hidden="true">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className="text-hs-brand">
                <path d="M12 3l1.9 6.1L20 11l-6.1 1.9L12 19l-1.9-6.1L4 11l6.1-1.9L12 3z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
              </svg>
            </span>
            <span className="hidden flex-1 border-t border-dashed border-hs-brand/40 sm:block" aria-hidden="true" />
            <Link href="/product#assistant" className="btn btn-sm btn-outline !bg-transparent">Explore the Assistant</Link>
          </div>
          <div className="mt-10 grid gap-8 md:grid-cols-2" data-reveal>
            <h2 className={SERIF_H2}>Ask your CRM anything.</h2>
            <p className="max-w-[520px] text-[16.5px] leading-relaxed text-hs-body md:justify-self-end">
              Stalled deals, today&rsquo;s briefs, a follow-up draft — answered from your workspace data
              only. Anything the assistant wants to <em>change</em> comes back to you as a proposal, like
              everything else in Vouchso.
            </p>
          </div>
          <div className="mt-12" data-reveal><AssistantFrame /></div>
        </div>
      </section>

      {/* ============ PROBLEM / RESULTS BAND ============ */}
      <section className="bg-hs-mist">
        <div className="wrap py-20 md:py-[110px]">
          <div className="grid gap-8 md:grid-cols-2" data-reveal>
            <div>
              <Eyebrow>Case study: your own CRM</Eyebrow>
              <h2 className={`mt-6 ${SERIF_H2}`}>Your CRM is lying to you — politely.</h2>
            </div>
            <p className="max-w-[520px] text-[16.5px] leading-relaxed text-hs-body md:justify-self-end">
              Deals sit in the wrong stage. Next steps exist in inboxes, not in HubSpot. Everyone knows;
              nobody has the hour a day it takes to fix it by hand. Vouchso&rsquo;s counter-fact: every
              proposal carries a confidence score and the source it came from — checkable in one glance.
            </p>
          </div>

          <div className="hs-card-shadow mt-12 rounded-3xl border border-hs-line bg-white p-8 md:p-12" data-reveal>
            <div className="grid gap-10 text-center md:grid-cols-3">
              {[
                { n: "43%", c: "of CRM records go stale within a month of being touched" },
                { n: "5.3 hrs", c: "a week, per rep, lost to manual CRM updates instead of selling" },
                { n: "1 in 3", c: "deals is sitting in the wrong stage right now" },
              ].map((s) => (
                <div key={s.n}>
                  <p className="font-hsserif text-[52px] leading-none font-light text-hs-ink">{s.n}</p>
                  <p className="mx-auto mt-3 max-w-[250px] text-[14px] leading-relaxed text-hs-body">{s.c}</p>
                  <p className="mt-2 font-jbmono text-[10.5px] font-semibold tracking-wider text-hs-mute uppercase">Illustrative</p>
                </div>
              ))}
            </div>
            <div className="mt-12 border-t border-hs-line pt-10 text-center">
              <p className="mx-auto max-w-[760px] font-hsserif text-[26px] leading-snug font-light text-hs-ink md:text-[30px]">
                “The AI drafts. A person decides. The CRM stays true.”
              </p>
              <p className="mt-4 text-[14.5px] text-hs-mute">That is the whole product — and the reason teams trust it with their pipeline.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ============ INTEGRATIONS CARD ============ */}
      <section className="bg-white">
        <div className="wrap py-20 md:py-[100px]">
          <div className="hs-card-shadow grid gap-10 rounded-3xl border border-hs-line bg-white p-8 md:p-12 lg:grid-cols-[1fr_1.3fr]" data-reveal>
            <div>
              <h2 className="font-jakarta text-[26px] leading-tight font-bold text-hs-ink md:text-[28px]">
                Connects to the tools your team already uses.
              </h2>
              <Link href="/product#connections" className="link-u mt-5 inline-block text-[15.5px]">See all connections</Link>
              <p className="mt-6 font-jbmono text-[11.5px] leading-relaxed font-medium tracking-wide text-hs-mute">
                DEFAULT PERMISSIONS: READS ON · WRITES OFF — YOU TURN WRITES ON PER APP.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3">
              {INTEGRATIONS.map((t) => (
                <div key={t.name} className="rounded-2xl border border-hs-line bg-hs-paper px-4 py-4">
                  <span className="mb-2.5 block h-2.5 w-2.5 rounded-full bg-hs-brand" aria-hidden="true" />
                  <p className="font-jakarta text-[15px] font-bold text-hs-ink">{t.name}</p>
                  <p className="mt-0.5 text-[12px] text-hs-mute">{t.status}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ============ FAQ ============ */}
      <section id="faq" className="scroll-mt-28 bg-hs-paper">
        <div className="wrap py-20 md:py-[100px]">
          <h2 className="text-center font-jakarta text-[26px] font-bold text-hs-ink md:text-[30px]" data-reveal>
            Asked by every RevOps lead
          </h2>
          <div className="mx-auto mt-10 max-w-[920px]" data-reveal>
            <Faq items={HOME_FAQ} />
          </div>
        </div>
      </section>

      {/* ============ FACT STRIP (awards-strip anatomy) ============ */}
      <section className="border-t border-hs-line bg-white">
        <div className="wrap flex flex-wrap items-center justify-between gap-4 py-9" data-reveal>
          <p className="font-jakarta text-[19px] font-bold text-hs-ink">0 changes applied without a human approval</p>
          <p className="font-jbmono text-[12px] font-medium tracking-wide text-hs-mute">READS ON · WRITES OFF · BY DEFAULT, ON EVERY PLAN</p>
        </div>
      </section>

      <CtaBand />
    </>
  );
}
