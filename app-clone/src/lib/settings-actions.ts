"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { prisma } from "./db";
import { requireWorkspace, requireUser } from "./session";
import { auth } from "./auth";
import { audit } from "./audit";
import { can, normalizeRole, ROLE_LABELS, type RoleKey } from "./permissions";
import {
  parseWorkspaceSettings,
  parseNotificationPrefs,
  type NotificationPrefs,
} from "./settings";
import type { Prisma } from "../generated/prisma/client";

function refreshSettings() {
  revalidatePath("/settings");
  revalidatePath("/dashboard");
  revalidatePath("/approvals");
  revalidatePath("/deals");
}

async function writeWorkspaceSettings(
  workspaceId: string,
  patch: Partial<ReturnType<typeof parseWorkspaceSettings>>,
) {
  const ws = await prisma.workspace.findUnique({ where: { id: workspaceId }, select: { settings: true } });
  const merged = { ...parseWorkspaceSettings(ws?.settings), ...patch };
  await prisma.workspace.update({
    where: { id: workspaceId },
    data: { settings: merged as unknown as Prisma.InputJsonValue },
  });
}

// ---------- Profile ----------

export async function saveProfileNameAction(name: string) {
  const { user } = await requireWorkspace();
  const clean = name.trim().slice(0, 80);
  if (!clean) return { ok: false, error: "Name can't be empty" };
  await prisma.user.update({ where: { id: user.id }, data: { name: clean } });
  refreshSettings();
  return { ok: true };
}

// ---------- Workspace ----------

export async function saveWorkspaceNameAction(name: string) {
  const { workspace, role } = await requireWorkspace();
  if (!can(role, "settings.write")) return { ok: false, error: "Only the Owner or an Admin can rename the workspace" };
  const clean = name.trim().slice(0, 80);
  if (!clean) return { ok: false, error: "Workspace name can't be empty" };
  await prisma.workspace.update({ where: { id: workspace.id }, data: { name: clean } });
  refreshSettings();
  return { ok: true };
}

export async function saveCompanyDetailsAction(input: { companyName: string; location: string }) {
  const { workspace, role } = await requireWorkspace();
  if (!can(role, "settings.write")) return { ok: false, error: "Only the Owner or an Admin can edit company details" };
  await writeWorkspaceSettings(workspace.id, {
    companyName: input.companyName.trim().slice(0, 120),
    location: input.location.trim().slice(0, 120),
  });
  refreshSettings();
  return { ok: true };
}

// ---------- AI Preferences ----------

export async function saveAiPreferencesAction(input: {
  confidenceThreshold: number;
  analysisFocus: string;
  assistantDailyLimit: number;
}) {
  const { workspace, role } = await requireWorkspace();
  if (!can(role, "settings.write")) return { ok: false, error: "Only the Owner or an Admin can change AI preferences" };
  const focus = ["balanced", "deals", "quality", "enrichment", "followups"].includes(input.analysisFocus)
    ? input.analysisFocus
    : "balanced";
  const threshold = [50, 60, 70, 80, 90].includes(input.confidenceThreshold) ? input.confidenceThreshold : 50;
  const rawLimit = Math.round(Number(input.assistantDailyLimit));
  const assistantDailyLimit = Number.isFinite(rawLimit) ? Math.min(500, Math.max(5, rawLimit)) : 30;
  await writeWorkspaceSettings(workspace.id, {
    confidenceThreshold: threshold,
    assistantDailyLimit,
    analysisFocus: focus as ReturnType<typeof parseWorkspaceSettings>["analysisFocus"],
  });
  refreshSettings();
  return { ok: true };
}

// ---------- Notifications (per user) ----------

export async function saveNotificationPrefsAction(prefs: NotificationPrefs) {
  const { workspace, user } = await requireWorkspace();
  const clean = parseNotificationPrefs(prefs);
  await prisma.membership.updateMany({
    where: { workspaceId: workspace.id, userId: user.id },
    data: { settings: clean as unknown as Prisma.InputJsonValue },
  });
  revalidatePath("/settings");
  return { ok: true };
}

// ---------- Security ----------

export async function saveDataRetentionAction(months: number) {
  const { workspace, role } = await requireWorkspace();
  if (!can(role, "settings.write")) return { ok: false, error: "Only the Owner or an Admin can change data retention" };
  if (![6, 12, 24].includes(months)) return { ok: false, error: "Pick 6, 12 or 24 months" };
  await writeWorkspaceSettings(workspace.id, { dataRetentionMonths: months });
  refreshSettings();
  return { ok: true };
}

export async function revokeSessionAction(sessionId: string) {
  const user = await requireUser();
  const current = await auth.api.getSession({ headers: await headers() });
  if (current?.session.id === sessionId) {
    return { ok: false, error: "That's this device — use Sign out instead" };
  }
  const target = await prisma.session.findFirst({ where: { id: sessionId, userId: user.id } });
  if (!target) return { ok: false, error: "Session not found" };
  await prisma.session.delete({ where: { id: sessionId } });
  revalidatePath("/settings");
  return { ok: true };
}

// ---------- Team: invites ----------

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export async function inviteMemberAction(email: string, roleRaw: string) {
  const { workspace, user, role } = await requireWorkspace();
  if (!can(role, "team.write")) return { ok: false, error: "Only the Owner or an Admin can invite members" };
  const clean = email.trim().toLowerCase();
  if (!EMAIL_RE.test(clean)) return { ok: false, error: "That email doesn't look right" };
  const inviteRole = normalizeRole(roleRaw);
  if (inviteRole === "owner") return { ok: false, error: "The Owner role can't be invited — transfer ownership instead" };
  const existingMember = await prisma.membership.findFirst({
    where: { workspaceId: workspace.id, user: { email: clean } },
  });
  if (existingMember) return { ok: false, error: "That person is already a member of this workspace" };
  const existingInvite = await prisma.invite.findFirst({
    where: { workspaceId: workspace.id, email: clean, status: "pending" },
  });
  if (existingInvite) return { ok: false, error: "An invite for that email is already pending" };
  const invite = await prisma.invite.create({
    data: {
      workspaceId: workspace.id,
      email: clean,
      role: inviteRole,
      token: randomUUID(),
      expiresAt: new Date(Date.now() + 7 * 86400000),
      createdById: user.id,
    },
  });
  await audit(workspace.id, "invited", `Invited ${clean} as ${ROLE_LABELS[inviteRole]}`, {
    userId: user.id,
    meta: { inviteId: invite.id, email: clean, role: inviteRole },
  });
  refreshSettings();
  return { ok: true, id: invite.id, token: invite.token };
}

export async function resendInviteAction(inviteId: string) {
  const { workspace, user, role } = await requireWorkspace();
  if (!can(role, "team.write")) return { ok: false, error: "Only the Owner or an Admin can manage invites" };
  const invite = await prisma.invite.findFirst({
    where: { id: inviteId, workspaceId: workspace.id, status: "pending" },
  });
  if (!invite) return { ok: false, error: "Invite not found" };
  const token = randomUUID();
  await prisma.invite.update({
    where: { id: invite.id },
    data: { token, expiresAt: new Date(Date.now() + 7 * 86400000) },
  });
  await audit(workspace.id, "invite_resent", `Re-sent the invite for ${invite.email}`, {
    userId: user.id,
    meta: { inviteId: invite.id },
  });
  refreshSettings();
  return { ok: true, token };
}

export async function revokeInviteAction(inviteId: string) {
  const { workspace, user, role } = await requireWorkspace();
  if (!can(role, "team.write")) return { ok: false, error: "Only the Owner or an Admin can manage invites" };
  const invite = await prisma.invite.findFirst({
    where: { id: inviteId, workspaceId: workspace.id, status: "pending" },
  });
  if (!invite) return { ok: false, error: "Invite not found" };
  await prisma.invite.update({ where: { id: invite.id }, data: { status: "revoked" } });
  await audit(workspace.id, "invite_revoked", `Revoked the invite for ${invite.email}`, {
    userId: user.id,
    meta: { inviteId: invite.id },
  });
  refreshSettings();
  return { ok: true };
}

// ---------- Team: roles & removal ----------

export async function changeMemberRoleAction(membershipId: string, roleRaw: string) {
  const { workspace, user, role } = await requireWorkspace();
  if (!can(role, "team.write")) return { ok: false, error: "Only the Owner or an Admin can change roles" };
  const newRole: RoleKey = normalizeRole(roleRaw);
  const target = await prisma.membership.findFirst({
    where: { id: membershipId, workspaceId: workspace.id },
    include: { user: true },
  });
  if (!target) return { ok: false, error: "Member not found" };
  const targetRole = normalizeRole(target.role);

  // Ownership transfer: only the current Owner, and it demotes them to Admin.
  if (newRole === "owner") {
    if (!can(role, "team.transferOwnership")) {
      return { ok: false, error: "Only the workspace Owner can transfer ownership" };
    }
    if (targetRole === "owner") return { ok: true };
    const self = await prisma.membership.findFirst({
      where: { workspaceId: workspace.id, userId: user.id },
    });
    if (!self) return { ok: false, error: "Your membership was not found" };
    await prisma.$transaction([
      prisma.membership.update({ where: { id: self.id }, data: { role: "admin", roleLabel: null } }),
      prisma.membership.update({ where: { id: target.id }, data: { role: "owner", roleLabel: null } }),
    ]);
    await audit(workspace.id, "ownership_transferred", `Ownership transferred to ${target.user.email}`, {
      userId: user.id,
      meta: { membershipId: target.id },
    });
    refreshSettings();
    return { ok: true, transferred: true };
  }

  if (targetRole === "owner") {
    return { ok: false, error: "The Owner's role can't be changed — transfer ownership instead" };
  }
  if (newRole === targetRole) return { ok: true };
  await prisma.membership.update({ where: { id: target.id }, data: { role: newRole, roleLabel: null } });
  await audit(
    workspace.id,
    "role_changed",
    `${target.user.email} is now ${ROLE_LABELS[newRole]} (was ${ROLE_LABELS[targetRole]})`,
    { userId: user.id, meta: { membershipId: target.id, role: newRole } },
  );
  refreshSettings();
  return { ok: true };
}

export async function removeMemberAction(membershipId: string) {
  const { workspace, user, role } = await requireWorkspace();
  if (!can(role, "team.write")) return { ok: false, error: "Only the Owner or an Admin can remove members" };
  const target = await prisma.membership.findFirst({
    where: { id: membershipId, workspaceId: workspace.id },
    include: { user: true },
  });
  if (!target) return { ok: false, error: "Member not found" };
  if (normalizeRole(target.role) === "owner") {
    return { ok: false, error: "The Owner can't be removed — transfer ownership first" };
  }
  if (target.userId === user.id) {
    // Leaving a workspace you don't own is fine; the sole-Owner case is
    // already blocked above because the Owner membership can't be removed.
    const owners = await prisma.membership.count({ where: { workspaceId: workspace.id, role: "owner" } });
    if (owners === 0) return { ok: false, error: "This workspace has no Owner" };
  }
  await prisma.membership.delete({ where: { id: target.id } });
  await audit(workspace.id, "member_removed", `Removed ${target.user.email} from the workspace`, {
    userId: user.id,
    meta: { membershipId: target.id },
  });
  refreshSettings();
  return { ok: true };
}

// ---------- Invite acceptance ----------

export async function acceptInviteAction(token: string) {
  const user = await requireUser();
  const invite = await prisma.invite.findUnique({ where: { token }, include: { workspace: true } });
  if (!invite) return { ok: false, error: "This invite link isn't valid" };
  if (invite.status !== "pending") return { ok: false, error: "This invite is no longer active" };
  if (invite.expiresAt.getTime() < Date.now()) return { ok: false, error: "This invite has expired" };
  if (user.email.toLowerCase() !== invite.email.toLowerCase()) {
    return { ok: false, error: `This invite is for ${invite.email} — you're signed in as ${user.email}` };
  }
  const already = await prisma.membership.findFirst({
    where: { workspaceId: invite.workspaceId, userId: user.id },
  });
  if (!already) {
    // A brand-new signup arrives with an auto-created empty starter
    // workspace ("My workspace"). If it's still untouched, joining the team
    // replaces it so the team workspace becomes the user's workspace.
    const others = await prisma.membership.findMany({
      where: { userId: user.id, workspaceId: { not: invite.workspaceId } },
      include: { workspace: true },
    });
    for (const m of others) {
      const [memberCount, dealCount, proposalCount, connectionCount] = await Promise.all([
        prisma.membership.count({ where: { workspaceId: m.workspaceId } }),
        prisma.crmDeal.count({ where: { workspaceId: m.workspaceId } }),
        prisma.proposal.count({ where: { workspaceId: m.workspaceId } }),
        prisma.connection.count({ where: { workspaceId: m.workspaceId } }),
      ]);
      if (memberCount === 1 && dealCount === 0 && proposalCount === 0 && connectionCount === 0) {
        await prisma.workspace.delete({ where: { id: m.workspaceId } });
      }
    }
    await prisma.membership.create({
      data: { userId: user.id, workspaceId: invite.workspaceId, role: invite.role },
    });
  }
  await prisma.invite.update({ where: { id: invite.id }, data: { status: "accepted" } });
  await audit(invite.workspaceId, "invite_accepted", `${invite.email} joined as ${ROLE_LABELS[normalizeRole(invite.role)]}`, {
    userId: user.id,
    meta: { inviteId: invite.id },
  });
  // No refreshSettings() here: revalidating from this action makes Next
  // re-render the invite page (now "already accepted") and wipes the
  // success state before the user can read it. App pages are dynamic, so
  // the new membership is picked up on the next navigation anyway.
  return { ok: true, workspaceName: invite.workspace.name };
}
