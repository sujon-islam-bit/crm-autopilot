import Link from "next/link";

import DashboardSearch from "@/components/dashboard-search";
import ProposalCard, { type ProposalView } from "@/components/proposal-card";
import { daysSilent, money, timeAgo } from "@/lib/format";
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

const STAGE_PILL: Record<string, string> = {
  New: "bg-stone-100 text-stone-600 ring-stone-500/10",
  Contacted: "bg-yellow-50 text-yellow-700 ring-yellow-600/15",
  "Meeting booked": "bg-green-50 text-green-700 ring-green-600/15",
  "Proposal sent": "bg-lime-100 text-lime-800 ring-lime-600/20",
  Negotiation: "bg-green-100 text-green-800 ring-green-600/15",
  Won: "bg-lime text-lime-950 ring-lime-600/25",
};

const FLAG_LABEL: Record<string, { label: string; style: string }> = {
  going_cold: { label: "Going cold", style: "bg-red-50 text-red-700 ring-red-600/15" },
  no_reply: { label: "No reply yet", style: "bg-amber-50 text-amber-700 ring-amber-600/15" },
  promise_due: { label: "Promise due", style: "bg-lime-100 text-lime-800 ring-lime-600/20" },
};

/** Pastel appointment tints for the calendar rail, alternating. */
const MEETING_TINTS = ["bg-yellow-100/80", "bg-pink-100/80", "bg-lime-100/80", "bg-green-100/80"];

/**
 * The home screen, composed like a modern CRM dashboard: a header bar
 * with real search, a performance card, the pipeline chart with a
 * calendar rail, then the working lists — biggest deals, deals that
 * need a human, the newest inbox captures, and the AI's proposals.
 * Every number is read from the database the product itself maintains.
 */
export default async function DashboardPage() {
  const user = await requireUser();
  const mine = await getMyWorkspace(user.id);
  if (!mine) return null;
  const ws = mine.workspace.id;

  const since24h = new Date(Date.now() - 24 * 3600 * 1000);
  const since7d = new Date(Date.now() - 7 * 24 * 3600 * 1000);
  const [
    pending,
    pendingCount,
    openDeals,
    topDeals,
    attention,
    activity,
    appliedYesterday,
    proposedYesterday,
    connections,
    stageRows,
    captures,
    meetings,
    promiseDeals,
    weekRows,
  ] = await Promise.all([
    prisma.proposal.findMany({
      where: { workspaceId: ws, status: "pending" },
      orderBy: { createdAt: "desc" },
      take: 3,
    }),
    prisma.proposal.count({ where: { workspaceId: ws, status: "pending" } }),
    prisma.crmDeal.findMany({ where: { workspaceId: ws, stage: { not: "Won" } } }),
    prisma.crmDeal.findMany({
      where: { workspaceId: ws, stage: { not: "Won" } },
      orderBy: { amount: "desc" },
      take: 6,
    }),
    prisma.crmDeal.findMany({
      where: { workspaceId: ws, healthFlag: { not: null } },
      orderBy: { lastActivityAt: "asc" },
      take: 4,
    }),
    prisma.auditEvent.findMany({
      where: { workspaceId: ws },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
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
      where: { workspaceId: ws },
      orderBy: { occurredAt: "desc" },
      take: 4,
    }),
    prisma.capture.findMany({
      where: { workspaceId: ws, kind: "meeting" },
      orderBy: { occurredAt: "desc" },
      take: 4,
    }),
    prisma.crmDeal.findMany({
      where: { workspaceId: ws, healthFlag: "promise_due" },
      orderBy: { amount: "desc" },
      take: 3,
    }),
    prisma.auditEvent.groupBy({
      by: ["action"],
      where: { workspaceId: ws, createdAt: { gte: since7d } },
      _count: { _all: true },
    }),
  ]);

  const pipelineValue = openDeals.reduce((sum, d) => sum + (d.amount ?? 0), 0);
  const today = new Date().toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const hubspotConnected = connections.some((c) => c.provider === "hubspot");

  const stageMap = new Map(stageRows.map((r) => [r.stage, r]));
  const dealsWon = stageMap.get("Won")?._count._all ?? 0;
  const maxStageValue = Math.max(1, ...STAGES.map((s) => stageMap.get(s)?._sum.amount ?? 0));

  const weekCount = (action: string) =>
    weekRows.find((r) => r.action === action)?._count._all ?? 0;
  const weekStats = [
    { label: "Proposals made", value: weekCount("proposed"), chip: "bg-lime-100 text-lime-800" },
    { label: "Approved", value: weekCount("approved"), chip: "bg-green-100 text-green-700" },
    { label: "Applied", value: weekCount("applied"), chip: "bg-yellow-100 text-yellow-700" },
    { label: "Rejected", value: weekCount("rejected"), chip: "bg-pink-100 text-pink-700" },
  ];

  const perfStats = [
    { label: "Open deals", value: String(openDeals.length) },
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
    <div className="space-y-6">
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

      <header className="flex flex-wrap items-end justify-between gap-4 pt-2">
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
        <div className="mt-5 grid grid-cols-2 gap-y-6 lg:grid-cols-4">
          {perfStats.map((s, i) => (
            <div
              key={s.label}
              className={i > 0 ? "lg:border-l lg:border-line lg:pl-8" : ""}
            >
              <p className="text-[13px] font-medium text-stone-400">{s.label}</p>
              <p className="tnum mt-1 text-[30px] font-extrabold tracking-tight text-stone-900">
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

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="card p-6 lg:col-span-2">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="section-title">Pipeline by stage</h2>
              <p className="tnum mt-2 text-[34px] font-extrabold leading-none tracking-tight text-stone-900">
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
          <div className="mt-6 grid grid-cols-3 gap-4 sm:grid-cols-6">
            {STAGES.map((stage) => {
              const row = stageMap.get(stage);
              const value = row?._sum.amount ?? 0;
              const count = row?._count._all ?? 0;
              const heightPct = Math.max(value > 0 ? 4 : 0, Math.round((value / maxStageValue) * 100));
              return (
                <div key={stage} className="flex flex-col items-center">
                  <p className="tnum text-[13px] font-bold text-stone-900">{money(value)}</p>
                  <div className="flex h-36 w-full items-end justify-center">
                    <div
                      className={`w-full max-w-14 rounded-t-xl ${STAGE_BAR[stage]}`}
                      style={{ height: `${heightPct}%` }}
                    />
                  </div>
                  <p className="mt-2.5 text-center text-xs font-semibold leading-tight text-stone-500">
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
            <p className="mt-4 text-[14px] leading-relaxed text-stone-500">
              No meetings captured yet. Once Google Calendar is connected and synced, the
              meetings the AI has read appear here.
            </p>
          ) : (
            <ul className="mt-4 space-y-2.5">
              {meetings.map((cap, i) => (
                <li key={cap.id} className={`rounded-2xl px-4 py-3 ${MEETING_TINTS[i % MEETING_TINTS.length]}`}>
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

          <div className="mt-6 border-t border-line-soft pt-5">
            <h3 className="text-[13px] font-bold uppercase tracking-wide text-stone-400">
              Promises due today
            </h3>
            {promiseDeals.length === 0 ? (
              <p className="mt-2.5 text-[14px] leading-relaxed text-stone-500">
                No promises are due. The AI flags them here the moment one slips.
              </p>
            ) : (
              <ul className="mt-3 space-y-2">
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
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section>
            <h2 className="section-title mb-3">Top deals</h2>
            {topDeals.length === 0 ? (
              <div className="card px-5 py-8 text-center">
                <p className="mx-auto max-w-xs text-[14.5px] leading-relaxed text-stone-500">
                  No open deals yet. Once HubSpot is connected, your biggest deals show here.
                </p>
              </div>
            ) : (
              <div className="card overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-line-soft text-xs font-semibold uppercase tracking-wide text-stone-400">
                        <th className="px-5 py-3">Deal</th>
                        <th className="px-3 py-3">Stage</th>
                        <th className="px-3 py-3 text-right">Amount</th>
                        <th className="px-3 py-3">Owner</th>
                        <th className="px-3 py-3">Last activity</th>
                        <th className="px-5 py-3">Health</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line-soft">
                      {topDeals.map((deal) => {
                        const flag = deal.healthFlag ? FLAG_LABEL[deal.healthFlag] : null;
                        return (
                          <tr key={deal.id} className="transition duration-200 hover:bg-warm">
                            <td className="max-w-64 px-5 py-3.5">
                              <p className="text-[14.5px] font-bold tracking-[-0.01em] text-stone-900">
                                {deal.company ?? deal.name}
                              </p>
                              {deal.company && (
                                <p className="text-[13px] text-stone-500">{deal.name}</p>
                              )}
                            </td>
                            <td className="whitespace-nowrap px-3 py-3.5">
                              <span
                                className={`rounded-full px-2.5 py-1 text-xs font-bold ring-1 ring-inset ${STAGE_PILL[deal.stage] ?? STAGE_PILL.New}`}
                              >
                                {deal.stage}
                              </span>
                            </td>
                            <td className="tnum whitespace-nowrap px-3 py-3.5 text-right text-[14.5px] font-bold text-stone-900">
                              {money(deal.amount, deal.currency)}
                            </td>
                            <td className="whitespace-nowrap px-3 py-3.5 text-[14px] text-stone-600">
                              {deal.ownerName ?? "—"}
                            </td>
                            <td className="tnum whitespace-nowrap px-3 py-3.5 text-[14px] text-stone-600">
                              {deal.lastActivityAt ? timeAgo(deal.lastActivityAt) : "—"}
                            </td>
                            <td className="whitespace-nowrap px-5 py-3.5">
                              {flag ? (
                                <span
                                  className={`rounded-full px-2.5 py-1 text-xs font-bold ring-1 ring-inset ${flag.style}`}
                                >
                                  {flag.label}
                                </span>
                              ) : (
                                <span className="text-[13px] text-stone-400">Healthy</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="border-t border-line-soft px-5 py-3">
                  <Link href="/pipeline" className="text-[13.5px] font-semibold text-pine hover:underline">
                    Open pipeline →
                  </Link>
                </div>
              </div>
            )}
          </section>

          <section>
            <h2 className="section-title mb-3">Needs your attention</h2>
            {attention.length === 0 ? (
              <div className="card flex flex-col items-center px-5 py-8 text-center">
                <span className="grid h-11 w-11 place-items-center rounded-full bg-lime-100 text-lime-800">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="8.5" />
                    <path d="m8.5 12.4 2.4 2.4 4.6-5.3" />
                  </svg>
                </span>
                <p className="mt-3 max-w-xs text-[14.5px] leading-relaxed text-stone-500">
                  Nothing is going cold right now. The AI keeps watching every deal.
                </p>
              </div>
            ) : (
              <ul className="space-y-3">
                {attention.map((deal) => {
                  const flag = deal.healthFlag ? FLAG_LABEL[deal.healthFlag] : null;
                  const silent = daysSilent(deal.lastActivityAt);
                  return (
                    <li key={deal.id} className="card card-hover p-4">
                      <div className="flex items-start gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-[15px] font-bold tracking-[-0.01em] text-stone-900">
                            {deal.company ?? deal.name}
                          </p>
                          <p className="tnum text-[13.5px] text-stone-500">
                            {deal.name} · {money(deal.amount, deal.currency)}
                            {silent != null && silent > 0 ? ` · ${silent}d silent` : ""}
                          </p>
                          {deal.healthNote && (
                            <p className="mt-1 text-[13.5px] leading-relaxed text-stone-500">
                              {deal.healthNote}
                            </p>
                          )}
                        </div>
                        {flag && (
                          <span
                            className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ring-1 ring-inset ${flag.style}`}
                          >
                            {flag.label}
                          </span>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section>
            <h2 className="section-title mb-3">Latest from your inbox</h2>
            {captures.length === 0 ? (
              <div className="card flex flex-col items-center px-5 py-8 text-center">
                <span className="grid h-11 w-11 place-items-center rounded-full bg-lime-100 text-lime-800">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="5.5" width="18" height="13" rx="2.5" />
                    <path d="m4 7 8 6 8-6" />
                  </svg>
                </span>
                <p className="mt-3 max-w-sm text-[14.5px] leading-relaxed text-stone-500">
                  Nothing captured yet. Once Google is connected and synced, the newest emails
                  and meetings the AI has read appear here.
                </p>
              </div>
            ) : (
              <ul className="card divide-y divide-line-soft overflow-hidden">
                {captures.map((cap) => (
                  <li
                    key={cap.id}
                    className="flex items-start gap-3 px-5 py-3.5 transition duration-200 hover:bg-warm"
                  >
                    <span
                      className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${
                        cap.kind === "meeting"
                          ? "bg-pink-100 text-pink-700"
                          : "bg-yellow-100 text-yellow-700"
                      }`}
                    >
                      {cap.kind === "meeting" ? (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="3" y="5" width="18" height="16" rx="2.5" />
                          <path d="M3 10h18M8 3v4M16 3v4" />
                        </svg>
                      ) : (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="3" y="5.5" width="18" height="13" rx="2.5" />
                          <path d="m4 7 8 6 8-6" />
                        </svg>
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[14.5px] font-bold tracking-[-0.01em] text-stone-900">
                        {cap.title}
                      </p>
                      <p className="text-[13px] leading-relaxed text-stone-500">
                        {cap.fromLabel ? `${cap.fromLabel} · ` : ""}
                        {cap.snippet ?? ""}
                      </p>
                    </div>
                    <span className="tnum shrink-0 text-xs text-stone-400">
                      {timeAgo(cap.occurredAt)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <div className="space-y-6">
          <section>
            <div className="mb-3 flex items-baseline justify-between">
              <h2 className="section-title">Waiting for your approval</h2>
              <Link href="/approvals" className="text-[13.5px] font-semibold text-pine hover:underline">
                See all →
              </Link>
            </div>
            {pending.length === 0 ? (
              <div className="card flex flex-col items-center px-5 py-8 text-center">
                <span className="grid h-11 w-11 place-items-center rounded-full bg-lime-100 text-lime-800">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3.5 13.5h4.2l1.6 2.7h5.4l1.6-2.7h4.2" />
                    <path d="M5.4 5h13.2a1.9 1.9 0 0 1 1.9 1.9v10.2a1.9 1.9 0 0 1-1.9 1.9H5.4a1.9 1.9 0 0 1-1.9-1.9V6.9A1.9 1.9 0 0 1 5.4 5Z" />
                  </svg>
                </span>
                <p className="mt-3 max-w-xs text-[14.5px] leading-relaxed text-stone-500">
                  All caught up. New proposals appear here the moment the AI finds something.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {pending.map((p) => (
                  <ProposalCard
                    key={p.id}
                    proposal={
                      {
                        id: p.id,
                        type: p.type,
                        title: p.title,
                        reason: p.reason,
                        source: p.source,
                        status: p.status,
                        createdAt: p.createdAt.toISOString(),
                        detail: (p.detail ?? null) as ProposalView["detail"],
                      } satisfies ProposalView
                    }
                  />
                ))}
              </div>
            )}
          </section>

          <section>
            <h2 className="section-title mb-3">This week</h2>
            <div className="card p-5">
              <div className="grid grid-cols-2 gap-3">
                {weekStats.map((s) => (
                  <div key={s.label} className="rounded-2xl bg-warm px-4 py-3.5">
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-bold ${s.chip}`}
                    >
                      {s.label}
                    </span>
                    <p className="tnum mt-1.5 text-[22px] font-extrabold tracking-tight text-stone-900">
                      {s.value}
                    </p>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-xs text-stone-400">
                AI work across your workspace in the last 7 days.
              </p>
            </div>
          </section>

          <section>
            <h2 className="section-title mb-3">Latest AI activity</h2>
            {activity.length === 0 ? (
              <div className="card flex flex-col items-center px-5 py-8 text-center">
                <span className="grid h-11 w-11 place-items-center rounded-full bg-lime-100 text-lime-800">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 12h4l2.5-6.5 4 13L16 12h5" />
                  </svg>
                </span>
                <p className="mt-3 max-w-xs text-[14.5px] leading-relaxed text-stone-500">
                  No activity yet. Connect your apps and the AI&apos;s work will show here, in order.
                </p>
              </div>
            ) : (
              <ul className="card divide-y divide-line-soft overflow-hidden">
                {activity.map((event) => (
                  <li
                    key={event.id}
                    className="flex items-baseline gap-3 px-4 py-3 transition duration-200 hover:bg-warm"
                  >
                    <span className="shrink-0 rounded-full bg-stone-100 px-2 py-0.5 text-[11px] font-bold capitalize text-stone-500">
                      {event.action}
                    </span>
                    <span className="min-w-0 flex-1 text-[14px] leading-relaxed text-stone-700">
                      {event.summary}
                    </span>
                    <span className="tnum shrink-0 text-xs text-stone-400">
                      {timeAgo(event.createdAt)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
