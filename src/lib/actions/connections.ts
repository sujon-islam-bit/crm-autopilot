"use server";

import { revalidatePath } from "next/cache";

import { syncHubspotDeals } from "@/lib/hubspot-sync";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, getMyWorkspace } from "@/lib/session";

/** Remove a provider connection (tokens deleted with the row). */
export async function disconnectProvider(provider: string) {
  const user = await getCurrentUser();
  if (!user) return;
  const mine = await getMyWorkspace(user.id);
  if (!mine) return;
  const ws = mine.workspace.id;
  const deleted = await prisma.connection.deleteMany({ where: { workspaceId: ws, provider } });
  if (deleted.count > 0) {
    await prisma.auditEvent.create({
      data: { workspaceId: ws, action: "disconnected", summary: `Disconnected ${provider}` },
    });
  }
  revalidatePath("/connections");
  revalidatePath("/dashboard");
}

/** Manual HubSpot deal re-sync from the Connections screen. */
export async function syncHubspotNow(): Promise<{ deals: number } | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  const mine = await getMyWorkspace(user.id);
  if (!mine) return null;
  const deals = await syncHubspotDeals(mine.workspace.id).catch(() => 0);
  revalidatePath("/connections");
  revalidatePath("/pipeline");
  revalidatePath("/dashboard");
  return { deals };
}
