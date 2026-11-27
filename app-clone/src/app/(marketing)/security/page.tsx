import type { Metadata } from "next";
import { CapsLabel, Check, CtaBand } from "../../../components/marketing3/chrome";

export const metadata: Metadata = {
  title: "Security — Vouchso",
  description:
    "How Vouchso handles your CRM: approval before anything applies, reads on and writes off by default, a full audit history with 7-day rollback, and workspace isolation with five roles.",
  openGraph: {
    title: "Security — Vouchso",
    description: "Approval before apply. Reads on, writes off. Every change logged and reversible for 7 days.",
    type: "website",
  },
  other: { "page-type": "software", "site-kind": "software" },
};

/* Locked copy (plan §5 / v2 security page) — wording unchanged, design is v3. */
const BLOCKS: { title: string; body: string; points: string[] }[] = [
  {
    title: "Approval before apply — the core rule",
    body: "Vouchso's AI can read, draft and suggest. It cannot write. Every change to your CRM exists first as a proposal, and only a person in your workspace can approve it. There is no auto-apply mode, no confidence threshold that skips the human, and no background sync that edits records.",
    points: [
      "Proposals show the field diff, a confidence score and the source evidence",
      "Edit-before-approval means the applied value is the one a person settled on",
      "Rejected proposals change nothing — and are kept in History as rejections",
    ],
  },
  {
    title: "Reads on. Writes off — until you say otherwise",
    body: "When you connect an app, Vouchso starts by only reading it, so it can draft proposals. Writing back is a separate switch, per app, controlled by Owners and Admins. Even with writes on, the approval rule above still applies to every single change.",
    points: [
      "Per-app permission toggles, changeable at any time",
      "Sync frequency is yours to set; disconnecting stops everything immediately",
      "Turning writes off never deletes your history or your queue",
    ],
  },
  {
    title: "A full audit history, with a 7-day undo",
    body: "Every approval lands in History as a batch: what changed, who approved it, when, and what it synced to. Any batch can be rolled back for 7 days in three steps — preview what reverts, confirm, and verify the CRM matches the previous values.",
    points: [
      "Batch-level records, not a vague activity feed",
      "Rollback restores the exact previous values, then verifies them",
      "Rolled-back batches stay visible, marked as rolled back",
    ],
  },
  {
    title: "Workspaces are isolated; roles are enforced",
    body: "Each company gets its own workspace, and every record in Vouchso belongs to exactly one workspace. Inside it, five roles decide who sees and does what — enforced by the product, not by convention.",
    points: [
      "Owner, Admin, Manager, Sales Rep, Viewer — with a per-page permission matrix",
      "Sales Reps see and approve only their own deals and queue",
      "Viewers are read-only everywhere: no Approve or Rollback controls at all",
      "Connections and billing are Owner/Admin territory only",
    ],
  },
  {
    title: "It only drafts from evidence it can show you",
    body: "Vouchso drafts proposals from the sources you connect — Gmail or Outlook, Google Calendar, and call notes or transcripts from tools like Zoom. If a proposal exists, its source exists, and you can open it from the proposal itself. No source, no proposal.",
    points: [
      "Every proposal names its source: the email, meeting or call it came from",
      "The AI Assistant answers only from your workspace data",
      "Assistant writes are proposals too — it cannot change anything directly",
    ],
  },
];

export default function SecurityPage() {
  return (
    <>
      <section className="bg-white">
        <div className="wrap pt-14 pb-20 md:pt-20">
          <div className="max-w-[820px]" data-reveal>
            <CapsLabel className="text-hs-brand">Security &amp; trust</CapsLabel>
            <h1 className="mt-5 font-hsserif text-[40px] leading-[1.14] font-light tracking-[-0.01em] text-hs-ink md:text-[56px]">
              Your CRM changes only when your team says so<span className="text-hs-brand">.</span>
            </h1>
            <p className="mt-6 max-w-[640px] text-[17px] leading-relaxed text-hs-body">
              Most AI tools ask for write access first and explain later. Vouchso is built the other
              way around — here is exactly how it treats your data and your CRM.
            </p>
            <p className="mt-8 inline-flex rounded-xl border border-hs-line bg-hs-paper px-4 py-2.5 font-jbmono text-[12px] font-semibold tracking-wide text-hs-ink">
              DEFAULT PERMISSIONS: READS ON · WRITES OFF
            </p>
          </div>

          <div className="mt-8 flex flex-col">
            {BLOCKS.map((b, i) => (
              <article
                key={b.title}
                className="grid gap-6 border-t border-hs-line py-12 md:grid-cols-2 md:gap-14"
                data-reveal
              >
                <div>
                  <p className="font-hsserif text-[19px] font-light text-hs-brand">{String(i + 1).padStart(2, "0")}</p>
                  <h2 className="mt-2.5 font-jakarta text-[23px] leading-snug font-bold text-hs-ink">{b.title}</h2>
                  <p className="mt-3.5 max-w-[520px] text-[15.5px] leading-relaxed text-hs-body">{b.body}</p>
                </div>
                <ul className="flex flex-col justify-center gap-2.5">
                  {b.points.map((pt) => (
                    <li
                      key={pt}
                      className="hs-card-shadow flex items-start gap-2.5 rounded-2xl border border-hs-line bg-white px-4.5 py-3.5 text-[14px] leading-snug font-medium text-hs-body"
                    >
                      <Check /> {pt}
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </div>
      </section>

      <CtaBand />
    </>
  );
}
