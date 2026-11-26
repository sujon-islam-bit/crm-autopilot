import "server-only";
import { prisma } from "./db";
import { daysSilent, startOfWeek } from "./constants";
import { effectiveHealth } from "./health";
import { normalizeRole, ROLE_LABELS } from "./permissions";

/**
 * Data for the role-adapted dashboard (Owner/Admin Team Performance,
 * Manager Rep Activity + Stalled Deals, Sales Rep scoped home).
 * Every number comes from real rows — audit events for member activity,
 * the live health rules for stalled deals, and the Rep's own records
 * (deal.ownerName === their profile name, the same scope rule the
 * server actions enforce).
 */

export type MemberActivity = {
  userId: string;
  name: string;
  email: string;
  role: string;
  roleLabel: string;
  decided: number;
  approved: number;
  rejected: number;
};

/** Per-member decision counts from AuditEvent rows (an approve writes an
 *  "applied" audit, a reject a "rejected" one — both carry the deciding
 *  user's id). Members with no decisions yet show honest zeros. */
export async function getMemberActivity(workspaceId: string): Promise<MemberActivity[]> {
  const [memberships, audits] = await Promise.all([
    prisma.membership.findMany({
      where: { workspaceId },
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.auditEvent.findMany({
      where: { workspaceId, action: { in: ["applied", "rejected"] }, userId: { not: null } },
      select: { action: true, userId: true },
    }),
  ]);
  const counts = new Map<string, { approved: number; rejected: number }>();
  for (const a of audits) {
    if (!a.userId) continue;
    const c = counts.get(a.userId) ?? { approved: 0, rejected: 0 };
    if (a.action === "applied") c.approved += 1;
    else c.rejected += 1;
    counts.set(a.userId, c);
  }
  const roleRank = (r: string) => {
    const k = normalizeRole(r);
    return k === "owner" ? 0 : k === "admin" ? 1 : k === "manager" ? 2 : k === "rep" ? 3 : 4;
  };
  return memberships
    .map((m) => {
      const c = counts.get(m.user.id) ?? { approved: 0, rejected: 0 };
      const key = normalizeRole(m.role);
      return {
        userId: m.user.id,
        name: m.user.name?.trim() || m.user.email.split("@")[0],
        email: m.user.email,
        role: m.role,
        roleLabel: m.roleLabel ?? ROLE_LABELS[key],
        decided: c.approved + c.rejected,
        approved: c.approved,
        rejected: c.rejected,
      };
    })
    .sort((a, b) => roleRank(a.role) - roleRank(b.role));
}

export type StalledDeal = {
  externalId: string;
  name: string;
  company: string | null;
  stage: string;
  amount: number | null;
  daysSilent: number;
  flag: string;
  flagLabel: string;
  risk: "High" | "Medium";
};

/** Open deals carrying an effective health flag — the same derivation
 *  the Pipeline "Stalled" tab and the Deals "At Risk" tab use. */
export async function getStalledDeals(workspaceId: string): Promise<StalledDeal[]> {
  const deals = await prisma.crmDeal.findMany({
    where: { workspaceId, stage: { notIn: ["Won", "Lost"] } },
    orderBy: { lastActivityAt: "asc" },
  });
  const out: StalledDeal[] = [];
  for (const d of deals) {
    const health = effectiveHealth(d);
    if (!health) continue;
    out.push({
      externalId: d.externalId,
      name: d.name,
      company: d.company,
      stage: d.stage,
      amount: d.amount,
      daysSilent: daysSilent(d.lastActivityAt),
      flag: health.flag,
      flagLabel: health.label,
      risk: health.flag === "going_cold" ? "High" : "Medium",
    });
  }
  return out.sort((a, b) => b.daysSilent - a.daysSilent);
}

/** 7-day series for the Manager's Stalled stat card: how many of today's
 *  stalled deals had already crossed their silence threshold by each of
 *  the last 7 days. Silence thresholds mirror effectiveHealth (Proposal
 *  sent / Negotiation ≥ 7d, Contacted / Discovery ≥ 14d) and are computed
 *  from lastActivityAt alone, so the series never invents history. */
export function stalledSparkSeries(
  deals: { stage: string; lastActivityAt: Date; createdAt: Date }[],
  now = new Date(),
): number[] {
  const threshold = (stage: string) =>
    stage === "Proposal sent" || stage === "Negotiation" ? 7 : stage === "Contacted" || stage === "Discovery" ? 14 : null;
  const days: number[] = [];
  for (let back = 6; back >= 0; back--) {
    const end = new Date(now);
    end.setDate(end.getDate() - back);
    end.setHours(23, 59, 59, 999);
    let n = 0;
    for (const d of deals) {
      const t = threshold(d.stage);
      if (t === null || d.createdAt > end) continue;
      const crossed = new Date(d.lastActivityAt);
      crossed.setDate(crossed.getDate() + t);
      if (crossed <= end) n += 1;
    }
    days.push(n);
  }
  return days;
}

/** The Manager stat-card sparkline for Stalled Deals (see stalledSparkSeries). */
export async function getStalledSpark(workspaceId: string): Promise<number[]> {
  const deals = await prisma.crmDeal.findMany({
    where: { workspaceId, stage: { notIn: ["Won", "Lost"] } },
    select: { stage: true, lastActivityAt: true, createdAt: true },
  });
  return stalledSparkSeries(deals);
}

export type RepDealRow = {
  externalId: string;
  name: string;
  company: string | null;
  stage: string;
  amount: number | null;
  closeDate: Date | null;
};

export type RepDashboardData = {
  /** Raw pending proposals tied to the Rep's own deals (sorted like the
   *  Approvals queue: confidence desc, nulls last, newest first). Rows
   *  include their capture, matching getDashboardData's pending shape. */
  pending: Awaited<ReturnType<typeof getRepPending>>;
  ownDeals: RepDealRow[];
  ownOpenTotal: number;
  followupCount: number;
  pulse: { label: string; thisWeek: number; lastWeek: number }[];
  pulseNow: number;
  pulseDelta: number;
  sparks: { queue: number[]; deals: number[]; pipeline: number[]; followups: number[] };
};

function getRepPending(workspaceId: string, ownIds: string[]) {
  return prisma.proposal.findMany({
    where: { workspaceId, status: "pending", dealExternalId: { in: ownIds } },
    include: { capture: true },
  });
}

/** Everything the Sales Rep home shows, scoped to the Rep's own records.
 *  A Rep "owns" the deals whose ownerName matches their profile name —
 *  the exact rule in permissions.ownsDeal / the Approvals scoping. */
export async function getRepDashboard(workspaceId: string, userName: string): Promise<RepDashboardData> {
  const now = new Date();
  const name = (userName ?? "").trim().toLowerCase();
  const allDeals = await prisma.crmDeal.findMany({ where: { workspaceId } });
  const own = allDeals.filter((d) => d.ownerName && d.ownerName.trim().toLowerCase() === name);
  const ownIds = new Set(own.map((d) => d.externalId));
  const ownOpen = own.filter((d) => d.stage !== "Won" && d.stage !== "Lost");

  const pendingAll = await getRepPending(workspaceId, [...ownIds]);
  pendingAll.sort((a, b) => {
    if (a.confidence == null && b.confidence == null) return b.createdAt.getTime() - a.createdAt.getTime();
    if (a.confidence == null) return 1;
    if (b.confidence == null) return -1;
    if (b.confidence !== a.confidence) return b.confidence - a.confidence;
    return b.createdAt.getTime() - a.createdAt.getTime();
  });
  const followups = pendingAll.filter((p) => p.type === "followup_draft");

  // Pipeline Pulse scoped to own open deals (same construction as the
  // workspace pulse in lib/data.ts, filtered to the Rep's deals).
  const weekStart = startOfWeek(now);
  const lastWeekStart = new Date(weekStart);
  lastWeekStart.setDate(lastWeekStart.getDate() - 7);
  const labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const cum = (rows: typeof ownOpen, upto: Date) =>
    rows.filter((d) => d.createdAt <= upto).reduce((s, d) => s + (d.amount ?? 0), 0);
  const pulse = labels.map((label, i) => {
    const tw = new Date(weekStart);
    tw.setDate(tw.getDate() + i);
    tw.setHours(23, 59, 59, 999);
    const lw = new Date(lastWeekStart);
    lw.setDate(lw.getDate() + i);
    lw.setHours(23, 59, 59, 999);
    return { label, thisWeek: cum(ownOpen, tw), lastWeek: cum(ownOpen, lw) };
  });
  const pulseNow = pulse[6].thisWeek;
  const pulsePrev = pulse[6].lastWeek;
  const pulseDelta = pulsePrev > 0 ? Math.round(((pulseNow - pulsePrev) / pulsePrev) * 100) : 0;

  // 7-day spark series from the same rows (cumulative by createdAt).
  const dayEnds = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now);
    d.setDate(d.getDate() - (6 - i));
    d.setHours(23, 59, 59, 999);
    return d;
  });
  const sparks = {
    // "Suggestions waiting" trend: of today's own pending rows, how many
    // already existed by each day (created ≤ day end) — an honest
    // lower-bound trend from the rows themselves.
    queue: dayEnds.map((end) => pendingAll.filter((p) => p.createdAt <= end).length),
    deals: dayEnds.map((end) => ownOpen.filter((d) => d.createdAt <= end).length),
    pipeline: pulse.map((p) => p.thisWeek),
    followups: dayEnds.map((end) => followups.filter((p) => p.createdAt <= end).length),
  };
  return {
    pending: pendingAll,
    ownDeals: ownOpen
      .slice()
      .sort((a, b) => (b.amount ?? 0) - (a.amount ?? 0))
      .map((d) => ({
        externalId: d.externalId,
        name: d.name,
        company: d.company,
        stage: d.stage,
        amount: d.amount,
        closeDate: d.closeDate,
      })),
    ownOpenTotal: ownOpen.reduce((s, d) => s + (d.amount ?? 0), 0),
    followupCount: followups.length,
    pulse,
    pulseNow,
    pulseDelta,
    sparks,
  };
}
