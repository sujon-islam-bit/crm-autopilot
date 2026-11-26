"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "./db";
import { requireWorkspace } from "./session";
import { applyProposal, rejectProposal, undoProposal } from "./apply";
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
  if (!deal) return { ok: false };
  const configured = Boolean(process.env.SIGNUDOC_BASE_URL && process.env.SIGNUDOC_API_KEY);
  await prisma.signatureRequest.create({
    data: {
      workspaceId: workspace.id,
      dealExternalId,
      title: `Agreement — ${deal.name}`,
      signerName: deal.company ?? deal.name,
      signerEmail: "",
      status: configured ? "sent" : "requested",
    },
  });
  revalidatePath("/deals");
  return { ok: true, configured };
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
