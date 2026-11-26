import { redirect } from "next/navigation";
import { verifyState } from "@/lib/oauth-state";
import { salesforceExchange, saveSalesforceConnection, syncSalesforceDeals } from "@/lib/salesforce";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state") ?? "";
  const workspaceId = verifyState(state);
  if (!code || !workspaceId) redirect("/connections?error=salesforce");
  try {
    const tokens = await salesforceExchange(code!);
    await saveSalesforceConnection(workspaceId!, tokens);
    await syncSalesforceDeals(workspaceId!).catch(() => null);
  } catch {
    redirect("/connections?error=salesforce");
  }
  redirect("/connections?connected=salesforce");
}
