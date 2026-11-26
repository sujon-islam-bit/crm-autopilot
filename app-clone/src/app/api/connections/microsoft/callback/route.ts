import { redirect } from "next/navigation";
import { requireWorkspace } from "@/lib/session";
import { prisma } from "@/lib/db";
import { encryptJson } from "@/lib/crypto";
import { audit } from "@/lib/audit";
import { syncOutlookCaptures } from "@/lib/outlook-capture";
import { runEngineForWorkspace } from "@/lib/engine";

export async function GET(req: Request) {
  const { workspace } = await requireWorkspace();
  const url = new URL(req.url);
  const status = url.searchParams.get("status");
  const connectionId = url.searchParams.get("connection");
  if (status !== "connected" || !connectionId) redirect("/connections?error=outlook");
  await prisma.connection.upsert({
    where: { workspaceId_provider: { workspaceId: workspace.id, provider: "outlook" } },
    create: {
      workspaceId: workspace.id,
      provider: "outlook",
      data: encryptJson({ viaConnect: true, connectionId }),
    },
    update: { data: encryptJson({ viaConnect: true, connectionId }) },
  });
  await audit(workspace.id, "connected", "Outlook connected (mail + calendar)", {});
  await syncOutlookCaptures(workspace.id).catch(() => null);
  await runEngineForWorkspace(workspace.id).catch(() => null);
  redirect("/connections?connected=outlook");
}
