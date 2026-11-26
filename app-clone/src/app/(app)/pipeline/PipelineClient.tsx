"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { I } from "@/components/icons";
import { Sparkline } from "@/components/charts";
import DealDrawer from "@/components/DealDrawer";
import { STAGES, money, moneyShort } from "@/lib/constants";
import type { DealView } from "@/lib/view";
import type { Insight, Kpi, MovementRow } from "@/lib/pipeline";

type PeriodInfo = { key: string; days: number; startISO: string; endISO: string };
type TabKey = "all" | "progressed" | "stalled" | "slipped" | "wonlost";

const TERMINAL = ["Won", "Lost"];
const STAGE_PILL: Record<string, string> = {
  New: "bg-canvas text-muted",
  Discovery: "bg-violet-tint text-violet",
  Contacted: "bg-primary-tint text-primary",
  "Meeting booked": "bg-amber-tint text-amber",
  "Proposal sent": "bg-primary-tint text-primary",
  Negotiation: "bg-purple-tint text-purple",
  Won: "bg-green-tint text-green",
  Lost: "bg-[#fdecec] text-red",
};
const RISK_STYLE: Record<string, { pill: string; dot: string }> = {
  High: { pill: "bg-[#fdecec] text-red", dot: "bg-red" },
  Medium: { pill: "bg-amber-tint text-amber", dot: "bg-[#d99a16]" },
  Low: { pill: "bg-green-tint text-green", dot: "bg-green" },
};

function initials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function DeltaLine({ kpi, days }: { kpi: Kpi; days: number }) {
  const d = kpi.delta;
  if (!d || d.dir === "none") return <p className="mt-1 text-[11.5px] font-semibold text-faint">— vs previous {days}d</p>;
  if (d.dir === "flat") return <p className="mt-1 text-[11.5px] font-semibold text-faint">— {d.text} vs previous {days}d</p>;
  return (
    <p className={`mt-1 text-[11.5px] font-semibold ${d.dir === "up" ? "text-green" : "text-red"}`}>
      {d.dir === "up" ? "↑" : "↓"} {d.text} vs previous {days}d
    </p>
  );
}

function MovementChart({ movement }: { movement: MovementRow[] }) {
  const maxRaw = Math.max(0, ...movement.flatMap((m) => [m.current, m.previous]));
  if (maxRaw <= 0) {
    return (
      <div className="flex h-[240px] items-center justify-center px-6 text-center text-[13px] text-muted">
        No pipeline movement yet — once deals exist, this chart compares each stage with the start of the period.
      </div>
    );
  }
  // Nice round axis steps (…10K, 25K, 50K, 100K, 250K…) so gridline labels
  // stay clean like the reference.
  const stepPow = Math.pow(10, Math.floor(Math.log10(maxRaw)));
  const step = [1, 2.5, 5, 10].map((f) => f * stepPow).find((s) => maxRaw / s <= 4) ?? 10 * stepPow;
  const max = Math.ceil(maxRaw / step) * step;
  const tickCount = Math.round(max / step);
  const W = 720;
  const H = 252;
  const padL = 46;
  const padT = 26;
  const padB = 34;
  const plotW = W - padL - 8;
  const plotH = H - padT - padB;
  const groupW = plotW / movement.length;
  const barW = 24;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Pipeline movement by stage">
      {Array.from({ length: tickCount + 1 }, (_, i) => i).map((i) => {
        const f = i / tickCount;
        const y = padT + plotH * (1 - f);
        return (
          <g key={i}>
            <line x1={padL} x2={W - 8} y1={y} y2={y} stroke="#eceef4" strokeWidth={1} />
            <text x={padL - 8} y={y + 3.5} textAnchor="end" fontSize={10} fill="#9aa1b5">
              {i === 0 ? "$0" : moneyShort(step * i)}
            </text>
          </g>
        );
      })}
      {movement.map((m, i) => {
        const gx = padL + groupW * i + groupW / 2;
        const curH = (m.current / max) * plotH;
        const prevH = (m.previous / max) * plotH;
        const base = padT + plotH;
        const words = m.label.split(" ");
        const lines = words.length > 1 && m.label.length > 10 ? [words.slice(0, -1).join(" "), words[words.length - 1]] : [m.label];
        return (
          <g key={m.stage}>
            <rect x={gx - barW - 3} y={base - curH} width={barW} height={curH} rx={4} fill="#2b6bf0" />
            <rect x={gx + 3} y={base - prevH} width={barW} height={prevH} rx={4} fill="#c3cdf5" />
            {m.current > 0 && (
              <text x={gx - barW / 2 - 3} y={base - curH - 5} textAnchor="middle" fontSize={10} fontWeight={700} fill="#23283b">
                {moneyShort(m.current)}
              </text>
            )}
            {m.previous > 0 && (
              <text x={gx + barW / 2 + 3} y={base - prevH - 5} textAnchor="middle" fontSize={10} fontWeight={600} fill="#8a93a8">
                {moneyShort(m.previous)}
              </text>
            )}
            {lines.map((ln, li) => (
              <text key={li} x={gx} y={base + 15 + li * 11} textAnchor="middle" fontSize={10.5} fill="#6b7280">
                {ln}
              </text>
            ))}
          </g>
        );
      })}
    </svg>
  );
}

export default function PipelineClient({
  period,
  kpis,
  movement,
  insights,
  tabCounts,
  rows,
  owners,
  hasConnection,
}: {
  period: PeriodInfo;
  kpis: Kpi[];
  movement: MovementRow[];
  insights: Insight[];
  tabCounts: { all: number; progressed: number; stalled: number; slipped: number; wonLost: number };
  rows: DealView[];
  owners: string[];
  hasConnection: boolean;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<TabKey>("all");
  const [query, setQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [fStage, setFStage] = useState("any");
  const [fRisk, setFRisk] = useState("any");
  const [fOwner, setFOwner] = useState("any");
  const [selected, setSelected] = useState<DealView | null>(null);
  const [customOpen, setCustomOpen] = useState(false);
  const [customFrom, setCustomFrom] = useState(period.startISO.slice(0, 10));
  const [customTo, setCustomTo] = useState(period.endISO.slice(0, 10));

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (tab === "progressed" && !r.tabFlags?.progressed) return false;
      if (tab === "stalled" && !r.tabFlags?.stalled) return false;
      if (tab === "slipped" && !r.tabFlags?.slipped) return false;
      if (tab === "wonlost" && !TERMINAL.includes(r.stage)) return false;
      if (fStage !== "any" && r.stage !== fStage) return false;
      if (fRisk !== "any" && r.risk !== fRisk) return false;
      if (fOwner !== "any" && r.ownerName !== fOwner) return false;
      if (q && !r.name.toLowerCase().includes(q) && !(r.company ?? "").toLowerCase().includes(q)) return false;
      return true;
    });
  }, [rows, tab, query, fStage, fRisk, fOwner]);

  const scrollToTable = () => document.getElementById("deals-table")?.scrollIntoView({ behavior: "smooth", block: "start" });

  function exportCsv() {
    const esc = (v: unknown) => `"${String(v ?? "").replaceAll('"', '""')}"`;
    const lines = [
      ["Deal Name", "Amount", "Previous Stage", "Current Stage", "Owner", "Last Activity", "Days in Stage", "Risk"].map(esc).join(","),
      ...filtered.map((r) =>
        [
          r.name,
          r.amount ?? "",
          r.prevStage ?? r.stage,
          r.stage === "Won" ? "Closed Won" : r.stage,
          r.ownerName ?? "",
          r.lastActivityLabel,
          r.daysInStage == null ? "" : r.daysInStage,
          r.risk ?? "",
        ]
          .map(esc)
          .join(","),
      ),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pipeline-report-${period.key === "custom" ? "custom" : `${period.key}d`}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  const tabs: { key: TabKey; label: string; count: number }[] = [
    { key: "all", label: "All Deals", count: tabCounts.all },
    { key: "progressed", label: "Progressed", count: tabCounts.progressed },
    { key: "stalled", label: "Stalled", count: tabCounts.stalled },
    { key: "slipped", label: "Close Date Slipped", count: tabCounts.slipped },
    { key: "wonlost", label: "Won / Lost", count: tabCounts.wonLost },
  ];
  const insightStyle = {
    growth: { tile: "bg-green-tint text-green", icon: "trend" as const },
    stage: { tile: "bg-violet-tint text-violet", icon: "clock" as const },
    risk: { tile: "bg-amber-tint text-amber", icon: "alert" as const },
  };

  return (
    <div className="relative">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-[26px] font-extrabold tracking-[-0.01em]">Pipeline</h1>
          <p className="mt-1 text-[13.5px] text-muted">
            Track deal movement and find what&rsquo;s working (or not) in your sales pipeline.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="flex items-center rounded-xl bg-[#eef0f7] p-1">
              {(["7", "30", "90"] as const).map((p) => (
                <Link
                  key={p}
                  href={`/pipeline?period=${p}`}
                  className={`rounded-lg px-3 py-1.5 text-[12.5px] font-semibold transition ${
                    period.key === p ? "bg-white text-ink shadow-sm" : "text-muted hover:text-ink"
                  }`}
                >
                  {p}D
                </Link>
              ))}
              <button
                type="button"
                onClick={() => setCustomOpen((v) => !v)}
                className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-[12.5px] font-semibold transition ${
                  period.key === "custom" ? "bg-white text-ink shadow-sm" : "text-muted hover:text-ink"
                }`}
              >
                Custom <I n="chevD" size={12} sw={2.4} />
              </button>
            </div>
            {customOpen && (
              <div className="card absolute right-0 top-[calc(100%+8px)] z-20 w-[264px] p-3.5">
                <p className="text-[12px] font-bold">Custom range</p>
                <label className="mt-2.5 block text-[11px] font-semibold text-muted">
                  From
                  <input
                    type="date"
                    value={customFrom}
                    onChange={(e) => setCustomFrom(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-line bg-white px-2.5 py-1.5 text-[12.5px] text-ink outline-none focus:border-primary"
                  />
                </label>
                <label className="mt-2 block text-[11px] font-semibold text-muted">
                  To
                  <input
                    type="date"
                    value={customTo}
                    onChange={(e) => setCustomTo(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-line bg-white px-2.5 py-1.5 text-[12.5px] text-ink outline-none focus:border-primary"
                  />
                </label>
                <button
                  type="button"
                  disabled={!customFrom || !customTo || customTo <= customFrom}
                  onClick={() => router.push(`/pipeline?period=custom&from=${customFrom}&to=${customTo}`)}
                  className="mt-3 w-full rounded-lg bg-violet px-3 py-2 text-[12.5px] font-bold text-white transition hover:opacity-90 disabled:opacity-40"
                >
                  Apply range
                </button>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={exportCsv}
            className="flex items-center gap-2 rounded-full bg-violet px-4 py-2 text-[13px] font-bold text-white shadow-sm transition hover:opacity-90"
          >
            <I n="download" size={14} sw={2.2} />
            Export Report
          </button>
        </div>
      </div>

      {/* KPI cards */}
      <div className="mt-5 grid grid-cols-4 gap-4">
        {kpis.map((k) => (
          <div key={k.key} className="card flex items-start gap-3 px-4 py-4">
            <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${k.tile}`}>
              <I n={k.icon} size={17} sw={2} />
            </span>
            <div className="min-w-0">
              <p className="text-[12px] font-semibold whitespace-nowrap text-muted">{k.label}</p>
              <p className="mt-0.5 text-[24px] leading-none font-extrabold">{k.value}</p>
              <DeltaLine kpi={k} days={period.days} />
            </div>
            <div className="ml-auto shrink-0 pt-1">
              <Sparkline data={k.spark} color={k.color} width={80} height={38} />
            </div>
          </div>
        ))}
      </div>

      {/* Movement + Insights */}
      <div className="mt-4 grid grid-cols-3 gap-4">
        <section className="card col-span-2 px-5 py-4">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-[14.5px] font-bold">
              <I n="bars" size={16} className="text-muted" />
              Pipeline Movement
            </h2>
            <div className="flex items-center gap-4 text-[11.5px] font-semibold text-muted">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-primary" /> This Period
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-[#c3cdf5]" /> Previous Period
              </span>
            </div>
          </div>
          <div className="mt-2">
            <MovementChart movement={movement} />
          </div>
        </section>

        <section className="card px-5 py-4">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-[14.5px] font-bold">
              <I n="bulb" size={16} className="text-amber" />
              Key Insights
            </h2>
            <button type="button" onClick={scrollToTable} className="text-[12px] font-bold text-violet hover:underline">
              View Details →
            </button>
          </div>
          <div className="mt-3 space-y-4">
            {insights.map((ins) => {
              const st = insightStyle[ins.kind];
              const body = (
                <>
                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${st.tile}`}>
                    <I n={st.icon} size={16} sw={2.1} />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[13px] font-bold">{ins.headline}</span>
                    <span className="mt-0.5 block text-[12px] leading-snug text-muted">{ins.text}</span>
                  </span>
                </>
              );
              return ins.kind === "risk" ? (
                <button
                  key={ins.kind}
                  type="button"
                  onClick={() => {
                    setTab("stalled");
                    scrollToTable();
                  }}
                  className="flex w-full items-start gap-3 text-left"
                >
                  {body}
                </button>
              ) : (
                <div key={ins.kind} className="flex items-start gap-3">
                  {body}
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {!hasConnection && (
        <div className="card mt-4 flex flex-wrap items-center gap-3 px-5 py-4">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-tint text-primary">
            <I n="plug" size={19} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[13.5px] font-bold">Connect your CRM</p>
            <p className="text-[12.5px] text-muted">Link HubSpot or Salesforce and your pipeline will fill in here automatically.</p>
          </div>
          <Link href="/connections" className="rounded-full bg-primary px-4 py-2 text-[12.5px] font-bold text-white transition hover:opacity-90">
            Connect a CRM
          </Link>
        </div>
      )}

      {/* Tabs + filter + search */}
      <div className="mt-5 flex flex-wrap items-center gap-2">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`rounded-full px-3.5 py-1.5 text-[12.5px] font-semibold transition ${
              tab === t.key ? "bg-violet-tint text-violet" : "text-muted hover:bg-canvas hover:text-ink"
            }`}
          >
            {t.label} ({t.count})
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setShowFilters((v) => !v)}
            className={`flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[12.5px] font-semibold transition ${
              showFilters ? "border-violet/50 bg-violet-tint text-violet" : "border-line bg-white text-ink2 hover:border-primary/40"
            }`}
          >
            <I n="filter" size={13} />
            Filter
          </button>
          <label className="flex w-[210px] items-center gap-2 rounded-full border border-line bg-white px-3.5 py-1.5">
            <I n="search" size={14} className="shrink-0 text-faint" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search deals..."
              className="w-full bg-transparent text-[12.5px] outline-none placeholder:text-faint"
            />
          </label>
        </div>
      </div>

      {showFilters && (
        <div className="mt-3 flex flex-wrap items-center gap-2.5">
          <label className="flex items-center gap-2 text-[12px] font-semibold text-muted">
            Stage
            <select value={fStage} onChange={(e) => setFStage(e.target.value)} className="rounded-lg border border-line bg-white px-2.5 py-1.5 text-[12.5px] font-medium text-ink outline-none focus:border-primary">
              <option value="any">Any stage</option>
              {[...STAGES, "Lost"].map((s) => (
                <option key={s} value={s}>
                  {s === "Won" ? "Closed Won" : s}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2 text-[12px] font-semibold text-muted">
            Risk
            <select value={fRisk} onChange={(e) => setFRisk(e.target.value)} className="rounded-lg border border-line bg-white px-2.5 py-1.5 text-[12.5px] font-medium text-ink outline-none focus:border-primary">
              <option value="any">Any risk</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </label>
          <label className="flex items-center gap-2 text-[12px] font-semibold text-muted">
            Owner
            <select value={fOwner} onChange={(e) => setFOwner(e.target.value)} className="rounded-lg border border-line bg-white px-2.5 py-1.5 text-[12.5px] font-medium text-ink outline-none focus:border-primary">
              <option value="any">Any owner</option>
              {owners.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </label>
          {(fStage !== "any" || fRisk !== "any" || fOwner !== "any") && (
            <button
              type="button"
              onClick={() => {
                setFStage("any");
                setFRisk("any");
                setFOwner("any");
              }}
              className="text-[12px] font-bold text-violet hover:underline"
            >
              Clear filters
            </button>
          )}
        </div>
      )}

      {/* Deals table */}
      <section id="deals-table" className="card mt-4 scroll-mt-4 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1060px] border-collapse text-left">
            <thead>
              <tr className="border-b border-line text-[11px] font-bold tracking-[0.04em] text-faint uppercase">
                <th className="px-5 py-3">Deal Name</th>
                <th className="px-3 py-3">Amount</th>
                <th className="px-3 py-3">Previous Stage</th>
                <th className="px-3 py-3">Current Stage</th>
                <th className="px-3 py-3">Owner</th>
                <th className="px-3 py-3">Last Activity</th>
                <th className="px-3 py-3">Days in Stage</th>
                <th className="px-3 py-3">Risk</th>
                <th className="px-3 py-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className="border-b border-line/50 transition last:border-0 hover:bg-canvas/60">
                  <td className="px-5 py-3">
                    <p className="text-[13px] font-bold">{r.name}</p>
                    {r.company && r.company !== r.name && <p className="text-[11.5px] text-faint">{r.company}</p>}
                  </td>
                  <td className="px-3 py-3 text-[13px] font-semibold tabular-nums">{r.amount != null ? money(r.amount) : "—"}</td>
                  <td className="px-3 py-3 whitespace-nowrap">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="rounded-full bg-canvas px-2.5 py-[3px] text-[11px] font-semibold text-muted">
                        {r.prevStage === "Won" ? "Closed Won" : (r.prevStage ?? r.stage)}
                      </span>
                      {r.prevStage && r.prevStage !== r.stage && <span className="text-faint">→</span>}
                    </span>
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap">
                    <span className={`rounded-full px-2.5 py-[3px] text-[11px] font-semibold ${STAGE_PILL[r.stage] ?? "bg-canvas text-muted"}`}>
                      {r.stage === "Won" ? "Closed Won" : r.stage}
                    </span>
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap">
                    {r.ownerName ? (
                      <span className="flex items-center gap-2 text-[12.5px] font-medium">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary-tint text-[9.5px] font-bold text-primary">
                          {initials(r.ownerName)}
                        </span>
                        {r.ownerName}
                      </span>
                    ) : (
                      <span className="text-faint">—</span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-[12.5px] whitespace-nowrap text-muted">{r.lastActivityLabel}</td>
                  <td className="px-3 py-3 text-[12.5px] whitespace-nowrap text-muted">
                    {r.daysInStage == null ? "—" : r.daysInStage === 0 ? "Today" : `${r.daysInStage} day${r.daysInStage === 1 ? "" : "s"}`}
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap">
                    {r.risk ? (
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-[3px] text-[11px] font-semibold ${RISK_STYLE[r.risk].pill}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${RISK_STYLE[r.risk].dot}`} />
                        {r.risk}
                      </span>
                    ) : (
                      <span className="text-faint">—</span>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    <button
                      type="button"
                      onClick={() => setSelected(r)}
                      className="flex items-center gap-1 rounded-lg border border-line px-2.5 py-1 text-[12px] font-semibold whitespace-nowrap text-ink2 transition hover:border-primary/40 hover:text-primary"
                    >
                      View <I n="arrowR" size={12} sw={2.3} />
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-5 py-10 text-center text-[13px] text-muted">
                    {rows.length === 0
                      ? "No deals yet — connect your CRM and your pipeline will appear here."
                      : "No deals match this tab, search and filters."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {filtered.length > 0 && (
          <p className="border-t border-line/60 px-5 py-2.5 text-[11.5px] text-faint">
            Showing {filtered.length} of {rows.length} deals · {period.key === "custom" ? "Custom range" : `Last ${period.days} days`}
          </p>
        )}
      </section>

      {selected && (
        <div className="fixed inset-0 z-30">
          <DealDrawer deal={selected} onClose={() => setSelected(null)} />
        </div>
      )}
    </div>
  );
}
