import "server-only";
import { prisma } from "./db";
import { computeHygiene, scoreFromCounts } from "./hygiene";

/**
 * Health snapshots — one row per workspace per day, written whenever a
 * health scan runs (the engine's run path calls this). The stored score is
 * the workspace's headline figure when it has one; a workspace that has
 * never been scored gets the points-rule result for its real counts
 * (an empty CRM honestly scores 100). Powers the Data Quality Trend.
 */
export async function recordHealthSnapshot(workspaceId: string): Promise<void> {
  try {
    const h = await computeHygiene(workspaceId);
    const score = h.score ?? scoreFromCounts(h.counts);
    const day = new Date();
    day.setHours(0, 0, 0, 0);
    await prisma.healthSnapshot.upsert({
      where: { workspaceId_date: { workspaceId, date: day } },
      create: {
        workspaceId,
        date: day,
        score,
        dupCount: h.counts.duplicates,
        missingCount: h.counts.missing,
        unloggedCount: h.counts.unlogged,
        staleCount: h.counts.stale,
      },
      update: {
        score,
        dupCount: h.counts.duplicates,
        missingCount: h.counts.missing,
        unloggedCount: h.counts.unlogged,
        staleCount: h.counts.stale,
      },
    });
  } catch {
    // A snapshot must never break the scan/engine run that triggered it.
  }
}
