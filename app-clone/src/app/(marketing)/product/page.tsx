import type { Metadata } from "next";
import Link from "next/link";
import { CapsLabel, Check, CtaBand, Eyebrow } from "../../../components/marketing3/chrome";
import { AssistantFrame, CleanupFrame, HistoryFrame, PipelineFrame, QueueFrame } from "../../../components/marketing3/frames";

export const metadata: Metadata = {
  title: "Product — Vouchso",
  description:
    "The full Vouchso product: Review Queue, Pipeline Compare, Data Cleanup, History & Rollback, the AI Assistant, and connections for HubSpot and Salesforce — every change approved by a person first.",
  openGraph: {
    title: "Product — Vouchso",
    description: "One queue for every CRM change. The AI drafts with evidence; your team approves; the CRM stays true.",
    type: "website",
  },
  other: { "page-type": "software", "site-kind": "software" },
};

const SERIF_H2 = "font-hsserif text-[32px] leading-[1.15] font-light tracking-[-0.01em] text-hs-ink md:text-[38px]";

function Section({
  id, eyebrow, title, body, bullets, flip, mist, children,
}: {
  id: string; eyebrow: string; title: string; body: string; bullets: string[];
  flip?: boolean; mist?: boolean; children: React.ReactNode;
}) {
  return (
    <section id={id} className={`scroll-mt-28 ${mist ? "bg-hs-mist" : "bg-white"}`}>
      <div className="wrap grid items-center gap-12 py-20 md:py-[100px] lg:grid-cols-2">
        <div className={flip ? "order-2 lg:order-1" : ""} data-reveal>{children}</div>
        <div className={flip ? "order-1 lg:order-2" : ""} data-reveal>
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
        </div>
      </div>
    </section>
  );
}

const HOW_STEPS = [
  { n: "1", name: "Reads", body: "Gmail, Calendar and calls land as captures — only from the sources you connect, with reads on and writes off by default." },
  { n: "2", name: "Proposes", body: "Every change is drafted with a confidence score and the exact source it came from, sorted into five tabs in one queue." },
  { n: "3", name: "You approve", body: "Approve it, edit it first, or reject it. Bulk-approve the obvious ones. This step is always a person." },
  { n: "4", name: "Applied + logged", body: "The change is written to HubSpot or Salesforce as a stamped batch — reversible for 7 days from History." },
];

const CONNECTIONS = [
  { name: "HubSpot", status: "CRM — read & propose" },
  { name: "Salesforce", status: "CRM — read & propose" },
  { name: "Gmail", status: "Reads" },
  { name: "Google Calendar", status: "Reads" },
  { name: "Outlook", status: "Reads" },
  { name: "Slack", status: "Notifications" },
  { name: "Zoom", status: "Call transcripts" },
  { name: "SignuDoc", status: "Signed → deal-won proposal" },
];

export default function ProductPage() {
  return (
    <>
      {/* Hero */}
      <section className="bg-white">
        <div className="wrap pt-14 pb-16 text-center md:pt-20 md:pb-20" data-reveal>
          <CapsLabel className="text-hs-ink">The product</CapsLabel>
          <h1 className="mx-auto mt-6 max-w-[880px] font-hsserif text-[40px] leading-[1.14] font-light tracking-[-0.01em] text-hs-ink md:text-[56px]">
            One queue for every CRM change your team will ever make<span className="text-hs-brand">.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-[640px] text-[17px] leading-relaxed text-hs-body">
            Five screens, one rule: the AI drafts, a person decides. Here is each part of Vouchso,
            in the order your team meets it.
          </p>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-4">
            <Link href="/sign-in" className="btn btn-primary">Start free</Link>
            <Link href="/pricing" className="btn btn-outline">See pricing</Link>
          </div>
        </div>
      </section>

      <Section
        id="approvals"
        eyebrow="Review Queue"
        title="The AI drafts. You decide."
        body="Every proposal shows what changes, the confidence score, and the exact email, meeting or call it came from. Approve it, edit it first, or reject it. Bulk-approve the obvious ones — the queue is built to clear in minutes, not to become another inbox."
        bullets={[
          "Field diff, confidence score and source evidence on every proposal",
          "Edit the value before you approve — the applied value is the one a person settled on",
          "Five tabs: deal updates, new contacts, enrichment, follow-ups, field fixes",
          "Undo right after approving returns a proposal to pending",
        ]}
      >
        <QueueFrame />
      </Section>

      <Section
        id="pipeline"
        eyebrow="Pipeline Compare"
        title="See what actually moved this week."
        body="Progressed, new, stalled, slipped, won and lost — compared against last week, per rep and per deal value. The movement is computed from the changes your team approved, so there is no second board to keep up by hand."
        flip mist
        bullets={[
          "Movement analytics instead of another board to maintain",
          "Stalled deals surface themselves, with the deal value attached",
          "Won/lost and win-rate computed from the same approved changes",
          "Export the week as CSV for your pipeline review",
        ]}
      >
        <PipelineFrame />
      </Section>

      <Section
        id="cleanup"
        eyebrow="Data Cleanup"
        title="A health score your reps don't maintain by hand."
        body="Duplicates, missing fields and unlogged activity, found continuously and fixed the same way everything is fixed in Vouchso: as proposals with evidence. Guardrails then stop the same mess coming back."
        bullets={[
          "One health score for the whole CRM, trending over time",
          "Compare duplicates side by side before a merge is proposed",
          "Missing-field fixes are proposed only where the value actually exists",
          "Guardrails you control: stage rules, required next steps, duplicate checks",
        ]}
      >
        <CleanupFrame />
      </Section>

      <Section
        id="history"
        eyebrow="History & Rollback"
        title="Every change has an undo."
        body="Approvals land in batches, each one stamped with who approved it and when, and what it synced to. Any batch from the last 7 days rolls back in three steps — preview, confirm, verify."
        flip mist
        bullets={[
          "Batch-level audit trail across every connected app",
          "Rollback restores the exact previous values, then verifies them",
          "Rolled-back batches stay visible, marked as rolled back",
          "API and sync usage visible in the same place",
        ]}
      >
        <HistoryFrame />
      </Section>

      <Section
        id="assistant"
        eyebrow="AI Assistant"
        title="Ask your CRM anything."
        body="Stalled deals, today's briefs, a follow-up draft — answered from your workspace data only, never the open web and never another workspace. Anything the assistant wants to change comes back to you as a proposal."
        bullets={[
          "Answers cite the deals, contacts and activity they came from",
          "Drafts follow-ups in your pipeline's context, ready to approve",
          "Writes are proposals too — the assistant cannot change anything directly",
          "A fair daily limit per user keeps the queue human-sized",
        ]}
      >
        <AssistantFrame />
      </Section>

      {/* How it works */}
      <section id="how" className="scroll-mt-28 bg-hs-tint">
        <div className="wrap py-20 md:py-[100px]">
          <div className="max-w-[720px]" data-reveal>
            <Eyebrow>How it works</Eyebrow>
            <h2 className={`mt-6 ${SERIF_H2}`}>From inbox to updated CRM in four steps — one of them is yours.</h2>
          </div>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 xl:grid-cols-4" data-reveal>
            {HOW_STEPS.map((s) => (
              <article key={s.n} className="hs-card-shadow rounded-2xl border border-hs-line bg-white p-7">
                <p className="font-hsserif text-[30px] leading-none font-light text-hs-brand">{s.n}</p>
                <h3 className="mt-3 font-jakarta text-[18px] font-bold text-hs-ink">{s.name}</h3>
                <p className="mt-2.5 text-[14.5px] leading-relaxed text-hs-body">{s.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Connections */}
      <section id="connections" className="scroll-mt-28 bg-white">
        <div className="wrap py-20 md:py-[100px]">
          <div className="grid gap-8 md:grid-cols-2" data-reveal>
            <div>
              <CapsLabel className="text-hs-brand">Connections</CapsLabel>
              <h2 className={`mt-4 ${SERIF_H2}`}>Reads on. Writes off. Per app, your call.</h2>
            </div>
            <p className="max-w-[520px] text-[16.5px] leading-relaxed text-hs-body md:justify-self-end">
              Every app connects read-only first. Owners and Admins decide, per app, if and when
              Vouchso may write back — and even then, only what a person approved. Disconnecting
              stops everything immediately.
            </p>
          </div>
          <div id="crm" className="mt-12 grid grid-cols-2 gap-3.5 scroll-mt-28 sm:grid-cols-3 lg:grid-cols-4" data-reveal>
            {CONNECTIONS.map((t) => (
              <div key={t.name} className="hs-card-shadow rounded-2xl border border-hs-line bg-white px-5 py-5">
                <span className="mb-3 block h-2.5 w-2.5 rounded-full bg-hs-brand" aria-hidden="true" />
                <p className="font-jakarta text-[16px] font-bold text-hs-ink">{t.name}</p>
                <p className="mt-0.5 text-[12.5px] text-hs-mute">{t.status}</p>
              </div>
            ))}
          </div>
          <p className="mt-6 font-jbmono text-[11.5px] font-medium tracking-wide text-hs-mute" data-reveal>
            DEFAULT PERMISSIONS: READS ON · WRITES OFF — ON EVERY PLAN.
          </p>
        </div>
      </section>

      <CtaBand />
    </>
  );
}
