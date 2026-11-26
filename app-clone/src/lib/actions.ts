"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "./db";
import { requireWorkspace } from "./session";
import { applyProposal, rejectProposal, undoProposal, newBatchId, type EditRow } from "./apply";
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
  const r = await applyProposal(workspace.id, id, user.id, undefined, newBatchId());
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
  const r = await applyProposal(workspace.id, id, user.id, edits, newBatchId());
  refresh();
  return r;
}

export async function approveManyAction(ids: string[]) {
  const { workspace, user } = await requireWorkspace();
  const batchId = newBatchId();
  let applied = 0;
  for (const id of ids.slice(0, 100)) {
    const r = await applyProposal(workspace.id, id, user.id, undefined, batchId);
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
  const batchId = newBatchId();
  for (const p of pending) {
    const r = await applyProposal(workspace.id, p.id, user.id, undefined, batchId);
    if (r.ok) applied++;
  }
  refresh();
  return { ok: true, applied };
}

/**
 * History → Rollback: revert a whole apply batch. Every still-applied
 * proposal in the batch is undone newest-first through the same per-
 * proposal machinery Approvals uses, so each change is reversed exactly
 * and the proposals return to the review queue. One audit row records
 * the batch rollback itself.
 */
export async function rollbackBatchAction(batchId: string) {
  const { workspace, user } = await requireWorkspace();
  const proposals = await prisma.proposal.findMany({
    where: { workspaceId: workspace.id, batchId, status: "applied" },
    orderBy: { appliedAt: "desc" },
    select: { id: true, appliedAt: true },
  });
  if (proposals.length === 0) return { ok: false, error: "Nothing applied in this batch to roll back" };
  const latest = proposals.reduce<Date | null>(
    (max, p) => (p.appliedAt && (!max || p.appliedAt > max) ? p.appliedAt : max),
    null,
  );
  if (latest && Date.now() > latest.getTime() + 7 * 86400000) {
    return { ok: false, error: "The 7-day rollback window for this batch has closed" };
  }
  let reverted = 0;
  for (const p of proposals) {
    const r = await undoProposal(workspace.id, p.id, user.id);
    if (r.ok) reverted++;
  }
  const { audit } = await import("./audit");
  await audit(workspace.id, "rolled_back", `Rolled back batch ${batchId} (${reverted} changes)`, {
    userId: user.id,
    meta: { batchId, reverted },
  });
  refresh();
  return { ok: true, reverted };
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

// ---------- Data Cleanup actions ----------
// Every one of these creates a Proposal that lands in Approvals — nothing
// is applied from Data Cleanup directly (the product's trust rule).

export async function proposeMergeAction(masterId: string, duplicateId: string) {
  const { workspace } = await requireWorkspace();
  if (masterId === duplicateId) return { ok: false, error: "Pick two different records" };
  const [master, dup] = await Promise.all([
    prisma.crmContact.findFirst({ where: { id: masterId, workspaceId: workspace.id } }),
    prisma.crmContact.findFirst({ where: { id: duplicateId, workspaceId: workspace.id } }),
  ]);
  if (!master || !dup) return { ok: false, error: "Records not found" };
  const pendingMerges = await prisma.proposal.findMany({
    where: { workspaceId: workspace.id, status: "pending", type: "hygiene_fix" },
    select: { detail: true },
  });
  const already = pendingMerges.some((p) => {
    const d = (p.detail ?? {}) as Record<string, unknown>;
    return d.kind === "merge" && (d.masterId === masterId || d.duplicateId === masterId || d.masterId === duplicateId || d.duplicateId === duplicateId);
  });
  if (already) return { ok: false, error: "A merge for this pair is already waiting in Approvals" };
  await prisma.proposal.create({
    data: {
      workspaceId: workspace.id,
      type: "hygiene_fix",
      category: categoryFor("hygiene_fix", { kind: "merge" }),
      title: "Merge Duplicate Contacts",
      detail: {
        kind: "merge",
        masterId,
        duplicateId,
        description: `Two contact records exist for ${master.name}${master.company ? ` at ${master.company}` : ""}. Merge them into one master record.`,
        subline: `${dup.email ?? master.email ?? ""} → ${master.name}`,
        diffRows: [
          { field: "Master Record", current: master.name, proposed: master.name },
          { field: "Duplicate", current: `${dup.name} (2nd record)`, proposed: "Merged & removed" },
        ],
        cascade: [{ icon: "user", text: `Keeps one ${master.name} record in Contacts` }],
        iconKind: "users",
      } as Prisma.InputJsonValue,
      reason: "Created from Data Cleanup — the two records share the same email address. Review and approve to merge.",
      source: "hygiene",
      confidence: 85,
      status: "pending",
    },
  });
  refresh();
  return { ok: true };
}

export async function proposeMissingFixAction(contactId: string) {
  const { workspace } = await requireWorkspace();
  const contact = await prisma.crmContact.findFirst({ where: { id: contactId, workspaceId: workspace.id } });
  if (!contact) return { ok: false, error: "Contact not found" };
  // Re-derive the suggestion server-side — the only honest source the
  // Missing Fields tab offers: the title carried by the duplicate record.
  if (contact.title) return { ok: false, error: "This record is not missing a title" };
  const twin = contact.email
    ? await prisma.crmContact.findFirst({
        where: {
          workspaceId: workspace.id,
          id: { not: contact.id },
          email: { equals: contact.email, mode: "insensitive" },
          title: { not: null },
        },
      })
    : null;
  if (!twin?.title) return { ok: false, error: "No suggestion exists for this record yet" };
  const pendingEnrich = await prisma.proposal.findMany({
    where: { workspaceId: workspace.id, status: "pending", type: "hygiene_fix" },
    select: { detail: true },
  });
  const already = pendingEnrich.some((p) => {
    const d = (p.detail ?? {}) as Record<string, unknown>;
    return d.kind === "enrich" && d.contactId === contactId;
  });
  if (already) return { ok: false, error: "Already waiting in Approvals" };
  await prisma.proposal.create({
    data: {
      workspaceId: workspace.id,
      type: "hygiene_fix",
      category: categoryFor("hygiene_fix", { kind: "enrich" }),
      title: `Enrich Contact: ${contact.name}`,
      detail: {
        kind: "enrich",
        field: "title",
        contactId,
        toTitle: twin.title,
        subline: "Add title from the duplicate record",
        description: `Fill in ${contact.name}'s missing Title — the duplicate record for ${contact.email} lists "${twin.title}".`,
        diffRows: [{ field: "Title", current: "—", proposed: twin.title, edit: "text" }],
      } as Prisma.InputJsonValue,
      reason: "Created from Data Cleanup — the value comes from the duplicate record with the same email.",
      source: "hygiene",
      confidence: 85,
      status: "pending",
    },
  });
  refresh();
  return { ok: true };
}

export async function proposeStaleFollowupAction(dealExternalId: string) {
  const { workspace } = await requireWorkspace();
  const deal = await prisma.crmDeal.findFirst({ where: { workspaceId: workspace.id, externalId: dealExternalId } });
  if (!deal) return { ok: false, error: "Deal not found" };
  const already = await prisma.proposal.findFirst({
    where: {
      workspaceId: workspace.id,
      status: "pending",
      dealExternalId,
      type: { in: ["followup_draft", "task"] },
    },
  });
  if (already) return { ok: false, error: "A follow-up for this deal is already waiting in Approvals" };
  const days = Math.floor((Date.now() - deal.lastActivityAt.getTime()) / 86400000);
  const contact = deal.company
    ? await prisma.crmContact.findFirst({
        where: { workspaceId: workspace.id, company: deal.company },
        orderBy: { name: "asc" },
      })
    : null;
  const firstName = contact?.name.split(" ")[0];
  await prisma.proposal.create({
    data: {
      workspaceId: workspace.id,
      type: "followup_draft",
      category: categoryFor("followup_draft"),
      title: `Draft Follow-up: ${deal.name}`,
      detail: {
        toName: contact?.name ?? deal.company ?? deal.name,
        toEmail: contact?.email ?? "",
        subject: `Following up — ${deal.name}`,
        draftBody: `Hi ${firstName ?? "there"},\n\nJust checking in on ${deal.name} — it's been ${days} days since we last spoke, and I wanted to make sure you have everything you need from us.\n\nHappy to pick things up whenever you're ready.\n\nBest regards`,
        description: `Draft a follow-up for ${deal.name} — the deal has had no activity for ${days} days at ${deal.stage}.`,
        subline: "Based on a stale deal in Data Cleanup",
      } as Prisma.InputJsonValue,
      reason: `Created from Data Cleanup — no activity for ${days} days at ${deal.stage}. Nothing is sent until you approve it.`,
      source: "hygiene",
      confidence: 85,
      dealExternalId,
      status: "pending",
    },
  });
  refresh();
  return { ok: true };
}

export async function proposeLogEntryAction(captureId: string) {
  const { workspace } = await requireWorkspace();
  const capture = await prisma.capture.findFirst({ where: { id: captureId, workspaceId: workspace.id } });
  if (!capture) return { ok: false, error: "Meeting not found" };
  const already = await prisma.proposal.findFirst({
    where: { workspaceId: workspace.id, status: "pending", captureId },
  });
  if (already) return { ok: false, error: "Already waiting in Approvals" };
  await prisma.proposal.create({
    data: {
      workspaceId: workspace.id,
      type: "hygiene_fix",
      category: categoryFor("hygiene_fix", { kind: "unlogged" }),
      title: `Log Meeting: ${capture.title}`,
      detail: {
        kind: "unlogged",
        description: `Log "${capture.title}" into the CRM so the meeting is on record.`,
        subline: capture.title,
        diffRows: [{ field: "Meeting", current: "Not logged", proposed: "Log entry added" }],
        iconKind: "calendar",
      } as Prisma.InputJsonValue,
      reason: "Created from Data Cleanup — the AI read this meeting but no CRM update came out of it.",
      source: "hygiene",
      confidence: 85,
      captureId,
      status: "pending",
    },
  });
  refresh();
  return { ok: true };
}

export async function saveGuardrailsAction(input: {
  enabled: boolean;
  autoEnrich: boolean;
  preventInvalidStage: boolean;
  requireNextStep: boolean;
  detectDuplicates: boolean;
  flagSuspicious: boolean;
}) {
  const { workspace } = await requireWorkspace();
  const { countDuplicateExtras } = await import("./hygiene");
  const existing = await prisma.guardrailSetting.findUnique({ where: { workspaceId: workspace.id } });
  const wasEffectiveDetect = (existing?.enabled ?? true) && (existing?.detectDuplicates ?? true);
  const nowEffectiveDetect = input.enabled && input.detectDuplicates;
  // Freeze the duplicate count at the moment detection stops being
  // effective, so dashboards keep showing the last computed figure.
  let lastDupCount: number | undefined;
  if (!nowEffectiveDetect && (wasEffectiveDetect || existing?.lastDupCount == null)) {
    lastDupCount = await countDuplicateExtras(workspace.id);
  }
  const data = {
    enabled: input.enabled,
    autoEnrich: input.autoEnrich,
    preventInvalidStage: input.preventInvalidStage,
    requireNextStep: input.requireNextStep,
    detectDuplicates: input.detectDuplicates,
    flagSuspicious: input.flagSuspicious,
    ...(lastDupCount !== undefined ? { lastDupCount } : {}),
  };
  await prisma.guardrailSetting.upsert({
    where: { workspaceId: workspace.id },
    create: { workspaceId: workspace.id, ...data, lastDupCount: lastDupCount ?? null },
    update: data,
  });
  revalidatePath("/hygiene");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function saveProfileAction(form: FormData) {  const { user } = await requireWorkspace();
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

// ---------- Deals & Contacts: hand-created records ----------
export async function createDealAction(input: {
  name: string;
  company: string;
  amount: string;
  stage: string;
  closeDate: string;
}) {
  const { workspace, user } = await requireWorkspace();
  const name = input.name.trim();
  if (!name) return { ok: false, error: "Give the deal a name" };
  const amount = input.amount.trim() ? Number(input.amount) : null;
  if (amount != null && (Number.isNaN(amount) || amount < 0)) return { ok: false, error: "Amount must be a number" };
  const { randomUUID } = await import("node:crypto");
  const deal = await prisma.crmDeal.create({
    data: {
      workspaceId: workspace.id,
      externalId: `local-${randomUUID()}`,
      source: "local",
      name,
      company: input.company.trim() || null,
      stage: input.stage || "New",
      amount,
      ownerName: user.name || null,
      closeDate: input.closeDate ? new Date(`${input.closeDate}T00:00:00`) : null,
      lastActivityAt: new Date(),
    },
  });
  await prisma.auditEvent.create({
    data: {
      workspaceId: workspace.id,
      userId: user.id,
      action: "captured",
      summary: `Deal created by hand: ${deal.name}`,
      meta: { dealExternalId: deal.externalId } as Prisma.InputJsonValue,
    },
  });
  refresh();
  return { ok: true, id: deal.id };
}

export async function createContactAction(input: {
  name: string;
  email: string;
  title: string;
  company: string;
}) {
  const { workspace, user } = await requireWorkspace();
  const name = input.name.trim();
  if (!name) return { ok: false, error: "Give the contact a name" };
  const email = input.email.trim();
  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { ok: false, error: "That email doesn't look right" };
  const contact = await prisma.crmContact.create({
    data: {
      workspaceId: workspace.id,
      name,
      email: email || null,
      title: input.title.trim() || null,
      company: input.company.trim() || null,
    },
  });
  await prisma.auditEvent.create({
    data: {
      workspaceId: workspace.id,
      userId: user.id,
      action: "captured",
      summary: `Contact created by hand: ${contact.name}`,
      meta: { contactId: contact.id } as Prisma.InputJsonValue,
    },
  });
  refresh();
  return { ok: true, id: contact.id };
}

export async function createAccountAction(input: { name: string; industry: string }) {
  const { workspace, user } = await requireWorkspace();
  const name = input.name.trim();
  if (!name) return { ok: false, error: "Give the account a company name" };
  const existing = await prisma.crmAccount.findFirst({ where: { workspaceId: workspace.id, name } });
  if (existing) return { ok: false, error: "That account already exists" };
  const account = await prisma.crmAccount.create({
    data: { workspaceId: workspace.id, name, industry: input.industry.trim() || null },
  });
  await prisma.auditEvent.create({
    data: {
      workspaceId: workspace.id,
      userId: user.id,
      action: "captured",
      summary: `Account created by hand: ${account.name}`,
      meta: { accountId: account.id } as Prisma.InputJsonValue,
    },
  });
  refresh();
  return { ok: true, id: account.id };
}

export async function disconnectAction(provider: string) {  const { workspace, user } = await requireWorkspace();
  await prisma.connection.deleteMany({ where: { workspaceId: workspace.id, provider } });
  const { audit } = await import("./audit");
  await audit(workspace.id, "disconnected", `Disconnected ${provider}`, { userId: user.id });
  revalidatePath("/connections");
  revalidatePath("/dashboard");
  revalidatePath("/activity");
  return { ok: true };
}

/** Read a connection's settings JSON (per-app preferences) as an object. */
function connSettings(raw: unknown): {
  apps?: Record<string, { permissions?: Record<string, boolean>; syncFrequency?: string }>;
  reconnectedAt?: string;
} {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    return raw as { apps?: Record<string, { permissions?: Record<string, boolean>; syncFrequency?: string }>; reconnectedAt?: string };
  }
  return {};
}

/** Save one catalog app's data permissions and/or sync frequency onto its
 *  Connection row (settings JSON, keyed by app id). Real persistence — the
 *  Connections screen reads these back on every render. */
export async function saveConnectionAppSettingsAction(
  appId: string,
  patch: { permissions?: Record<string, boolean>; syncFrequency?: string },
) {
  const { workspace } = await requireWorkspace();
  const { appById } = await import("./catalog");
  const app = appById(appId);
  if (!app) return { ok: false, error: "Unknown app" };
  const conn = await prisma.connection.findFirst({
    where: { workspaceId: workspace.id, provider: app.provider },
  });
  if (!conn) return { ok: false, error: "Not connected" };
  const settings = connSettings(conn.settings);
  const apps = { ...(settings.apps ?? {}) };
  const current = apps[appId] ?? {};
  apps[appId] = {
    permissions: patch.permissions ?? current.permissions,
    syncFrequency: patch.syncFrequency ?? current.syncFrequency,
  };
  await prisma.connection.update({
    where: { id: conn.id },
    data: { settings: { ...settings, apps } as Prisma.InputJsonValue },
  });
  revalidatePath("/connections");
  return { ok: true };
}

/** "Sync Now" on a connected app: runs the same engine scan as Approvals'
 *  "Check for updates", then stamps the connection's lastSyncAt and writes
 *  a "synced" audit row. */
export async function syncNowConnectionAction(provider: string) {
  const { workspace, user } = await requireWorkspace();
  const { PROVIDER_NAMES } = await import("./catalog");
  const label = PROVIDER_NAMES[provider] ?? provider;
  const conn = await prisma.connection.findFirst({
    where: { workspaceId: workspace.id, provider },
  });
  if (!conn) return { ok: false, error: "Not connected" };
  const r = await runEngineForWorkspace(workspace.id);
  await prisma.connection.update({ where: { id: conn.id }, data: { lastSyncAt: new Date() } });
  const { audit } = await import("./audit");
  await audit(workspace.id, "synced", `Synced ${label} — checked for new activity`, { userId: user.id });
  refresh();
  revalidatePath("/connections");
  revalidatePath("/activity");
  return { ok: true, proposals: r.proposals, processed: r.processed, error: r.error };
}

/** "Reconnect": re-stamps the connection (updatedAt + a reconnectedAt mark
 *  in settings) and writes a "connected" audit row. No fake OAuth — the
 *  stored credentials are untouched. */
export async function reconnectConnectionAction(provider: string) {
  const { workspace, user } = await requireWorkspace();
  const { PROVIDER_NAMES } = await import("./catalog");
  const label = PROVIDER_NAMES[provider] ?? provider;
  const conn = await prisma.connection.findFirst({
    where: { workspaceId: workspace.id, provider },
  });
  if (!conn) return { ok: false, error: "Not connected" };
  const settings = connSettings(conn.settings);
  await prisma.connection.update({
    where: { id: conn.id },
    data: { settings: { ...settings, reconnectedAt: new Date().toISOString() } as Prisma.InputJsonValue },
  });
  const { audit } = await import("./audit");
  await audit(workspace.id, "connected", `Reconnected ${label}`, { userId: user.id });
  revalidatePath("/connections");
  revalidatePath("/activity");
  return { ok: true };
}

export async function saveDummyConnectionAction(provider: string) {
  // Placeholder guard — real OAuth flows live under /api/connections/*.
  void provider;
  void encryptJson;
  return { ok: false, error: "Use the Connect button" };
}
