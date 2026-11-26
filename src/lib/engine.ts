import "server-only";

import { aiComplete, parseAiJson } from "@/lib/ai";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * The proposal engine — the product's brain.
 *
 * Reads unprocessed captures (emails + meetings) alongside the
 * workspace's mirrored deals, asks the AI what should change in the
 * CRM, validates every suggestion against the real deal list, and
 * stores the survivors as pending Proposals. A human approves before
 * anything is applied — the engine never writes to the CRM itself.
 *
 * It also maintains deal health flags with plain rules (silence is a
 * fact, not an opinion): long silence late in the pipeline = going
 * cold; early silence = no reply yet.
 */

const STAGE_LABELS = ["New", "Contacted", "Meeting booked", "Proposal sent", "Negotiation", "Won"];

type RawProposal = {
  captureExternalId?: string;
  type?: string;
  title?: string;
  reason?: string;
  detail?: Record<string, unknown>;
};

const VALID_TYPES = new Set([
  "deal_stage",
  "deal_field",
  "new_contact",
  "new_deal",
  "followup_draft",
  "task",
]);

export async function runProposalEngine(
  workspaceId: string,
): Promise<{ proposals: number; capturesRead: number }> {
  const captures = await prisma.capture.findMany({
    where: { workspaceId, processedAt: null },
    orderBy: { occurredAt: "asc" },
    take: 30,
  });

  await refreshHealthFlags(workspaceId);
  if (captures.length === 0) return { proposals: 0, capturesRead: 0 };

  const deals = await prisma.crmDeal.findMany({
    where: { workspaceId },
    select: { externalId: true, name: true, company: true, stage: true, amount: true },
  });
  const dealByExternalId = new Map(deals.map((d) => [d.externalId, d]));

  const system = [
    "You are the AI inside CRM Autopilot. You read a sales team's recent emails and meetings and propose CRM updates. A human approves every proposal before anything changes, so be precise and conservative: propose only changes the evidence clearly supports.",
    "Answer with a JSON array only. Each item: {\"captureExternalId\": string, \"type\": one of deal_stage|deal_field|new_contact|new_deal|followup_draft|task, \"title\": short plain-English summary, \"reason\": 1-2 sentences citing the evidence, \"detail\": object}.",
    "For deal_stage detail: {\"dealExternalId\": <id from the deal list>, \"fromStage\": <current stage>, \"toStage\": <one of: " + STAGE_LABELS.join(" | ") + ">}.",
    "For deal_field detail: {\"dealExternalId\": <id>, \"fieldLabel\": e.g. \"Close date\", \"toValue\": string}.",
    "For followup_draft detail: {\"draftBody\": the full short email text, \"toEmail\": the recipient email if it appears in the evidence, \"subject\": a short subject line}. For new_contact detail: {\"contactName\": string, \"contactEmail\": string}.",
    "If an item needs no CRM change (newsletters, scheduling chit-chat, spam, personal mail), omit it. Never invent deals, people, amounts or dates that are not in the evidence.",
  ].join("\n");

  const user = [
    "DEALS IN THE CRM:",
    deals.length
      ? deals
          .map(
            (d) =>
              `- id=${d.externalId} | ${d.company ?? ""} ${d.name} | stage=${d.stage} | amount=${d.amount ?? "?"}`,
          )
          .join("\n")
      : "(none yet)",
    "",
    "NEW EMAILS AND MEETINGS:",
    captures
      .map(
        (c) =>
          `[${c.kind} id=${c.externalId}] ${c.occurredAt.toISOString()} | ${c.title} | from: ${c.fromLabel ?? "?"} | ${c.snippet ?? ""}`,
      )
      .join("\n"),
  ].join("\n");

  let created = 0;
  let readOk = false;
  try {
    const answer = await aiComplete([
      { role: "system", content: system },
      { role: "user", content: user },
    ]);
    const raw = parseAiJson<RawProposal[]>(answer) ?? [];
    readOk = true;
    const captureByExternalId = new Map(captures.map((c) => [c.externalId, c]));

    for (const item of raw) {
      if (!item.type || !VALID_TYPES.has(item.type) || !item.title || !item.reason) continue;
      const capture = item.captureExternalId
        ? captureByExternalId.get(item.captureExternalId)
        : undefined;
      const detail = (item.detail ?? {}) as Record<string, unknown>;

      // Deal-bound proposals must point at a real deal and a real stage.
      if (item.type === "deal_stage" || item.type === "deal_field") {
        const deal = dealByExternalId.get(String(detail.dealExternalId ?? ""));
        if (!deal) continue;
        if (item.type === "deal_stage") {
          if (!STAGE_LABELS.includes(String(detail.toStage ?? ""))) continue;
          detail.fromStage = deal.stage;
        }
      }

      const proposal = await prisma.proposal.create({
        data: {
          workspaceId,
          type: item.type,
          title: item.title.slice(0, 300),
          reason: item.reason.slice(0, 1000),
          source: capture?.kind === "meeting" ? "calendar" : "gmail",
          sourceRef: capture?.externalId ?? null,
          detail: detail as Prisma.InputJsonValue,
        },
      });
      await prisma.auditEvent.create({
        data: {
          workspaceId,
          proposalId: proposal.id,
          action: "proposed",
          summary: proposal.title,
        },
      });
      created++;
    }
  } finally {
    // Captures are marked read only when the AI actually answered —
    // a transient provider failure must not silently swallow them.
    if (readOk) {
      await prisma.capture.updateMany({
        where: { id: { in: captures.map((c) => c.id) } },
        data: { processedAt: new Date() },
      });
    }
  }

  return { proposals: created, capturesRead: captures.length };
}

/** Deterministic health flags from silence — no AI involved. */
export async function refreshHealthFlags(workspaceId: string): Promise<void> {
  const deals = await prisma.crmDeal.findMany({ where: { workspaceId } });
  const now = Date.now();
  for (const deal of deals) {
    if (deal.healthFlag === "promise_due") continue; // human/AI promise tracking wins
    if (!deal.lastActivityAt || deal.stage === "Won") {
      if (deal.healthFlag) {
        await prisma.crmDeal.update({ where: { id: deal.id }, data: { healthFlag: null, healthNote: null } });
      }
      continue;
    }
    const silentDays = Math.floor((now - deal.lastActivityAt.getTime()) / 86_400_000);
    let flag: string | null = null;
    let note: string | null = null;
    if (silentDays >= 7 && (deal.stage === "Proposal sent" || deal.stage === "Negotiation")) {
      flag = "going_cold";
      note = `No activity for ${silentDays} days at ${deal.stage}. Deals at this stage usually die quietly — a short follow-up is drafted in Approvals when the AI finds one.`;
    } else if (silentDays >= 3 && deal.stage === "Contacted") {
      flag = "no_reply";
      note = `No reply for ${silentDays} days since first contact.`;
    }
    if (flag !== deal.healthFlag) {
      await prisma.crmDeal.update({
        where: { id: deal.id },
        data: { healthFlag: flag, healthNote: note },
      });
    }
  }
}
