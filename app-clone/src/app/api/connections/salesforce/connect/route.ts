import { redirect } from "next/navigation";
import { requireWorkspace } from "@/lib/session";
import { signState } from "@/lib/oauth-state";
import { salesforceAuthorizeUrl, salesforceConfigured } from "@/lib/salesforce";

export async function GET() {
  const { workspace } = await requireWorkspace();
  if (!salesforceConfigured()) redirect("/connections?error=salesforce-setup");
  redirect(salesforceAuthorizeUrl(signState(workspace.id)));
}
