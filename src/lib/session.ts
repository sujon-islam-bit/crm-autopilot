import "server-only";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/** The signed-in user, or null. Server components / actions only. */
export async function getCurrentUser() {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user ?? null;
}

/** The signed-in user, or a redirect to /sign-in. */
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  return user;
}

/** The user's first workspace + their membership in it (null if none). */
export async function getMyWorkspace(userId: string) {
  const membership = await prisma.membership.findFirst({
    where: { userId },
    include: { workspace: true },
    orderBy: { createdAt: "asc" },
  });
  if (!membership) return null;
  return { membership, workspace: membership.workspace };
}
