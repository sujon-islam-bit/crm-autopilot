/**
 * Demo seed for design review: one workspace ("Northwind Sales") with a
 * connected HubSpot + Google, mirrored deals, pending AI proposals and
 * an audit trail — the same shapes the real engines will produce.
 * Run: pnpm tsx scripts/seed-demo.mts
 */
import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../src/generated/prisma/client";
import { encryptSecret } from "../src/lib/crypto";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const hoursAgo = (h: number) => new Date(Date.now() - h * 3600 * 1000);
const daysAgo = (d: number) => new Date(Date.now() - d * 86_400_000);

async function main() {
  const email = "demo@crmautopilot.dev";
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log("demo user already exists — skipping");
    return;
  }

  const user = await prisma.user.create({
    data: { name: "Alex Morgan", email, emailVerified: true },
  });
  const workspace = await prisma.workspace.create({
    data: { name: "Northwind Sales", plan: "trial" },
  });
  await prisma.membership.create({
    data: { userId: user.id, workspaceId: workspace.id, role: "owner" },
  });
  const ws = workspace.id;

  await prisma.connection.createMany({
    data: [
      {
        workspaceId: ws,
        provider: "hubspot",
        accountEmail: "HubSpot portal 4821… (Northwind)",
        data: encryptSecret(JSON.stringify({ accessToken: "demo", refreshToken: "demo" })),
        createdById: user.id,
      },
      {
        workspaceId: ws,
        provider: "google",
        accountEmail: "alex@northwindsales.com",
        data: encryptSecret(JSON.stringify({ accessToken: "demo", refreshToken: "demo" })),
        createdById: user.id,
      },
    ],
  });

  const deals = [
    { externalId: "hs-101", name: "CloudFlow platform deal", company: "CloudFlow", stage: "Meeting booked", amount: 24000, ownerName: "Alex", lastActivityAt: hoursAgo(2) },
    { externalId: "hs-102", name: "Brightline renewal", company: "Brightline", stage: "Proposal sent", amount: 18500, ownerName: "Alex", lastActivityAt: daysAgo(9), healthFlag: "going_cold", healthNote: "Proposal sent 9 days ago. Two follow-ups, no reply. The AI drafted a shorter check-in." },
    { externalId: "hs-103", name: "Datawise expansion", company: "Datawise", stage: "Negotiation", amount: 42000, ownerName: "Priya", lastActivityAt: daysAgo(1) },
    { externalId: "hs-104", name: "Kite & Anchor onboarding", company: "Kite & Anchor", stage: "Contacted", amount: 9600, ownerName: "Alex", lastActivityAt: daysAgo(4), healthFlag: "no_reply", healthNote: "Intro email opened twice, no reply in 4 days." },
    { externalId: "hs-105", name: "Moss Legal pilot", company: "Moss Legal", stage: "New", amount: 7200, ownerName: "Priya", lastActivityAt: hoursAgo(26) },
    { externalId: "hs-106", name: "Fernhill Q3 order", company: "Fernhill", stage: "Proposal sent", amount: 15800, ownerName: "Alex", lastActivityAt: daysAgo(2), healthFlag: "promise_due", healthNote: "You promised revised pricing by today. No draft sent yet." },
    { externalId: "hs-107", name: "Ostro Media annual", company: "Ostro Media", stage: "Negotiation", amount: 31500, ownerName: "Alex", lastActivityAt: hoursAgo(5) },
    { externalId: "hs-108", name: "Vale Clinics rollout", company: "Vale Clinics", stage: "Won", amount: 27800, ownerName: "Priya", lastActivityAt: daysAgo(3) },
    { externalId: "hs-109", name: "Pinehost starter", company: "Pinehost", stage: "Contacted", amount: 5400, ownerName: "Alex", lastActivityAt: daysAgo(1) },
  ];
  for (const d of deals) {
    await prisma.crmDeal.create({ data: { workspaceId: ws, currency: "USD", ...d } });
  }

  const proposals = [
    {
      type: "deal_stage",
      title: "Move deal CloudFlow — $24,000 to Proposal sent",
      reason: "Sarah Chen replied on Gmail: “Send the proposal — we'd like to sign this month.” The meeting also ended with pricing agreed.",
      source: "gmail",
      createdAt: hoursAgo(1),
      detail: { dealExternalId: "hs-101", fromStage: "Meeting booked", toStage: "Proposal sent" },
    },
    {
      type: "followup_draft",
      title: "Send follow-up to David Ruiz at Brightline",
      reason: "The Brightline proposal has had no reply in 9 days. This draft is short and references his last email about budget timing.",
      source: "gmail",
      createdAt: hoursAgo(3),
      detail: { draftBody: "Hi David — floating this back up. If budget timing is the blocker, we can split the start: onboarding this month, full rollout in January. Want a 15-minute call Thursday?" },
    },
    {
      type: "new_contact",
      title: "Add new contact: Maria Lopez, VP Ops at Fernhill",
      reason: "Maria was cc'd on the Fernhill thread and confirmed the delivery dates. She is not in your CRM yet.",
      source: "gmail",
      createdAt: hoursAgo(5),
      detail: { contactName: "Maria Lopez", contactEmail: "maria@fernhill.example" },
    },
    {
      type: "task",
      title: "Create task: send revised pricing to Fernhill today",
      reason: "On yesterday's call you promised revised pricing by end of today. No email has been sent yet.",
      source: "calendar",
      createdAt: hoursAgo(6),
      detail: {},
    },
    {
      type: "deal_field",
      title: "Set close date Nov 30 on CloudFlow — $24,000",
      reason: "In the contract call, Sarah said they sign “before the end of November”. The deal currently has no close date.",
      source: "calendar",
      createdAt: hoursAgo(1),
      detail: { dealExternalId: "hs-101", fieldLabel: "Close date", toValue: "Nov 30" },
    },
  ];
  for (const p of proposals) {
    const created = await prisma.proposal.create({ data: { workspaceId: ws, ...p } });
    await prisma.auditEvent.create({
      data: {
        workspaceId: ws,
        proposalId: created.id,
        action: "proposed",
        summary: created.title,
        createdAt: p.createdAt,
      },
    });
  }

  const older = [
    { action: "connected", summary: "HubSpot connected — portal Northwind", createdAt: daysAgo(2) },
    { action: "connected", summary: "Gmail + Calendar connected — alex@northwindsales.com", createdAt: daysAgo(2) },
    { action: "applied", summary: "Move deal Ostro Media — $31,500 to Negotiation", createdAt: hoursAgo(20) },
    { action: "applied", summary: "Log call notes on Vale Clinics rollout", createdAt: hoursAgo(22) },
    { action: "applied", summary: "Add new contact: Tom Becker, CTO at Ostro Media", createdAt: hoursAgo(30) },
  ];
  for (const e of older) {
    await prisma.auditEvent.create({ data: { workspaceId: ws, ...e } });
  }

  console.log("seeded demo workspace:", ws);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
