import "server-only";
import { prisma } from "./db";
import { decryptJson } from "./crypto";
import { connectProxy, connectConfigured } from "./connect-client";
import { audit } from "./audit";

type ViaConnect = { viaConnect?: boolean; connectionId?: string };

export async function getViaConnectId(workspaceId: string, provider: string): Promise<string | null> {
  const conn = await prisma.connection.findUnique({
    where: { workspaceId_provider: { workspaceId, provider } },
  });
  if (!conn) return null;
  try {
    const data = decryptJson<ViaConnect>(conn.data);
    return data.viaConnect && data.connectionId ? data.connectionId : null;
  } catch {
    return null;
  }
}

export async function syncGoogleCaptures(workspaceId: string): Promise<{ emails: number; events: number }> {
  if (!connectConfigured()) throw new Error("Connect service is not configured on this server");
  const connectionId = await getViaConnectId(workspaceId, "google");
  if (!connectionId) throw new Error("Google is not connected");

  let emails = 0;
  const list = await connectProxy(
    connectionId,
    "GET",
    "https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=25&q=newer_than%3A3d",
  );
  const messages = (list.data as { messages?: { id: string }[] } | null)?.messages ?? [];
  for (const m of messages) {
    const full = await connectProxy(
      connectionId,
      "GET",
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${m.id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date`,
    );
    const d = full.data as {
      id: string;
      snippet?: string;
      internalDate?: string;
      payload?: { headers?: { name: string; value: string }[] };
    } | null;
    if (!d?.id) continue;
    const headers = Object.fromEntries((d.payload?.headers ?? []).map((h) => [h.name.toLowerCase(), h.value]));
    await prisma.capture.upsert({
      where: { workspaceId_externalId: { workspaceId, externalId: `gmail:${d.id}` } },
      create: {
        workspaceId,
        kind: "email",
        source: "gmail",
        externalId: `gmail:${d.id}`,
        title: headers["subject"] || "(no subject)",
        fromLabel: headers["from"] || null,
        body: d.snippet || "",
        snippet: d.snippet || "",
        occurredAt: d.internalDate ? new Date(Number(d.internalDate)) : new Date(),
      },
      update: {},
    });
    emails++;
  }

  let events = 0;
  const now = new Date();
  const from = new Date(now.getTime() - 2 * 86400000).toISOString();
  const to = new Date(now.getTime() + 2 * 86400000).toISOString();
  const cal = await connectProxy(
    connectionId,
    "GET",
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(from)}&timeMax=${encodeURIComponent(to)}&singleEvents=true&orderBy=startTime&maxResults=25`,
  );
  const items = (cal.data as { items?: Record<string, unknown>[] } | null)?.items ?? [];
  for (const ev of items) {
    const id = String(ev.id ?? "");
    if (!id) continue;
    const start = (ev.start as { dateTime?: string; date?: string } | undefined) ?? {};
    const attendees = (ev.attendees as { email?: string }[] | undefined) ?? [];
    await prisma.capture.upsert({
      where: { workspaceId_externalId: { workspaceId, externalId: `gcal:${id}` } },
      create: {
        workspaceId,
        kind: "meeting",
        source: "calendar",
        externalId: `gcal:${id}`,
        title: String(ev.summary ?? "(no title)"),
        fromLabel: attendees.map((a) => a.email).filter(Boolean).join(", ") || null,
        body: String(ev.description ?? ""),
        snippet: String(ev.description ?? "").slice(0, 200),
        occurredAt: start.dateTime ? new Date(start.dateTime) : start.date ? new Date(start.date) : now,
      },
      update: {},
    });
    events++;
  }

  await prisma.connection.updateMany({
    where: { workspaceId, provider: "google" },
    data: { lastSyncAt: new Date() },
  });
  await audit(workspaceId, "synced", `Google sync: ${emails} emails, ${events} calendar events`, {});
  return { emails, events };
}

export async function googleProfileEmail(connectionId: string): Promise<string | null> {
  const r = await connectProxy(connectionId, "GET", "https://gmail.googleapis.com/gmail/v1/users/me/profile");
  const d = r.data as { emailAddress?: string } | null;
  return d?.emailAddress ?? null;
}
