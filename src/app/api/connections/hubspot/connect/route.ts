import { NextResponse } from "next/server";

import { hubspotAuthorizeUrl, hubspotConfigured } from "@/lib/hubspot";
import { makeOAuthState } from "@/lib/oauth-state";
import { getCurrentUser, getMyWorkspace } from "@/lib/session";

/**
 * Start of the HubSpot connect flow: signed-in user → their workspace
 * id goes into a signed state → off to HubSpot's consent screen.
 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.redirect(new URL("/sign-in", process.env.BETTER_AUTH_URL));
  if (!hubspotConfigured()) {
    return NextResponse.redirect(
      new URL("/connections?error=hubspot-not-configured", process.env.BETTER_AUTH_URL),
    );
  }
  const mine = await getMyWorkspace(user.id);
  if (!mine) return NextResponse.redirect(new URL("/sign-in", process.env.BETTER_AUTH_URL));
  const url = hubspotAuthorizeUrl(makeOAuthState(mine.workspace.id));
  return NextResponse.redirect(url);
}
