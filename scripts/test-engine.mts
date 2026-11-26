/**
 * Engine end-to-end test on the demo workspace: inserts fresh captures
 * (two real sales signals + one newsletter that should be ignored),
 * runs the proposal engine against the real Gemini API, and prints the
 * proposals it created. Run: pnpm tsx --conditions=react-server scripts/test-engine.mts
 */
import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../src/generated/prisma/client";
import { runProposalEngine } from "../src/lib/engine";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function main() {
  const demo = await prisma.user.findUnique({ where: { email: "demo@crmautopilot.dev" } });
  if (!demo) throw new Error("demo user missing — run seed-demo first");
  const membership = await prisma.membership.findFirst({ where: { userId: demo.id } });
  if (!membership) throw new Error("demo workspace missing");
  const ws = membership.workspaceId;

  const stamp = Date.now();
  const captures = [
    {
      kind: "email",
      externalId: `test-${stamp}-1`,
      title: "Re: Ostro Media annual — legal review",
      fromLabel: "Tom Becker <tom@ostromedia.example>",
      snippet:
        "Hi Alex — we're happy with the terms. Legal is reviewing the final draft now; expect our signature by Friday. Please set the start date for December 1.",
      occurredAt: new Date(),
    },
    {
      kind: "email",
      externalId: `test-${stamp}-2`,
      title: "Demo next week?",
      fromLabel: "Grace Liu <grace@pinehost.example>",
      snippet:
        "Hi, I'm Grace, ops lead at Pinehost. Saw your tool mentioned in our Slack — can we get a demo next week? I'm the right person to talk to on our side.",
      occurredAt: new Date(),
    },
    {
      kind: "email",
      externalId: `test-${stamp}-3`,
      title: "Product Hunt Daily — today's top launches",
      fromLabel: "Product Hunt <digest@producthunt.example>",
      snippet: "Here are today's top products: a new AI calendar, a habit tracker, and 3 more.",
      occurredAt: new Date(),
    },
    {
      kind: "meeting",
      externalId: `test-${stamp}-4`,
      title: "Datawise expansion — pricing review",
      fromLabel: "Priya Nair, Datawise team",
      snippet:
        "Meeting notes: Datawise agreed to expand from 20 to 35 seats. Priya asked for the updated quote by Monday.",
      occurredAt: new Date(),
    },
  ];
  for (const c of captures) {
    await prisma.capture.create({ data: { workspaceId: ws, ...c } });
  }

  const before = await prisma.proposal.count({ where: { workspaceId: ws } });
  const result = await runProposalEngine(ws);
  const fresh = await prisma.proposal.findMany({
    where: { workspaceId: ws },
    orderBy: { createdAt: "desc" },
    take: result.proposals + 2,
  });
  const processed = await prisma.capture.count({
    where: { workspaceId: ws, processedAt: { not: null } },
  });

  console.log(`captures read: ${result.capturesRead}, proposals created: ${result.proposals} (before=${before}, processed total=${processed})`);
  for (const p of fresh.slice(0, result.proposals)) {
    console.log(`- [${p.type}] ${p.title}`);
    console.log(`  reason: ${p.reason}`);
    console.log(`  detail: ${JSON.stringify(p.detail)}`);
  }
}

main()
  .catch((e) => {
    console.error("ENGINE TEST FAILED:", e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
