import "server-only";
import { prisma } from "./db";

export type HygieneItem = {
  kind: "duplicate" | "missing" | "unlogged" | "stale";
  dealId?: string;
  contactId?: string;
  captureId?: string;
  label: string;
  detail: string;
};

function norm(s: string | null | undefined): string {
  return (s ?? "").trim().toLowerCase();
}

/**
 * Data Hygiene computed from real rows:
 * - duplicates: extra contact records sharing a normalised email (pairs)
 * - missing: deals/contacts with at least one empty key field (one item each)
 * - unlogged: meeting captures the engine read but produced no proposal from
 * - stale: open deals with no activity for 30+ days
 * The headline score is the workspace's stored health figure (the four counts
 * are the live, row-level truth shown next to it). A workspace that has never
 * been scored stores NULL — the UI renders an honest "no data yet" state,
 * never a borrowed number.
 */
export async function computeHygiene(workspaceId: string) {
  const [workspace, deals, contacts, meetings] = await Promise.all([
    prisma.workspace.findUnique({ where: { id: workspaceId } }),
    prisma.crmDeal.findMany({ where: { workspaceId }, orderBy: { name: "asc" } }),
    prisma.crmContact.findMany({ where: { workspaceId }, orderBy: { name: "asc" } }),
    prisma.capture.findMany({
      where: { workspaceId, kind: "meeting" },
      include: { proposals: { select: { id: true } } },
      orderBy: { occurredAt: "desc" },
    }),
  ]);

  const duplicates: HygieneItem[] = [];
  const byEmail = new Map<string, (typeof contacts)[number]>();
  for (const c of contacts) {
    const key = norm(c.email);
    if (!key) continue;
    const prior = byEmail.get(key);
    if (prior) {
      duplicates.push({
        kind: "duplicate",
        contactId: c.id,
        label: c.name,
        detail: `Same email as "${prior.name}" (${c.email}) — likely a duplicate contact`,
      });
    } else {
      byEmail.set(key, c);
    }
  }

  const missing: HygieneItem[] = [];
  for (const d of deals) {
    const fields: string[] = [];
    if (d.amount == null) fields.push("amount");
    if (!d.ownerName) fields.push("owner");
    if (!d.company) fields.push("company");
    if (fields.length > 0) {
      missing.push({ kind: "missing", dealId: d.id, label: d.name, detail: `Missing: ${fields.join(", ")}` });
    }
  }
  for (const c of contacts) {
    const fields: string[] = [];
    if (!c.email) fields.push("email");
    if (!c.title) fields.push("title");
    if (!c.company) fields.push("company");
    if (fields.length > 0) {
      missing.push({ kind: "missing", contactId: c.id, label: c.name, detail: `Missing: ${fields.join(", ")}` });
    }
  }

  const unlogged: HygieneItem[] = meetings
    .filter((m) => m.processedAt && m.proposals.length === 0)
    .map((m) => ({
      kind: "unlogged" as const,
      captureId: m.id,
      label: m.title,
      detail: "Meeting was read but no CRM update came out of it",
    }));

  const stale: HygieneItem[] = [];
  for (const d of deals) {
    const silent = Math.floor((Date.now() - d.lastActivityAt.getTime()) / 86400000);
    if (d.stage !== "Won" && silent > 30) {
      stale.push({
        kind: "stale",
        dealId: d.id,
        label: d.name,
        detail: `No activity for ${silent} days (stage: ${d.stage})`,
      });
    }
  }

  return {
    score: workspace?.healthScore ?? null,
    scoreDelta: workspace?.healthDelta ?? null,
    duplicates,
    missing,
    unlogged,
    stale,
    counts: {
      duplicates: duplicates.length,
      missing: missing.length,
      unlogged: unlogged.length,
      stale: stale.length,
    },
  };
}
