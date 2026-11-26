import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "./auth";
import { prisma } from "./db";

export async function getCurrentUser() {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user ?? null;
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  return user;
}

/** The signed-in user's first workspace (this product is one workspace per user in v1 UI). */
export async function requireWorkspace() {
  const user = await requireUser();
  const membership = await prisma.membership.findFirst({
    where: { userId: user.id },
    include: { workspace: true },
    orderBy: { createdAt: "asc" },
  });
  if (!membership) redirect("/sign-in");
  return { user, workspace: membership.workspace, role: membership.role, roleLabel: membership.roleLabel };
}
