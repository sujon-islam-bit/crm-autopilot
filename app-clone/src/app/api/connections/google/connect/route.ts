import { redirect } from "next/navigation";
import { requireWorkspace } from "@/lib/session";
import { connectBase } from "@/lib/connect-client";

export async function GET() {
  const { workspace } = await requireWorkspace();
  const app = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3200";
  const returnUrl = `${app}/api/connections/google/callback`;
  redirect(
    `${connectBase()}/connect/google?user=${encodeURIComponent(`crm:${workspace.id}`)}&return_url=${encodeURIComponent(returnUrl)}`,
  );
}
