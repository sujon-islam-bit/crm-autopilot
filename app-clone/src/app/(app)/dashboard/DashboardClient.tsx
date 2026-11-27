"use client";

import { useState } from "react";
import Link from "next/link";
import { I } from "../../../components/icons";
import { Sparkline, PulseChart, Donut } from "../../../components/charts";
import ProposalRow from "../../../components/ProposalRow";
import DetailDrawer from "../../../components/DetailDrawer";
import { Avatar } from "../../../components/Sidebar";
import type { ProposalView } from "../../../lib/view";
import type { MemberActivity, RepDealRow, StalledDeal } from "../../../lib/team";
import { fmtDate, money, moneyShort } from "../../../lib/constants";

export type DashStats = {
  queueCount: number;
  queueDelta: number;
  score: number | null;
  scoreDelta: number | null;
  readyCount: number;
  repHours: number;
  repDelta: number;
  sparks: { queue: number[]; integrity: number[]; ready: number[]; rep: number[] };
  pulseNow: number;
  pulseDelta: number;
  counts: { duplicates: number; missing: number; unlogged: number; stale: number };
};

export type RepStats = {
  queueCount: number;
  dealsCount: number;
  pipelineTotal: number;
  followupCount: number;
  sparks: { queue: number[]; deals: number[]; pipeline: number[]; followups: number[] };
};

export type Brief = { icon: "clock" | "bolt" | "alert"; title: string; sub: string; cta: string; href: string };

type DashProps = {
  firstName: string;
  connected: boolean;
  /** Roles that may open the Connections page see the connect CTA button. */
  canConnect: boolean;
  views: ProposalView[];
  stats: DashStats;
  pulse: { label: string; thisWeek: number; lastWeek: number }[];
  briefs: Brief[];
  /** Proposal ids this user may decide (role + scope) — rows outside it
   *  render read-only (no Approve / Ignore). */
  decidableIds: string[];
  /** Whether the "Edit Draft" brief CTA may render for this user. */
  canEditDraft: boolean;
  /** standard = Owner/Admin/Viewer home; manager/rep get adapted layouts. */
  variant?: "standard" | "manager" | "rep";
  /** Owner/Admin only: the Team Performance card in the lower row. */
  teamPerformance?: MemberActivity[];
  /** Manager: stalled deals + per-member activity + stalled stat spark. */
  stalled?: StalledDeal[];
  stalledSpark?: number[];
  memberActivity?: MemberActivity[];
  /** Rep: scoped stat cards + own deals + scoped pulse totals. */
  repStats?: RepStats;
  repDeals?: RepDealRow[];
  pulseScoped?: { now: number; delta: number };
};

export default function DashboardClient(props: DashProps) {
  const { firstName, connected, canConnect, views, stats, pulse, briefs, decidableIds, canEditDraft } = props;
  const variant = props.variant ?? "standard";
  const [selected, setSelected] = useState<ProposalView | null>(null);
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  const queueCard = (title: string, emptyText: string) => (
    <div className="card overflow-hidden">
      <div className="flex items-center gap-2 px-5 pt-4 pb-1">
        <I n="sparkle" size={16} className="text-purple" fill />
        <h2 className="flex-1 text-[15px] font-bold whitespace-nowrap">{title}</h2>
        <Link href="/approvals" className="flex items-center gap-1 text-[13px] font-semibold whitespace-nowrap">
          View all <I n="arrowR" size={13} sw={2.2} />
        </Link>
      </div>
      <div className="divide-y divide-line/70">
        {views.length === 0 && <p className="px-5 py-6 text-[13px] leading-relaxed text-muted">{emptyText}</p>}
        {views.map((v, i) => (
          <ProposalRow
            key={v.id}
            view={v}
            first={i === 0}
            selected={selected?.id === v.id}
            onSelect={setSelected}
            canDecide={decidableIds.includes(v.id)}
          />
        ))}
      </div>
    </div>
  );

  const pulseCard = (now: number, delta: number) => (
    <div className="card p-5">
      <div className="flex items-center gap-2">
        <I n="chart" size={16} className="text-primary" />
        <h2 className="flex-1 text-[15px] font-bold">Pipeline Pulse</h2>
        <Link href="/pipeline" className="flex items-center gap-1 text-[13px] font-semibold">
          View details <I n="arrowR" size={13} sw={2.2} />
        </Link>
      </div>
      <div className="mt-3 flex items-start gap-5">
        <div className="flex items-start gap-2.5">
          <span className="text-[27px] leading-none font-extrabold tracking-tight">{moneyShort(now)}</span>
          <span className="leading-tight">
            {now > 0 ? (
              <>
                <span className="block text-[12.5px] font-bold text-green">↑ +{delta}%</span>
                <span className="block text-[10.5px] text-muted">vs last week</span>
              </>
            ) : (
              <span className="block text-[12.5px] font-medium text-muted">No data yet</span>
            )}
          </span>
        </div>
        <div className="ml-auto flex items-center gap-3.5 pt-1 text-[11.5px] text-ink2">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-primary" /> This Week
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[#c3cdf5]" /> Last Week
          </span>
        </div>
      </div>
      <div className="mt-1">
        <PulseChart points={pulse} nowLabel={moneyShort(now)} />
      </div>
    </div>
  );

  const briefsCard = (viewAllHref: string, emptyText: string) => (
    <div className="card overflow-hidden">
      <div className="flex items-center gap-2 px-5 pt-4 pb-1">
        <I n="calendar" size={16} className="text-primary" />
        <h2 className="flex-1 text-[15px] font-bold">Today&apos;s Briefs</h2>
        <Link href={viewAllHref} className="flex items-center gap-1 text-[13px] font-semibold">
          View all <I n="arrowR" size={13} sw={2.2} />
        </Link>
      </div>
      <div className="divide-y divide-line/70">
        {briefs.map((b, i) => (
          <div key={i} className="flex items-center gap-3 px-5 py-[11px]">
            <span
              className={
                b.icon === "alert"
                  ? "flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full bg-red text-white"
                  : b.icon === "bolt"
                    ? "shrink-0 text-purple"
                    : "shrink-0 text-muted"
              }
            >
              <I n={b.icon === "alert" ? "alert" : b.icon === "bolt" ? "zap" : "clock"} size={b.icon === "alert" ? 11 : 16} sw={2.2} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13.5px] font-semibold">{b.title}</div>
              <div className="mt-0.5 truncate text-[12px] text-muted">{b.sub}</div>
            </div>
            {(b.cta !== "Edit Draft" || canEditDraft) && (
              <Link href={b.href} className="btn-outline shrink-0 px-3 py-[6px] text-[12px]">
                {b.cta}
              </Link>
            )}
          </div>
        ))}
        {briefs.length === 0 && <p className="px-5 py-5 text-[13px] text-muted">{emptyText}</p>}
      </div>
    </div>
  );

  const dataHealthCard = (
    <div className="card p-5">
      <div className="flex items-center gap-2">
        <I n="shield" size={16} className="text-primary" />
        <h2 className="flex-1 text-[15px] font-bold">Data Health Overview</h2>
        <Link href="/hygiene" className="flex items-center gap-1 text-[13px] font-semibold">
          View details <I n="arrowR" size={13} sw={2.2} />
        </Link>
      </div>
      <div className="mt-2 flex items-center gap-6">
        <Donut
          score={stats.score}
          segments={[
            { color: "#22b573", value: stats.counts.duplicates },
            { color: "#f5a623", value: stats.counts.missing },
            { color: "#2b6bf0", value: stats.counts.unlogged },
            { color: "#8b5cf6", value: stats.counts.stale },
          ]}
        />
        <div className="flex-1">
          {(
            [
              ["#22b573", "Duplicates", stats.counts.duplicates],
              ["#f5a623", "Missing Fields", stats.counts.missing],
              ["#2b6bf0", "Unlogged Meetings", stats.counts.unlogged],
              ["#8b5cf6", "Stale Deals", stats.counts.stale],
            ] as const
          ).map(([color, label, count]) => (
            <div key={label} className="flex items-center gap-2.5 py-[5px] text-[13.5px]">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} />
              <span className="flex-1 text-ink2">{label}</span>
              <span className="font-bold">{count}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="relative flex items-start gap-5 px-7 pt-5 pb-7">
      <div className="min-w-0 flex-1">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-[29px] leading-tight font-extrabold tracking-tight">
              {greeting}, {firstName}!
            </h1>
            <p className="mt-1 text-[13.5px] text-muted">Here&apos;s what&apos;s happening with your CRM today.</p>
          </div>
          <div className="flex items-center gap-2 pt-1">
            <button className="btn-outline flex items-center gap-2 px-3.5 py-2 text-[13px]">
              Last 7 Days <I n="chevD" size={14} className="text-faint" />
            </button>
            <Link href="/pipeline" className="btn-outline flex h-[34px] w-[34px] items-center justify-center text-primary" aria-label="Pipeline details">
              <I n="chart" size={16} />
            </Link>
          </div>
        </div>

        {/* Connect CTA — shown until the workspace has any CRM connection,
            and only to roles that can open the Connections page. */}
        {!connected && canConnect && (
          <div className="card mt-5 flex items-center gap-4 px-5 py-4">
            <span className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-[12px] bg-primary text-white">
              <I n="plug" size={20} sw={2} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-[15px] font-bold">Connect your CRM</div>
              <p className="mt-0.5 text-[13px] text-muted">
                Connect HubSpot or Salesforce and Vouchso will start reading your pipeline and preparing updates
                for your approval.
              </p>
            </div>
            <Link href="/connections" className="btn-primary shrink-0 px-4 py-2.5 text-[13.5px]">
              Connect your CRM
            </Link>
          </div>
        )}

        {variant === "manager" ? (
          <ManagerBody
            {...props}
            queueCard={queueCard}
            pulseCard={pulseCard}
            dataHealthCard={dataHealthCard}
          />
        ) : variant === "rep" ? (
          <RepBody {...props} queueCard={queueCard} pulseCard={pulseCard} briefsCard={briefsCard} />
        ) : (
          <>
            {/* Stat cards */}
            <div className="mt-5 grid grid-cols-4 gap-4">
              <StatCard
                icon="inbox"
                tile="bg-primary text-white"
                label="Approvals"
                value={String(stats.queueCount)}
                delta={<DeltaLine delta={stats.queueDelta} />}
                spark={<Sparkline data={stats.sparks.queue} color="#2b6bf0" />}
              />
              <StatCard
                icon="shield"
                tile="bg-green-bright text-white"
                label="Data Integrity"
                value={
                  stats.score === null ? (
                    "—"
                  ) : (
                    <>
                      {stats.score} <span className="text-[17px] font-bold text-muted">/ 100</span>
                    </>
                  )
                }
                delta={
                  stats.score === null || stats.scoreDelta === null ? (
                    <span className="text-muted">No data yet</span>
                  ) : (
                    <DeltaLine delta={stats.scoreDelta} />
                  )
                }
                spark={<Sparkline data={stats.sparks.integrity} color="#22b573" />}
              />
              <StatCard
                icon="clock"
                tile="bg-purple text-white"
                label="Pending AI Queue"
                value={
                  <>
                    {stats.readyCount} <span className="text-[17px] font-bold">Ready</span>
                  </>
                }
                delta={<span className="text-muted">(&gt;70%)</span>}
                spark={<Sparkline data={stats.sparks.ready} color="#8b5cf6" />}
              />
              <StatCard
                icon="users"
                tile="bg-[#38a1f2] text-white"
                label="Rep Time"
                value={
                  <>
                    {stats.repHours.toFixed(1)} <span className="text-[15px] font-bold text-muted">hrs/wk</span>
                  </>
                }
                delta={<DeltaLine delta={stats.repDelta} pct />}
                spark={<Sparkline data={stats.sparks.rep} color="#38a1f2" />}
              />
            </div>

            {/* Queue + Pulse */}
            <div className="mt-4 grid grid-cols-[1.12fr_1fr] gap-4">
              {queueCard(
                "Autopilot Review Queue",
                connected
                  ? "Queue is clear — the AI has nothing waiting."
                  : "No proposals yet — connect your CRM and the AI will prepare updates for you.",
              )}
              {pulseCard(stats.pulseNow, stats.pulseDelta)}
            </div>

            {/* Briefs + Data Health (+ Team Performance for Owner/Admin) */}
            <div className={`mt-4 grid gap-4 ${props.teamPerformance ? "grid-cols-3" : "grid-cols-2"}`}>
              {briefsCard(
                "/activity",
                connected ? "Nothing needs you today." : "Nothing yet — briefs appear here once your CRM is connected.",
              )}
              {dataHealthCard}
              {props.teamPerformance && <TeamActivityCard title="Team Performance" rows={props.teamPerformance} />}
            </div>
          </>
        )}
      </div>

      {selected && (
        <DetailDrawer
          view={selected}
          onClose={() => setSelected(null)}
          overlay
          canDecide={decidableIds.includes(selected.id)}
        />
      )}
    </div>
  );
}

/** Manager home: team queue first, then stalled deals + rep activity,
 *  pipeline pulse, and data health lower. Same cards, team scope. */
function ManagerBody(
  props: DashProps & {
    queueCard: (title: string, emptyText: string) => React.ReactNode;
    pulseCard: (now: number, delta: number) => React.ReactNode;
    dataHealthCard: React.ReactNode;
  },
) {
  const { stats, stalled = [], stalledSpark = [], memberActivity = [] } = props;
  const highRisk = stalled.filter((d) => d.risk === "High").length;
  return (
    <>
      {/* Stat cards — team scope */}
      <div className="mt-5 grid grid-cols-4 gap-4">
        <StatCard
          icon="inbox"
          tile="bg-primary text-white"
          label="Approvals"
          value={String(stats.queueCount)}
          delta={<DeltaLine delta={stats.queueDelta} />}
          spark={<Sparkline data={stats.sparks.queue} color="#2b6bf0" />}
        />
        <StatCard
          icon="hourglass"
          tile="bg-[#f5a623] text-white"
          label="Stalled Deals"
          value={String(stalled.length)}
          delta={
            stalled.length === 0 ? (
              <span className="text-muted">Everything is moving</span>
            ) : (
              <span className="text-muted">
                {highRisk} high risk · {stalled.length - highRisk} medium
              </span>
            )
          }
          spark={<Sparkline data={stalledSpark} color="#f5a623" />}
        />
        <StatCard
          icon="chart"
          tile="bg-green-bright text-white"
          label="Pipeline"
          value={moneyShort(stats.pulseNow)}
          delta={<DeltaLine delta={stats.pulseDelta} pct />}
          spark={<Sparkline data={props.pulse.map((p) => p.thisWeek)} color="#22b573" />}
        />
        <StatCard
          icon="users"
          tile="bg-[#38a1f2] text-white"
          label="Rep Time"
          value={
            <>
              {stats.repHours.toFixed(1)} <span className="text-[15px] font-bold text-muted">hrs/wk</span>
            </>
          }
          delta={<DeltaLine delta={stats.repDelta} pct />}
          spark={<Sparkline data={stats.sparks.rep} color="#38a1f2" />}
        />
      </div>

      {/* Team queue + Stalled deals */}
      <div className="mt-4 grid grid-cols-[1.12fr_1fr] gap-4">
        {props.queueCard(
          "Autopilot Review Queue",
          props.connected
            ? "Queue is clear — the AI has nothing waiting."
            : "No proposals yet — connect your CRM and the AI will prepare updates for you.",
        )}
        <StalledCard stalled={stalled} />
      </div>

      {/* Rep activity + Pipeline pulse */}
      <div className="mt-4 grid grid-cols-2 gap-4">
        <TeamActivityCard title="Rep Activity" rows={memberActivity} />
        {props.pulseCard(stats.pulseNow, stats.pulseDelta)}
      </div>

      {/* Data health, lower */}
      <div className="mt-4">{props.dataHealthCard}</div>
    </>
  );
}

/** Sales Rep home: only their own queue, deals, briefs and pipeline.
 *  No team cards, no Data Health (that's a manager/owner surface). */
function RepBody(
  props: DashProps & {
    queueCard: (title: string, emptyText: string) => React.ReactNode;
    pulseCard: (now: number, delta: number) => React.ReactNode;
    briefsCard: (viewAllHref: string, emptyText: string) => React.ReactNode;
  },
) {
  const rep = props.repStats ?? { queueCount: 0, dealsCount: 0, pipelineTotal: 0, followupCount: 0, sparks: { queue: [], deals: [], pipeline: [], followups: [] } };
  const scoped = props.pulseScoped ?? { now: 0, delta: 0 };
  return (
    <>
      {/* Stat cards — own scope only */}
      <div className="mt-5 grid grid-cols-4 gap-4">
        <StatCard
          icon="inbox"
          tile="bg-primary text-white"
          label="My Queue"
          value={String(rep.queueCount)}
          delta={<span className="text-muted">From your own deals</span>}
          spark={<Sparkline data={rep.sparks.queue} color="#2b6bf0" />}
        />
        <StatCard
          icon="briefcase"
          tile="bg-[#38a1f2] text-white"
          label="My Deals"
          value={String(rep.dealsCount)}
          delta={<span className="text-muted">Open deals assigned to you</span>}
          spark={<Sparkline data={rep.sparks.deals} color="#38a1f2" />}
        />
        <StatCard
          icon="chart"
          tile="bg-green-bright text-white"
          label="My Pipeline"
          value={moneyShort(rep.pipelineTotal)}
          delta={
            rep.pipelineTotal > 0 ? <DeltaLine delta={scoped.delta} pct /> : <span className="text-muted">No data yet</span>
          }
          spark={<Sparkline data={rep.sparks.pipeline} color="#22b573" />}
        />
        <StatCard
          icon="zap"
          tile="bg-purple text-white"
          label="My Follow-ups"
          value={String(rep.followupCount)}
          delta={<span className="text-muted">Drafts waiting for you</span>}
          spark={<Sparkline data={rep.sparks.followups} color="#8b5cf6" />}
        />
      </div>

      {/* My queue + My deals */}
      <div className="mt-4 grid grid-cols-[1.12fr_1fr] gap-4">
        {props.queueCard(
          "My Review Queue",
          "Nothing needs your review yet — suggestions for your own deals will appear here.",
        )}
        <MyDealsCard deals={props.repDeals ?? []} />
      </div>

      {/* My briefs + my pipeline pulse */}
      <div className="mt-4 grid grid-cols-2 gap-4">
        {props.briefsCard("/approvals", "No follow-up drafts waiting.")}
        {props.pulseCard(scoped.now, scoped.delta)}
      </div>
    </>
  );
}

/** Per-member decision activity from audit rows. Shared by the Owner /
 *  Admin "Team Performance" card and the Manager "Rep Activity" card. */
function TeamActivityCard({ title, rows }: { title: string; rows: MemberActivity[] }) {
  return (
    <div className="card overflow-hidden">
      <div className="flex items-center gap-2 px-5 pt-4 pb-1">
        <I n="users" size={16} className="text-primary" />
        <h2 className="flex-1 text-[15px] font-bold whitespace-nowrap">{title}</h2>
        <Link href="/settings" className="flex items-center gap-1 text-[13px] font-semibold whitespace-nowrap">
          Team <I n="arrowR" size={13} sw={2.2} />
        </Link>
      </div>
      <div className="divide-y divide-line/70">
        {rows.map((m) => (
          <div key={m.userId} className="flex items-center gap-3 px-5 py-[11px]">
            <Avatar name={m.name} size={30} />
            <div className="min-w-0 flex-1 leading-tight">
              <div className="truncate text-[13.5px] font-semibold">{m.name}</div>
              <div className="mt-0.5 text-[11.5px] text-muted">{m.roleLabel}</div>
            </div>
            <div className="text-right leading-tight">
              <div className="text-[13.5px] font-bold">{m.decided} decided</div>
              <div className="mt-0.5 text-[11.5px] text-muted">
                {m.decided === 0 ? "No decisions yet" : `${m.approved} approved · ${m.rejected} rejected`}
              </div>
            </div>
          </div>
        ))}
        {rows.length === 0 && <p className="px-5 py-5 text-[13px] text-muted">No team members yet.</p>}
      </div>
    </div>
  );
}

/** Manager card: open deals flagged by the health rules, quietest first. */
function StalledCard({ stalled }: { stalled: StalledDeal[] }) {
  return (
    <div className="card overflow-hidden">
      <div className="flex items-center gap-2 px-5 pt-4 pb-1">
        <I n="hourglass" size={16} className="text-[#f5a623]" />
        <h2 className="flex-1 text-[15px] font-bold whitespace-nowrap">Stalled Deals</h2>
        <Link href="/deals?tab=atrisk" className="flex items-center gap-1 text-[13px] font-semibold whitespace-nowrap">
          View all <I n="arrowR" size={13} sw={2.2} />
        </Link>
      </div>
      <div className="divide-y divide-line/70">
        {stalled.slice(0, 6).map((d) => (
          <Link key={d.externalId} href="/deals?tab=atrisk" className="flex items-center gap-3 px-5 py-[10px] hover:bg-canvas">
            <div className="min-w-0 flex-1 leading-tight">
              <div className="truncate text-[13.5px] font-semibold">{d.name}</div>
              <div className="mt-0.5 truncate text-[11.5px] text-muted">
                {d.company ? `${d.company} · ` : ""}
                {d.stage} · {d.daysSilent}d silent
              </div>
            </div>
            <span
              className={`shrink-0 rounded-full px-2 py-[3px] text-[11px] font-bold ${
                d.risk === "High" ? "bg-[#fdecec] text-red" : "bg-amber-tint text-amber"
              }`}
            >
              {d.risk}
            </span>
          </Link>
        ))}
        {stalled.length === 0 && (
          <p className="px-5 py-6 text-[13px] leading-relaxed text-muted">No stalled deals — everything is moving.</p>
        )}
        {stalled.length > 6 && (
          <Link href="/deals?tab=atrisk" className="block px-5 py-[10px] text-[12.5px] font-semibold">
            View all {stalled.length} at-risk deals →
          </Link>
        )}
      </div>
    </div>
  );
}

/** Rep card: their own open deals, largest first. */
function MyDealsCard({ deals }: { deals: RepDealRow[] }) {
  return (
    <div className="card overflow-hidden">
      <div className="flex items-center gap-2 px-5 pt-4 pb-1">
        <I n="briefcase" size={16} className="text-primary" />
        <h2 className="flex-1 text-[15px] font-bold whitespace-nowrap">My Deals</h2>
        <Link href="/deals" className="flex items-center gap-1 text-[13px] font-semibold whitespace-nowrap">
          View all <I n="arrowR" size={13} sw={2.2} />
        </Link>
      </div>
      <div className="divide-y divide-line/70">
        {deals.slice(0, 6).map((d) => (
          <Link key={d.externalId} href="/deals" className="flex items-center gap-3 px-5 py-[10px] hover:bg-canvas">
            <div className="min-w-0 flex-1 leading-tight">
              <div className="truncate text-[13.5px] font-semibold">{d.name}</div>
              <div className="mt-0.5 truncate text-[11.5px] text-muted">
                {d.company ? `${d.company} · ` : ""}
                {d.stage}
                {d.closeDate ? ` · closes ${fmtDate(d.closeDate)}` : ""}
              </div>
            </div>
            <span className="shrink-0 text-[13.5px] font-bold">{d.amount != null ? money(d.amount) : "—"}</span>
          </Link>
        ))}
        {deals.length === 0 && (
          <p className="px-5 py-6 text-[13px] leading-relaxed text-muted">
            No deals assigned to you yet — deals you own will appear here.
          </p>
        )}
      </div>
    </div>
  );
}

/** Honest delta line: up in green, down in red, zero = a plain "No change"
 *  (a green "↑ +0" on an empty workspace would be a fake signal). */
function DeltaLine({ delta, pct = false }: { delta: number; pct?: boolean }) {
  const unit = pct ? "%" : "";
  if (delta > 0)
    return (
      <>
        ↑ <b>+{delta}{unit}</b> vs last week
      </>
    );
  if (delta < 0)
    return (
      <span className="text-red">
        ↓ <b>{delta}{unit}</b> vs last week
      </span>
    );
  return <span className="text-muted">No change vs last week</span>;
}

function StatCard({
  icon,
  tile,
  label,
  value,
  delta,
  spark,
}: {
  icon: string;
  tile: string;
  label: string;
  value: React.ReactNode;
  delta: React.ReactNode;
  spark: React.ReactNode;
}) {
  return (
    <div className="card relative overflow-hidden px-[18px] pt-4 pb-1">
      <div className="flex items-center gap-2.5">
        <span className={`flex h-[38px] w-[38px] items-center justify-center rounded-[11px] ${tile}`}>
          <I n={icon as never} size={19} sw={2} />
        </span>
        <span className="text-[13px] font-semibold whitespace-nowrap text-ink2">{label}</span>
      </div>
      <div className="mt-2.5 text-[27px] leading-none font-extrabold tracking-tight">{value}</div>
      <div className="mt-1.5 text-[12px] font-medium text-green">{delta}</div>
      <div className="absolute right-0 bottom-0 left-0">{spark}</div>
      <div className="h-[30px]" />
    </div>
  );
}
