import { NextResponse, type NextRequest } from "next/server";

import { exchangeHubspotCode, saveHubspotConnection } from "@/lib/hubspot";
import { syncHubspotDeals } from "@/lib/hubspot-sync";
import { readOAuthState } from "@/lib/oauth-state";
import { getCurrentUser, getMyWorkspace } from "@/lib/session";

/**
 * HubSpot OAuth callback: verify the signed state belongs to the
 * signed-in user's workspace, exchange the code, store the tokens
 * encrypted, and pull the first deal sync so the Pipeline fills at once.
 */
export async function GET(req: NextRequest) {
  const base = process.env.BETTER_AUTH_URL ?? "http://localhost:3200";
  const fail = (why: string) =>
    NextResponse.redirect(new URL(`/connections?error=${why}`, base));

  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  if (!code || !state) return fail("hubspot-denied");

  const workspaceId = readOAuthState(state);
  if (!workspaceId) return fail("hubspot-state");

  const user = await getCurrentUser();
  if (!user) return NextResponse.redirect(new URL("/sign-in", base));
  const mine = await getMyWorkspace(user.id);
  if (!mine || mine.workspace.id !== workspaceId) return fail("hubspot-workspace");

  try {
    const tokens = await exchangeHubspotCode(code);
    await saveHubspotConnection(workspaceId, user.id, tokens);
    await syncHubspotDeals(workspaceId).catch(() => null);
  } catch {
    return fail("hubspot-exchange");
  }
  return NextResponse.redirect(new URL("/connections?connected=hubspot", base));
}
