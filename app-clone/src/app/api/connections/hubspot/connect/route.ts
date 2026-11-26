import { redirect } from "next/navigation";
import { requireWorkspace } from "@/lib/session";
import { signState } from "@/lib/oauth-state";
import { hubspotAuthorizeUrl, hubspotConfigured } from "@/lib/hubspot";

export async function GET() {
  const { workspace } = await requireWorkspace();
  if (!hubspotConfigured()) redirect("/connections?error=hubspot-setup");
  redirect(hubspotAuthorizeUrl(signState(workspace.id)));
}
