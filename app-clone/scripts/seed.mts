// Seed for the CleanPipe clone demo workspace.
// Every number on the Command Center is a real row: open pipeline sums to
// $1,240,000, 14 pending proposals, hygiene counts 19/24/31/8, rep-time
// saved 630 min this week vs 562 last week (+12%), queue delta +3.
import { readFileSync } from "node:fs";

// --- load .env before importing app code ---
for (const line of readFileSync(new URL("../.env", import.meta.url), "utf8").split("\n")) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}

const { prisma } = await import("../src/lib/db");
const { encryptJson } = await import("../src/lib/crypto");
const { randomUUID } = await import("node:crypto");

const now = new Date();
const daysAgo = (d: number, h = 10) => {
  const t = new Date(now);
  t.setDate(t.getDate() - d);
  t.setHours(h, 5, 0, 0);
  return t;
};
const hoursAgo = (h: number) => new Date(now.getTime() - h * 3600_000);
// Monday of the current week (matches startOfWeek in src/lib/constants).
const monday = new Date(now);
monday.setHours(0, 0, 0, 0);
monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
// Date inside a week: weekOffset 0 = this week, -1 = last week; dayIdx 0 = Mon … 6 = Sun.
const wk = (weekOffset: number, dayIdx: number, h = 10) => {
  const t = new Date(monday);
  t.setDate(t.getDate() + weekOffset * 7 + dayIdx);
  t.setHours(h, 5, 0, 0);
  return t;
};

// ---------- clean slate ----------
await prisma.auditEvent.deleteMany();
await prisma.proposal.deleteMany();
await prisma.capture.deleteMany();
await prisma.signatureRequest.deleteMany();
await prisma.connection.deleteMany();
await prisma.crmContact.deleteMany();
await prisma.crmDeal.deleteMany();
await prisma.membership.deleteMany();
await prisma.workspace.deleteMany();
await prisma.session.deleteMany();
await prisma.account.deleteMany();
await prisma.verification.deleteMany();
await prisma.user.deleteMany();

// ---------- user + workspace ----------
const user = await prisma.user.create({
  data: {
    id: randomUUID(),
    name: "Md Yasses",
    email: "demo@crmautopilot.dev",
    emailVerified: true,
  },
});
const ws = await prisma.workspace.create({
  data: { name: "Acme Sales", plan: "trial", healthScore: 94, healthDelta: 11 },
});
// The demo persona's sidebar role line is part of the reference image, so it
// is stored on THIS membership only; real owners get no override → "Owner".
await prisma.membership.create({
  data: { userId: user.id, workspaceId: ws.id, role: "owner", roleLabel: "RevOps Admin" },
});
const W = ws.id;

await prisma.connection.create({
  data: {
    workspaceId: W,
    provider: "hubspot",
    accountEmail: "yasses@acmesales.com",
    data: encryptJson({ accessToken: "demo-token", refreshToken: "demo-refresh", portalId: "demo" }),
    lastSyncAt: new Date(now.getTime() - 55_000),
  },
});

// ---------- deals (open pipeline must total exactly $1,240,000) ----------
// createdAt bucketing shapes the Pipeline Pulse curves (cumulative by creation):
//   base (before last week) 850,000 → last week +238,000 → 1,088,000 (+14% base)
//   this week +152,000 → 1,240,000. Both weeks are back-loaded so the lines
//   bend upward: last week 862→878→899→925→959→1,016→1,088K,
//   this week 1,097→1,108→1,122→1,140→1,164→1,192→1,240K.
// [externalId, name, amount, stage, createdAt, opts]
type DealSpec = [
  string,
  string,
  number,
  string,
  Date,
  { owner?: string | null; lastActDays?: number; close?: string }?,
];
const dealSpecs: DealSpec[] = [
  // BASE bucket (before last week) — 850,000
  ["hs-201", "Acme Corp", 120000, "Discovery", daysAgo(16), { close: "2026-12-15", lastActDays: 2 }],
  ["hs-202", "Datawise", 142000, "Negotiation", daysAgo(18), { lastActDays: 1 }],
  ["hs-203", "Brightline", 110000, "Proposal sent", daysAgo(15), { lastActDays: 2 }],
  ["hs-204", "CloudFlow", 96000, "Meeting booked", daysAgo(20), { lastActDays: 1 }],
  ["hs-205", "Vale Clinics", 92000, "Meeting booked", daysAgo(17), { lastActDays: 3 }],
  ["hs-206", "Ostro Media", 88000, "Negotiation", daysAgo(19), { lastActDays: 2 }],
  ["hs-207", "Northstar", 85000, "Negotiation", daysAgo(21), { lastActDays: 14 }],
  ["hs-208", "Pinehost", 51000, "Contacted", daysAgo(14), { lastActDays: 2 }],
  ["hs-210", "PixelWorks", 18000, "Proposal sent", daysAgo(35), { owner: null, lastActDays: 33 }],
  ["hs-212", "Sunfield", 15000, "Discovery", daysAgo(38), { lastActDays: 36 }],
  ["hs-219", "Moss Legal", 33000, "New", daysAgo(24), { lastActDays: 3 }],
  // LAST WEEK bucket (Mon–Sun) — +238,000 → 1,088,000
  ["hs-214", "Redwood", 12000, "Proposal sent", wk(-1, 0), { owner: null, lastActDays: 34 }],
  ["hs-211", "Bluepeak", 16000, "Contacted", wk(-1, 1), { owner: null, lastActDays: 40 }],
  ["hs-209", "Harbor Dental", 21000, "Contacted", wk(-1, 2), { lastActDays: 38 }],
  ["hs-224", "Copperline", 26000, "Contacted", wk(-1, 3), { lastActDays: 1 }],
  ["hs-223", "Northbeam", 34000, "Negotiation", wk(-1, 4), { lastActDays: 0 }],
  ["hs-218", "Fernhill", 57000, "Discovery", wk(-1, 5), { lastActDays: 2 }],
  ["hs-221", "Koda Labs", 22000, "Meeting booked", wk(-1, 6), { lastActDays: 2 }],
  ["hs-222", "BetaFlow", 50000, "Discovery", wk(-1, 6), { lastActDays: 0 }],
  // THIS WEEK bucket (Mon–Sun) — +152,000 → 1,240,000
  ["hs-216", "Mesa Group", 9000, "Contacted", wk(0, 0), { owner: null, lastActDays: 37 }],
  ["hs-215", "Alto Labs", 11000, "New", wk(0, 1), { owner: null, lastActDays: 41 }],
  ["hs-213", "Koda Systems", 14000, "Contacted", wk(0, 2), { owner: null, lastActDays: 44 }],
  ["hs-226", "Loomly", 18000, "New", wk(0, 3), { owner: null, lastActDays: 3 }],
  ["hs-225", "Vantage", 24000, "Proposal sent", wk(0, 4), { lastActDays: 2 }],
  ["hs-220", "Sunridge", 28000, "Contacted", wk(0, 5), { owner: null, lastActDays: 4 }],
  ["hs-217", "Kite & Anchor", 48000, "Proposal sent", wk(0, 6), { lastActDays: 1 }],
];
let openTotal = 0;
for (const [ext, name, amount, stage, created, opts] of dealSpecs) {
  openTotal += amount;
  await prisma.crmDeal.create({
    data: {
      workspaceId: W,
      externalId: ext,
      source: "hubspot",
      name,
      company: name,
      stage,
      amount,
      ownerName: opts?.owner === null ? null : (opts?.owner ?? "Md Yasses"),
      closeDate: opts?.close ? new Date(opts.close) : null,
      lastActivityAt: daysAgo(opts?.lastActDays ?? 1),
      createdAt: created,
    },
  });
}
await prisma.crmDeal.create({
  data: {
    workspaceId: W,
    externalId: "hs-227",
    source: "hubspot",
    name: "Harbor Labs",
    company: "Harbor Labs",
    stage: "Won",
    amount: 45000,
    ownerName: "Md Yasses",
    lastActivityAt: daysAgo(6),
    createdAt: daysAgo(20),
  },
});
console.log("open pipeline total:", openTotal);

// ---------- contacts ----------
// [name, email, company, title]
const named: [string, string, string, string][] = [
  ["Priya Nair", "priya.nair@acmecorp.com", "Acme Corp", "VP Finance"],
  ["Mark Sullivan", "mark@northstar.io", "Northstar", "COO"],
  ["Dana Kim", "dana@betaflow.com", "BetaFlow", "Head of Ops"],
  ["Tom Becker", "tom@datawise.co", "Datawise", "IT Lead"],
  ["Elena Rodriguez", "elena@cloudflow.io", "CloudFlow", "CTO"],
  ["James Park", "james@valeclinics.com", "Vale Clinics", "Director"],
  ["Aisha Khan", "aisha@ostromedia.com", "Ostro Media", "CMO"],
  ["Ben Carter", "ben@brightline.co", "Brightline", "Founder"],
  ["Lucy Meyer", "lucy@fernhill.com", "Fernhill", "Ops Manager"],
  ["Omar Farouk", "omar@pinehost.com", "Pinehost", "CEO"],
  ["Grace Liu", "grace@kiteandanchor.com", "Kite & Anchor", "Partner"],
  ["Noah Berg", "noah@northbeam.io", "Northbeam", "VP Sales"],
];
for (const [name, email, company, title] of named) {
  await prisma.crmContact.create({ data: { workspaceId: W, name, email, company, title } });
}
// 16 contacts with a missing field (8 without email, 8 without title)
const missingNames = [
  "Ravi Menon", "Sofia Rossi", "Liam Doyle", "Ingrid Voss", "Pavel Novak", "Mia Chen",
  "Diego Fuentes", "Anna Lindberg", "Karl Weber", "Nina Petrova", "Owen Hart", "Lena Fischer",
  "Marco Bianchi", "Eva Novak", "Sam Whitfield", "Tara O'Brien",
];
for (let i = 0; i < missingNames.length; i++) {
  const noEmail = i < 8;
  await prisma.crmContact.create({
    data: {
      workspaceId: W,
      name: missingNames[i],
      email: noEmail ? null : `contact${i}@example.com`,
      company: "Prospect Co",
      title: noEmail ? "Manager" : null,
    },
  });
}
// 19 duplicate rows (same email as an existing contact)
const dupSources = [...named, ...missingNames.slice(8).map((n, i) => [n, `contact${i + 8}@example.com`, "Prospect Co", "Manager"] as const)];
for (let i = 0; i < 19; i++) {
  const [name, email, company, title] = dupSources[i % dupSources.length];
  await prisma.crmContact.create({ data: { workspaceId: W, name, email, company, title } });
}

// ---------- captures ----------
const zoomCapture = await prisma.capture.create({
  data: {
    workspaceId: W,
    kind: "call",
    source: "zoom",
    externalId: "zoom-acme-1124",
    title: "Zoom call — Acme Corp MSA review",
    fromLabel: "Priya Nair (Acme Corp)",
    snippet: "Send MSA today.",
    body: "Priya Nair: Legal has signed off on our side. We will send the MSA today. If you can move the close date to November 30, our finance team can release the budget this quarter. Yasses: Perfect — I'll update the deal stage to Negotiation and move the close date. Priya: Amount stays at $120,000.",
    occurredAt: new Date(2026, 10, 24, 10, 0),
    processedAt: daysAgo(2, 11),
  },
});
const gmailCapture = await prisma.capture.create({
  data: {
    workspaceId: W,
    kind: "email",
    source: "gmail",
    externalId: "gmail-saralee-1",
    title: "Intro — Sara Lee, VP Ops",
    fromLabel: "Sara Lee <sara.lee@kiteandanchor.com>",
    snippet: "Enriched",
    body: "Hi Yasses — Sara Lee, VP Ops at Kite & Anchor. Grace passed me your details. I'd like a call this week about the proposal. Please add me as the main contact on our account.",
    occurredAt: daysAgo(1, 9),
    processedAt: daysAgo(1, 10),
  },
});
// Today's brief: BetaFlow meeting at 2:00 PM
const todayTwoPm = new Date(now);
todayTwoPm.setHours(14, 0, 0, 0);
await prisma.capture.create({
  data: {
    workspaceId: W,
    kind: "meeting",
    source: "calendar",
    externalId: "cal-betaflow-today",
    title: "BetaFlow Discovery",
    fromLabel: "Dana Kim (BetaFlow)",
    snippet: "Budget $50K, looking for Q1 start.",
    body: "Discovery call with Dana Kim, Head of Ops at BetaFlow. Budget $50K, looking for Q1 start.",
    occurredAt: todayTwoPm,
  },
});
// Support tickets (brief row 3)
await prisma.capture.create({
  data: {
    workspaceId: W, kind: "email", source: "support", externalId: "sup-1",
    title: "Pricing question", fromLabel: "help@valeclinics.com",
    snippet: "Pricing question", body: "Can you confirm the per-seat price for 25 reps?",
    occurredAt: hoursAgo(3),
  },
});
await prisma.capture.create({
  data: {
    workspaceId: W, kind: "email", source: "support", externalId: "sup-2",
    title: "Cannot export report", fromLabel: "ops@cloudflow.io",
    snippet: "Cannot export report", body: "The quarterly export fails at 90%.",
    occurredAt: daysAgo(1, 15),
  },
});
// 31 unlogged meetings — read by the engine, no proposal came out
const meetingCompanies = ["Acme Corp", "Datawise", "CloudFlow", "Vale Clinics", "Ostro Media", "Brightline", "Pinehost", "Fernhill", "Northbeam", "Copperline"];
for (let i = 0; i < 31; i++) {
  const co = meetingCompanies[i % meetingCompanies.length];
  const kindLabel = ["Weekly sync", "Intro call", "QBR", "Check-in"][i % 4];
  await prisma.capture.create({
    data: {
      workspaceId: W,
      kind: "meeting",
      source: "calendar",
      externalId: `cal-unlogged-${i}`,
      title: `${kindLabel} — ${co}`,
      fromLabel: co,
      snippet: "Routine meeting — no changes agreed.",
      body: "Routine meeting. No stage changes, new contacts or follow-ups were agreed.",
      occurredAt: daysAgo(3 + (i % 30), 9 + (i % 7)),
      processedAt: daysAgo(2 + (i % 28), 12),
    },
  });
}

// ---------- proposals ----------
async function auditAt(action: string, summary: string, at: Date, proposalId?: string) {
  await prisma.auditEvent.create({
    data: { workspaceId: W, userId: user.id, action, summary, createdAt: at, meta: proposalId ? { proposalId } : undefined },
  });
}

type PropSpec = Parameters<typeof prisma.proposal.create>[0]["data"];
async function proposal(data: PropSpec) {
  const p = await prisma.proposal.create({ data });
  await auditAt("proposed", `AI proposed: ${p.title}`, p.createdAt, p.id);
  return p;
}

// Hero 1 — Acme stage move (96%)
await proposal({
  workspaceId: W,
  type: "deal_stage",
  title: "Update Deal Stage: Acme Corp",
  confidence: 96,
  source: "call",
  captureId: zoomCapture.id,
  dealExternalId: "hs-201",
  reason:
    "Priya Nair confirmed on the Zoom call that Acme will send the MSA today, and asked to bring the close date forward to November 30.",
  detail: {
    field: "stage",
    fromValue: "Discovery",
    toValue: "Negotiation",
    amount: 120000,
    sourceLine: 'Src: Zoom • "Send MSA today"',
    duration: "02:17",
    evidenceTitle: "Zoom Call — Nov 24, 2026",
    requiredOk: true,
    cascade: [
      { icon: "slack", text: "Triggers Slack notification in #deals" },
      { icon: "chart", text: "Increases Q4 Pipeline by +$45K" },
    ],
    diffRows: [
      { field: "Stage", current: "Discovery", proposed: "Negotiation", pill: true },
      { field: "Close Date", current: "Dec 15, 2026", proposed: "Nov 30, 2026" },
      { field: "Amount", current: "$120,000", proposed: "$120,000" },
    ],
  },
  status: "pending",
  createdAt: hoursAgo(2),
});
// Hero 2 — Sara Lee contact (88%)
await proposal({
  workspaceId: W,
  type: "new_contact",
  title: "Add Contact: Sara Lee (VP Ops)",
  confidence: 88,
  source: "gmail",
  captureId: gmailCapture.id,
  reason: "Sara Lee introduced herself as VP Ops at Kite & Anchor in the email thread and asked to be the main contact.",
  detail: {
    name: "Sara Lee",
    email: "sara.lee@kiteandanchor.com",
    company: "Kite & Anchor",
    title: "VP Ops",
    sourceLine: "Src: Gmail thread • Enriched",
  },
  status: "pending",
  createdAt: hoursAgo(1),
});
// Hero 3 — Northstar stalled (72%)
await proposal({
  workspaceId: W,
  type: "deal_field",
  title: "Mark Deal as Stalled: Northstar",
  confidence: 72,
  source: "engine",
  dealExternalId: "hs-207",
  reason: "Northstar has had no activity for 14 days while sitting in Negotiation.",
  detail: { field: "healthFlag", subline: "No activity for 14 days", cta: "review" },
  status: "pending",
  createdAt: hoursAgo(3),
});
// Follow-up draft (brief row 2) — confidence 68 keeps it out of the queue top-3
await proposal({
  workspaceId: W,
  type: "followup_draft",
  title: "Draft Follow-up: Northstar",
  confidence: 71,
  source: "gmail",
  dealExternalId: "hs-207",
  reason: "Mark asked for the SOC2 report on the last call; no follow-up has been sent yet.",
  detail: {
    toName: "Mark Sullivan",
    toEmail: "mark@northstar.io",
    subject: "SOC2 report + next steps",
    draftBody: "Hi Mark, attaching the SOC2 PDF you asked for. Happy to walk your security team through it this week.",
  },
  status: "pending",
  createdAt: daysAgo(1, 8),
});
// 10 more pending proposals (queue total = 14)
const morePending: PropSpec[] = [
  { type: "deal_stage", title: "Advance Pinehost to Meeting booked", confidence: 71, source: "gmail", dealExternalId: "hs-208", reason: "Omar confirmed a demo call for Thursday in his reply.", detail: { field: "stage", fromValue: "Contacted", toValue: "Meeting booked" }, createdAt: daysAgo(1, 8) },
  { type: "deal_field", title: "Update Ostro Media close date to December 1", confidence: 71, source: "call", dealExternalId: "hs-206", reason: "Aisha said legal needs the close moved to December 1.", detail: { field: "closeDate", fromValue: "2026-12-20", toValue: "2026-12-01" }, createdAt: daysAgo(1, 7) },
  { type: "new_deal", title: "Create deal: GreenLeaf pilot", confidence: 71, source: "gmail", reason: "GreenLeaf's ops lead asked for a paid pilot quote.", detail: { name: "GreenLeaf pilot", company: "GreenLeaf", amount: 15000, stage: "Discovery" }, createdAt: daysAgo(2, 9) },
  { type: "task", title: "Send pricing sheet to CloudFlow", confidence: 71, source: "gmail", dealExternalId: "hs-204", reason: "Elena asked for the pricing sheet before Friday's review.", detail: { taskTitle: "Send pricing sheet to CloudFlow", dueHint: "Friday" }, createdAt: daysAgo(2, 11) },
  { type: "deal_stage", title: "Advance Kite & Anchor to Negotiation", confidence: 71, source: "chat", dealExternalId: "hs-217", reason: "Grace confirmed budget approval in the WhatsApp thread.", detail: { field: "stage", fromValue: "Proposal sent", toValue: "Negotiation" }, createdAt: daysAgo(3, 9) },
  { type: "deal_field", title: "Update Datawise amount to $148,000", confidence: 71, source: "gmail", dealExternalId: "hs-202", reason: "Tom confirmed the extra 20 seats in writing.", detail: { field: "amount", fromValue: 142000, toValue: 148000 }, createdAt: daysAgo(3, 13) },
  { type: "new_contact", title: "Add Contact: Marta Ruiz (Vale Clinics)", confidence: 71, source: "gmail", reason: "Marta was cc'd as Vale Clinics' procurement lead.", detail: { name: "Marta Ruiz", email: "marta@valeclinics.com", company: "Vale Clinics", title: "Procurement Lead" }, createdAt: daysAgo(4, 10) },
  { type: "task", title: "Book security review with Datawise", confidence: 71, source: "calendar", dealExternalId: "hs-202", reason: "Datawise's security review is the last blocker before signature.", detail: { taskTitle: "Book security review with Datawise", dueHint: "This week" }, createdAt: daysAgo(4, 15) },
  { type: "followup_draft", title: "Draft Follow-up: Brightline", confidence: 71, source: "gmail", dealExternalId: "hs-203", reason: "Ben asked for the revised terms; the draft is ready to send.", detail: { toName: "Ben Carter", toEmail: "ben@brightline.co", subject: "Revised terms", draftBody: "Hi Ben, attached are the revised terms we discussed." }, createdAt: daysAgo(5, 9) },
  { type: "hygiene_fix", title: "Merge duplicate: Priya Nair", confidence: 71, source: "hygiene", reason: "Two contact records share priya.nair@acmecorp.com.", detail: { kind: "duplicate", label: "Priya Nair" }, createdAt: daysAgo(5, 12) },
];
for (const spec of morePending) {
  await proposal({ workspaceId: W, status: "pending", ...spec });
}

// Decided this week — 11 applied, savedMinutes sum 630 (= 10.5 hrs)
const savedThisWeek = [60, 60, 60, 55, 55, 55, 55, 60, 60, 55, 55];
for (let i = 0; i < savedThisWeek.length; i++) {
  const created = daysAgo(8 + (i % 6), 9);
  const decided = daysAgo([1,1,1,2,2,2,3,3,3,3,3][i], 14);
  const p = await prisma.proposal.create({
    data: {
      workspaceId: W,
      type: "deal_stage",
      title: `Applied update ${i + 1} — pipeline hygiene`,
      confidence: 90,
      source: "gmail",
      detail: { savedMinutes: savedThisWeek[i] },
      status: "applied",
      createdAt: created,
      decidedAt: decided,
      appliedAt: decided,
    },
  });
  await auditAt("proposed", `AI proposed: ${p.title}`, created, p.id);
  await auditAt("applied", `Applied: ${p.title}`, decided, p.id);
}
// Decided last week — 9 applied (savedMinutes sum 562 = 9.37 hrs) + 2 rejected.
// decidedAt is anchored to Mon–Wed of last week (wk(-1, …)) on purpose: the
// Review Queue delta compares against a ROLLING 7-days-ago snapshot
// (pendingAt in src/lib/data.ts), so these must sit clearly more than 7 days
// in the past — a decision stamped exactly 7 days ago flips the delta's sign
// depending on the time of day the seed runs. Mon–Wed of last week is still
// inside the calendar last-week window the rep-time metric uses, so the
// 562-minute total (and +12%) is unchanged.
const savedLastWeek = [65, 65, 60, 60, 60, 62, 60, 65, 65];
for (let i = 0; i < savedLastWeek.length; i++) {
  const created = daysAgo(11 + (i % 3), 9);
  const decided = wk(-1, i % 3, 13);
  const p = await prisma.proposal.create({
    data: {
      workspaceId: W,
      type: "deal_stage",
      title: `Applied update L${i + 1} — pipeline hygiene`,
      confidence: 88,
      source: "gmail",
      detail: { savedMinutes: savedLastWeek[i] },
      status: "applied",
      createdAt: created,
      decidedAt: decided,
      appliedAt: decided,
    },
  });
  await auditAt("proposed", `AI proposed: ${p.title}`, created, p.id);
  await auditAt("applied", `Applied: ${p.title}`, decided, p.id);
}
for (let i = 0; i < 2; i++) {
  const created = daysAgo(12, 10);
  const decided = daysAgo(9 + i, 12);
  const p = await prisma.proposal.create({
    data: {
      workspaceId: W,
      type: "task",
      title: `Rejected suggestion L${i + 1}`,
      confidence: 64,
      source: "gmail",
      detail: {},
      status: "rejected",
      createdAt: created,
      decidedAt: decided,
    },
  });
  await auditAt("proposed", `AI proposed: ${p.title}`, created, p.id);
  await auditAt("rejected", `Rejected: ${p.title}`, decided, p.id);
}

const pendingCount = await prisma.proposal.count({ where: { workspaceId: W, status: "pending" } });
console.log("seed done. pending proposals:", pendingCount);
await prisma.$disconnect();
