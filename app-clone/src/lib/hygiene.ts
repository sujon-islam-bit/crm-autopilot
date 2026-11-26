import "server-only";
import { prisma } from "./db";
import { getGuardrails } from "./guardrails";

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
 * The scan's points rule, used for health SNAPSHOTS (the trend history):
 * 4 points per duplicate record, 2 per missing-field record, 2 per unlogged
 * activity, 3 per stale deal — 100 weighted points cost 1 score point.
 * Calibrated so the demo's live counts (19/24/31/8) reproduce its stored
 * score of 98. The headline score itself stays the workspace's stored
 * figure; snapshots record what the rule gives for that day's real counts.
 */
export function scoreFromCounts(c: {
  duplicates: number;
  missing: number;
  unlogged: number;
  stale: number;
}): number {
  const penalty = (4 * c.duplicates + 2 * c.missing + 2 * c.unlogged + 3 * c.stale) / 100;
  return Math.max(0, Math.min(100, Math.round(100 - penalty)));
}

/** Live duplicate count (extra records sharing a normalised email). */
export async function countDuplicateExtras(workspaceId: string): Promise<number> {
  const contacts = await prisma.crmContact.findMany({
    where: { workspaceId },
    select: { email: true },
  });
  const seen = new Set<string>();
  let extras = 0;
  for (const c of contacts) {
    const key = norm(c.email);
    if (!key) continue;
    if (seen.has(key)) extras++;
    else seen.add(key);
  }
  return extras;
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
  const [workspace, deals, contacts, meetings, guardrails] = await Promise.all([
    prisma.workspace.findUnique({ where: { id: workspaceId } }),
    prisma.crmDeal.findMany({ where: { workspaceId }, orderBy: { name: "asc" } }),
    prisma.crmContact.findMany({ where: { workspaceId }, orderBy: { name: "asc" } }),
    prisma.capture.findMany({
      where: { workspaceId, kind: "meeting" },
      include: { proposals: { select: { id: true } } },
      orderBy: { occurredAt: "desc" },
    }),
    getGuardrails(workspaceId),
  ]);

  // Guardrail effect: with duplicate detection off, the detector does not
  // run — the count freezes at the last computed value (stored when the
  // rule was switched off) and no live list is produced.
  const duplicatesPaused = !guardrails.effective.detectDuplicates;
  const duplicates: HygieneItem[] = [];
  if (!duplicatesPaused) {
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
    // Keep the frozen figure fresh while detection is on.
    if (guardrails.hasRow && guardrails.lastDupCount !== duplicates.length) {
      await prisma.guardrailSetting
        .update({ where: { workspaceId }, data: { lastDupCount: duplicates.length } })
        .catch(() => {});
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
    duplicatesPaused,
    counts: {
      duplicates: duplicatesPaused ? (guardrails.lastDupCount ?? 0) : duplicates.length,
      missing: missing.length,
      unlogged: unlogged.length,
      stale: stale.length,
    },
  };
}
