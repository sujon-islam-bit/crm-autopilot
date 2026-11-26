"use client";

import { useState } from "react";
import Link from "next/link";
import { I } from "../../../components/icons";
import { Sparkline, PulseChart, Donut } from "../../../components/charts";
import ProposalRow from "../../../components/ProposalRow";
import DetailDrawer from "../../../components/DetailDrawer";
import type { ProposalView } from "../../../lib/view";
import { moneyShort } from "../../../lib/constants";

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

export type Brief = { icon: "clock" | "bolt" | "alert"; title: string; sub: string; cta: string; href: string };

export default function DashboardClient({
  firstName,
  connected,
  views,
  stats,
  pulse,
  briefs,
}: {
  firstName: string;
  connected: boolean;
  views: ProposalView[];
  stats: DashStats;
  pulse: { label: string; thisWeek: number; lastWeek: number }[];
  briefs: Brief[];
}) {
  const [selected, setSelected] = useState<ProposalView | null>(null);
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

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

        {/* Connect CTA — shown until the workspace has any CRM connection */}
        {!connected && (
          <div className="card mt-5 flex items-center gap-4 px-5 py-4">
            <span className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-[12px] bg-primary text-white">
              <I n="plug" size={20} sw={2} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-[15px] font-bold">Connect your CRM</div>
              <p className="mt-0.5 text-[13px] text-muted">
                Connect HubSpot or Salesforce and CleanPipe will start reading your pipeline and preparing updates
                for your approval.
              </p>
            </div>
            <Link href="/connections" className="btn-primary shrink-0 px-4 py-2.5 text-[13.5px]">
              Connect your CRM
            </Link>
          </div>
        )}

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
          <div className="card overflow-hidden">
            <div className="flex items-center gap-2 px-5 pt-4 pb-1">
              <I n="sparkle" size={16} className="text-purple" fill />
              <h2 className="flex-1 text-[15px] font-bold whitespace-nowrap">Autopilot Review Queue</h2>
              <Link href="/approvals" className="flex items-center gap-1 text-[13px] font-semibold whitespace-nowrap">
                View all <I n="arrowR" size={13} sw={2.2} />
              </Link>
            </div>
            <div className="divide-y divide-line/70">
              {views.length === 0 && (
                <p className="px-5 py-6 text-[13px] leading-relaxed text-muted">
                  {connected
                    ? "Queue is clear — the AI has nothing waiting."
                    : "No proposals yet — connect your CRM and the AI will prepare updates for you."}
                </p>
              )}
              {views.map((v, i) => (
                <ProposalRow key={v.id} view={v} first={i === 0} selected={selected?.id === v.id} onSelect={setSelected} />
              ))}
            </div>
          </div>

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
                <span className="text-[27px] leading-none font-extrabold tracking-tight">{moneyShort(stats.pulseNow)}</span>
                <span className="leading-tight">
                  {stats.pulseNow > 0 ? (
                    <>
                      <span className="block text-[12.5px] font-bold text-green">↑ +{stats.pulseDelta}%</span>
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
              <PulseChart points={pulse} nowLabel={moneyShort(stats.pulseNow)} />
            </div>
          </div>
        </div>

        {/* Briefs + Data Health */}
        <div className="mt-4 grid grid-cols-2 gap-4">
          <div className="card overflow-hidden">
            <div className="flex items-center gap-2 px-5 pt-4 pb-1">
              <I n="calendar" size={16} className="text-primary" />
              <h2 className="flex-1 text-[15px] font-bold">Today&apos;s Briefs</h2>
              <Link href="/activity" className="flex items-center gap-1 text-[13px] font-semibold">
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
                  <Link href={b.href} className="btn-outline shrink-0 px-3 py-[6px] text-[12px]">
                    {b.cta}
                  </Link>
                </div>
              ))}
              {briefs.length === 0 && (
                <p className="px-5 py-5 text-[13px] text-muted">
                  {connected ? "Nothing needs you today." : "Nothing yet — briefs appear here once your CRM is connected."}
                </p>
              )}
            </div>
          </div>

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
        </div>
      </div>

      {selected && <DetailDrawer view={selected} onClose={() => setSelected(null)} overlay />}
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
