import { redirect } from "next/navigation";
import { verifyState } from "@/lib/oauth-state";
import { hubspotExchange, saveHubspotConnection, syncHubspotDeals } from "@/lib/hubspot";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state") ?? "";
  const workspaceId = verifyState(state);
  if (!code || !workspaceId) redirect("/connections?error=hubspot");
  try {
    const tokens = await hubspotExchange(code!);
    await saveHubspotConnection(workspaceId!, tokens);
    await syncHubspotDeals(workspaceId!).catch(() => null);
  } catch {
    redirect("/connections?error=hubspot");
  }
  redirect("/connections?connected=hubspot");
}
