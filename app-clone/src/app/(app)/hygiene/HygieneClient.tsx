"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { I } from "../../../components/icons";
import DealDrawer from "../../../components/DealDrawer";
import { smoothPath } from "../../../components/charts";
import { money } from "../../../lib/constants";
import type { CleanupData, DupGroup, GuardrailRuleView } from "../../../lib/cleanup";
import type { GuardrailKey } from "../../../lib/guardrails";
import {
  proposeLogEntryAction,
  proposeMergeAction,
  proposeMissingFixAction,
  proposeStaleFollowupAction,
  saveGuardrailsAction,
} from "../../../lib/actions";

type TabKey = "overview" | "duplicates" | "missing" | "stale" | "unlogged" | "guardrails";

const ISSUE_TILE: Record<string, string> = {
  duplicate: "bg-violet-tint text-violet",
  missing: "bg-primary-tint text-primary",
  stale: "bg-amber-tint text-amber",
  unlogged: "bg-green-tint text-green",
};
const ISSUE_ICON: Record<string, string> = {
  duplicate: "users",
  missing: "list",
  stale: "clock",
  unlogged: "mail",
};
const ISSUE_PILL: Record<string, string> = {
  duplicate: "bg-[#fdecec] text-red",
  missing: "bg-primary-tint text-primary",
  stale: "bg-amber-tint text-amber",
  unlogged: "bg-green-tint text-green",
};

function Toggle({
  on,
  onChange,
  disabled,
  label,
}: {
  on: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <button
      role="switch"
      aria-checked={on}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!on)}
      className={`relative h-[24px] w-[44px] shrink-0 rounded-full transition-colors ${
        on ? "bg-violet" : "bg-line"
      } ${disabled ? "cursor-not-allowed opacity-50" : ""}`}
    >
      <span
        className={`absolute top-[3px] h-[18px] w-[18px] rounded-full bg-white shadow transition-all ${
          on ? "left-[23px]" : "left-[3px]"
        }`}
      />
    </button>
  );
}

function ActionButton({
  label,
  action,
}: {
  label: string;
  action: () => Promise<{ ok: boolean; error?: string }>;
}) {
  const router = useRouter();
  const [busy, start] = useTransition();
  const [note, setNote] = useState("");
  return (
    <span className="inline-flex items-center gap-2">
      {note && <span className="text-[11.5px] text-red">{note}</span>}
      <button
        disabled={busy}
        onClick={() =>
          start(async () => {
            const r = await action();
            if (!r.ok) setNote(r.error ?? "Something went wrong");
            router.refresh();
          })
        }
        className="btn-outline px-3 py-[6px] text-[12px] font-semibold text-violet disabled:opacity-60"
      >
        {busy ? "Working…" : label}
      </button>
    </span>
  );
}

function InApprovalsBadge({ text = "In Approvals" }: { text?: string }) {
  return (
    <span className="rounded-full bg-violet-tint px-3 py-1 text-[12px] font-bold text-violet">{text}</span>
  );
}

function TrendChart({ points }: { points: { label: string; score: number }[] }) {
  if (points.length < 2) {
    return (
      <p className="px-5 py-8 text-[13px] text-muted">
        No scan history yet — the trend appears once health scans have run. Every point on this chart is a real
        scan&apos;s score.
      </p>
    );
  }
  const W = 720;
  const H = 190;
  const PADL = 36;
  const PADR = 16;
  const PADT = 30;
  const PADB = 26;
  const scores = points.map((p) => p.score);
  const rawMin = Math.min(...scores);
  const rawMax = Math.max(...scores);
  let lo = Math.max(0, Math.floor((rawMin - 2) / 5) * 5);
  let hi = Math.min(100, Math.ceil((rawMax + 2) / 5) * 5);
  if (hi - lo < 10) hi = Math.min(100, lo + 10);
  if (hi - lo < 10) lo = Math.max(0, hi - 10);
  const x = (i: number) => PADL + (i / (points.length - 1)) * (W - PADL - PADR);
  const y = (v: number) => PADT + (1 - (v - lo) / (hi - lo)) * (H - PADT - PADB);
  const pts = points.map((p, i) => [x(i), y(p.score)] as const);
  const line = smoothPath(pts);
  const area = `${line} L ${x(points.length - 1).toFixed(1)} ${H - PADB} L ${x(0).toFixed(1)} ${H - PADB} Z`;
  const ticks = [0, 1, 2, 3].map((i) => Math.round(lo + ((hi - lo) * i) / 3));
  const last = points[points.length - 1];
  const mid = points[Math.floor(points.length / 2)];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Data quality trend">
      {ticks.map((t) => (
        <g key={t}>
          <line x1={PADL} x2={W - PADR} y1={y(t)} y2={y(t)} stroke="#e7e7ef" strokeWidth="1" />
          <text x={PADL - 8} y={y(t) + 4} textAnchor="end" fontSize="10.5" fill="#9a9db0">
            {t}
          </text>
        </g>
      ))}
      <path d={area} fill="#6c3ce9" opacity="0.07" />
      <path d={line} fill="none" stroke="#6c3ce9" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx={x(points.length - 1)} cy={y(last.score)} r="4" fill="#6c3ce9" stroke="#fff" strokeWidth="2" />
      <g>
        <rect x={x(points.length - 1) - 17} y={y(last.score) - 27} width="34" height="19" rx="6" fill="#6c3ce9" />
        <text
          x={x(points.length - 1)}
          y={y(last.score) - 13.5}
          textAnchor="middle"
          fontSize="11"
          fontWeight="700"
          fill="#fff"
        >
          {last.score}
        </text>
      </g>
      <text x={x(0)} y={H - 6} fontSize="10.5" fill="#9a9db0">
        {points[0].label}
      </text>
      <text x={x(Math.floor(points.length / 2))} y={H - 6} textAnchor="middle" fontSize="10.5" fill="#9a9db0">
        {mid.label}
      </text>
      <text x={x(points.length - 1)} y={H - 6} textAnchor="end" fontSize="10.5" fill="#9a9db0">
        {last.label}
      </text>
    </svg>
  );
}

function ScoreRing({ score }: { score: number | null }) {
  const R = 62;
  const C = 2 * Math.PI * R;
  const frac = score == null ? 0 : Math.max(0, Math.min(100, score)) / 100;
  return (
    <div className="relative h-[148px] w-[148px] shrink-0">
      <svg viewBox="0 0 148 148" className="h-full w-full -rotate-90">
        <circle cx="74" cy="74" r={R} fill="none" stroke="#e2f6e9" strokeWidth="13" />
        {score != null && (
          <circle
            cx="74"
            cy="74"
            r={R}
            fill="none"
            stroke="#22b573"
            strokeWidth="13"
            strokeLinecap="round"
            strokeDasharray={C}
            strokeDashoffset={C * (1 - frac)}
          />
        )}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[36px] leading-none font-extrabold tracking-tight">{score ?? "—"}</span>
        <span className="mt-1 text-[12.5px] font-medium text-muted">/100</span>
      </div>
    </div>
  );
}

export default function HygieneClient({ data, periodDays }: { data: CleanupData; periodDays: number }) {
  const router = useRouter();
  const [tab, setTab] = useState<TabKey>("overview");
  const [drawerDeal, setDrawerDeal] = useState<CleanupData["staleRows"][number]["deal"] | null>(null);
  const [masters, setMasters] = useState<Record<string, string>>({});
  const [master, setMaster] = useState(data.guardrails.master);
  const [rules, setRules] = useState<Record<GuardrailKey, boolean>>(() =>
    Object.fromEntries(data.guardrails.rules.map((r) => [r.key, r.saved])) as Record<GuardrailKey, boolean>,
  );
  const [, startSave] = useTransition();

  useEffect(() => {
    setMaster(data.guardrails.master);
    setRules(Object.fromEntries(data.guardrails.rules.map((r) => [r.key, r.saved])) as Record<GuardrailKey, boolean>);
  }, [data.guardrails]);

  const saveGuardrails = (nextMaster: boolean, nextRules: Record<GuardrailKey, boolean>) => {
    startSave(async () => {
      await saveGuardrailsAction({ enabled: nextMaster, ...nextRules });
      router.refresh();
    });
  };
  const toggleMaster = (v: boolean) => {
    setMaster(v);
    saveGuardrails(v, rules);
  };
  const toggleRule = (key: GuardrailKey, v: boolean) => {
    const next = { ...rules, [key]: v };
    setRules(next);
    saveGuardrails(master, next);
  };
  const ruleView = (key: GuardrailKey): GuardrailRuleView | undefined =>
    data.guardrails.rules.find((r) => r.key === key);
  const effective = (key: GuardrailKey) => master && rules[key];

  const counts = data.counts;
  const totalIssues = counts.duplicates + counts.missing + counts.unlogged + counts.stale;
  const tabs: { key: TabKey; label: string }[] = [
    { key: "overview", label: "Issues Overview" },
    { key: "duplicates", label: `Duplicate Records (${counts.duplicates})` },
    { key: "missing", label: `Missing Fields (${counts.missing})` },
    { key: "stale", label: `Stale Deals (${counts.stale})` },
    { key: "unlogged", label: `Unlogged Activities (${counts.unlogged})` },
    { key: "guardrails", label: "Data Guardrails" },
  ];
  const firstIssueTab: TabKey =
    counts.duplicates > 0
      ? "duplicates"
      : counts.missing > 0
        ? "missing"
        : counts.stale > 0
          ? "stale"
          : counts.unlogged > 0
            ? "unlogged"
            : "duplicates";

  const periodSelect = (small = false) => (
    <select
      aria-label="Period"
      value={String(periodDays)}
      onChange={(e) => router.push(`/hygiene?period=${e.target.value}`)}
      className={`rounded-[10px] border border-line bg-white font-medium text-ink2 ${
        small ? "px-2.5 py-1.5 text-[12px]" : "px-3 py-2 text-[13px]"
      }`}
    >
      <option value="7">Last 7 days</option>
      <option value="30">Last 30 days</option>
      <option value="90">Last 90 days</option>
    </select>
  );

  const miniCards: { kind: "duplicate" | "missing" | "stale" | "unlogged"; count: number; label: string; tab: TabKey }[] = [
    { kind: "duplicate", count: counts.duplicates, label: "Duplicate Contacts", tab: "duplicates" },
    { kind: "missing", count: counts.missing, label: "Missing Fields", tab: "missing" },
    { kind: "stale", count: counts.stale, label: "Stale Deals", tab: "stale" },
    { kind: "unlogged", count: counts.unlogged, label: "Unlogged Activities", tab: "unlogged" },
  ];

  return (
    <div className="px-7 pt-5 pb-7">
      {/* header */}
      <div className="flex items-start gap-4">
        <div className="flex-1">
          <h1 className="text-[24px] font-extrabold tracking-tight">Data Cleanup</h1>
          <p className="mt-1 text-[13.5px] text-muted">Keep your CRM data clean, accurate and up to date.</p>
        </div>
        {periodSelect()}
      </div>

      {!data.hasConnection && (
        <div className="card mt-5 flex items-center gap-4 p-5">
          <span className="flex h-[42px] w-[42px] items-center justify-center rounded-[12px] bg-primary-tint text-primary">
            <I n="plug" size={19} />
          </span>
          <div className="flex-1">
            <div className="text-[14.5px] font-bold">Connect your CRM</div>
            <p className="text-[13px] text-muted">
              Once your CRM is connected, the AI scans it and lists every data problem here.
            </p>
          </div>
          <Link href="/connections" className="btn-primary px-4 py-2 text-[13px]">
            Connect your CRM
          </Link>
        </div>
      )}

      {/* score band */}
      <div className="mt-5 grid grid-cols-[minmax(360px,1.3fr)_repeat(4,1fr)] gap-4">
        <div className="card flex items-center gap-6 p-5">
          <ScoreRing score={data.score} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="text-[16px] font-extrabold">Data Health Score</span>
              {data.scoreDelta != null && (
                <span className="rounded-full bg-green-tint px-2.5 py-[3px] text-[11.5px] font-bold text-green">
                  {data.scoreDelta >= 0 ? "↑" : "↓"} {data.scoreDelta >= 0 ? "+" : ""}
                  {data.scoreDelta} from last period
                </span>
              )}
            </div>
            <p className="mt-2 text-[14px] font-medium text-ink2">
              {data.score == null
                ? "No data yet — connect your CRM and run a scan to get your first score."
                : data.verdict}
            </p>
            <div className="mt-4 h-2 w-full max-w-[300px] rounded-full bg-green-tint">
              <div
                className="h-full rounded-full bg-green-bright"
                style={{ width: `${data.score ?? 0}%` }}
              />
            </div>
          </div>
        </div>
        {miniCards.map((c) => (
          <div key={c.kind} className="card flex flex-col p-4">
            <span
              className={`flex h-10 w-10 items-center justify-center rounded-[11px] ${ISSUE_TILE[c.kind]}`}
            >
              <I n={ISSUE_ICON[c.kind]} size={18} />
            </span>
            <span className="mt-3 text-[26px] leading-none font-extrabold tracking-tight">{c.count}</span>
            <span className="mt-1.5 text-[12.5px] leading-snug text-muted">{c.label}</span>
            <button
              onClick={() => setTab(c.tab)}
              className="mt-auto flex items-center gap-1 pt-3 text-left text-[13px] font-semibold text-violet"
            >
              View <I n="arrowR" size={13} />
            </button>
          </div>
        ))}
      </div>

      {/* tabs */}
      <div className="card mt-5 flex flex-wrap gap-1 rounded-[16px] p-1.5">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`rounded-full px-4 py-2 text-[13px] font-semibold whitespace-nowrap ${
              tab === t.key ? "bg-violet text-white" : "text-ink2 hover:bg-canvas"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div className="mt-4 grid grid-cols-[1fr_330px] items-start gap-4">
          <div className="flex min-w-0 flex-col gap-4">
            {/* Top Issues */}
            <div className="card overflow-hidden">
              <div className="flex items-center gap-2 border-b border-line/70 px-5 py-3.5">
                <span className="text-red">
                  <I n="alert" size={17} />
                </span>
                <h2 className="flex-1 text-[15px] font-bold">Top Issues</h2>
                <button
                  onClick={() => setTab(firstIssueTab)}
                  className="flex items-center gap-1 text-[13px] font-semibold text-violet"
                >
                  View All Issues <I n="arrowR" size={13} />
                </button>
              </div>
              {totalIssues === 0 ? (
                <p className="px-5 py-6 text-[13px] text-muted">
                  {data.score == null
                    ? "No issues yet — connect your CRM and the AI will list every data problem here."
                    : "Nothing to clean up — your CRM data is in great shape."}
                </p>
              ) : (
                <div className="divide-y divide-line/60">
                  {data.topIssues.map((issue) => (
                    <div key={issue.kind} className="flex items-center gap-3.5 px-5 py-3.5">
                      <span
                        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${ISSUE_TILE[issue.kind]}`}
                      >
                        <I n={ISSUE_ICON[issue.kind]} size={18} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="text-[14px] font-bold">{issue.title}</div>
                        <div className="text-[12.5px] text-muted">{issue.subline}</div>
                      </div>
                      <span
                        className={`rounded-full px-2.5 py-[3px] text-[12px] font-bold ${ISSUE_PILL[issue.kind]}`}
                      >
                        {issue.count}
                      </span>
                      <button
                        onClick={() =>
                          setTab(
                            issue.kind === "duplicate"
                              ? "duplicates"
                              : issue.kind === "missing"
                                ? "missing"
                                : issue.kind === "stale"
                                  ? "stale"
                                  : "unlogged",
                          )
                        }
                        className="btn-outline flex items-center gap-1 px-3.5 py-[7px] text-[12.5px] font-semibold"
                      >
                        Review <I n="arrowR" size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Trend */}
            <div className="card overflow-hidden">
              <div className="flex items-center gap-2 px-5 pt-4 pb-1">
                <span className="text-violet">
                  <I n="trend" size={17} />
                </span>
                <h2 className="flex-1 text-[15px] font-bold">Data Quality Trend</h2>
                {periodSelect(true)}
              </div>
              <div className="px-3 pb-2">
                <TrendChart points={data.trend.points} />
              </div>
            </div>
          </div>

          {/* right rail */}
          <div className="flex flex-col gap-4">
            <div className="rounded-[18px] border border-violet-tint bg-violet-soft p-5">
              <div className="flex items-start gap-2.5">
                <span className="mt-[1px] text-violet">
                  <I n="sparkle" size={17} />
                </span>
                <h2 className="flex-1 text-[14.5px] leading-snug font-bold">Enable Data Guardrails</h2>
                <Toggle on={master} onChange={toggleMaster} label="Enable Data Guardrails" />
              </div>
              <p className="mt-2 text-[12.5px] leading-relaxed text-muted">
                Let AI prevent data issues before they happen.
              </p>
              <div className="mt-3.5 flex flex-col gap-2.5">
                {(["autoEnrich", "preventInvalidStage", "detectDuplicates"] as GuardrailKey[]).map((key) => {
                  const on = effective(key);
                  return (
                    <div key={key} className="flex items-center gap-2.5">
                      <span
                        className={`flex h-[18px] w-[18px] items-center justify-center rounded-full ${
                          on ? "bg-green-bright text-white" : "bg-line text-faint"
                        }`}
                      >
                        <I n={on ? "check" : "x"} size={11} sw={3} />
                      </span>
                      <span className={`text-[13px] ${on ? "text-ink2" : "text-muted"}`}>
                        {ruleView(key)?.label}
                      </span>
                    </div>
                  );
                })}
              </div>
              <button
                onClick={() => setTab("guardrails")}
                className="mt-4 flex items-center gap-1 text-[13px] font-semibold text-violet"
              >
                Configure Rules <I n="arrowR" size={13} />
              </button>
            </div>

            <div className="card overflow-hidden">
              <div className="flex items-center gap-2 px-5 pt-4 pb-2">
                <I n="clock" size={16} />
                <h2 className="flex-1 text-[14.5px] font-bold">Recent Activity</h2>
                <Link href="/activity" className="flex items-center gap-1 text-[12.5px] font-semibold text-violet">
                  View All <I n="arrowR" size={12} />
                </Link>
              </div>
              {data.recentActivity.length === 0 ? (
                <p className="px-5 pb-5 text-[13px] text-muted">No cleanup activity yet.</p>
              ) : (
                <div className="flex flex-col px-5 pb-4">
                  {data.recentActivity.map((row, i) => (
                    <div key={i} className="flex items-start gap-3 py-2.5">
                      <span
                        className={`mt-[1px] flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full ${
                          row.icon === "check" ? "bg-green-tint text-green" : "bg-primary-tint text-primary"
                        }`}
                      >
                        <I n={row.icon === "check" ? "check" : "info"} size={12} sw={2.6} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="text-[13px] font-bold">{row.title}</div>
                        <div className="text-[12px] leading-snug text-muted">{row.subline}</div>
                      </div>
                      <span className="shrink-0 text-[11.5px] text-faint">{row.when}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {tab === "duplicates" && (
        <div className="mt-4">
          {data.duplicatesPaused ? (
            <div className="card flex flex-col items-center px-6 py-12 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-violet-tint text-violet">
                <I n="shield" size={20} />
              </span>
              <h2 className="mt-4 text-[16px] font-bold">Detection paused</h2>
              <p className="mt-1.5 max-w-[440px] text-[13px] leading-relaxed text-muted">
                Duplicate detection is off in Data Guardrails, so the scan is paused. The count above is frozen at
                the last computed value ({counts.duplicates}).
              </p>
              <button
                onClick={() => setTab("guardrails")}
                className="btn-outline mt-4 px-4 py-2 text-[13px] font-semibold text-violet"
              >
                Open Data Guardrails
              </button>
            </div>
          ) : data.dupGroups.length === 0 ? (
            <div className="card px-6 py-10 text-center text-[13.5px] text-muted">
              No duplicate contacts — every email address appears exactly once.
            </div>
          ) : (
            <>
              <p className="mb-4 max-w-[720px] text-[13px] leading-relaxed text-muted">
                {counts.duplicates} duplicate records across {data.dupGroups.length} groups. Pick the master record
                for each pair, then propose the merge — merges only happen after approval in Approvals.
              </p>
              {data.dupGroups.map((group) => (
                <DupGroupCard
                  key={group.email}
                  group={group}
                  masterId={masters[group.email] ?? group.records[0].id}
                  onSelectMaster={(id) => setMasters((m) => ({ ...m, [group.email]: id }))}
                />
              ))}
            </>
          )}
        </div>
      )}

      {tab === "missing" && (
        <div className="card mt-4 overflow-hidden">
          <div className="border-b border-line/70 px-5 py-3.5">
            <h2 className="text-[15px] font-bold">Records with a missing field</h2>
            <p className="mt-0.5 text-[12.5px] text-muted">
              A fix is only offered when the value already exists somewhere in your data — otherwise the record is
              marked &ldquo;No suggestion yet&rdquo;.
            </p>
          </div>
          {data.missingRows.length === 0 ? (
            <p className="px-5 py-8 text-[13px] text-muted">No missing fields — every record is complete.</p>
          ) : (
            <div className="divide-y divide-line/60">
              {data.missingRows.map((row) => (
                <div key={`${row.recordKind}-${row.id}`} className="flex items-center gap-4 px-5 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-[13.5px] font-bold">{row.name}</span>
                      <span className="rounded bg-canvas px-1.5 py-[2px] text-[10.5px] font-bold tracking-wide text-muted uppercase">
                        {row.recordKind}
                      </span>
                    </div>
                    {row.context && <div className="text-[12px] text-muted">{row.context}</div>}
                  </div>
                  <div className="w-[190px] shrink-0 text-[12.5px] text-ink2">
                    Missing: {row.fieldLabels.join(", ")}
                    <span className="text-muted"> · currently —</span>
                  </div>
                  <div className="w-[240px] shrink-0">
                    {row.inApprovals != null ? (
                      <span className="text-[12.5px] text-muted">
                        Suggested: <span className="font-semibold text-ink2">{row.inApprovals}</span>
                      </span>
                    ) : row.suggestion ? (
                      <span className="text-[12.5px] text-muted">
                        Suggested: <span className="font-semibold text-ink2">{row.suggestion.value}</span>
                        <span className="block text-[11.5px]">{row.suggestion.sourceLabel}</span>
                      </span>
                    ) : (
                      <span className="text-[12.5px] text-muted italic">No suggestion yet</span>
                    )}
                  </div>
                  <div className="w-[150px] shrink-0 text-right">
                    {row.inApprovals != null ? (
                      <InApprovalsBadge />
                    ) : row.suggestion ? (
                      <ActionButton
                        label="Propose fix"
                        action={() => proposeMissingFixAction(row.id)}
                      />
                    ) : (
                      <span className="text-[12px] text-faint">—</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "stale" && (
        <div className="card mt-4 overflow-hidden">
          <div className="border-b border-line/70 px-5 py-3.5">
            <h2 className="text-[15px] font-bold">Deals with no recent activity</h2>
            <p className="mt-0.5 text-[12.5px] text-muted">
              Open deals that have gone quiet. Propose a follow-up and the draft waits in Approvals — nothing is
              sent without approval.
            </p>
          </div>
          {data.staleRows.length === 0 ? (
            <p className="px-5 py-8 text-[13px] text-muted">No stale deals — every open deal has recent activity.</p>
          ) : (
            <div className="divide-y divide-line/60">
              {data.staleRows.map((row) => (
                <div key={row.deal.id} className="flex items-center gap-4 px-5 py-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[11px] bg-primary-tint text-primary">
                    <I n="briefcase" size={17} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13.5px] font-bold">{row.deal.name}</div>
                    <div className="text-[12px] text-muted">{row.deal.company ?? "—"}</div>
                  </div>
                  <span className="w-[100px] shrink-0 text-[13.5px] font-bold">{money(row.deal.amount)}</span>
                  <span className="shrink-0 rounded-md bg-primary-tint px-2 py-[3px] text-[12px] font-semibold text-primary">
                    {row.deal.stage}
                  </span>
                  <span className="w-[170px] shrink-0 text-[12.5px] font-semibold text-amber">
                    No activity for {row.daysSilent} days
                  </span>
                  <span className="w-[110px] shrink-0 text-[12.5px] text-muted">{row.deal.ownerName ?? "—"}</span>
                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      onClick={() => setDrawerDeal(row.deal)}
                      className="btn-outline px-3 py-[6px] text-[12px] font-semibold"
                    >
                      View
                    </button>
                    {row.inApprovals ? (
                      <InApprovalsBadge text="Follow-up in Approvals" />
                    ) : (
                      <ActionButton
                        label="Propose follow-up"
                        action={() => proposeStaleFollowupAction(row.deal.externalId)}
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "unlogged" && (
        <div className="card mt-4 overflow-hidden">
          <div className="border-b border-line/70 px-5 py-3.5">
            <h2 className="text-[15px] font-bold">Meetings not logged in CRM</h2>
            <p className="mt-0.5 text-[12.5px] text-muted">
              The AI read these meetings, but no CRM update came out of them. Propose a log entry and it waits in
              Approvals.
            </p>
          </div>
          {data.unloggedRows.length === 0 ? (
            <p className="px-5 py-8 text-[13px] text-muted">Every meeting is logged — nothing waiting here.</p>
          ) : (
            <div className="divide-y divide-line/60">
              {data.unloggedRows.map((row) => (
                <div key={row.id} className="flex items-center gap-4 px-5 py-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[11px] bg-green-tint text-green">
                    <I n="calendar" size={17} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13.5px] font-bold">{row.title}</div>
                    <div className="text-[12px] text-muted">
                      {row.sourceLabel} · {row.dateLabel}
                    </div>
                  </div>
                  <span className="shrink-0 text-[12px] text-faint">{row.relLabel}</span>
                  <div className="w-[170px] shrink-0 text-right">
                    {row.inApprovals ? (
                      <InApprovalsBadge />
                    ) : (
                      <ActionButton label="Propose log entry" action={() => proposeLogEntryAction(row.id)} />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "guardrails" && (
        <div className="card mt-4 overflow-hidden">
          <div className="flex items-center gap-3 border-b border-line/70 px-5 py-4">
            <span className="flex h-10 w-10 items-center justify-center rounded-[11px] bg-violet-tint text-violet">
              <I n="shield" size={18} />
            </span>
            <div className="flex-1">
              <h2 className="text-[15px] font-bold">Data Guardrails</h2>
              <p className="text-[12.5px] text-muted">
                Guardrails stop data problems before they happen. Rules only take effect while the master switch
                is on.
              </p>
            </div>
            <Toggle on={master} onChange={toggleMaster} label="Enable Data Guardrails" />
          </div>
          <div className="divide-y divide-line/60">
            {data.guardrails.rules.map((rule) => {
              const on = effective(rule.key);
              return (
                <div key={rule.key} className="flex items-center gap-4 px-5 py-4">
                  <div className="min-w-0 flex-1">
                    <div className="text-[13.5px] font-bold">{rule.label}</div>
                    <div className="mt-0.5 text-[12.5px] leading-relaxed text-muted">{rule.desc}</div>
                    {rule.key === "detectDuplicates" && !on && (
                      <div className="mt-1 text-[12px] font-medium text-amber">
                        Detection paused — duplicate counts are frozen at the last computed value (
                        {counts.duplicates}).
                      </div>
                    )}
                    {rule.key === "autoEnrich" && !on && (
                      <div className="mt-1 text-[12px] font-medium text-amber">
                        The AI engine will not create enrichment suggestions while this is off.
                      </div>
                    )}
                  </div>
                  <Toggle
                    on={rules[rule.key]}
                    onChange={(v) => toggleRule(rule.key, v)}
                    label={rule.label}
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {drawerDeal && (
        <div className="fixed inset-0 z-30">
          <DealDrawer deal={drawerDeal} onClose={() => setDrawerDeal(null)} />
        </div>
      )}
    </div>
  );
}

function DupGroupCard({
  group,
  masterId,
  onSelectMaster,
}: {
  group: DupGroup;
  masterId: string;
  onSelectMaster: (id: string) => void;
}) {
  const router = useRouter();
  const [busy, start] = useTransition();
  const [note, setNote] = useState("");
  const duplicate = group.records.find((r) => r.id !== masterId) ?? group.records[1];
  return (
    <div className="card mb-4 p-5">
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-violet-tint text-violet">
          <I n="mail" size={16} />
        </span>
        <div className="flex-1">
          <div className="text-[14px] font-bold">{group.email}</div>
          <div className="text-[12px] text-muted">{group.records.length} records share this email</div>
        </div>
        {note && <span className="text-[12px] text-red">{note}</span>}
        {group.pendingMerge ? (
          <InApprovalsBadge text="Waiting in Approvals" />
        ) : (
          <button
            disabled={busy}
            onClick={() =>
              start(async () => {
                const r = await proposeMergeAction(masterId, duplicate.id);
                if (!r.ok) setNote(r.error ?? "Something went wrong");
                router.refresh();
              })
            }
            className="rounded-[10px] bg-violet px-4 py-2 text-[12.5px] font-semibold text-white disabled:opacity-60"
          >
            {busy ? "Working…" : "Propose Merge"}
          </button>
        )}
      </div>
      <div className="mt-4 grid grid-cols-2 gap-4">
        {group.records.map((rec) => {
          const selected = rec.id === masterId;
          return (
            <button
              key={rec.id}
              onClick={() => onSelectMaster(rec.id)}
              className={`rounded-[14px] border p-4 text-left transition-colors ${
                selected ? "border-violet bg-violet-soft ring-1 ring-violet" : "border-line hover:bg-canvas"
              }`}
            >
              <div className="flex items-center gap-2">
                <span
                  className={`flex h-[18px] w-[18px] items-center justify-center rounded-full border-2 ${
                    selected ? "border-violet" : "border-line"
                  }`}
                >
                  {selected && <span className="h-[9px] w-[9px] rounded-full bg-violet" />}
                </span>
                <span className="flex-1 truncate text-[13.5px] font-bold">{rec.name}</span>
                {selected && (
                  <span className="rounded-full bg-violet px-2 py-[2px] text-[10.5px] font-bold text-white">
                    Master
                  </span>
                )}
              </div>
              <dl className="mt-3 flex flex-col gap-1.5 text-[12.5px]">
                {(
                  [
                    ["Email", rec.email],
                    ["Title", rec.title],
                    ["Company", rec.company],
                    ["Industry", rec.industry],
                    ["Added", rec.addedLabel],
                  ] as [string, string | null][]
                ).map(([label, value]) => (
                  <div key={label} className="flex gap-2">
                    <dt className="w-[64px] shrink-0 font-semibold tracking-wide text-faint uppercase text-[10.5px] leading-[19px]">
                      {label}
                    </dt>
                    <dd className="min-w-0 flex-1 truncate text-ink2">{value ?? "—"}</dd>
                  </div>
                ))}
              </dl>
            </button>
          );
        })}
      </div>
    </div>
  );
}
