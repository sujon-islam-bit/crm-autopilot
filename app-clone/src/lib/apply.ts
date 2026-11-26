import "server-only";
import { prisma } from "./db";
import { audit } from "./audit";
import type { Prisma } from "../generated/prisma/client";

type Detail = Record<string, unknown>;

function str(v: unknown): string {
  return typeof v === "string" ? v : v == null ? "" : String(v);
}

export type EditRow = { field: string; proposed: string };

function isoFrom(v: string): string {
  const t = Date.parse(v);
  return Number.isNaN(t) ? v : new Date(t).toISOString();
}

function numFrom(v: string): number {
  const n = Number(String(v).replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

/**
 * Edit Before Approval: translate the panel's edited "Proposed Value" cells
 * (field label + new value) into detail mutations, so Save & Approve applies
 * exactly what the user typed. Only rows the view marked editable reach here.
 */
function applyEditsToDetail(
  p: { type: string },
  detail: Detail,
  edits: EditRow[],
) {
  for (const e of edits) {
    const f = e.field;
    const v = e.proposed;
    if (p.type === "deal_stage") {
      if (f === "Stage") detail.toValue = v;
      else if (f === "Close Date") detail.closeToValue = isoFrom(v);
      else if (f === "Amount") detail.amountTo = numFrom(v);
      else if (f === "Next Step") detail.nextStep = v;
    } else if (p.type === "deal_field") {
      const field = str(detail.field);
      if (field === "closeDate" && f === "Close Date") detail.toValue = isoFrom(v);
      else if (field === "amount" && f === "Amount") detail.toValue = numFrom(v);
    } else if (p.type === "new_contact") {
      const map: Record<string, string> = { Name: "name", Email: "email", Company: "company", Title: "title" };
      if (map[f]) detail[map[f]] = v;
    } else if (p.type === "new_deal") {
      if (f === "Deal") detail.name = v;
      else if (f === "Company") detail.company = v;
      else if (f === "Amount") detail.amount = numFrom(v);
      else if (f === "Stage") detail.stage = v;
    } else if (p.type === "followup_draft") {
      if (f === "To") detail.toName = v;
      else if (f === "Subject") detail.subject = v;
    } else if (p.type === "task") {
      if (f === "Task") detail.taskTitle = v;
    } else if (p.type === "hygiene_fix") {
      if (detail.kind === "industry" && f === "Industry") detail.value = v;
      else if (detail.kind === "enrich" && f === "Title") detail.toTitle = v;
    }
  }
}

/**
 * Write-back: approving a proposal applies it to the local CRM mirror (and,
 * when a live connection exists, the same change is what would be pushed to
 * HubSpot/Salesforce). Undo reverses exactly what apply did.
 */
export async function applyProposal(
  workspaceId: string,
  proposalId: string,
  userId?: string,
  edits?: EditRow[],
) {
  const p = await prisma.proposal.findFirst({ where: { id: proposalId, workspaceId } });
  if (!p || p.status !== "pending") return { ok: false, error: "Proposal is not pending" };
  const detail = { ...(p.detail as Detail) };
  if (edits && edits.length > 0) applyEditsToDetail(p, detail, edits);

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
      // Compound proposals (e.g. a stage move that also brings the close
      // date forward, as in the Field Changes table) carry extra targets.
      if (detail.closeToValue && field !== "closeDate") {
        if (detail._prevCloseDate === undefined)
          detail._prevCloseDate = deal.closeDate?.toISOString() ?? null;
        await prisma.crmDeal.update({
          where: { id: deal.id },
          data: { closeDate: new Date(str(detail.closeToValue)), lastActivityAt: new Date() },
        });
      }
      if (typeof detail.amountTo === "number" && field !== "amount") {
        if (detail._prevAmount === undefined) detail._prevAmount = deal.amount;
        await prisma.crmDeal.update({
          where: { id: deal.id },
          data: { amount: detail.amountTo, lastActivityAt: new Date() },
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
    } else if (p.type === "hygiene_fix") {
      const kind = str(detail.kind);
      if (kind === "industry") {
        // Fill the Industry field on every contact still missing it.
        const targets = await prisma.crmContact.findMany({
          where: { workspaceId, industry: null },
          select: { id: true },
        });
        if (targets.length > 0) {
          detail._industryIds = targets.map((t) => t.id);
          await prisma.crmContact.updateMany({
            where: { id: { in: targets.map((t) => t.id) } },
            data: { industry: str(detail.value) || "Software" },
          });
        }
      } else if (kind === "merge") {
        // Merge duplicates for real: the duplicate record is removed and a
        // full snapshot is kept on the proposal so Undo can restore it.
        const dup = detail.duplicateId
          ? await prisma.crmContact.findFirst({ where: { id: str(detail.duplicateId), workspaceId } })
          : null;
        if (dup) {
          detail._mergedContact = {
            name: dup.name,
            email: dup.email,
            company: dup.company,
            title: dup.title,
            industry: dup.industry,
            externalId: dup.externalId,
          };
          await prisma.crmContact.delete({ where: { id: dup.id } });
        }
      } else if (kind === "enrich") {
        const contact = detail.contactId
          ? await prisma.crmContact.findFirst({ where: { id: str(detail.contactId), workspaceId } })
          : null;
        if (contact && detail.toTitle) {
          detail._prevTitle = contact.title;
          await prisma.crmContact.update({
            where: { id: contact.id },
            data: { title: str(detail.toTitle) },
          });
        }
      }
      // other hygiene kinds (missing/unlogged/stale from Data Cleanup):
      // approval is the record itself, as before.
    }
    // task / followup_draft: approval is the record itself —
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
      if (detail.closeToValue && field !== "closeDate") {
        await prisma.crmDeal.update({
          where: { id: deal.id },
          data: { closeDate: detail._prevCloseDate ? new Date(str(detail._prevCloseDate)) : null },
        });
      }
      if (typeof detail.amountTo === "number" && field !== "amount") {
        await prisma.crmDeal.update({
          where: { id: deal.id },
          data: { amount: typeof detail._prevAmount === "number" ? detail._prevAmount : null },
        });
      }
    }
  } else if (p.type === "new_contact" && detail._createdContactId) {
    await prisma.crmContact.delete({ where: { id: str(detail._createdContactId) } }).catch(() => {});
  } else if (p.type === "new_deal" && detail._createdDealId) {
    await prisma.crmDeal.delete({ where: { id: str(detail._createdDealId) } }).catch(() => {});
  } else if (p.type === "hygiene_fix") {
    const kind = str(detail.kind);
    if (kind === "industry" && Array.isArray(detail._industryIds)) {
      await prisma.crmContact.updateMany({
        where: { id: { in: (detail._industryIds as unknown[]).map((x) => str(x)) } },
        data: { industry: null },
      });
    } else if (kind === "merge" && detail._mergedContact) {
      const snap = detail._mergedContact as Detail;
      await prisma.crmContact.create({
        data: {
          workspaceId,
          name: str(snap.name),
          email: (snap.email as string | null) ?? null,
          company: (snap.company as string | null) ?? null,
          title: (snap.title as string | null) ?? null,
          industry: (snap.industry as string | null) ?? null,
          externalId: (snap.externalId as string | null) ?? null,
        },
      });
    } else if (kind === "enrich" && detail.contactId) {
      await prisma.crmContact.updateMany({
        where: { id: str(detail.contactId), workspaceId },
        data: { title: (detail._prevTitle as string | null) ?? null },
      });
    }
  }

  await prisma.proposal.update({
    where: { id: p.id },
    data: { status: "pending", decidedAt: null },
  });
  await audit(workspaceId, "undone", `Undone: ${p.title}`, { userId, meta: { proposalId: p.id } });
  return { ok: true };
}
