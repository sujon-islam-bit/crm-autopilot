import "server-only";
import { prisma } from "./db";
import { startOfWeek } from "./constants";
import { computeHygiene } from "./hygiene";

export type PulsePoint = { label: string; thisWeek: number; lastWeek: number };

function dayStart(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

async function pendingAt(workspaceId: string, at: Date): Promise<number> {
  return prisma.proposal.count({
    where: {
      workspaceId,
      createdAt: { lte: at },
      OR: [{ decidedAt: null }, { decidedAt: { gt: at } }],
    },
  });
}

export async function getDashboardData(workspaceId: string) {
  const now = new Date();
  const weekStart = startOfWeek(now);
  const lastWeekStart = new Date(weekStart);
  lastWeekStart.setDate(lastWeekStart.getDate() - 7);
  const weekAgo = new Date(now);
  weekAgo.setDate(weekAgo.getDate() - 7);

  const [pending, pendingWeekAgo, hygiene, openDeals, applied, capturesToday, drafts, support, connectionCount] =
    await Promise.all([
      prisma.proposal.findMany({
        where: { workspaceId, status: "pending" },
        orderBy: [{ confidence: "desc" }, { createdAt: "desc" }],
        include: { capture: true },
      }),
      pendingAt(workspaceId, weekAgo),
      computeHygiene(workspaceId),
      prisma.crmDeal.findMany({
        // Open = not in a terminal stage. "Lost" must be excluded alongside
        // "Won" or lost deals would leak into the pulse/open sums.
        where: { workspaceId, stage: { notIn: ["Won", "Lost"] } },
        select: { amount: true, createdAt: true },
      }),
      prisma.proposal.findMany({
        where: { workspaceId, status: "applied" },
        select: { appliedAt: true, detail: true },
      }),
      prisma.capture.findMany({
        where: { workspaceId, kind: "meeting", occurredAt: { gte: dayStart(now) } },
        orderBy: { occurredAt: "asc" },
      }),
      prisma.proposal.findMany({
        where: { workspaceId, status: "pending", type: "followup_draft" },
        orderBy: { createdAt: "desc" },
      }),
      prisma.capture.findMany({
        where: { workspaceId, source: "support" },
        orderBy: { occurredAt: "desc" },
      }),
      prisma.connection.count({ where: { workspaceId } }),
    ]);

  // ---- Stat cards ----
  const queueCount = pending.length;
  const queueDelta = queueCount - pendingWeekAgo;
  const ready = pending.filter((p) => (p.confidence ?? 0) > 70);
  const savedMin = (from: Date, to: Date) =>
    applied
      .filter((p) => p.appliedAt && p.appliedAt >= from && p.appliedAt < to)
      .reduce((s, p) => s + (Number((p.detail as Record<string, unknown>)?.savedMinutes) || 0), 0);
  const nextWeek = new Date(weekStart);
  nextWeek.setDate(nextWeek.getDate() + 7);
  const savedThisWeek = savedMin(weekStart, nextWeek);
  const savedLastWeek = savedMin(lastWeekStart, weekStart);
  const repHours = savedThisWeek / 60;
  const repDelta =
    savedLastWeek > 0 ? Math.round(((savedThisWeek - savedLastWeek) / savedLastWeek) * 100) : 0;

  // ---- Sparklines: cumulative series over the last 7 days, from real rows ----
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = dayStart(now);
    d.setDate(d.getDate() - (6 - i));
    return d;
  });
  const queueSpark: number[] = [];
  for (const d of days) {
    const end = new Date(d);
    end.setHours(23, 59, 59, 999);
    queueSpark.push(await pendingAt(workspaceId, end));
  }
  const processed = await prisma.capture.findMany({
    where: { workspaceId, processedAt: { not: null } },
    select: { processedAt: true },
  });
  const integritySpark = days.map(
    (d) => processed.filter((c) => c.processedAt && dayStart(c.processedAt) <= d).length,
  );
  const readyRows = await prisma.proposal.findMany({
    where: { workspaceId, confidence: { gt: 70 } },
    select: { createdAt: true },
  });
  const readySpark = days.map(
    (d) => readyRows.filter((p) => dayStart(p.createdAt) <= d).length,
  );
  const repSpark = days.map((d) => {
    const end = new Date(d);
    end.setHours(23, 59, 59, 999);
    return (
      applied
        .filter((p) => p.appliedAt && p.appliedAt <= end)
        .reduce((s, p) => s + (Number((p.detail as Record<string, unknown>)?.savedMinutes) || 0), 0) / 60
    );
  });

  // ---- Pipeline Pulse: cumulative open pipeline, Mon–Sun, this vs last week ----
  const labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const cum = (upto: Date) =>
    openDeals.filter((d) => d.createdAt <= upto).reduce((s, d) => s + (d.amount ?? 0), 0);
  const pulse: PulsePoint[] = labels.map((label, i) => {
    const tw = new Date(weekStart);
    tw.setDate(tw.getDate() + i);
    tw.setHours(23, 59, 59, 999);
    const lw = new Date(lastWeekStart);
    lw.setDate(lw.getDate() + i);
    lw.setHours(23, 59, 59, 999);
    return { label, thisWeek: cum(tw), lastWeek: cum(lw) };
  });
  const pulseNow = pulse[6].thisWeek;
  const pulsePrev = pulse[6].lastWeek;
  const pulseDelta = pulsePrev > 0 ? Math.round(((pulseNow - pulsePrev) / pulsePrev) * 100) : 0;

  // ---- Today's Briefs ----
  type Brief = { icon: "clock" | "bolt" | "alert"; title: string; sub: string; cta: string; href: string };
  const briefs: Brief[] = [];
  for (const m of capturesToday.slice(0, 1)) {
    const t = m.occurredAt.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
    briefs.push({
      icon: "clock",
      title: `${t} • ${m.title}`,
      sub: m.snippet,
      cta: "View Brief",
      href: "/activity",
    });
  }
  for (const d of drafts.slice(0, 1)) {
    const det = d.detail as Record<string, unknown>;
    briefs.push({
      icon: "bolt",
      title: d.title,
      sub: `"${String(det.draftBody ?? "").split(".")[0]}..."`,
      cta: "Edit Draft",
      href: "/approvals",
    });
  }
  if (support.length > 0) {
    briefs.push({
      icon: "alert",
      title: `${support.length} open support tickets flagged`,
      sub: `Last email: ${support[0].title}`,
      cta: "View Tickets",
      href: "/activity",
    });
  }

  const lastSync = await prisma.connection.findFirst({
    where: { workspaceId },
    orderBy: { lastSyncAt: "desc" },
    select: { provider: true, lastSyncAt: true },
  });
  const bellCount = await prisma.auditEvent.count({
    where: { workspaceId, createdAt: { gte: dayStart(now) } },
  });

  return {
    pending,
    queueCount,
    queueDelta,
    readyCount: ready.length,
    repHours,
    repDelta,
    integrity: { score: hygiene.score, delta: hygiene.scoreDelta, counts: hygiene.counts },
    sparks: { queue: queueSpark, integrity: integritySpark, ready: readySpark, rep: repSpark },
    pulse,
    pulseNow,
    pulseDelta,
    briefs,
    lastSync,
    bellCount,
    hasConnection: connectionCount > 0,
  };
}
