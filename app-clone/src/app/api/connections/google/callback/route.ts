import { redirect } from "next/navigation";
import { requireWorkspace } from "@/lib/session";
import { prisma } from "@/lib/db";
import { encryptJson } from "@/lib/crypto";
import { audit } from "@/lib/audit";
import { googleProfileEmail, syncGoogleCaptures } from "@/lib/google-capture";
import { runEngineForWorkspace } from "@/lib/engine";

export async function GET(req: Request) {
  const { workspace } = await requireWorkspace();
  const url = new URL(req.url);
  const status = url.searchParams.get("status");
  const connectionId = url.searchParams.get("connection");
  if (status !== "connected" || !connectionId) redirect("/connections?error=google");
  const email = await googleProfileEmail(connectionId!).catch(() => null);
  await prisma.connection.upsert({
    where: { workspaceId_provider: { workspaceId: workspace.id, provider: "google" } },
    create: {
      workspaceId: workspace.id,
      provider: "google",
      accountEmail: email,
      data: encryptJson({ viaConnect: true, connectionId }),
    },
    update: { accountEmail: email, data: encryptJson({ viaConnect: true, connectionId }) },
  });
  await audit(workspace.id, "connected", "Google connected (Gmail + Calendar)", {});
  await syncGoogleCaptures(workspace.id).catch(() => null);
  await runEngineForWorkspace(workspace.id).catch(() => null);
  redirect("/connections?connected=google");
}
