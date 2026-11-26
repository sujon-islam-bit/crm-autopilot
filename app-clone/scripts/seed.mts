// Seed for the CleanPipe clone demo workspace.
// Every number on the Command Center is a real row: open pipeline sums to
// $1,240,000, 14 pending proposals, hygiene counts 19/24/31/8, rep-time
// saved 630 min this week vs 562 last week (+12%), queue delta +3.
// Review Queue v2 (2026-11-26): the 14 pending proposals are the ChatGPT
// design's set (Acme 96 / Sarah Lee 94 / NovaTech 91 …), each with a tab
// category — Deal Updates 6 · New Contacts 3 · Enrichment 3 · Follow-ups 2
// · Field Fixes 0 — and the workspace health score is 98 (design top pill).
// Pipeline Compare (2026-11-26): the base-bucket deals are spread 31–59
// days back (the dashboard pulse only needs them before last Monday) so
// 30-day comparisons have an honest base; 2 Lost + 1 extra Won deal make
// the win rate real; applied stage-change / close-date history proposals
// (below) give every Previous Stage, Days in Stage, movement-chart
// previous bar and tab count a traceable row. History proposals carry NO
// savedMinutes and are decided either >7 days ago or created+decided
// inside the last 7 days, so the queue delta (+3) and rep time (630/562)
// are untouched.
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
const minsAgo = (m: number) => new Date(now.getTime() - m * 60_000);
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
await prisma.healthSnapshot.deleteMany();
await prisma.guardrailSetting.deleteMany();
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
  data: { name: "Acme Sales", plan: "trial", healthScore: 98, healthDelta: 11 },
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
  // BASE bucket (before last week) — 850,000. CreatedAt spread 31–59 days
  // back (Pipeline Compare needs a real previous-30-days base; the pulse
  // only requires "before last Monday", which still holds).
  ["hs-201", "Acme Corp", 120000, "Discovery", daysAgo(33), { close: "2026-12-15", lastActDays: 2 }],
  ["hs-202", "Datawise", 142000, "Negotiation", daysAgo(47), { lastActDays: 1 }],
  ["hs-203", "Brightline", 110000, "Proposal sent", daysAgo(36), { close: "2026-12-22", lastActDays: 2 }],
  ["hs-204", "CloudFlow", 96000, "Meeting booked", daysAgo(42), { lastActDays: 1 }],
  ["hs-205", "Vale Clinics", 92000, "Meeting booked", daysAgo(39), { lastActDays: 3 }],
  ["hs-206", "Ostro Media", 88000, "Negotiation", daysAgo(45), { close: "2026-12-05", lastActDays: 2 }],
  ["hs-207", "Northstar", 85000, "Negotiation", daysAgo(51), { lastActDays: 14 }],
  ["hs-208", "Pinehost", 51000, "Contacted", daysAgo(31), { lastActDays: 2 }],
  ["hs-210", "PixelWorks", 18000, "Proposal sent", daysAgo(54), { owner: null, lastActDays: 33 }],
  ["hs-212", "Zenith Labs", 15000, "Discovery", daysAgo(57), { lastActDays: 36 }],
  ["hs-219", "Moss Legal", 33000, "New", daysAgo(59), { lastActDays: 3 }],
  // LAST WEEK bucket (Mon–Sun) — +238,000 → 1,088,000
  ["hs-214", "Redwood", 12000, "Proposal sent", wk(-1, 0), { owner: null, lastActDays: 34 }],
  ["hs-211", "Bluepeak", 16000, "Contacted", wk(-1, 1), { owner: null, lastActDays: 40 }],
  ["hs-209", "Harbor Dental", 21000, "Contacted", wk(-1, 2), { lastActDays: 38 }],
  ["hs-224", "Copperline", 26000, "Contacted", wk(-1, 3), { lastActDays: 1 }],
  ["hs-223", "Northbeam", 34000, "Negotiation", wk(-1, 4), { lastActDays: 0 }],
  ["hs-218", "Gamma Solutions", 57000, "Discovery", wk(-1, 5), { lastActDays: 2 }],
  ["hs-221", "Koda Labs", 22000, "Meeting booked", wk(-1, 6), { lastActDays: 2 }],
  ["hs-222", "BetaFlow", 50000, "Discovery", wk(-1, 6), { lastActDays: 0 }],
  // THIS WEEK bucket (Mon–Sun) — +152,000 → 1,240,000
  ["hs-216", "Mesa Group", 9000, "Contacted", wk(0, 0), { owner: null, lastActDays: 37 }],
  ["hs-215", "Alto Labs", 11000, "New", wk(0, 1), { owner: null, lastActDays: 41 }],
  ["hs-213", "NovaTech", 14000, "Contacted", wk(0, 2), { owner: null, lastActDays: 44, close: "2026-12-20" }],
  ["hs-226", "Loomly", 18000, "New", wk(0, 3), { owner: null, lastActDays: 3 }],
  ["hs-225", "Vantage", 24000, "Proposal sent", wk(0, 4), { lastActDays: 2 }],
  ["hs-220", "Sunridge", 28000, "Contacted", wk(0, 5), { owner: null, lastActDays: 4, close: "2026-12-18" }],
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
    createdAt: daysAgo(50),
  },
});
// Terminal deals for Pipeline Compare (win rate = won / (won + lost) = 2/4).
// Aldercroft: won 65 days ago (stage history below). Quantic: lost 35 days
// ago; its lastActivityAt is 20 days back (a closing email thread) so it
// stays out of hygiene's stale set (silent > 30). Castline: created inside
// the current 30-day period, lost 25 days ago.
await prisma.crmDeal.create({
  data: {
    workspaceId: W, externalId: "hs-230", source: "hubspot",
    name: "Aldercroft", company: "Aldercroft", stage: "Won", amount: 62000,
    ownerName: "Md Yasses", lastActivityAt: daysAgo(40), createdAt: daysAgo(75),
  },
});
await prisma.crmDeal.create({
  data: {
    workspaceId: W, externalId: "hs-228", source: "hubspot",
    name: "Quantic Systems", company: "Quantic Systems", stage: "Lost", amount: 30000,
    ownerName: "Md Yasses", lastActivityAt: daysAgo(20), createdAt: daysAgo(52),
  },
});
await prisma.crmDeal.create({
  data: {
    workspaceId: W, externalId: "hs-229", source: "hubspot",
    name: "Castline", company: "Castline", stage: "Lost", amount: 18000,
    ownerName: "Md Yasses", lastActivityAt: daysAgo(25), createdAt: daysAgo(29),
  },
});
console.log("open pipeline total:", openTotal);

// ---------- contacts ----------
// The 12 named contacts carry industry = NULL — they are exactly the 12
// records the "Fix Missing Field: Industry" proposal fills with 'Software'.
// Every other contact gets an industry so the apply touches exactly 12.
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
  ["Lucy Meyer", "lucy@fernhill.com", "Gamma Solutions", "Ops Manager"],
  ["Omar Farouk", "omar@pinehost.com", "Pinehost", "CEO"],
  ["Grace Liu", "grace@kiteandanchor.com", "Kite & Anchor", "Partner"],
  ["Noah Berg", "noah@northbeam.io", "Northbeam", "VP Sales"],
];
// createdAt is backdated 32–40 days (Data Cleanup trend reconstruction:
// every named contact already existed across the whole 30-day snapshot
// window — only their industry is missing, which is not a hygiene count).
const namedCreated = [32, 33, 34, 35, 36, 37, 38, 39, 40, 33, 34, 35];
for (let i = 0; i < named.length; i++) {
  const [name, email, company, title] = named[i];
  await prisma.crmContact.create({
    data: { workspaceId: W, name, email, company, title, industry: null, createdAt: daysAgo(namedCreated[i]) },
  });
}
// Jane Doe exists twice — the pair the "Merge Duplicate Contacts" proposal
// merges. The second record is the workspace's 19th duplicate row.
const janeMaster = await prisma.crmContact.create({
  data: { workspaceId: W, name: "Jane Doe", email: "jane@acme.com", company: "Acme Corp", title: "Operations Director", industry: "Software", createdAt: daysAgo(35) },
});
const janeDuplicate = await prisma.crmContact.create({
  data: { workspaceId: W, name: "Jane Doe", email: "jane@acme.com", company: "Acme Corp", title: "Operations Director", industry: "Software", createdAt: daysAgo(6) },
});
// 16 contacts with a missing field (8 without email, 8 without title).
// Anna Lindberg sits in the no-title half — she is the Enrich proposal's
// target (LinkedIn supplies her title).
const missingNames = [
  "Ravi Menon", "Sofia Rossi", "Liam Doyle", "Ingrid Voss", "Pavel Novak", "Mia Chen",
  "Diego Fuentes", "Karl Weber", "Anna Lindberg", "Nina Petrova", "Owen Hart", "Lena Fischer",
  "Marco Bianchi", "Eva Novak", "Sam Whitfield", "Tara O'Brien",
];
const fillerIndustries = ["Technology", "Healthcare", "Finance", "Retail", "Manufacturing"];
let annaId = "";
for (let i = 0; i < missingNames.length; i++) {
  const noEmail = i < 8;
  const c = await prisma.crmContact.create({
    data: {
      workspaceId: W,
      name: missingNames[i],
      email: noEmail ? null : `contact${i}@example.com`,
      company: "Prospect Co",
      title: noEmail ? "Manager" : null,
      industry: fillerIndustries[i % fillerIndustries.length],
      // Backdated 31–38 days: these records (and their missing fields)
      // predate the 30-day snapshot window.
      createdAt: daysAgo(31 + (i % 8)),
    },
  });
  if (missingNames[i] === "Anna Lindberg") annaId = c.id;
}
// 18 more duplicate rows (same email as an existing contact) — with Jane's
// second record above, duplicates total 19.
const dupSources = [...named, ...missingNames.slice(8).map((n, i) => [n, `contact${i + 8}@example.com`, "Prospect Co", "Manager"] as const)];
// The duplicate rows arrived across the last 22 days — their createdAt
// spread is what the snapshot reconstruction reads.
const dupCreated = [3, 5, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22];
for (let i = 0; i < 18; i++) {
  const [name, email, company, title] = dupSources[i % dupSources.length];
  await prisma.crmContact.create({
    data: { workspaceId: W, name, email, company, title, industry: fillerIndustries[i % fillerIndustries.length], createdAt: daysAgo(dupCreated[i]) },
  });
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
    body: "Priya Nair: Legal has signed off on our side. We will send the MSA today. If you can move the close date to November 30, our finance team can release the budget this quarter. Yasses: Perfect — I'll update the deal stage to Negotiation and move the close date. Priya: Amount stays at $120,000. Priya: …let's move forward with the proposal by end of this month.",
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
// Captures behind the Review Queue v2 proposals (evidence sources).
const novatechCapture = await prisma.capture.create({
  data: {
    workspaceId: W,
    kind: "meeting",
    source: "calendar",
    externalId: "cal-novatech-qbr",
    title: "QBR — NovaTech",
    fromLabel: "NovaTech team",
    snippet: "Close moved to Dec 12.",
    body: "NovaTech QBR. Their board meets on December 10, so the close date moves from December 20 to December 12 (per meeting). Everything else on the deal is unchanged.",
    occurredAt: hoursAgo(1),
    processedAt: hoursAgo(1),
  },
});
const zenithCapture = await prisma.capture.create({
  data: {
    workspaceId: W,
    kind: "email",
    source: "gmail",
    externalId: "gmail-zenith-thread",
    title: "Proposal — Zenith Labs",
    fromLabel: "Rachel Ortiz <rachel@zenithlabs.com>",
    snippet: "No reply in 6 days",
    body: "Thread: Yasses sent the Zenith Labs proposal and pricing six days ago. Rachel Ortiz opened it twice. No reply has been received yet — a follow-up draft is warranted.",
    occurredAt: daysAgo(6, 9),
    processedAt: hoursAgo(2),
  },
});
const gammaCapture = await prisma.capture.create({
  data: {
    workspaceId: W,
    kind: "call",
    source: "zoom",
    externalId: "zoom-gamma-review",
    title: "Zoom call — Gamma Solutions budget review",
    fromLabel: "Lucy Meyer (Gamma Solutions)",
    snippet: "Budget approved — ready for proposal.",
    body: "Lucy Meyer: Finance approved the budget this morning. We are ready for the proposal — please move the deal forward. Yasses: Will do, I'll advance it to Proposal sent.",
    occurredAt: hoursAgo(3),
    processedAt: hoursAgo(2),
  },
});
const vectorCapture = await prisma.capture.create({
  data: {
    workspaceId: W,
    kind: "call",
    source: "zoom",
    externalId: "zoom-vector-product",
    title: "Product call — Vector Corp",
    fromLabel: "Vector Corp team",
    snippet: "Walked through the reporting module.",
    body: "Product call with Vector Corp. Walked through the reporting module and the new export options. They asked for a written summary of the call — the meeting note should be added to their record.",
    occurredAt: hoursAgo(4),
    processedAt: hoursAgo(3),
  },
});
const pinehostCapture = await prisma.capture.create({
  data: {
    workspaceId: W,
    kind: "email",
    source: "gmail",
    externalId: "gmail-pinehost-demo",
    title: "Re: Pinehost demo",
    fromLabel: "Omar Farouk <omar@pinehost.com>",
    snippet: "Thursday works for the demo.",
    body: "Omar Farouk: Thursday works for the demo call — let's lock it in. Please move us to the meeting stage.",
    occurredAt: hoursAgo(5),
    processedAt: hoursAgo(4),
  },
});
const martaCapture = await prisma.capture.create({
  data: {
    workspaceId: W,
    kind: "email",
    source: "gmail",
    externalId: "gmail-marta-cc",
    title: "Vale Clinics — procurement intro",
    fromLabel: "James Park <james@valeclinics.com>",
    snippet: "Looping in Marta from procurement.",
    body: "James Park: Looping in Marta Ruiz — she leads procurement for Vale Clinics and should be a contact on our account.",
    occurredAt: daysAgo(1, 11),
    processedAt: daysAgo(1, 12),
  },
});
const datawiseCapture = await prisma.capture.create({
  data: {
    workspaceId: W,
    kind: "email",
    source: "gmail",
    externalId: "gmail-datawise-seats",
    title: "Re: Datawise seats",
    fromLabel: "Tom Becker <tom@datawise.co>",
    snippet: "Confirmed: 20 extra seats.",
    body: "Tom Becker: Confirming in writing — we will add the extra 20 seats, so the deal amount goes to $148,000.",
    occurredAt: daysAgo(1, 14),
    processedAt: daysAgo(1, 15),
  },
});
const davidCapture = await prisma.capture.create({
  data: {
    workspaceId: W,
    kind: "email",
    source: "gmail",
    externalId: "gmail-david-intro",
    title: "Intro — David Chen, CloudFlow",
    fromLabel: "David Chen <david@cloudflow.io>",
    snippet: "I lead engineering at CloudFlow.",
    body: "Hi — David Chen, Engineering Manager at CloudFlow. Elena passed me your details; I'll be your technical contact for the rollout.",
    occurredAt: daysAgo(2, 10),
    processedAt: daysAgo(2, 11),
  },
});
const kiteCapture = await prisma.capture.create({
  data: {
    workspaceId: W,
    kind: "chat",
    source: "chat",
    externalId: "wa-kite-budget",
    title: "WhatsApp — Grace Liu (Kite & Anchor)",
    fromLabel: "Grace Liu",
    snippet: "Budget approved.",
    body: "Grace Liu: Good news — budget is approved on our side. Happy to move into negotiation whenever you are.",
    occurredAt: daysAgo(2, 16),
    processedAt: daysAgo(2, 17),
  },
});
const annaCapture = await prisma.capture.create({
  data: {
    workspaceId: W,
    kind: "chat",
    source: "manual",
    externalId: "li-anna-lindberg",
    title: "LinkedIn profile — Anna Lindberg",
    fromLabel: "Anna Lindberg",
    snippet: "Operations Manager at Prospect Co.",
    body: "LinkedIn profile: Anna Lindberg — Operations Manager at Prospect Co. Her CRM contact record has no title yet; LinkedIn lists Operations Manager.",
    occurredAt: daysAgo(2, 9),
    processedAt: daysAgo(2, 10),
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

// ---------- the 14 pending proposals (Review Queue v2 design set) ----------
// Order + confidences follow the design; createdAt is staggered in minutes
// so the "Xm ago" column reads 2m, 5m, 7m, 10m, 12m, 15m, 17m, 20m, then
// 25–90m. Categories land exactly: Deal Updates 6 · New Contacts 3 ·
// Enrichment 3 · Follow-ups 2 · Field Fixes 0.
// 1 — Acme stage move (96%, deal_update)
await proposal({
  workspaceId: W,
  type: "deal_stage",
  category: "deal_update",
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
    closeToValue: "2026-11-30",
    amount: 120000,
    description: "Move this deal from Discovery to Negotiation based on recent call activity.",
    subline: "From Discovery → Negotiation",
    sourceLine: 'Src: Zoom • "Send MSA today"',
    duration: "02:17",
    evidenceTitle: "Zoom Call — Nov 24, 2026",
    evidenceQuote: "…let's move forward with the proposal by end of this month.",
    requiredOk: true,
    cascade: [
      { icon: "chart", text: "Increase Q4 Pipeline by +$45K" },
      { icon: "slack", text: "Triggers Slack notification in #deals" },
      { icon: "sync", text: "Updates revenue forecast" },
    ],
    diffRows: [
      { field: "Stage", current: "Discovery", proposed: "Negotiation", pill: true, edit: "stage" },
      { field: "Close Date", current: "Dec 15, 2026", proposed: "Nov 30, 2026", edit: "date", iso: "2026-11-30" },
      { field: "Next Step", current: "Send proposal", proposed: "Await feedback", edit: "text" },
    ],
  },
  status: "pending",
  createdAt: minsAgo(2),
});
// 2 — Sarah Lee contact (94%, new_contact)
await proposal({
  workspaceId: W,
  type: "new_contact",
  category: "new_contact",
  title: "Add Contact: Sarah Lee (VP Ops)",
  confidence: 94,
  source: "gmail",
  captureId: gmailCapture.id,
  reason: "Sara Lee introduced herself as VP Ops at Kite & Anchor in the email thread and asked to be the main contact.",
  detail: {
    name: "Sarah Lee",
    email: "sara.lee@kiteandanchor.com",
    company: "Kite & Anchor",
    title: "VP Ops",
    description: "Add Sarah Lee as a contact from the Gmail thread and enrich with LinkedIn.",
    subline: "From Gmail thread • Enrich with LinkedIn",
    sourceLine: "Src: Gmail thread • Enriched",
  },
  status: "pending",
  createdAt: minsAgo(5),
});
// 3 — NovaTech close date (91%, deal_update)
await proposal({
  workspaceId: W,
  type: "deal_field",
  category: "deal_update",
  title: "Update Close Date: NovaTech",
  confidence: 91,
  source: "calendar",
  captureId: novatechCapture.id,
  dealExternalId: "hs-213",
  reason: "In the QBR, NovaTech asked for the close to move from December 20 to December 12, ahead of their board meeting.",
  detail: {
    field: "closeDate",
    fromValue: "2026-12-20",
    toValue: "2026-12-12",
    description: "Move NovaTech's close date from Dec 20 to Dec 12, as agreed in the meeting.",
    subline: "Dec 20 → Dec 12 (per meeting)",
  },
  status: "pending",
  createdAt: minsAgo(7),
});
// 4 — Zenith Labs follow-up draft (91%, followup)
await proposal({
  workspaceId: W,
  type: "followup_draft",
  category: "followup",
  title: "Draft Follow-up: Zenith Labs",
  confidence: 91,
  source: "gmail",
  captureId: zenithCapture.id,
  dealExternalId: "hs-212",
  reason: "The proposal email to Zenith Labs has had no reply in 6 days.",
  detail: {
    toName: "Rachel Ortiz",
    toEmail: "rachel@zenithlabs.com",
    subject: "Following up — Zenith Labs proposal",
    draftBody: "Hi Rachel, just floating our proposal back to the top of your inbox. Happy to walk through the pricing whenever suits you.",
    description: "Draft a follow-up to Zenith Labs — the last email went unanswered.",
    subline: "Based on unanswered email",
  },
  status: "pending",
  createdAt: minsAgo(10),
});
// 5 — Industry fix (87%, enrichment) — applies to the 12 null-industry contacts
await proposal({
  workspaceId: W,
  type: "hygiene_fix",
  category: "enrichment",
  title: "Fix Missing Field: Industry",
  confidence: 87,
  source: "hygiene",
  reason: "12 contacts have no Industry value; their company profiles all point to Software.",
  detail: {
    kind: "industry",
    value: "Software",
    count: 12,
    iconKind: "building2",
    description: "12 contacts are missing an Industry value. Set them to 'Software' based on their company profiles.",
    subline: "Add 'Software' for 12 contacts",
    diffRows: [{ field: "Industry", current: "— (12 contacts)", proposed: "Software", edit: "text" }],
    cascade: [{ icon: "sync", text: "Updates 12 contact records in your CRM" }],
  },
  status: "pending",
  createdAt: minsAgo(12),
});
// 6 — Gamma Solutions to Proposal (84%, deal_update)
await proposal({
  workspaceId: W,
  type: "deal_stage",
  category: "deal_update",
  title: "Move Deal to Proposal",
  confidence: 84,
  source: "call",
  captureId: gammaCapture.id,
  dealExternalId: "hs-218",
  reason: "Lucy Meyer confirmed on the call that Gamma Solutions' budget is approved and they are ready for the proposal.",
  detail: {
    field: "stage",
    fromValue: "Discovery",
    toValue: "Proposal sent",
    iconKind: "shield",
    description: "Move Gamma Solutions from Discovery to Proposal sent — budget is approved.",
    subline: "Gamma Solutions • $57K",
  },
  status: "pending",
  createdAt: minsAgo(15),
});
// 7 — Merge Jane Doe duplicates (82%, enrichment)
await proposal({
  workspaceId: W,
  type: "hygiene_fix",
  category: "enrichment",
  title: "Merge Duplicate Contacts",
  confidence: 82,
  source: "hygiene",
  reason: "Two contact records share the email jane@acme.com.",
  detail: {
    kind: "merge",
    masterId: janeMaster.id,
    duplicateId: janeDuplicate.id,
    iconKind: "users",
    description: "Two contact records exist for Jane Doe at Acme Corp. Merge them into one master record.",
    subline: "jane@acme.com → Jane Doe",
    diffRows: [
      { field: "Master Record", current: "Jane Doe", proposed: "Jane Doe" },
      { field: "Duplicate", current: "Jane Doe (2nd record)", proposed: "Merged & removed" },
    ],
    cascade: [{ icon: "user", text: "Keeps one Jane Doe record in Contacts" }],
  },
  status: "pending",
  createdAt: minsAgo(17),
});
// 8 — Vector Corp meeting note (79%, followup)
await proposal({
  workspaceId: W,
  type: "task",
  category: "followup",
  title: "Add Meeting Note",
  confidence: 79,
  source: "call",
  captureId: vectorCapture.id,
  reason: "Vector Corp asked for a written summary of the product call on their record.",
  detail: {
    taskTitle: "Add meeting note — Vector Corp product call",
    noteBody: "Product call: walked through the reporting module and export options. Vector Corp asked for a written summary.",
    iconKind: "mailOpen",
    description: "Add the notes from the Vector Corp product call to their CRM record.",
    subline: "Product call with Vector Corp",
  },
  status: "pending",
  createdAt: minsAgo(20),
});
// 9 — Pinehost to Meeting booked (78%, deal_update)
await proposal({
  workspaceId: W,
  type: "deal_stage",
  category: "deal_update",
  title: "Advance Pinehost to Meeting booked",
  confidence: 78,
  source: "gmail",
  captureId: pinehostCapture.id,
  dealExternalId: "hs-208",
  reason: "Omar confirmed a demo call for Thursday in his reply.",
  detail: {
    field: "stage",
    fromValue: "Contacted",
    toValue: "Meeting booked",
    description: "Advance Pinehost from Contacted to Meeting booked — the demo is confirmed for Thursday.",
    subline: "From Contacted → Meeting booked",
  },
  status: "pending",
  createdAt: minsAgo(25),
});
// 10 — Marta Ruiz contact (77%, new_contact)
await proposal({
  workspaceId: W,
  type: "new_contact",
  category: "new_contact",
  title: "Add Contact: Marta Ruiz (Vale Clinics)",
  confidence: 77,
  source: "gmail",
  captureId: martaCapture.id,
  reason: "James Park cc'd Marta Ruiz as Vale Clinics' procurement lead.",
  detail: {
    name: "Marta Ruiz",
    email: "marta@valeclinics.com",
    company: "Vale Clinics",
    title: "Procurement Lead",
    description: "Add Marta Ruiz as a contact from the Gmail thread.",
    subline: "From Gmail thread • Procurement lead",
  },
  status: "pending",
  createdAt: minsAgo(32),
});
// 11 — Datawise amount (76%, deal_update)
await proposal({
  workspaceId: W,
  type: "deal_field",
  category: "deal_update",
  title: "Update Datawise amount to $148,000",
  confidence: 76,
  source: "gmail",
  captureId: datawiseCapture.id,
  dealExternalId: "hs-202",
  reason: "Tom confirmed the extra 20 seats in writing.",
  detail: {
    field: "amount",
    fromValue: 142000,
    toValue: 148000,
    description: "Raise the Datawise deal amount from $142,000 to $148,000 for the extra 20 seats.",
    subline: "$142,000 → $148,000",
  },
  status: "pending",
  createdAt: minsAgo(40),
});
// 12 — Enrich Anna Lindberg (75%, enrichment)
await proposal({
  workspaceId: W,
  type: "hygiene_fix",
  category: "enrichment",
  title: "Enrich Contact: Anna Lindberg",
  confidence: 75,
  source: "hygiene",
  captureId: annaCapture.id,
  reason: "Anna Lindberg's contact record has no title; her LinkedIn profile lists Operations Manager.",
  detail: {
    kind: "enrich",
    contactId: annaId,
    field: "title",
    toTitle: "Operations Manager",
    description: "Fill in Anna Lindberg's missing Title from her LinkedIn profile.",
    subline: "Add title from LinkedIn",
    diffRows: [{ field: "Title", current: "—", proposed: "Operations Manager", edit: "text" }],
  },
  status: "pending",
  createdAt: minsAgo(48),
});
// 13 — David Chen contact (74%, new_contact)
await proposal({
  workspaceId: W,
  type: "new_contact",
  category: "new_contact",
  title: "Add Contact: David Chen (CloudFlow)",
  confidence: 74,
  source: "gmail",
  captureId: davidCapture.id,
  reason: "David Chen introduced himself as CloudFlow's Engineering Manager and technical contact for the rollout.",
  detail: {
    name: "David Chen",
    email: "david@cloudflow.io",
    company: "CloudFlow",
    title: "Engineering Manager",
    description: "Add David Chen as a contact from the Gmail thread.",
    subline: "From Gmail thread • Eng Manager",
  },
  status: "pending",
  createdAt: minsAgo(55),
});
// 14 — Kite & Anchor to Negotiation (73%, deal_update)
await proposal({
  workspaceId: W,
  type: "deal_stage",
  category: "deal_update",
  title: "Advance Kite & Anchor to Negotiation",
  confidence: 73,
  source: "chat",
  captureId: kiteCapture.id,
  dealExternalId: "hs-217",
  reason: "Grace confirmed budget approval in the WhatsApp thread.",
  detail: {
    field: "stage",
    fromValue: "Proposal sent",
    toValue: "Negotiation",
    description: "Advance Kite & Anchor from Proposal sent to Negotiation — budget is approved.",
    subline: "From Proposal sent → Negotiation",
  },
  status: "pending",
  createdAt: minsAgo(70),
});

// ---------- applied history (Pipeline Compare) ----------
// Real applied proposals that record how deals reached their current
// stage / close date. They are the ONLY source the Pipeline page uses for
// Previous Stage, Days in Stage, the movement chart's previous-period
// bars, and the Progressed / Slipped tabs — every figure traces to one of
// these rows. No savedMinutes (rep time stays 630 vs 562); decidedAt is
// either >7 days ago or created+decided within the last 7 days, so the
// rolling queue-delta snapshot (+3) never sees them as pending.
async function stageHistory(
  dealExternalId: string,
  dealName: string,
  from: string,
  to: string,
  appliedAt: Date,
  reason: string,
) {
  // A movement can never predate the deal itself (the wk()-dated deals
  // shift with the weekday the seed runs on) — clamp to just after creation.
  const deal = await prisma.crmDeal.findFirst({
    where: { workspaceId: W, externalId: dealExternalId },
    select: { createdAt: true },
  });
  if (deal && appliedAt.getTime() <= deal.createdAt.getTime()) {
    appliedAt = new Date(deal.createdAt.getTime() + 2 * 3600_000);
  }
  const p = await proposal({
    workspaceId: W,
    type: "deal_stage",
    category: "deal_update",
    title: `Move ${dealName} to ${to}`,
    confidence: 90,
    source: "gmail",
    dealExternalId,
    reason,
    detail: { field: "stage", fromValue: from, toValue: to, _prevStage: from },
    status: "applied",
    createdAt: new Date(appliedAt.getTime() - 2 * 3600_000),
    decidedAt: appliedAt,
    appliedAt,
  });
  await auditAt("applied", `Applied: ${p.title}`, appliedAt, p.id);
  return p;
}
async function closeDateHistory(
  dealExternalId: string,
  dealName: string,
  fromIso: string,
  toIso: string,
  appliedAt: Date,
  reason: string,
) {
  const p = await proposal({
    workspaceId: W,
    type: "deal_field",
    category: "deal_update",
    title: `Update ${dealName} close date`,
    confidence: 88,
    source: "gmail",
    dealExternalId,
    reason,
    detail: { field: "closeDate", fromValue: fromIso, toValue: toIso, _prevCloseDate: fromIso },
    status: "applied",
    createdAt: new Date(appliedAt.getTime() - 2 * 3600_000),
    decidedAt: appliedAt,
    appliedAt,
  });
  await auditAt("applied", `Applied: ${p.title}`, appliedAt, p.id);
  return p;
}
// Older movements (shape the previous-period stage reconstruction)
await stageHistory("hs-230", "Aldercroft", "Negotiation", "Won", daysAgo(65, 15), "Signed after the final security review — Aldercroft closed.");
await stageHistory("hs-202", "Datawise", "Discovery", "Proposal sent", daysAgo(40, 15), "Discovery complete; the proposal went out with the seat breakdown.");
await stageHistory("hs-210", "PixelWorks", "Discovery", "Proposal sent", daysAgo(40, 16), "Proposal sent after the design-partner review.");
await stageHistory("hs-227", "Harbor Labs", "Negotiation", "Proposal sent", daysAgo(44, 15), "Commercial terms agreed in principle; proposal drafted.");
await stageHistory("hs-228", "Quantic Systems", "Negotiation", "Lost", daysAgo(35, 15), "Quantic chose a competitor on price and closed the evaluation.");
await stageHistory("hs-207", "Northstar", "Contacted", "Negotiation", daysAgo(28, 15), "Budget holder engaged; moved straight to negotiation.");
await stageHistory("hs-205", "Vale Clinics", "Discovery", "Meeting booked", daysAgo(25, 15), "James Park booked the procurement review meeting.");
await stageHistory("hs-229", "Castline", "Proposal sent", "Lost", daysAgo(25, 16), "Castline paused the project and the deal was marked lost.");
await stageHistory("hs-203", "Brightline", "Contacted", "Proposal sent", daysAgo(22, 15), "Proposal sent following the finance call.");
await stageHistory("hs-201", "Acme Corp", "New", "Discovery", daysAgo(20, 15), "First discovery call held with Priya Nair's team.");
await stageHistory("hs-202", "Datawise", "Proposal sent", "Negotiation", daysAgo(18, 15), "Tom Becker confirmed the seat expansion in writing — negotiation opened.");
await stageHistory("hs-204", "CloudFlow", "Contacted", "Meeting booked", daysAgo(15, 15), "Elena Rodriguez scheduled the technical deep-dive.");
await stageHistory("hs-208", "Pinehost", "New", "Contacted", daysAgo(12, 15), "Omar Farouk replied to the intro email.");
await stageHistory("hs-227", "Harbor Labs", "Proposal sent", "Won", daysAgo(12, 16), "Signed order form received — Harbor Labs closed won.");
await stageHistory("hs-206", "Ostro Media", "Proposal sent", "Negotiation", daysAgo(10, 15), "Aisha Khan opened negotiation on the annual terms.");
// Close dates that slipped later (Close Date Slipped tab)
await closeDateHistory("hs-203", "Brightline", "2026-12-08", "2026-12-22", daysAgo(15, 16), "Brightline's board moved the signing to December 22.");
await closeDateHistory("hs-206", "Ostro Media", "2026-11-20", "2026-12-05", daysAgo(9, 15), "Ostro's legal review pushed the close to December 5.");
// Recent movements (inside the last 7 days; created+decided there too)
await stageHistory("hs-223", "Northbeam", "Proposal sent", "Negotiation", daysAgo(6, 15), "Noah Berg brought in their VP Sales — negotiation started.");
await stageHistory("hs-221", "Koda Labs", "Contacted", "Meeting booked", daysAgo(4, 15), "Demo call booked with the Koda Labs team.");
await stageHistory("hs-222", "BetaFlow", "New", "Discovery", daysAgo(3, 15), "Discovery opened after Dana Kim's intro call.");

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

// ---------- apply batches (History) ----------
// Group the already-applied proposals into the batches the History
// screen lists: proposals applied within 2 hours of each other came
// from one approve action. The batch id carries the moment the action
// finished (its latest apply), formatted BATCH_YYYYMMDD_HHMM.
{
  const appliedRows = await prisma.proposal.findMany({
    where: { workspaceId: W, appliedAt: { not: null } },
    orderBy: { appliedAt: "asc" },
    select: { id: true, appliedAt: true },
  });
  const p2 = (n: number) => String(n).padStart(2, "0");
  let cluster: { id: string; at: Date }[] = [];
  const flush = async () => {
    if (cluster.length === 0) return;
    const at = cluster[cluster.length - 1].at;
    const batchId = `BATCH_${at.getFullYear()}${p2(at.getMonth() + 1)}${p2(at.getDate())}_${p2(at.getHours())}${p2(at.getMinutes())}`;
    for (const row of cluster) {
      await prisma.proposal.update({ where: { id: row.id }, data: { batchId } });
    }
    cluster = [];
  };
  for (const row of appliedRows) {
    if (!row.appliedAt) continue;
    const prev = cluster[cluster.length - 1];
    if (prev && row.appliedAt.getTime() - prev.at.getTime() > 2 * 3600_000) await flush();
    cluster.push({ id: row.id, at: row.appliedAt });
  }
  await flush();
}

// ---------- health snapshots (Data Cleanup trend) ----------
// 31 daily snapshots DERIVED from the rows above — never a freehand curve.
// For each past day d, an issue counts when the underlying record already
// existed at the end of that day (createdAt/occurredAt <= cutoff) and the
// live detector's rule held as of that day:
//   duplicate = a later-created record sharing a normalised email;
//   missing   = a contact with no title/email, or an open deal with no owner;
//   unlogged  = a processed meeting capture with no proposal;
//   stale     = an open deal silent for >30 days as of that day.
// Scores use the live formula (scoreFromCounts), so today's snapshot equals
// the live hygiene counts exactly (19/24/31/8 -> 98). Honest shape: the
// derived curve gently DECLINES across the month (100 -> 98) because the
// seeded issues accumulated as data arrived; the workspace's stored +11
// health delta predates this 30-day window.
{
  const { scoreFromCounts } = await import("../src/lib/hygiene");
  const snapContacts = await prisma.crmContact.findMany({
    where: { workspaceId: W },
    select: { email: true, title: true, createdAt: true },
  });
  const byEmail = new Map<string, Date[]>();
  for (const c of snapContacts) {
    if (!c.email) continue;
    const k = c.email.trim().toLowerCase();
    byEmail.set(k, [...(byEmail.get(k) ?? []), c.createdAt]);
  }
  const dupExtraDates: Date[] = [];
  for (const dates of byEmail.values()) {
    if (dates.length < 2) continue;
    dupExtraDates.push(...[...dates].sort((a, b) => a.getTime() - b.getTime()).slice(1));
  }
  const snapDeals = await prisma.crmDeal.findMany({
    where: { workspaceId: W, stage: { notIn: ["Won", "Lost"] } },
    select: { ownerName: true, lastActivityAt: true, createdAt: true },
  });
  const snapMeetings = await prisma.capture.findMany({
    where: { workspaceId: W, kind: "meeting", processedAt: { not: null }, proposals: { none: {} } },
    select: { occurredAt: true },
  });
  for (let d = 30; d >= 0; d--) {
    const cutoff = daysAgo(d, 23); // ~end of that day (23:05), after every seeded row's hour
    const ct = cutoff.getTime();
    const dup = dupExtraDates.filter((t) => t.getTime() <= ct).length;
    const missing =
      snapContacts.filter((c) => c.createdAt.getTime() <= ct && (!c.title || !c.email)).length +
      snapDeals.filter((x) => x.createdAt.getTime() <= ct && !x.ownerName).length;
    const unlogged = snapMeetings.filter((c) => c.occurredAt.getTime() <= ct).length;
    const stale = snapDeals.filter(
      (x) => x.createdAt.getTime() <= ct && x.lastActivityAt.getTime() + 31 * 86400_000 <= ct,
    ).length;
    const counts = { duplicates: dup, missing, unlogged, stale };
    const dayDate = new Date(cutoff);
    dayDate.setHours(0, 0, 0, 0);
    await prisma.healthSnapshot.create({
      data: {
        workspaceId: W,
        date: dayDate,
        score: scoreFromCounts(counts),
        dupCount: dup,
        missingCount: missing,
        unloggedCount: unlogged,
        staleCount: stale,
      },
    });
  }
  console.log("health snapshots seeded: 31 days");
}

const pendingCount = await prisma.proposal.count({ where: { workspaceId: W, status: "pending" } });
console.log("seed done. pending proposals:", pendingCount);
await prisma.$disconnect();
