import { Suspense } from "react";
import { connection } from "next/server";
import { requireWorkspace } from "../../../lib/session";
import { prisma } from "../../../lib/db";
import { getDashboardData } from "../../../lib/data";
import { getMemberActivity, getRepDashboard, getStalledDeals, getStalledSpark } from "../../../lib/team";
import { toProposalView } from "../../../lib/view";
import { can, hasTeamScope, normalizeRole, ownsDeal } from "../../../lib/permissions";
import DashboardClient, { type RepStats } from "./DashboardClient";

async function DashboardInner() {
  await connection();
  const { user, workspace, role } = await requireWorkspace();
  const roleKey = normalizeRole(role);

  // Greeting name: profile name when present; OTP signups may have an empty
  // name, so fall back to the email handle ("fresh@…" → "Fresh").
  const rawName = user.name.trim();
  const emailHandle = user.email.split("@")[0].replace(/[._-]+/g, " ").trim();
  const base = rawName || emailHandle;
  const lastWord = base.split(" ").filter(Boolean).slice(-1)[0] ?? "there";
  const firstName = rawName ? lastWord : lastWord.charAt(0).toUpperCase() + lastWord.slice(1);
  const canConnect = can(role, "pages.connections");

  // ---- Sales Rep: a fully scoped home (own queue, own deals, own pulse) ----
  if (roleKey === "rep") {
    const rep = await getRepDashboard(workspace.id, user.name);
    const connectionCount = await prisma.connection.count({ where: { workspaceId: workspace.id } });
    const top = rep.pending.slice(0, 3);
    const views = await Promise.all(
      top.map(async (p) => {
        const deal = p.dealExternalId
          ? await prisma.crmDeal.findFirst({ where: { workspaceId: workspace.id, externalId: p.dealExternalId } })
          : null;
        return toProposalView(p, deal);
      }),
    );
    // Every row here is tied to the Rep's own deal, and Reps may decide
    // their own proposals — the buttons render (server enforces the same).
    const decidableIds = top.map((p) => p.id);
    const briefs = rep.pending
      .filter((p) => p.type === "followup_draft")
      .slice(0, 3)
      .map((p) => {
        const det = p.detail as Record<string, unknown>;
        return {
          icon: "bolt" as const,
          title: p.title,
          sub: `"${String(det.draftBody ?? "").split(".")[0]}..."`,
          cta: "Edit Draft",
          href: "/approvals",
        };
      });
    const repStats: RepStats = {
      queueCount: rep.pending.length,
      dealsCount: rep.ownDeals.length,
      pipelineTotal: rep.ownOpenTotal,
      followupCount: rep.followupCount,
      sparks: rep.sparks,
    };
    return (
      <DashboardClient
        variant="rep"
        firstName={firstName}
        connected={connectionCount > 0}
        canConnect={canConnect}
        views={views}
        stats={EMPTY_STATS}
        pulse={rep.pulse}
        pulseScoped={{ now: rep.pulseNow, delta: rep.pulseDelta }}
        briefs={briefs}
        decidableIds={decidableIds}
        canEditDraft={briefs.length > 0}
        repStats={repStats}
        repDeals={rep.ownDeals}
      />
    );
  }

  // ---- Standard data set (Owner / Admin / Manager / Viewer) ----
  const data = await getDashboardData(workspace.id);

  const top = data.pending.slice(0, 3);
  const pairs = await Promise.all(
    top.map(async (p) => {
      const deal = p.dealExternalId
        ? await prisma.crmDeal.findFirst({
            where: { workspaceId: workspace.id, externalId: p.dealExternalId },
          })
        : null;
      return { p, deal };
    }),
  );
  const views = await Promise.all(pairs.map(({ p, deal }) => toProposalView(p, deal)));

  // UI gating mirror of the server decideGate: a row's Approve / Ignore
  // buttons render only when this user may actually decide that proposal
  // (role has proposals.decide AND — for non-team-scope roles like a Sales
  // Rep — the proposal belongs to one of their own deals). Read actions
  // (Preview) always render. The server actions enforce the same rule.
  const roleCanDecide = can(role, "proposals.decide");
  const decidableFor = (dealExternalId: string | null, dealOwnerName: string | null | undefined) =>
    roleCanDecide && (hasTeamScope(role) || (!!dealExternalId && ownsDeal(user.name, dealOwnerName)));
  const decidableIds = pairs.filter(({ p, deal }) => decidableFor(p.dealExternalId, deal?.ownerName)).map(({ p }) => p.id);

  // Today's Briefs "Edit Draft" points at the newest pending follow-up
  // draft (the same row getDashboardData builds the brief from) — gate it
  // by the same decide rule for that draft's deal.
  const draft = await prisma.proposal.findFirst({
    where: { workspaceId: workspace.id, status: "pending", type: "followup_draft" },
    orderBy: { createdAt: "desc" },
    select: { dealExternalId: true },
  });
  const draftDeal = draft?.dealExternalId
    ? await prisma.crmDeal.findFirst({
        where: { workspaceId: workspace.id, externalId: draft.dealExternalId },
        select: { ownerName: true },
      })
    : null;
  const canEditDraft = draft ? decidableFor(draft.dealExternalId, draftDeal?.ownerName) : false;

  const stats = {
    queueCount: data.queueCount,
    queueDelta: data.queueDelta,
    score: data.integrity.score,
    scoreDelta: data.integrity.delta,
    readyCount: data.readyCount,
    repHours: data.repHours,
    repDelta: data.repDelta,
    sparks: data.sparks,
    pulseNow: data.pulseNow,
    pulseDelta: data.pulseDelta,
    counts: data.integrity.counts,
  };

  if (roleKey === "manager") {
    const [stalled, memberActivity, stalledSpark] = await Promise.all([
      getStalledDeals(workspace.id),
      getMemberActivity(workspace.id),
      getStalledSpark(workspace.id),
    ]);
    return (
      <DashboardClient
        variant="manager"
        firstName={firstName}
        connected={data.hasConnection}
        canConnect={canConnect}
        views={views}
        stats={stats}
        pulse={data.pulse}
        briefs={data.briefs}
        decidableIds={decidableIds}
        canEditDraft={canEditDraft}
        stalled={stalled}
        stalledSpark={stalledSpark}
        memberActivity={memberActivity}
      />
    );
  }

  // Owner + Admin get the approved dashboard plus the Team Performance
  // card; the Viewer keeps the approved read-only dashboard unchanged.
  const teamPerformance = roleKey === "owner" || roleKey === "admin" ? await getMemberActivity(workspace.id) : undefined;

  return (
    <DashboardClient
      variant="standard"
      firstName={firstName}
      connected={data.hasConnection}
      canConnect={canConnect}
      views={views}
      stats={stats}
      pulse={data.pulse}
      briefs={data.briefs}
      decidableIds={decidableIds}
      canEditDraft={canEditDraft}
      teamPerformance={teamPerformance}
    />
  );
}

/** The Rep variant renders its own stat cards; the standard stats prop is
 *  unused there, so a zeroed placeholder keeps the shared type satisfied. */
const EMPTY_STATS = {
  queueCount: 0,
  queueDelta: 0,
  score: null,
  scoreDelta: null,
  readyCount: 0,
  repHours: 0,
  repDelta: 0,
  sparks: { queue: [], integrity: [], ready: [], rep: [] },
  pulseNow: 0,
  pulseDelta: 0,
  counts: { duplicates: 0, missing: 0, unlogged: 0, stale: 0 },
};

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="px-7 pt-6 text-sm text-muted">Loading…</div>}>
      <DashboardInner />
    </Suspense>
  );
}
