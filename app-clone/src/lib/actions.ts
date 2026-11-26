"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "./db";
import { requireWorkspace } from "./session";
import { applyProposal, rejectProposal, undoProposal, type EditRow } from "./apply";
import { categoryFor } from "./category";
import { runEngineForWorkspace } from "./engine";
import { encryptJson } from "./crypto";
import type { Prisma } from "../generated/prisma/client";

function refresh() {
  for (const p of ["/dashboard", "/approvals", "/pipeline", "/hygiene", "/deals", "/activity"]) {
    revalidatePath(p);
  }
}

export async function approveAction(id: string) {
  const { workspace, user } = await requireWorkspace();
  const r = await applyProposal(workspace.id, id, user.id);
  refresh();
  return r;
}

export async function rejectAction(id: string) {
  const { workspace, user } = await requireWorkspace();
  const r = await rejectProposal(workspace.id, id, user.id);
  refresh();
  return r;
}

export async function undoAction(id: string) {
  const { workspace, user } = await requireWorkspace();
  const r = await undoProposal(workspace.id, id, user.id);
  refresh();
  return r;
}

/** Approve with user-edited proposed values (Edit Before Approval). */
export async function approveEditedAction(id: string, edits: EditRow[]) {
  const { workspace, user } = await requireWorkspace();
  const r = await applyProposal(workspace.id, id, user.id, edits);
  refresh();
  return r;
}

export async function approveManyAction(ids: string[]) {
  const { workspace, user } = await requireWorkspace();
  let applied = 0;
  for (const id of ids.slice(0, 100)) {
    const r = await applyProposal(workspace.id, id, user.id);
    if (r.ok) applied++;
  }
  refresh();
  return { ok: true, applied };
}

export async function rejectManyAction(ids: string[]) {
  const { workspace, user } = await requireWorkspace();
  let rejected = 0;
  for (const id of ids.slice(0, 100)) {
    const r = await rejectProposal(workspace.id, id, user.id);
    if (r.ok) rejected++;
  }
  refresh();
  return { ok: true, rejected };
}

/** Header "Approve All (n)" — applies every pending proposal in the workspace. */
export async function approveAllAction() {
  const { workspace, user } = await requireWorkspace();
  const pending = await prisma.proposal.findMany({
    where: { workspaceId: workspace.id, status: "pending" },
    orderBy: [{ confidence: "desc" }, { createdAt: "desc" }],
    select: { id: true },
  });
  let applied = 0;
  for (const p of pending) {
    const r = await applyProposal(workspace.id, p.id, user.id);
    if (r.ok) applied++;
  }
  refresh();
  return { ok: true, applied };
}

export async function runEngineAction() {
  const { workspace } = await requireWorkspace();
  const r = await runEngineForWorkspace(workspace.id);
  refresh();
  return r;
}

export async function addNoteAction(form: FormData) {
  const { workspace } = await requireWorkspace();
  const kind = String(form.get("kind") || "call");
  const title = String(form.get("title") || "Pasted note").slice(0, 200);
  const body = String(form.get("body") || "").slice(0, 8000);
  if (!body.trim()) return { ok: false, error: "Paste some text first" };
  await prisma.capture.create({
    data: {
      workspaceId: workspace.id,
      kind: kind === "chat" ? "chat" : "call",
      source: "manual",
      externalId: `note-${Date.now()}`,
      title,
      body,
      snippet: body.slice(0, 140),
      occurredAt: new Date(),
    },
  });
  const r = await runEngineForWorkspace(workspace.id);
  refresh();
  return { ok: true, proposals: r.proposals, error: r.error };
}

export async function proposeFixAction(kind: string, label: string, dealExternalId: string | null) {
  const { workspace } = await requireWorkspace();
  const titles: Record<string, string> = {
    duplicate: `Merge duplicate: ${label}`,
    missing: `Fill missing fields: ${label}`,
    unlogged: `Log meeting outcome: ${label}`,
    stale: `Reactivate stale deal: ${label}`,
  };
  await prisma.proposal.create({
    data: {
      workspaceId: workspace.id,
      type: "hygiene_fix",
      category: categoryFor("hygiene_fix", { kind }),
      title: titles[kind] ?? `Fix: ${label}`,
      detail: { kind, label } as Prisma.InputJsonValue,
      reason: "Created from Data Cleanup — review and approve to apply the cleanup.",
      source: "hygiene",
      confidence: 85,
      dealExternalId,
      status: "pending",
    },
  });
  refresh();
  return { ok: true };
}

export async function saveProfileAction(form: FormData) {
  const { user } = await requireWorkspace();
  const name = String(form.get("name") || "").trim();
  if (name) await prisma.user.update({ where: { id: user.id }, data: { name } });
  revalidatePath("/settings");
  return { ok: true };
}

export async function saveWorkspaceAction(form: FormData) {
  const { workspace, role } = await requireWorkspace();
  if (role !== "owner" && role !== "admin") return { ok: false, error: "Owner or admin only" };
  const name = String(form.get("name") || "").trim();
  if (name) await prisma.workspace.update({ where: { id: workspace.id }, data: { name } });
  revalidatePath("/settings");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function signatureAction(dealExternalId: string) {
  const { workspace } = await requireWorkspace();
  const deal = await prisma.crmDeal.findFirst({ where: { workspaceId: workspace.id, externalId: dealExternalId } });
  if (!deal) return { ok: false, configured: false, sent: false };
  const { signudocConfigured, signudocCreateEnvelope } = await import("./signudoc");
  const configured = signudocConfigured();
  // The signer is the deal's primary contact when one is on record.
  const contact = deal.company
    ? await prisma.crmContact.findFirst({
        where: { workspaceId: workspace.id, company: deal.company },
        orderBy: { name: "asc" },
      })
    : null;
  const signerName = contact?.name ?? deal.company ?? deal.name;
  const signerEmail = contact?.email ?? "";
  let envelopeId: string | null = null;
  let sent = false;
  if (configured) {
    try {
      const r = await signudocCreateEnvelope({
        title: `Agreement — ${deal.name}`,
        signerName,
        signerEmail,
        dealExternalId,
      });
      envelopeId = r.envelopeId || null;
      sent = true;
    } catch {
      sent = false; // API failed — the request is still recorded, honestly as "requested"
    }
  }
  await prisma.signatureRequest.create({
    data: {
      workspaceId: workspace.id,
      dealExternalId,
      title: `Agreement — ${deal.name}`,
      signerName,
      signerEmail,
      envelopeId,
      status: sent ? "sent" : "requested",
    },
  });
  revalidatePath("/deals");
  revalidatePath("/pipeline");
  return { ok: true, configured, sent };
}

export async function disconnectAction(provider: string) {
  const { workspace, user } = await requireWorkspace();
  await prisma.connection.deleteMany({ where: { workspaceId: workspace.id, provider } });
  const { audit } = await import("./audit");
  await audit(workspace.id, "disconnected", `Disconnected ${provider}`, { userId: user.id });
  revalidatePath("/connections");
  return { ok: true };
}

export async function saveDummyConnectionAction(provider: string) {
  // Placeholder guard — real OAuth flows live under /api/connections/*.
  void provider;
  void encryptJson;
  return { ok: false, error: "Use the Connect button" };
}
