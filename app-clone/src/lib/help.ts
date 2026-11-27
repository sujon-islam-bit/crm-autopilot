/**
 * Help centre content — real, static articles about THIS product as built.
 * The /help page renders from this data and the search runs over it
 * (title, summary, category, keywords and body text). Every claim here is
 * written against the actual app behaviour; keep it that way when editing.
 */

export type HelpBlock =
  | { kind: "p"; text: string }
  | { kind: "steps"; items: string[] }
  | { kind: "bullets"; items: string[] };

export type HelpSection = { heading?: string; blocks: HelpBlock[] };

export type HelpArticle = {
  slug: string;
  title: string;
  category: string;
  summary: string;
  minutes: number;
  keywords: string[];
  sections: HelpSection[];
};

export type HelpCategory = { name: string; icon: string; blurb: string };

export const HELP_CATEGORIES: HelpCategory[] = [
  { name: "Getting Started", icon: "play", blurb: "What Vouchso does and how the pieces fit" },
  { name: "Approvals", icon: "inbox", blurb: "Reviewing, editing and undoing AI proposals" },
  { name: "Data Cleanup", icon: "shield", blurb: "Health score, duplicates and guardrails" },
  { name: "Connections", icon: "plug", blurb: "HubSpot, Salesforce, email and calendar" },
  { name: "Team & Roles", icon: "users", blurb: "Invites, the five roles and your workspace" },
  { name: "AI Assistant", icon: "sparkle", blurb: "Asking your pipeline questions" },
  { name: "History & Rollback", icon: "undo", blurb: "The audit trail and undoing a batch" },
  { name: "Billing & Plans", icon: "card", blurb: "The Beta plan and launch pricing" },
];

const p = (text: string): HelpBlock => ({ kind: "p", text });
const steps = (items: string[]): HelpBlock => ({ kind: "steps", items });
const bullets = (items: string[]): HelpBlock => ({ kind: "bullets", items });

export const HELP_ARTICLES: HelpArticle[] = [
  {
    slug: "getting-started",
    title: "Getting started: what Vouchso does",
    category: "Getting Started",
    summary: "Vouchso reads your email, calendar and calls, drafts CRM updates, and applies only what you approve.",
    minutes: 3,
    keywords: ["start", "intro", "overview", "how it works", "onboarding", "basics"],
    sections: [
      {
        blocks: [
          p("Vouchso is an AI layer that sits on top of your CRM. Instead of reps typing updates into HubSpot or Salesforce by hand, Vouchso reads the work they already do — email threads, calendar meetings, call notes — and drafts the CRM updates for them. A person reviews every draft, and only approved changes are written to the CRM."),
        ],
      },
      {
        heading: "The loop, in four steps",
        blocks: [
          steps([
            "Connect your CRM and inbox from the Connections page (Owner and Admin roles manage connections).",
            "Vouchso reads new activity and turns what it finds into proposals in Approvals — each with a confidence score and the source it came from.",
            "You (or your team) approve, edit or reject each proposal. Nothing is applied before a yes.",
            "Approved changes are written to the CRM and recorded in History, where any batch can be rolled back.",
          ]),
        ],
      },
      {
        heading: "Good to know",
        blocks: [
          bullets([
            "Follow-up emails are drafted for you and only ever sent after approval — there is no auto-send.",
            "Call notes and transcripts can be pasted in on the Add notes page; the AI reads them the same way it reads email.",
            "Every workspace starts completely fresh: your deals, your contacts, nobody else's data.",
          ]),
        ],
      },
    ],
  },
  {
    slug: "how-approvals-work",
    title: "How approvals work — and what the confidence % means",
    category: "Approvals",
    summary: "Every AI suggestion waits in Approvals with its evidence. Approve, edit, reject, or handle the whole queue in bulk.",
    minutes: 4,
    keywords: ["approve", "reject", "confidence", "queue", "bulk", "edit before approval", "threshold", "proposal"],
    sections: [
      {
        blocks: [
          p("Nothing Vouchso finds is applied straight away. Each suggestion becomes a proposal in the Approvals queue, grouped by type: Deal Updates, New Contacts, Enrichment, Follow-ups and Field Fixes. Open any proposal to see exactly what would change — the field, the old value, the new value — and the Source Evidence it came from, such as the email or call note behind it."),
        ],
      },
      {
        heading: "What the confidence % means",
        blocks: [
          p("The percentage is how sure the AI is that the proposal is right, based on how clear and complete its source was. A signed quote in an email scores higher than a vague mention on a call. Confidence is a guide for your review order — the queue sorts highest first — not a guarantee. You can raise the bar in Settings → AI Preferences: proposals under your confidence threshold (50–90%, default 50%) get a “Below threshold” marker so they stand out."),
          p("There is deliberately no auto-apply. Even a 99% proposal waits for a person."),
        ],
      },
      {
        heading: "Your options on each proposal",
        blocks: [
          bullets([
            "Approve — the change is written to the CRM and recorded in History.",
            "Edit Before Approval — adjust the values first (for example, fix a close date), then approve your version.",
            "Reject — the proposal is discarded and nothing changes.",
            "Bulk actions — select several proposals and approve or reject them together; “Approve All” asks for one extra confirmation.",
            "Undo — changed your mind right after deciding? Undo returns a decided proposal to pending.",
          ]),
        ],
      },
    ],
  },
  {
    slug: "when-a-proposal-looks-wrong",
    title: "When a proposal looks wrong",
    category: "Approvals",
    summary: "Don't approve it. Check the source evidence, edit the values, or reject it — and roll back if it already went through.",
    minutes: 3,
    keywords: ["wrong", "mistake", "error", "bad proposal", "evidence", "suspicious", "troubleshooting", "fix"],
    sections: [
      {
        blocks: [
          p("A proposal is a draft, not a decision. If something looks off, the safest move is also the simplest: don't approve it. Proposals you ignore or reject change nothing in your CRM."),
        ],
      },
      {
        heading: "Check it in three places",
        blocks: [
          steps([
            "Open the proposal and read the Source Evidence — the exact email, meeting or note the AI read. Most wrong proposals are a misread source, and you'll spot it here.",
            "Compare the field changes: old value → new value. If the new value is almost right, use Edit Before Approval and fix just that value.",
            "Look at the confidence % and any “Below threshold” marker — low-confidence proposals deserve the closest read.",
          ]),
        ],
      },
      {
        heading: "If it was already approved",
        blocks: [
          p("Applied changes are grouped into batches in History, and a batch can be rolled back within 7 days — see “Undo a change: rollback in History”. If wrong proposals keep coming from the same place, an Owner or Admin can also turn on the “Flag suspicious updates” guardrail in Data Cleanup, which marks unusual updates for extra attention."),
        ],
      },
    ],
  },
  {
    slug: "raise-your-data-health-score",
    title: "Raise your data health score",
    category: "Data Cleanup",
    summary: "The score counts duplicates, missing fields, stale deals and unlogged activity — and every fix goes through Approvals.",
    minutes: 4,
    keywords: ["health", "score", "duplicates", "merge", "missing fields", "stale", "unlogged", "guardrails", "cleanup", "hygiene"],
    sections: [
      {
        blocks: [
          p("Your data health score (out of 100, on the Dashboard and at the top of Data Cleanup) measures how trustworthy your CRM data is. It drops when problems pile up and rises as you clear them. Data Cleanup tracks the trend day by day, so you can see whether the team is winning or slipping."),
        ],
      },
      {
        heading: "The four issue types",
        blocks: [
          bullets([
            "Duplicate Contacts — the same person or company recorded twice.",
            "Missing Fields — deals and contacts missing values they should have, like an amount or a next step.",
            "Stale Deals — open deals that have gone quiet with no recent activity.",
            "Unlogged Activities — emails and meetings that happened but were never recorded against a deal.",
          ]),
        ],
      },
      {
        heading: "How fixing works",
        blocks: [
          p("Fixes are proposals, not silent edits. For duplicates, open Compare to see the two records side by side, then choose Propose Merge — the merge lands in Approvals for a person to confirm. For missing fields, Vouchso suggests a value only when that value already exists somewhere in your data; it never invents one."),
        ],
      },
      {
        heading: "Guardrails (Owner and Admin)",
        blocks: [
          p("Guardrails are standing rules on the Data Cleanup page. Two of them change what the engine does: turn off “Detect duplicate emails” and duplicate detection pauses; turn off “Auto-enrich new contacts” and enrichment proposals stop. The others — “Prevent invalid stage changes”, “Require a next-step date” and “Flag suspicious updates” — are saved with your workspace and shown to the whole team."),
        ],
      },
    ],
  },
  {
    slug: "connect-hubspot-or-salesforce",
    title: "Connect HubSpot or Salesforce",
    category: "Connections",
    summary: "What the Connections page does today, the read-first permission model, and when live connect opens.",
    minutes: 3,
    keywords: ["connect", "hubspot", "salesforce", "gmail", "calendar", "slack", "zoom", "integrations", "permissions", "sync"],
    sections: [
      {
        blocks: [
          p("The Connections page (Owners and Admins only) is where Vouchso links to the tools it reads: HubSpot and Salesforce for your CRM, plus Gmail, Google Calendar, Slack and Zoom. More apps — including Microsoft Outlook and Notion — are marked “Coming soon” in the catalogue."),
        ],
      },
      {
        heading: "Where things stand",
        blocks: [
          p("Live connect opens at final setup, when the product launches. Until then, the Connections page shows the full catalogue and how each app will work — and the demo workspace includes a sample HubSpot connection so you can explore the Manage panel: permission toggles, sync frequency, Sync Now and Disconnect."),
        ],
      },
      {
        heading: "Reads first, writes only when you say so",
        blocks: [
          bullets([
            "Read permissions start ON — Vouchso can see the data it needs to draft proposals.",
            "Write permissions start OFF — nothing can be written back until an Owner or Admin turns writes on in Manage.",
            "Even with writes on, Vouchso never writes without an approved proposal. The approval rule always wins.",
            "Sync frequency is set per connection, Sync Now runs a scan immediately, and Disconnect is a two-step action so it can't happen by accident.",
          ]),
        ],
      },
    ],
  },
  {
    slug: "invite-your-team-and-roles",
    title: "Invite your team — and what each role can do",
    category: "Team & Roles",
    summary: "Invite by email from Settings → Team. A pending invite reserves the seat, and the five roles decide who can change what.",
    minutes: 4,
    keywords: ["invite", "team", "roles", "owner", "admin", "manager", "sales rep", "viewer", "permissions", "seat", "member"],
    sections: [
      {
        blocks: [
          p("Everyone gets their own account; the workspace is what's shared. Owners and Admins invite people from Settings → Team: enter an email, pick a role, and the invite appears as pending — the seat is reserved straight away, so your member count is always honest. Each pending invite has a copyable invite link you can share directly, plus Resend and Revoke. The person joins by signing in with the invited email address."),
        ],
      },
      {
        heading: "The five roles",
        blocks: [
          bullets([
            "Owner — everything, including billing and transferring ownership. The Owner can never be removed.",
            "Admin — everything except billing and ownership: settings, team, connections, guardrails.",
            "Manager — runs the day to day: decides and edits proposals, rolls back batches, creates records. No connections, settings, team or billing.",
            "Sales Rep — their own book only: their queue, their deals, their pipeline. Data Cleanup and History are hidden for Reps.",
            "Viewer — can look at everything and change nothing: no approve buttons, no rollback, read-only throughout.",
          ]),
        ],
      },
      {
        heading: "Changing roles later",
        blocks: [
          p("Roles can be changed from the same Team section at any time, and the change applies immediately — menus appear or disappear, and the server enforces the same rules even if someone tries to skip the interface."),
        ],
      },
    ],
  },
  {
    slug: "your-data-stays-yours",
    title: "Your data stays yours",
    category: "Team & Roles",
    summary: "A fresh, isolated workspace per signup, role-based access, and a full audit trail of every applied change.",
    minutes: 3,
    keywords: ["privacy", "security", "isolation", "workspace", "fresh", "audit", "data", "access"],
    sections: [
      {
        blocks: [
          bullets([
            "Fresh start — every signup creates a completely new workspace with zero data in it. Demo data exists only in the demo account; it never leaks into a real workspace.",
            "Isolation — a workspace's deals, contacts, proposals and history are only ever visible to that workspace's members. There is no cross-workspace view anywhere in the product.",
            "Role-based access — the five roles are enforced on the server, not just hidden in the interface, so a Viewer can't change data even by calling the app directly.",
            "Audit trail — every applied change is recorded in History with its batch, its source and who approved it, and batches can be rolled back within 7 days.",
          ]),
        ],
      },
    ],
  },
  {
    slug: "ask-the-ai-assistant",
    title: "Ask the AI Assistant",
    category: "AI Assistant",
    summary: "A chat that answers from your real pipeline — and turns actions into proposals you approve, never direct changes.",
    minutes: 3,
    keywords: ["assistant", "chat", "ask", "ai", "stalled", "limit", "daily", "cmd k", "question"],
    sections: [
      {
        blocks: [
          p("Open the AI Assistant from the button at the top of the sidebar, or press ⌘K (Ctrl+K on Windows) from anywhere. It only knows your workspace — it answers from your real deals, contacts and queue, never from the open internet."),
        ],
      },
      {
        heading: "Things you can ask",
        blocks: [
          bullets([
            "“Which deals are stalled?” — the quiet deals that need attention, with days silent and risk.",
            "“What does my pipeline look like?” — open total, won and lost, by stage.",
            "“What's waiting for me?” — a summary of your pending approvals.",
            "“Tell me about the NovaTech deal” — status, stage and what's pending on it.",
            "“Any follow-ups due?” — the follow-up proposals waiting in your queue.",
            "“How's my data health?” — the cleanup counts behind your score.",
            "Contact lookups — find a person and the deal they're attached to.",
          ]),
        ],
      },
      {
        heading: "Actions are proposals, not commands",
        blocks: [
          p("Ask the Assistant to move a deal's stage or draft a follow-up, and it creates a proposal card right in the chat. Nothing is applied or sent until you press Approve on that card — the same approval rule as everywhere else. Sales Reps only see their own deals in answers, and Viewers can ask questions but can't create proposals."),
        ],
      },
      {
        heading: "The daily limit",
        blocks: [
          p("Each person has a daily message limit (30 by default) so the Assistant stays a work tool, not an all-day toy. The composer shows how many you have left today; the counter resets at midnight. Owners and Admins can change the limit (5–500) in Settings → AI Preferences."),
        ],
      },
    ],
  },
  {
    slug: "undo-a-change-rollback",
    title: "Undo a change: rollback in History",
    category: "History & Rollback",
    summary: "Applied changes are grouped into batches. Preview, confirm and verify a rollback — within 7 days of the apply.",
    minutes: 3,
    keywords: ["undo", "rollback", "revert", "history", "batch", "restore", "mistake", "sync"],
    sections: [
      {
        blocks: [
          p("Every time proposals are approved, the applied changes are grouped into a batch — one bulk approval is one batch. History is the full record: what changed, which batch it belonged to, and who approved it. If a batch turns out to be wrong, you don't fix records one by one; you roll the batch back."),
        ],
      },
      {
        heading: "The three steps",
        blocks: [
          steps([
            "Preview — from the Rollback tab in History, pick the batch. You'll see every change it made and what rolling back will restore, including anything that can't be undone.",
            "Confirm — confirm the rollback. This is the point of no return for the undo itself, so it is never a single stray click.",
            "Verify — Vouchso restores the previous values and shows the batch marked as rolled back, so the team can see it happened.",
          ]),
        ],
      },
      {
        heading: "The window",
        blocks: [
          p("A batch can be rolled back within 7 days of being applied. After that it stays in the audit trail permanently — you can always see what happened, even when it can no longer be undone. Viewers can read History but can't roll anything back."),
        ],
      },
    ],
  },
  {
    slug: "plans-and-billing",
    title: "Plans & billing",
    category: "Billing & Plans",
    summary: "Vouchso is free while in beta. At launch it's a flat $19–29 per rep per month — no AI credits, no per-action charges.",
    minutes: 2,
    keywords: ["price", "pricing", "billing", "plan", "beta", "free", "cost", "upgrade", "invoice"],
    sections: [
      {
        blocks: [
          bullets([
            "Today: your workspace is on the Beta plan, and beta is free. Settings → Billing shows the plan, your member count and your connection count.",
            "At launch: a flat $19–29 per rep per month depending on the plan you pick. You pay for people, not for AI actions — no credits, no per-proposal charges, no onboarding fee.",
            "The Upgrade button in Billing activates at launch; while in beta it stays disabled and there are no invoices.",
            "Billing is Owner-only — Admins, Managers, Reps and Viewers can't see or change it.",
          ]),
        ],
      },
    ],
  },
  {
    slug: "pipeline-movement-explained",
    title: "Pipeline movement, explained",
    category: "Getting Started",
    summary: "The Pipeline page compares this period with the one before: what progressed, stalled, slipped, or closed.",
    minutes: 3,
    keywords: ["pipeline", "movement", "progressed", "stalled", "slipped", "won", "lost", "period", "export", "csv", "compare"],
    sections: [
      {
        blocks: [
          p("A pipeline total tells you where you are; the Pipeline page tells you how you got there. It compares the current period with the previous one — deal by deal — using the stage changes and close-date changes that were actually applied through Approvals."),
        ],
      },
      {
        heading: "The tabs",
        blocks: [
          bullets([
            "Progressed — deals that moved to a later stage in the period.",
            "Stalled — open deals flagged at risk because they've gone quiet.",
            "Slipped — deals whose close date was pushed later in the period.",
            "Won-Lost — deals that closed, either way, in the period.",
          ]),
        ],
      },
      {
        heading: "Periods and export",
        blocks: [
          p("Switch between 7, 30 or 90 days, or pick a custom range — the KPI cards, the movement chart, the Key Insights and the table all follow the same period, so the numbers never disagree with each other. The Export button downloads the table as a CSV for your own reporting."),
        ],
      },
    ],
  },
  {
    slug: "keyboard-shortcuts",
    title: "Keyboard shortcuts",
    category: "Getting Started",
    summary: "The honest, complete list: one global shortcut, plus the Assistant's composer keys.",
    minutes: 2,
    keywords: ["keyboard", "shortcut", "hotkey", "cmd", "ctrl", "enter"],
    sections: [
      {
        blocks: [
          bullets([
            "⌘K / Ctrl+K — open the AI Assistant from anywhere in the app.",
            "Enter — in the AI Assistant, send your message.",
            "Shift+Enter — in the AI Assistant, add a new line instead of sending.",
          ]),
          p("That's the full list today — we'd rather show you three shortcuts that work than a page of ones that don't. This article will grow as more are added."),
        ],
      },
    ],
  },
];

/** Flatten an article into one lowercase string the search can run over. */
export function helpSearchText(a: HelpArticle): string {
  const parts: string[] = [a.title, a.summary, a.category, a.slug, ...a.keywords];
  for (const s of a.sections) {
    if (s.heading) parts.push(s.heading);
    for (const b of s.blocks) {
      if (b.kind === "p") parts.push(b.text);
      else parts.push(...b.items);
    }
  }
  return parts.join(" \n ").toLowerCase();
}

export function searchHelpArticles(query: string): HelpArticle[] {
  const q = query.trim().toLowerCase();
  if (!q) return HELP_ARTICLES;
  return HELP_ARTICLES.filter((a) => helpSearchText(a).includes(q));
}

export function helpCategoryCount(category: string): number {
  return HELP_ARTICLES.filter((a) => a.category === category).length;
}
