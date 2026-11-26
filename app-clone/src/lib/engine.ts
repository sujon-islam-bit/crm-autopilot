import "server-only";
import { prisma } from "./db";
import { audit } from "./audit";
import { askAiJson } from "./ai";
import { STAGES, daysSilent } from "./constants";
import type { Prisma } from "../generated/prisma/client";

const TYPES = [
  "deal_stage",
  "deal_field",
  "new_contact",
  "new_deal",
  "followup_draft",
  "task",
  "hygiene_fix",
] as const;

/** Deterministic health flags from silence — never overwrites promise_due. */
export async function refreshHealthFlags(workspaceId: string) {
  const deals = await prisma.crmDeal.findMany({ where: { workspaceId } });
  for (const d of deals) {
    const silent = daysSilent(d.lastActivityAt);
    let flag: string | null = null;
    let note: string | null = null;
    if (d.stage !== "Won") {
      if ((d.stage === "Proposal sent" || d.stage === "Negotiation") && silent >= 7) {
        flag = "going_cold";
        note = `No activity for ${silent} days at ${d.stage}`;
      } else if ((d.stage === "Contacted" || d.stage === "Discovery") && silent >= 14) {
        flag = "no_reply";
        note = `No activity for ${silent} days`;
      }
    }
    if (d.healthFlag === "promise_due") continue;
    if (flag !== d.healthFlag) {
      await prisma.crmDeal.update({ where: { id: d.id }, data: { healthFlag: flag, healthNote: note } });
    }
  }
}

function sourceFor(capture: { kind: string; source: string }): string {
  if (capture.kind === "call") return "call";
  if (capture.kind === "chat") return "chat";
  if (capture.source === "calendar") return "calendar";
  return "gmail";
}

type AiItem = {
  type?: string;
  title?: string;
  reason?: string;
  confidence?: number;
  captureIndex?: number;
  dealExternalId?: string;
  detail?: Record<string, unknown>;
};

export async function runEngineForWorkspace(workspaceId: string): Promise<{
  proposals: number;
  processed: number;
  error?: string;
}> {
  await refreshHealthFlags(workspaceId);
  const captures = await prisma.capture.findMany({
    where: { workspaceId, processedAt: null },
    orderBy: { occurredAt: "asc" },
    take: 30,
  });
  if (captures.length === 0) return { proposals: 0, processed: 0 };

  const deals = await prisma.crmDeal.findMany({
    where: { workspaceId },
    select: { externalId: true, name: true, company: true, stage: true, amount: true },
  });
  const dealIds = new Set(deals.map((d) => d.externalId));

  const captureText = captures
    .map(
      (c, i) =>
        `[${i}] (${c.kind}/${c.source}, ${c.occurredAt.toISOString()}) From: ${c.fromLabel ?? "—"}\nTitle: ${c.title}\n${(c.body || c.snippet || "").slice(0, 1500)}`,
    )
    .join("\n\n---\n\n");
  const dealText = deals
    .map((d) => `- ${d.externalId}: "${d.name}" (${d.company ?? "?"}) stage=${d.stage} amount=${d.amount ?? "?"}`)
    .join("\n");

  const prompt = `You are the AI engine of a CRM autopilot. Read the captured emails, meetings, calls and chats and propose CRM updates. Only propose changes backed by clear evidence in a capture. Newsletters, marketing mail and internal chatter produce NO proposals.

Current deals (reference by externalId):
${dealText}

Valid stages: ${STAGES.join(", ")}.

Captures:
${captureText}

Reply with a JSON array of proposal objects:
{"type": "deal_stage"|"deal_field"|"new_contact"|"new_deal"|"followup_draft"|"task",
 "title": "short human title",
 "reason": "one sentence citing the evidence",
 "confidence": 0-100 integer (how sure you are),
 "captureIndex": index of the capture this is based on,
 "dealExternalId": "id from the deal list (required for deal_stage/deal_field)",
 "detail": for deal_stage {"field":"stage","fromValue":"<current stage>","toValue":"<new stage>"};
           for deal_field {"field":"closeDate"|"amount","fromValue":...,"toValue":...};
           for new_contact {"name","email","company","title"};
           for new_deal {"name","company","amount","stage"};
           for followup_draft {"toEmail","toName","subject","draftBody"};
           for task {"taskTitle","dueHint"}}
If nothing is worth proposing, reply [].`;

  const raw = await askAiJson(prompt);
  if (raw === null) {
    // The AI did not answer — captures must NOT be marked processed.
    return { proposals: 0, processed: 0, error: "AI unavailable" };
  }
  const items = (Array.isArray(raw) ? raw : []) as AiItem[];

  let created = 0;
  for (const item of items) {
    if (!item.type || !TYPES.includes(item.type as (typeof TYPES)[number])) continue;
    if (!item.title) continue;
    const idx = typeof item.captureIndex === "number" ? item.captureIndex : -1;
    const capture = idx >= 0 && idx < captures.length ? captures[idx] : captures[0];
    const detail = (item.detail ?? {}) as Record<string, unknown>;

    let dealExternalId: string | null = item.dealExternalId ?? null;
    if (item.type === "deal_stage" || item.type === "deal_field") {
      if (!dealExternalId || !dealIds.has(dealExternalId)) continue;
      const deal = deals.find((d) => d.externalId === dealExternalId)!;
      if (item.type === "deal_stage") {
        const to = String(detail.toValue ?? "");
        if (!STAGES.includes(to as (typeof STAGES)[number])) continue;
        detail.fromValue = deal.stage;
        detail.dealName = deal.name;
        detail.company = deal.company;
        detail.amount = deal.amount;
      } else {
        detail.dealName = deal.name;
        detail.company = deal.company;
      }
    }
    if (item.type === "new_contact" && !detail.name) continue;
    if (item.type === "new_deal" && !detail.name) continue;

    const confidence =
      typeof item.confidence === "number" && Number.isFinite(item.confidence)
        ? Math.max(0, Math.min(100, Math.round(item.confidence)))
        : null;

    const proposal = await prisma.proposal.create({
      data: {
        workspaceId,
        type: item.type,
        title: item.title.slice(0, 200),
        detail: detail as Prisma.InputJsonValue,
        reason: (item.reason ?? "").slice(0, 500),
        source: sourceFor(capture),
        confidence,
        captureId: capture.id,
        dealExternalId,
        status: "pending",
      },
    });
    created++;
    await audit(workspaceId, "proposed", `AI proposed: ${proposal.title}`, {
      meta: { proposalId: proposal.id, type: proposal.type },
    });
  }

  await prisma.capture.updateMany({
    where: { id: { in: captures.map((c) => c.id) } },
    data: { processedAt: new Date() },
  });
  await refreshHealthFlags(workspaceId);
  return { proposals: created, processed: captures.length };
}
