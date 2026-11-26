import { I } from "../../../components/icons";

const STEPS = [
  {
    title: "Connect your CRM and inbox",
    body: "Link HubSpot or Salesforce, plus Gmail or Outlook, from the Connections page. One click each — no admin project, no API keys to paste.",
  },
  {
    title: "The AI reads and proposes",
    body: "Every day it reads new email, calendar events, call notes and chats you add, and turns what it finds into proposals in Approvals — each with a confidence score and the source it came from.",
  },
  {
    title: "You approve, it updates",
    body: "Approve a proposal and the change is written to your CRM. Reject it and the AI learns from that too. Follow-up emails are drafted for you and only sent after you approve them.",
  },
  {
    title: "Everything is reversible",
    body: "History keeps the full record. Any applied change can be undone in one click.",
  },
];

const FAQ = [
  {
    q: "Does the AI ever change my CRM without asking?",
    a: "No. Every change — a stage move, a new contact, a follow-up email — waits in Approvals until a person approves it.",
  },
  {
    q: "Which CRMs are supported?",
    a: "HubSpot and Salesforce, on the plans small teams actually use. No Pro or Enterprise upgrade is required for the autopilot.",
  },
  {
    q: "What does it cost?",
    a: "A flat $19–29 per rep per month. No credits, no per-resolution charges, no onboarding fee.",
  },
  {
    q: "Where do call notes come from?",
    a: "Paste transcripts or notes on the Add notes page — Zoom, Meet, WhatsApp or LinkedIn. The AI reads them the same way it reads email.",
  },
];

export default function HelpPage() {
  return (
    <div className="px-7 pt-5 pb-7">
      <h1 className="text-[24px] font-extrabold tracking-tight">Help</h1>
      <p className="mt-1 text-[13.5px] text-muted">How the autopilot works, in four steps.</p>

      <div className="mt-5 grid max-w-[880px] grid-cols-2 gap-4">
        {STEPS.map((s, i) => (
          <div key={s.title} className="card p-5">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-tint text-[13px] font-extrabold text-primary">
              {i + 1}
            </span>
            <h2 className="mt-3 text-[14.5px] font-bold">{s.title}</h2>
            <p className="mt-1.5 text-[13px] leading-relaxed text-muted">{s.body}</p>
          </div>
        ))}
      </div>

      <h2 className="mt-7 mb-3 flex items-center gap-2 text-[15px] font-bold">
        <I n="help" size={16} className="text-primary" /> Common questions
      </h2>
      <div className="card max-w-[880px] divide-y divide-line/60 overflow-hidden">
        {FAQ.map((f) => (
          <div key={f.q} className="px-5 py-4">
            <div className="text-[13.5px] font-semibold">{f.q}</div>
            <p className="mt-1 text-[13px] leading-relaxed text-muted">{f.a}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
