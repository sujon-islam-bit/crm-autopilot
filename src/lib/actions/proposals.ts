"use server";

import { revalidatePath } from "next/cache";

import { applyProposal, unapplyProposal } from "@/lib/apply";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, getMyWorkspace } from "@/lib/session";

/**
 * Proposal decisions. Approving a proposal applies the change (the
 * HubSpot write-back engine plugs in at `applyProposal`); rejecting
 * closes it; undo reverses an applied change. Every step writes an
 * AuditEvent — the Activity screen is the product's trust layer.
 */

async function ownedProposal(proposalId: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not signed in");
  const mine = await getMyWorkspace(user.id);
  if (!mine) throw new Error("No workspace");
  const proposal = await prisma.proposal.findFirst({
    where: { id: proposalId, workspaceId: mine.workspace.id },
  });
  if (!proposal) throw new Error("Proposal not found");
  return { user, workspace: mine.workspace, proposal };
}

function refresh() {
  revalidatePath("/dashboard");
  revalidatePath("/approvals");
  revalidatePath("/activity");
  revalidatePath("/pipeline");
}

export async function approveProposal(proposalId: string) {
  const { user, workspace, proposal } = await ownedProposal(proposalId);
  if (proposal.status !== "pending") return;

  // The write-back runs first; only a successful apply is recorded as
  // applied. A failure is honest: status "failed" + an audit event.
  try {
    await applyProposal(proposal);
  } catch {
    await prisma.proposal.update({
      where: { id: proposal.id },
      data: { status: "failed", decidedAt: new Date(), decidedById: user.id },
    });
    await prisma.auditEvent.create({
      data: {
        workspaceId: workspace.id,
        proposalId: proposal.id,
        action: "failed",
        summary: `Could not apply: ${proposal.title}`,
      },
    });
    refresh();
    return;
  }

  await prisma.proposal.update({
    where: { id: proposal.id },
    data: { status: "applied", decidedAt: new Date(), decidedById: user.id },
  });
  await prisma.auditEvent.create({
    data: {
      workspaceId: workspace.id,
      proposalId: proposal.id,
      action: "applied",
      summary: proposal.title,
    },
  });
  refresh();
}

export async function rejectProposal(proposalId: string) {
  const { user, workspace, proposal } = await ownedProposal(proposalId);
  if (proposal.status !== "pending") return;

  await prisma.proposal.update({
    where: { id: proposal.id },
    data: { status: "rejected", decidedAt: new Date(), decidedById: user.id },
  });
  await prisma.auditEvent.create({
    data: {
      workspaceId: workspace.id,
      proposalId: proposal.id,
      action: "rejected",
      summary: proposal.title,
    },
  });
  refresh();
}

export async function undoProposal(proposalId: string) {
  const { workspace, proposal } = await ownedProposal(proposalId);
  if (proposal.status !== "applied") return;

  await unapplyProposal(proposal).catch(() => null);

  await prisma.proposal.update({
    where: { id: proposal.id },
    data: { status: "undone" },
  });
  await prisma.auditEvent.create({
    data: {
      workspaceId: workspace.id,
      proposalId: proposal.id,
      action: "undone",
      summary: `Undid: ${proposal.title}`,
    },
  });
  refresh();
}
