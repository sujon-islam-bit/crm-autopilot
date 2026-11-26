import Link from "next/link";

import DashboardSearch from "@/components/dashboard-search";
import { money } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { getMyWorkspace, requireUser } from "@/lib/session";

const STAGES = ["New", "Contacted", "Meeting booked", "Proposal sent", "Negotiation", "Won"];

/** Bar colours for the pipeline chart: pale green deepening by stage,
 *  with the Won bar in lime like the reference dashboard's highlight. */
const STAGE_BAR: Record<string, string> = {
  New: "bg-green-200",
  Contacted: "bg-green-300",
  "Meeting booked": "bg-green-400",
  "Proposal sent": "bg-pine/60",
  Negotiation: "bg-pine",
  Won: "bg-lime",
};

const FLAG_LABEL: Record<string, { label: string; style: string }> = {
  going_cold: { label: "Going cold", style: "bg-red-50 text-red-700 ring-red-600/15" },
  no_reply: { label: "No reply yet", style: "bg-amber-50 text-amber-700 ring-amber-600/15" },
  promise_due: { label: "Promise due", style: "bg-lime-100 text-lime-800 ring-lime-600/20" },
};

/** Pastel appointment tints for the calendar rail, alternating. */
const MEETING_TINTS = ["bg-yellow-100/80", "bg-pink-100/80", "bg-lime-100/80", "bg-green-100/80"];

/**
 * The home screen — deliberately one screen on a desktop: a header bar
 * with real search, the morning brief, one performance card, and the
 * pipeline chart beside a rail with the calendar, today's promises and
 * the deals that need a human. Everything else lives on its own page
 * (approvals, pipeline, activity); this page only carries the counts
 * and links that point there. Every number is read from the database
 * the product itself maintains.
 */
export default async function DashboardPage() {
  const user = await requireUser();
  const mine = await getMyWorkspace(user.id);
  if (!mine) return null;
  const ws = mine.workspace.id;

  const since24h = new Date(Date.now() - 24 * 3600 * 1000);
  const [
    pendingCount,
    appliedYesterday,
    proposedYesterday,
    connections,
    stageRows,
    meetings,
    promiseDeals,
    attention,
  ] = await Promise.all([
    prisma.proposal.count({ where: { workspaceId: ws, status: "pending" } }),
    prisma.auditEvent.count({
      where: { workspaceId: ws, action: "applied", createdAt: { gte: since24h } },
    }),
    prisma.auditEvent.count({
      where: { workspaceId: ws, action: "proposed", createdAt: { gte: since24h } },
    }),
    prisma.connection.findMany({ where: { workspaceId: ws } }),
    prisma.crmDeal.groupBy({
      by: ["stage"],
      where: { workspaceId: ws },
      _count: { _all: true },
      _sum: { amount: true },
    }),
    prisma.capture.findMany({
      where: { workspaceId: ws, kind: "meeting" },
      orderBy: { occurredAt: "desc" },
      take: 3,
    }),
    prisma.crmDeal.findMany({
      where: { workspaceId: ws, healthFlag: "promise_due" },
      orderBy: { amount: "desc" },
      take: 3,
    }),
    prisma.crmDeal.findMany({
      where: { workspaceId: ws, healthFlag: { not: null } },
      orderBy: { lastActivityAt: "asc" },
      take: 3,
    }),
  ]);

  const today = new Date().toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const hubspotConnected = connections.some((c) => c.provider === "hubspot");

  const stageMap = new Map(stageRows.map((r) => [r.stage, r]));
  const dealsWon = stageMap.get("Won")?._count._all ?? 0;
  const openDealsCount = STAGES.filter((s) => s !== "Won").reduce(
    (sum, s) => sum + (stageMap.get(s)?._count._all ?? 0),
    0,
  );
  const pipelineValue = STAGES.filter((s) => s !== "Won").reduce(
    (sum, s) => sum + (stageMap.get(s)?._sum.amount ?? 0),
    0,
  );
  const maxStageValue = Math.max(1, ...STAGES.map((s) => stageMap.get(s)?._sum.amount ?? 0));

  const perfStats = [
    { label: "Open deals", value: String(openDealsCount) },
    { label: "Pipeline value", value: money(pipelineValue) },
    { label: "Approvals waiting", value: String(pendingCount) },
    { label: "Deals won", value: String(dealsWon) },
  ];

  const meetingTime = new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <DashboardSearch />
        <div className="flex shrink-0 items-center gap-3">
          <div className="hidden text-right leading-tight sm:block">
            <p className="text-[14px] font-bold tracking-[-0.01em] text-stone-900">
              {user.name || "Account"}
            </p>
            <p className="text-xs text-stone-400">{mine.workspace.name}</p>
          </div>
          <span className="grid h-10 w-10 place-items-center rounded-full bg-pine text-[15px] font-bold text-white shadow-[0_6px_14px_-6px_rgba(11,79,58,0.55)]">
            {(user.name || user.email).slice(0, 1).toUpperCase()}
          </span>
        </div>
      </div>

      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-[32px] font-extrabold tracking-tight text-stone-900">Dashboard</h1>
          <p className="mt-1 max-w-2xl text-[15px] leading-relaxed text-stone-500">
            {today} · In the last 24 hours the AI proposed{" "}
            <b className="text-stone-900">{proposedYesterday}</b> updates and{" "}
            <b className="text-stone-900">{appliedYesterday}</b> approved changes were applied to
            your CRM.{" "}
            {pendingCount > 0
              ? `${pendingCount} more are waiting for your approval.`
              : "Nothing is waiting on you."}
          </p>
        </div>
        <Link
          href="/approvals"
          className="inline-flex shrink-0 items-center gap-2.5 rounded-xl bg-pine px-5 py-3 text-[15px] font-semibold text-white shadow-[0_8px_18px_-8px_rgba(11,79,58,0.55)] transition duration-200 hover:bg-pine-dark"
        >
          Review approvals
          {pendingCount > 0 && (
            <span className="tnum rounded-full bg-lime px-2 py-0.5 text-xs font-bold leading-none text-lime-950">
              {pendingCount}
            </span>
          )}
        </Link>
      </header>

      <section className="card p-6">
        <h2 className="section-title">Your pipeline at a glance</h2>
        <div className="mt-4 grid grid-cols-2 gap-y-5 lg:grid-cols-4">
          {perfStats.map((s, i) => (
            <div
              key={s.label}
              className={i > 0 ? "lg:border-l lg:border-line lg:pl-8" : ""}
            >
              <p className="text-[13px] font-medium text-stone-400">{s.label}</p>
              <p className="tnum mt-1 text-[28px] font-extrabold tracking-tight text-stone-900">
                {s.value}
              </p>
            </div>
          ))}
        </div>
      </section>

      {!hubspotConnected && (
        <section className="card relative overflow-hidden p-6">
          <span
            aria-hidden
            className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-lime via-lime-200 to-green-200"
          />
          <h2 className="text-lg font-bold tracking-[-0.01em] text-stone-900">Switch on the autopilot</h2>
          <p className="mt-1 max-w-lg text-[15px] leading-relaxed text-stone-600">
            Connect HubSpot and your team&apos;s Gmail + Calendar. From then on, this page fills
            itself: updates to approve, deals that need you, and a brief every morning.
          </p>
          <Link
            href="/connections"
            className="mt-4 inline-block rounded-xl bg-pine px-6 py-3 text-[15px] font-semibold text-white shadow-[0_8px_18px_-8px_rgba(11,79,58,0.55)] transition duration-200 hover:bg-pine-dark"
          >
            Connect your apps →
          </Link>
        </section>
      )}

      <div className="grid gap-5 lg:grid-cols-3">
        <section className="card p-6 lg:col-span-2">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="section-title">Pipeline by stage</h2>
              <p className="tnum mt-2 text-[32px] font-extrabold leading-none tracking-tight text-stone-900">
                {money(pipelineValue)}
              </p>
              <p className="mt-1.5 text-[13px] text-stone-400">
                Open pipeline value · {money(stageMap.get("Won")?._sum.amount ?? 0)} already won
              </p>
            </div>
            <span className="rounded-full bg-lime-100 px-3 py-1 text-xs font-bold text-lime-800">
              {dealsWon} won
            </span>
          </div>
          <div className="mt-5 grid grid-cols-3 gap-4 sm:grid-cols-6">
            {STAGES.map((stage) => {
              const row = stageMap.get(stage);
              const value = row?._sum.amount ?? 0;
              const count = row?._count._all ?? 0;
              const heightPct = Math.max(value > 0 ? 4 : 0, Math.round((value / maxStageValue) * 100));
              return (
                <div key={stage} className="flex flex-col items-center">
                  <p className="tnum text-[13px] font-bold text-stone-900">{money(value)}</p>
                  <div className="flex h-28 w-full items-end justify-center">
                    <div
                      className={`w-full max-w-14 rounded-t-xl ${STAGE_BAR[stage]}`}
                      style={{ height: `${heightPct}%` }}
                    />
                  </div>
                  <p className="mt-2 text-center text-xs font-semibold leading-tight text-stone-500">
                    {stage}
                  </p>
                  <p className="tnum text-xs text-stone-400">
                    {count} {count === 1 ? "deal" : "deals"}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        <section className="card flex flex-col p-6">
          <h2 className="section-title">From your calendar</h2>
          {meetings.length === 0 ? (
            <p className="mt-3 text-[14px] leading-relaxed text-stone-500">
              No meetings captured yet. Once Google Calendar is connected and synced, the
              meetings the AI has read appear here.
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {meetings.map((cap, i) => (
                <li key={cap.id} className={`rounded-2xl px-4 py-2.5 ${MEETING_TINTS[i % MEETING_TINTS.length]}`}>
                  <p className="text-[14px] font-bold leading-snug tracking-[-0.01em] text-stone-900">
                    {cap.title}
                  </p>
                  <p className="tnum mt-0.5 text-xs font-medium text-stone-500">
                    {meetingTime.format(cap.occurredAt)}
                    {cap.fromLabel ? ` · ${cap.fromLabel}` : ""}
                  </p>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-5 border-t border-line-soft pt-4">
            <h3 className="text-[13px] font-bold uppercase tracking-wide text-stone-400">
              Promises due today
            </h3>
            {promiseDeals.length === 0 ? (
              <p className="mt-2 text-[14px] leading-relaxed text-stone-500">
                No promises are due. The AI flags them here the moment one slips.
              </p>
            ) : (
              <ul className="mt-2.5 space-y-1.5">
                {promiseDeals.map((deal) => (
                  <li key={deal.id} className="flex items-baseline justify-between gap-3">
                    <span className="min-w-0 text-[14px] font-semibold leading-snug text-stone-800">
                      {deal.company ?? deal.name}
                    </span>
                    <span className="tnum shrink-0 text-[13.5px] font-bold text-stone-900">
                      {money(deal.amount, deal.currency)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="mt-5 border-t border-line-soft pt-4">
            <h3 className="text-[13px] font-bold uppercase tracking-wide text-stone-400">
              Needs your attention
            </h3>
            {attention.length === 0 ? (
              <p className="mt-2 text-[14px] leading-relaxed text-stone-500">
                Nothing needs you right now. The AI keeps watching every deal.
              </p>
            ) : (
              <ul className="mt-2 space-y-1">
                {attention.map((deal) => {
                  const flag = deal.healthFlag ? FLAG_LABEL[deal.healthFlag] : null;
                  return (
                    <li key={deal.id}>
                      <Link
                        href="/pipeline"
                        className="flex items-center justify-between gap-2 rounded-lg px-1 py-1 transition duration-200 hover:bg-warm"
                      >
                        <span className="min-w-0 truncate text-[13.5px] font-semibold text-stone-800">
                          {deal.company ?? deal.name}
                        </span>
                        {flag && (
                          <span
                            className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold ring-1 ring-inset ${flag.style}`}
                          >
                            {flag.label}
                          </span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
