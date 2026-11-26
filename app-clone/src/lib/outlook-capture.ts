import "server-only";
import { prisma } from "./db";
import { connectProxy, connectConfigured } from "./connect-client";
import { audit } from "./audit";
import { getViaConnectId } from "./google-capture";

// Outlook mail + calendar through the connect service's microsoft provider
// (Microsoft Graph bases under the proxy).
export async function syncOutlookCaptures(workspaceId: string): Promise<{ emails: number; events: number }> {
  if (!connectConfigured()) throw new Error("Connect service is not configured on this server");
  const connectionId = await getViaConnectId(workspaceId, "outlook");
  if (!connectionId) throw new Error("Outlook is not connected");

  let emails = 0;
  const mail = await connectProxy(
    connectionId,
    "GET",
    "https://graph.microsoft.com/v1.0/me/messages?$top=25&$orderby=receivedDateTime%20desc&$select=subject,from,receivedDateTime,bodyPreview",
  );
  const msgs = (mail.data as { value?: Record<string, unknown>[] } | null)?.value ?? [];
  for (const m of msgs) {
    const id = String(m.id ?? "");
    if (!id) continue;
    const from = (m.from as { emailAddress?: { name?: string; address?: string } } | undefined)?.emailAddress;
    await prisma.capture.upsert({
      where: { workspaceId_externalId: { workspaceId, externalId: `msmail:${id}` } },
      create: {
        workspaceId,
        kind: "email",
        source: "outlook",
        externalId: `msmail:${id}`,
        title: String(m.subject ?? "(no subject)"),
        fromLabel: from ? `${from.name ?? ""} <${from.address ?? ""}>`.trim() : null,
        body: String(m.bodyPreview ?? ""),
        snippet: String(m.bodyPreview ?? "").slice(0, 200),
        occurredAt: m.receivedDateTime ? new Date(String(m.receivedDateTime)) : new Date(),
      },
      update: {},
    });
    emails++;
  }

  let events = 0;
  const ev = await connectProxy(
    connectionId,
    "GET",
    "https://graph.microsoft.com/v1.0/me/events?$top=25&$orderby=start/dateTime%20desc&$select=subject,start,end,organizer",
  );
  const evs = (ev.data as { value?: Record<string, unknown>[] } | null)?.value ?? [];
  for (const e of evs) {
    const id = String(e.id ?? "");
    if (!id) continue;
    const start = (e.start as { dateTime?: string } | undefined)?.dateTime;
    const organizer = (e.organizer as { emailAddress?: { name?: string } } | undefined)?.emailAddress?.name;
    await prisma.capture.upsert({
      where: { workspaceId_externalId: { workspaceId, externalId: `msevent:${id}` } },
      create: {
        workspaceId,
        kind: "meeting",
        source: "outlook",
        externalId: `msevent:${id}`,
        title: String(e.subject ?? "(no title)"),
        fromLabel: organizer ?? null,
        body: "",
        snippet: "",
        occurredAt: start ? new Date(start) : new Date(),
      },
      update: {},
    });
    events++;
  }

  await prisma.connection.updateMany({
    where: { workspaceId, provider: "outlook" },
    data: { lastSyncAt: new Date() },
  });
  await audit(workspaceId, "synced", `Outlook sync: ${emails} emails, ${events} events`, {});
  return { emails, events };
}
