"use server";

import { headers } from "next/headers";
import { auth } from "./auth";
import { prisma } from "./db";
import { requireWorkspace } from "./session";
import { SIGNUP_ROLES } from "./signup-roles";

/**
 * Where an email stands before sign-up starts:
 * - "new": no account yet — run the full flow.
 * - "no-password": an account exists (created with an email code) but no
 *   password was ever set — the flow resumes at the password step.
 * - "has-password": a finished account — send them to sign-in instead.
 */
export async function checkEmailStatusAction(email: string) {
  const clean = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) {
    return { ok: false as const, error: "Enter a valid email address." };
  }
  const user = await prisma.user.findUnique({ where: { email: clean } });
  if (!user) return { ok: true as const, status: "new" as const };
  const credential = await prisma.account.findFirst({
    where: { userId: user.id, providerId: "credential" },
    select: { password: true },
  });
  return {
    ok: true as const,
    status: credential?.password ? ("has-password" as const) : ("no-password" as const),
  };
}

/**
 * Sign-up password step: the account was created by the email-code verify
 * (so a session exists) but has no password yet — set the first one.
 * Better Auth's /set-password endpoint does exactly this and refuses when
 * a password already exists.
 */
export async function setInitialPasswordAction(newPassword: string) {
  if (newPassword.length < 8 || newPassword.length > 128) {
    return { ok: false as const, error: "Password must be 8–128 characters." };
  }
  try {
    await auth.api.setPassword({
      body: { newPassword },
      headers: await headers(),
    });
    return { ok: true as const };
  } catch {
    return {
      ok: false as const,
      error: "Could not save the password — if this account already has one, sign in instead.",
    };
  }
}

/**
 * Final sign-up step: name the person, name their fresh workspace, and
 * record the job they picked on the role step. The workspace itself was
 * already created empty by the auth hook when the email code verified;
 * the creator's permission role stays "owner" — jobRole is descriptive.
 */
export async function completeSignupAction(input: {
  name: string;
  workspaceName: string;
  jobRole: string;
}) {
  const { user, workspace } = await requireWorkspace();
  const name = input.name.trim().slice(0, 80);
  const workspaceName = input.workspaceName.trim().slice(0, 80);
  if (!name) return { ok: false as const, error: "Your name can't be empty." };
  if (!workspaceName) return { ok: false as const, error: "Workspace name can't be empty." };
  const jobRole = (SIGNUP_ROLES as readonly string[]).includes(input.jobRole)
    ? input.jobRole
    : "Owner";
  await prisma.user.update({ where: { id: user.id }, data: { name } });
  await prisma.workspace.update({ where: { id: workspace.id }, data: { name: workspaceName } });
  await prisma.membership.update({
    where: { userId_workspaceId: { userId: user.id, workspaceId: workspace.id } },
    data: { jobRole },
  });
  return { ok: true as const };
}
