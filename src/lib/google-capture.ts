import "server-only";

import { connectProxy, viaConnectId } from "@/lib/connect-client";
import { prisma } from "@/lib/prisma";

/**
 * Capture: pull the workspace's recent email and calendar activity
 * through the connect service into Capture rows — the AI engine's
 * inbox. Windows: email from the last 3 days; meetings from the last
 * 2 days through tomorrow. Re-running is safe (upsert by source id).
 */

type GmailHeader = { name: string; value: string };
type GmailMessage = {
  id: string;
  snippet?: string;
  internalDate?: string;
  payload?: { headers?: GmailHeader[] };
};
type CalendarEvent = {
  id: string;
  summary?: string;
  description?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
  attendees?: { email?: string; displayName?: string }[];
};

function header(headers: GmailHeader[] | undefined, name: string): string | null {
  return headers?.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value ?? null;
}

export async function captureGoogle(
  workspaceId: string,
): Promise<{ emails: number; meetings: number }> {
  const connectionId = await viaConnectId(workspaceId, "google");
  if (!connectionId) return { emails: 0, meetings: 0 };

  let emails = 0;
  const list = await connectProxy(
    connectionId,
    "GET",
    "https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=25&q=newer_than:3d",
  );
  const ids = ((list.data as { messages?: { id: string }[] }).messages ?? []).map((m) => m.id);
  for (const id of ids) {
    const full = await connectProxy(
      connectionId,
      "GET",
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date`,
    );
    const msg = full.data as GmailMessage;
    await prisma.capture.upsert({
      where: { workspaceId_kind_externalId: { workspaceId, kind: "email", externalId: id } },
      create: {
        workspaceId,
        kind: "email",
        externalId: id,
        title: header(msg.payload?.headers, "Subject") ?? "(no subject)",
        fromLabel: header(msg.payload?.headers, "From"),
        snippet: msg.snippet ?? null,
        occurredAt: msg.internalDate ? new Date(Number(msg.internalDate)) : new Date(),
      },
      update: {},
    });
    emails++;
  }

  let meetings = 0;
  const timeMin = new Date(Date.now() - 2 * 86_400_000).toISOString();
  const timeMax = new Date(Date.now() + 86_400_000).toISOString();
  const events = await connectProxy(
    connectionId,
    "GET",
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}&singleEvents=true&orderBy=startTime&maxResults=50`,
  );
  const items = (events.data as { items?: CalendarEvent[] }).items ?? [];
  for (const ev of items) {
    const startRaw = ev.start?.dateTime ?? ev.start?.date;
    if (!startRaw) continue;
    const attendees = (ev.attendees ?? [])
      .map((a) => a.displayName ?? a.email)
      .filter(Boolean)
      .join(", ");
    await prisma.capture.upsert({
      where: { workspaceId_kind_externalId: { workspaceId, kind: "meeting", externalId: ev.id } },
      create: {
        workspaceId,
        kind: "meeting",
        externalId: ev.id,
        title: ev.summary ?? "(untitled meeting)",
        fromLabel: attendees || null,
        snippet: ev.description?.slice(0, 500) ?? null,
        occurredAt: new Date(startRaw),
      },
      update: {},
    });
    meetings++;
  }

  return { emails, meetings };
}
