import { NextResponse } from "next/server";

import { connectServiceConfigured, googleConnectUrl } from "@/lib/connect-client";
import { getCurrentUser, getMyWorkspace } from "@/lib/session";

/**
 * Start of the Google connect flow: the actual consent happens on our
 * connect service (it owns the Google connection); we hand it the
 * workspace-scoped user id and a return URL back to this app.
 */
export async function GET() {
  const base = process.env.BETTER_AUTH_URL ?? "http://localhost:3200";
  const user = await getCurrentUser();
  if (!user) return NextResponse.redirect(new URL("/sign-in", base));
  if (!connectServiceConfigured()) {
    return NextResponse.redirect(new URL("/connections?error=connect-not-configured", base));
  }
  const mine = await getMyWorkspace(user.id);
  if (!mine) return NextResponse.redirect(new URL("/sign-in", base));
  return NextResponse.redirect(googleConnectUrl(mine.workspace.id, base));
}
