import Link from "next/link";

import ProposalCard, { type ProposalView } from "@/components/proposal-card";
import { daysSilent, money, timeAgo } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { getMyWorkspace, requireUser } from "@/lib/session";

const STAGES = ["New", "Contacted", "Meeting booked", "Proposal sent", "Negotiation", "Won"];

const FLAG_LABEL: Record<string, { label: string; style: string }> = {
  going_cold: { label: "Going cold", style: "bg-red-50 text-red-700 ring-red-600/15" },
  no_reply: { label: "No reply yet", style: "bg-amber-50 text-amber-700 ring-amber-600/15" },
  promise_due: { label: "Promise due", style: "bg-brand-soft text-brand ring-brand/20" },
};

const statIconProps = {
  width: 16,
  height: 16,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.9,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

/**
 * The home screen: a morning brief, the numbers that matter, the deals
 * that need a human today, and the AI's newest proposals. Everything
 * here is read from the database — the mirror deals, proposals and
 * audit events the product itself maintains.
 */
export default async function DashboardPage() {
  const user = await requireUser();
  const mine = await getMyWorkspace(user.id);
  if (!mine) return null;
  const ws = mine.workspace.id;

  const since24h = new Date(Date.now() - 24 * 3600 * 1000);
  const [
    pending,
    openDeals,
    attention,
    activity,
    appliedYesterday,
    proposedYesterday,
    connections,
    stageRows,
  ] = await Promise.all([
    prisma.proposal.findMany({
      where: { workspaceId: ws, status: "pending" },
      orderBy: { createdAt: "desc" },
      take: 3,
    }),
    prisma.crmDeal.findMany({ where: { workspaceId: ws, stage: { not: "Won" } } }),
    prisma.crmDeal.findMany({
      where: { workspaceId: ws, healthFlag: { not: null } },
      orderBy: { lastActivityAt: "asc" },
      take: 5,
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
  ]);

  const pendingCount = await prisma.proposal.count({
    where: { workspaceId: ws, status: "pending" },
  });
  const pipelineValue = openDeals.reduce((sum, d) => sum + (d.amount ?? 0), 0);
  const tasksDue = attention.filter((d) => d.healthFlag === "promise_due").length;
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const firstName = (user.name || user.email.split("@")[0]).split(" ")[0];
  const today = new Date().toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const hubspotConnected = connections.some((c) => c.provider === "hubspot");

  const stageMap = new Map(stageRows.map((r) => [r.stage, r]));

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-[26px] font-extrabold tracking-tight text-neutral-900 sm:text-[30px]">
          {greeting}, {firstName}
        </h1>
        <p className="mt-1 text-[15px] text-neutral-500">
          {today} · {attention.length} {attention.length === 1 ? "deal needs" : "deals need"}{" "}
          attention · {pendingCount} {pendingCount === 1 ? "update" : "updates"} waiting for
          approval
        </p>
      </header>

      {!hubspotConnected && (
        <section className="rounded-2xl border border-brand/25 bg-gradient-to-br from-brand-soft via-white to-white p-6 shadow-[0_12px_32px_-18px_rgba(62,124,177,0.35)]">
          <h2 className="text-lg font-bold tracking-[-0.01em] text-neutral-900">Switch on the autopilot</h2>
          <p className="mt-1 max-w-lg text-[15px] leading-relaxed text-neutral-600">
            Connect HubSpot and your team&apos;s Gmail + Calendar. From then on, this page fills
            itself: updates to approve, deals that need you, and a brief every morning.
          </p>
          <Link
            href="/connections"
            className="mt-4 inline-block rounded-xl bg-neutral-900 px-6 py-3 text-[15px] font-semibold text-white shadow-[0_8px_18px_-8px_rgba(23,23,23,0.6)] transition duration-200 hover:bg-neutral-700"
          >
            Connect your apps →
          </Link>
        </section>
      )}

      <section className="card bg-gradient-to-br from-brand-soft via-white to-white px-5 py-4">
        <p className="text-[13px] font-bold uppercase tracking-wide text-brand">Morning brief</p>
        <p className="mt-1 text-[15px] leading-relaxed text-neutral-600">
          In the last 24 hours the AI proposed <b className="text-neutral-900">{proposedYesterday}</b>{" "}
          updates and <b className="text-neutral-900">{appliedYesterday}</b> approved changes were
          applied to your CRM. {pendingCount > 0 ? `${pendingCount} more are waiting below.` : "Nothing is waiting on you."}
        </p>
      </section>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          {
            label: "Open deals",
            value: String(openDeals.length),
            chip: "bg-brand-soft text-brand",
            icon: (
              <svg {...statIconProps}>
                <rect x="3" y="7.5" width="18" height="12" rx="2.5" />
                <path d="M9 7.5V6.2A2.2 2.2 0 0 1 11.2 4h1.6A2.2 2.2 0 0 1 15 6.2v1.3" />
                <path d="M3 12.8h18" />
              </svg>
            ),
          },
          {
            label: "Pipeline value",
            value: money(pipelineValue),
            chip: "bg-emerald-50 text-emerald-600",
            icon: (
              <svg {...statIconProps}>
                <rect x="2.5" y="6" width="19" height="12" rx="2.5" />
                <circle cx="12" cy="12" r="2.7" />
                <path d="M6.2 9.8h.01M17.8 14.2h.01" strokeWidth={2.6} />
              </svg>
            ),
          },
          {
            label: "Approvals waiting",
            value: String(pendingCount),
            chip: "bg-amber-50 text-amber-600",
            icon: (
              <svg {...statIconProps}>
                <circle cx="12" cy="12" r="8.5" />
                <path d="m8.5 12.4 2.4 2.4 4.6-5.3" />
              </svg>
            ),
          },
          {
            label: "Promises due today",
            value: String(tasksDue),
            chip: "bg-violet-50 text-violet-600",
            icon: (
              <svg {...statIconProps}>
                <circle cx="12" cy="12" r="8.5" />
                <path d="M12 7.5V12l3 2" />
              </svg>
            ),
          },
        ].map((s) => (
          <div key={s.label} className="card card-hover p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="tnum text-[26px] font-extrabold tracking-tight text-neutral-900">
                  {s.value}
                </p>
                <p className="mt-0.5 text-[13px] font-medium text-neutral-400">{s.label}</p>
              </div>
              <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-[10px] ${s.chip}`}>
                {s.icon}
              </span>
            </div>
          </div>
        ))}
      </section>

      <section>
        <h2 className="section-title mb-3">Pipeline overview</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
          {STAGES.map((stage) => {
            const row = stageMap.get(stage);
            return (
              <div key={stage} className="card card-hover p-4">
                <p className="flex items-center gap-1.5 text-[12.5px] font-semibold uppercase leading-tight tracking-wide text-neutral-400">
                  <span
                    aria-hidden
                    className={`h-1.5 w-1.5 shrink-0 rounded-full ${stage === "Won" ? "bg-emerald-400" : "bg-brand/50"}`}
                  />
                  {stage}
                </p>
                <p className="tnum mt-2 text-xl font-extrabold tracking-tight text-neutral-900">
                  {row?._count._all ?? 0}
                </p>
                <p className="tnum text-[13px] text-neutral-500">{money(row?._sum.amount ?? 0)}</p>
              </div>
            );
          })}
        </div>
      </section>

      <div className="grid gap-8 lg:grid-cols-2">
        <section>
          <h2 className="section-title mb-3">Needs your attention</h2>
          {attention.length === 0 ? (
            <div className="card flex flex-col items-center px-5 py-8 text-center">
              <span className="grid h-11 w-11 place-items-center rounded-full bg-brand-soft text-brand">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="8.5" />
                  <path d="m8.5 12.4 2.4 2.4 4.6-5.3" />
                </svg>
              </span>
              <p className="mt-3 max-w-xs text-[14.5px] leading-relaxed text-neutral-500">
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
                        <p className="truncate text-[15px] font-bold tracking-[-0.01em] text-neutral-900">
                          {deal.company ?? deal.name}
                        </p>
                        <p className="tnum truncate text-[13.5px] text-neutral-500">
                          {deal.name} · {money(deal.amount, deal.currency)}
                          {silent != null && silent > 0 ? ` · ${silent}d silent` : ""}
                        </p>
                        {deal.healthNote && (
                          <p className="mt-1 text-[13.5px] leading-relaxed text-neutral-500">
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

          <h2 className="section-title mb-3 mt-8">Latest AI activity</h2>
          {activity.length === 0 ? (
            <div className="card flex flex-col items-center px-5 py-8 text-center">
              <span className="grid h-11 w-11 place-items-center rounded-full bg-brand-soft text-brand">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 12h4l2.5-6.5 4 13L16 12h5" />
                </svg>
              </span>
              <p className="mt-3 max-w-xs text-[14.5px] leading-relaxed text-neutral-500">
                No activity yet. Connect your apps and the AI&apos;s work will show here, in order.
              </p>
            </div>
          ) : (
            <ul className="card divide-y divide-line-soft overflow-hidden">
              {activity.map((event) => (
                <li
                  key={event.id}
                  className="flex items-baseline gap-3 px-4 py-3 transition duration-200 hover:bg-canvas"
                >
                  <span className="shrink-0 rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] font-bold capitalize text-neutral-500">
                    {event.action}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[14px] text-neutral-700">
                    {event.summary}
                  </span>
                  <span className="tnum shrink-0 text-xs text-neutral-400">
                    {timeAgo(event.createdAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="section-title">Waiting for your approval</h2>
            <Link href="/approvals" className="text-[13.5px] font-semibold text-brand hover:underline">
              See all →
            </Link>
          </div>
          {pending.length === 0 ? (
            <div className="card flex flex-col items-center px-5 py-8 text-center">
              <span className="grid h-11 w-11 place-items-center rounded-full bg-brand-soft text-brand">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3.5 13.5h4.2l1.6 2.7h5.4l1.6-2.7h4.2" />
                  <path d="M5.4 5h13.2a1.9 1.9 0 0 1 1.9 1.9v10.2a1.9 1.9 0 0 1-1.9 1.9H5.4a1.9 1.9 0 0 1-1.9-1.9V6.9A1.9 1.9 0 0 1 5.4 5Z" />
                </svg>
              </span>
              <p className="mt-3 max-w-xs text-[14.5px] leading-relaxed text-neutral-500">
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
      </div>
    </div>
  );
}
