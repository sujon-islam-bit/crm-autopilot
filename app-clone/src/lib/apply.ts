import "server-only";
import { prisma } from "./db";
import { audit } from "./audit";
import type { Prisma } from "../generated/prisma/client";

type Detail = Record<string, unknown>;

function str(v: unknown): string {
  return typeof v === "string" ? v : v == null ? "" : String(v);
}

/**
 * Write-back: approving a proposal applies it to the local CRM mirror (and,
 * when a live connection exists, the same change is what would be pushed to
 * HubSpot/Salesforce). Undo reverses exactly what apply did.
 */
export async function applyProposal(workspaceId: string, proposalId: string, userId?: string) {
  const p = await prisma.proposal.findFirst({ where: { id: proposalId, workspaceId } });
  if (!p || p.status !== "pending") return { ok: false, error: "Proposal is not pending" };
  const detail = { ...(p.detail as Detail) };

  try {
    if ((p.type === "deal_stage" || p.type === "deal_field") && p.dealExternalId) {
      const deal = await prisma.crmDeal.findFirst({
        where: { workspaceId, externalId: p.dealExternalId },
      });
      if (!deal) throw new Error("Deal not found");
      const field = str(detail.field) || (p.type === "deal_stage" ? "stage" : "");
      if (field === "stage") {
        detail._prevStage = deal.stage;
        await prisma.crmDeal.update({
          where: { id: deal.id },
          data: { stage: str(detail.toValue), lastActivityAt: new Date() },
        });
      } else if (field === "closeDate") {
        detail._prevCloseDate = deal.closeDate?.toISOString() ?? null;
        await prisma.crmDeal.update({
          where: { id: deal.id },
          data: { closeDate: new Date(str(detail.toValue)), lastActivityAt: new Date() },
        });
      } else if (field === "amount") {
        detail._prevAmount = deal.amount;
        await prisma.crmDeal.update({
          where: { id: deal.id },
          data: { amount: Number(detail.toValue), lastActivityAt: new Date() },
        });
      } else if (field === "healthFlag") {
        detail._prevHealthFlag = deal.healthFlag;
        await prisma.crmDeal.update({
          where: { id: deal.id },
          data: { healthFlag: "going_cold", healthNote: "Marked as stalled from the review queue" },
        });
      }
    } else if (p.type === "new_contact") {
      const email = str(detail.email) || null;
      const existing = email
        ? await prisma.crmContact.findFirst({ where: { workspaceId, email } })
        : null;
      if (!existing) {
        const c = await prisma.crmContact.create({
          data: {
            workspaceId,
            name: str(detail.name),
            email,
            company: str(detail.company) || null,
            title: str(detail.title) || null,
          },
        });
        detail._createdContactId = c.id;
      }
    } else if (p.type === "new_deal") {
      const deal = await prisma.crmDeal.create({
        data: {
          workspaceId,
          externalId: `local-${Date.now()}`,
          source: "local",
          name: str(detail.name),
          company: str(detail.company) || null,
          stage: str(detail.stage) || "New",
          amount: typeof detail.amount === "number" ? detail.amount : null,
        },
      });
      detail._createdDealId = deal.id;
    }
    // task / followup_draft / hygiene_fix: approval is the record itself —
    // the follow-up only leaves the building when a live Gmail connection
    // sends it; nothing is sent silently from here.
  } catch (e) {
    await prisma.proposal.update({
      where: { id: p.id },
      data: { status: "failed", decidedAt: new Date() },
    });
    await audit(workspaceId, "failed", `Apply failed: ${p.title}`, { userId });
    return { ok: false, error: e instanceof Error ? e.message : "Apply failed" };
  }

  await prisma.proposal.update({
    where: { id: p.id },
    data: {
      status: "applied",
      decidedAt: new Date(),
      appliedAt: new Date(),
      detail: detail as Prisma.InputJsonValue,
    },
  });
  await audit(workspaceId, "applied", `Applied: ${p.title}`, { userId, meta: { proposalId: p.id } });
  return { ok: true };
}

export async function rejectProposal(workspaceId: string, proposalId: string, userId?: string) {
  const p = await prisma.proposal.findFirst({ where: { id: proposalId, workspaceId } });
  if (!p || p.status !== "pending") return { ok: false };
  await prisma.proposal.update({
    where: { id: p.id },
    data: { status: "rejected", decidedAt: new Date() },
  });
  await audit(workspaceId, "rejected", `Rejected: ${p.title}`, { userId, meta: { proposalId: p.id } });
  return { ok: true };
}

export async function undoProposal(workspaceId: string, proposalId: string, userId?: string) {
  const p = await prisma.proposal.findFirst({ where: { id: proposalId, workspaceId } });
  if (!p || p.status !== "applied") return { ok: false, error: "Only applied proposals can be undone" };
  const detail = { ...(p.detail as Detail) };

  if ((p.type === "deal_stage" || p.type === "deal_field") && p.dealExternalId) {
    const deal = await prisma.crmDeal.findFirst({
      where: { workspaceId, externalId: p.dealExternalId },
    });
    if (deal) {
      const field = str(detail.field) || (p.type === "deal_stage" ? "stage" : "");
      if (field === "stage" && detail._prevStage) {
        await prisma.crmDeal.update({ where: { id: deal.id }, data: { stage: str(detail._prevStage) } });
      } else if (field === "closeDate") {
        await prisma.crmDeal.update({
          where: { id: deal.id },
          data: { closeDate: detail._prevCloseDate ? new Date(str(detail._prevCloseDate)) : null },
        });
      } else if (field === "amount") {
        await prisma.crmDeal.update({
          where: { id: deal.id },
          data: { amount: typeof detail._prevAmount === "number" ? detail._prevAmount : null },
        });
      } else if (field === "healthFlag") {
        await prisma.crmDeal.update({
          where: { id: deal.id },
          data: { healthFlag: (detail._prevHealthFlag as string | null) ?? null, healthNote: null },
        });
      }
    }
  } else if (p.type === "new_contact" && detail._createdContactId) {
    await prisma.crmContact.delete({ where: { id: str(detail._createdContactId) } }).catch(() => {});
  } else if (p.type === "new_deal" && detail._createdDealId) {
    await prisma.crmDeal.delete({ where: { id: str(detail._createdDealId) } }).catch(() => {});
  }

  await prisma.proposal.update({
    where: { id: p.id },
    data: { status: "undone", decidedAt: new Date() },
  });
  await audit(workspaceId, "undone", `Undone: ${p.title}`, { userId, meta: { proposalId: p.id } });
  return { ok: true };
}
