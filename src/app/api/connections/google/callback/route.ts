import { NextResponse, type NextRequest } from "next/server";

import { connectProxy } from "@/lib/connect-client";
import { encryptSecret } from "@/lib/crypto";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, getMyWorkspace } from "@/lib/session";

/**
 * Return from the connect service after Google consent. The service
 * hands back ?status=connected&provider=google&connection=<id>; we
 * store just that id (encrypted) on the workspace's google Connection
 * and read the account email through the proxy for display.
 */
export async function GET(req: NextRequest) {
  const base = process.env.BETTER_AUTH_URL ?? "http://localhost:3200";
  const fail = (why: string) => NextResponse.redirect(new URL(`/connections?error=${why}`, base));

  const status = req.nextUrl.searchParams.get("status");
  const connectionId = req.nextUrl.searchParams.get("connection");
  if (status !== "connected" || !connectionId) return fail("google-denied");

  const user = await getCurrentUser();
  if (!user) return NextResponse.redirect(new URL("/sign-in", base));
  const mine = await getMyWorkspace(user.id);
  if (!mine) return fail("google-workspace");
  const ws = mine.workspace.id;

  let accountEmail: string | null = null;
  try {
    const profile = await connectProxy(
      connectionId,
      "GET",
      "https://gmail.googleapis.com/gmail/v1/users/me/profile",
    );
    const data = profile.data as { emailAddress?: string };
    accountEmail = data.emailAddress ?? null;
  } catch {
    // Display-only detail; the connection itself is what matters.
  }

  const data = encryptSecret(JSON.stringify({ viaConnect: true, connectionId }));
  const existing = await prisma.connection.findFirst({
    where: { workspaceId: ws, provider: "google" },
  });
  if (existing) {
    await prisma.connection.update({
      where: { id: existing.id },
      data: { data, accountEmail: accountEmail ?? existing.accountEmail },
    });
  } else {
    await prisma.connection.create({
      data: { workspaceId: ws, provider: "google", accountEmail, data, createdById: user.id },
    });
  }
  await prisma.auditEvent.create({
    data: {
      workspaceId: ws,
      action: "connected",
      summary: `Gmail + Calendar connected${accountEmail ? ` — ${accountEmail}` : ""}`,
    },
  });
  return NextResponse.redirect(new URL("/connections?connected=google", base));
}
