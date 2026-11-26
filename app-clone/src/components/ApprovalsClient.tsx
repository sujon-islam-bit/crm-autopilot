"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import QueueRow, { RowCheckbox } from "./QueueRow";
import ApprovalPanel from "./ApprovalPanel";
import AddNotePanel from "./AddNotePanel";
import { UndoButton, CheckUpdatesButton } from "./buttons";
import { I } from "./icons";
import { timeAgo } from "../lib/constants";
import { CATEGORY_TABS, type ProposalCategory } from "../lib/category";
import type { ProposalView } from "../lib/view";
import { approveAllAction, approveManyAction, rejectManyAction } from "../lib/actions";

type SortKey = "confidence" | "newest" | "oldest";
type Filters = { minConf: number; source: string; age: "any" | "today" | "week" };

const SOURCE_OPTIONS = ["Any", "Zoom", "Gmail", "WhatsApp", "Call", "Meeting"];
const CONF_OPTIONS: { value: number; label: string }[] = [
  { value: 0, label: "Any" },
  { value: 70, label: "70%+" },
  { value: 85, label: "85%+" },
  { value: 90, label: "90%+" },
];

export default function ApprovalsClient({
  pending,
  decided,
  decidedTotal,
  connected,
}: {
  pending: ProposalView[];
  decided: ProposalView[];
  decidedTotal: number;
  connected: boolean;
}) {
  const router = useRouter();
  const [busy, start] = useTransition();
  const [tab, setTab] = useState<ProposalCategory | "all">("all");
  const [sort, setSort] = useState<SortKey>("confidence");
  const [filters, setFilters] = useState<Filters>({ minConf: 0, source: "Any", age: "any" });
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [selId, setSelId] = useState<string | null>(null);
  const [panelClosed, setPanelClosed] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [confirmAll, setConfirmAll] = useState(false);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: pending.length };
    for (const t of CATEGORY_TABS) if (t.key !== "all") c[t.key] = 0;
    for (const p of pending) c[p.category] = (c[p.category] ?? 0) + 1;
    return c;
  }, [pending]);

  const filtersActive = filters.minConf > 0 || filters.source !== "Any" || filters.age !== "any";

  const rows = useMemo(() => {
    let out = pending.filter((p) => tab === "all" || p.category === tab);
    if (filters.minConf > 0) out = out.filter((p) => (p.confidence ?? 0) >= filters.minConf);
    if (filters.source !== "Any") out = out.filter((p) => p.sourceTag === filters.source);
    if (filters.age !== "any") {
      const now = new Date();
      const start = new Date(now);
      start.setHours(0, 0, 0, 0);
      if (filters.age === "week") start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
      out = out.filter((p) => new Date(p.createdAt) >= start);
    }
    const sorted = [...out];
    if (sort === "confidence") {
      sorted.sort((a, b) => {
        if (a.confidence == null && b.confidence == null)
          return b.createdAt.localeCompare(a.createdAt);
        if (a.confidence == null) return 1;
        if (b.confidence == null) return -1;
        if (b.confidence !== a.confidence) return b.confidence - a.confidence;
        return b.createdAt.localeCompare(a.createdAt);
      });
    } else if (sort === "newest") {
      sorted.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    } else {
      sorted.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    }
    return sorted;
  }, [pending, tab, filters, sort]);

  const selectedView =
    pending.find((p) => p.id === selId) ?? (panelClosed ? null : (rows[0] ?? null));

  const selectRow = (v: ProposalView) => {
    setSelId(v.id);
    setPanelClosed(false);
  };
  const toggleCheck = (id: string) =>
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const allListedChecked = rows.length > 0 && rows.every((r) => checked.has(r.id));
  const toggleSelectAll = () =>
    setChecked((prev) => {
      const next = new Set(prev);
      if (allListedChecked) rows.forEach((r) => next.delete(r.id));
      else rows.forEach((r) => next.add(r.id));
      return next;
    });

  const bulkApprove = () =>
    start(async () => {
      await approveManyAction([...checked]);
      setChecked(new Set());
      router.refresh();
    });
  const bulkReject = () =>
    start(async () => {
      await rejectManyAction([...checked]);
      setChecked(new Set());
      router.refresh();
    });
  const approveAll = () => {
    if (!confirmAll) {
      setConfirmAll(true);
      setTimeout(() => setConfirmAll(false), 3500);
      return;
    }
    start(async () => {
      await approveAllAction();
      setConfirmAll(false);
      setChecked(new Set());
      router.refresh();
    });
  };

  return (
    <div className="px-7 pt-5 pb-7">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[30px] font-extrabold tracking-tight">Approvals</h1>
          <p className="mt-1 text-[13.5px] text-muted">
            Review AI-suggested updates before they sync to your CRM.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2.5 pt-1.5">
          <button
            onClick={() => setNotesOpen((o) => !o)}
            aria-expanded={notesOpen}
            className="btn-outline flex items-center gap-1.5 px-3.5 py-2 text-[13px] font-semibold"
          >
            <I n="plus" size={14} sw={2.2} /> Add notes
          </button>
          <CheckUpdatesButton variant="outline" />
          <span className="relative">
            <button
              onClick={() => setFiltersOpen((o) => !o)}
              aria-expanded={filtersOpen}
              className="btn-outline flex items-center gap-2 px-4 py-2 text-[13px] font-semibold"
            >
              <I n="filter" size={14} />
              Filters
              {filtersActive && <span className="h-2 w-2 rounded-full bg-violet" />}
            </button>
            {filtersOpen && (
              <>
                <span className="fixed inset-0 z-30 cursor-default" onClick={() => setFiltersOpen(false)} />
                <span className="absolute top-full right-0 z-40 mt-2 block w-64 rounded-2xl border border-line bg-white p-4 text-left shadow-[0_16px_40px_-12px_rgba(23,23,40,0.3)]">
                  <label className="block text-[12px] font-semibold text-ink2">Confidence at least</label>
                  <select
                    value={filters.minConf}
                    onChange={(e) => setFilters((f) => ({ ...f, minConf: Number(e.target.value) }))}
                    className="mt-1.5 w-full rounded-lg border border-line bg-white px-2.5 py-2 text-[13px]"
                  >
                    {CONF_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                  <label className="mt-3.5 block text-[12px] font-semibold text-ink2">Source</label>
                  <select
                    value={filters.source}
                    onChange={(e) => setFilters((f) => ({ ...f, source: e.target.value }))}
                    className="mt-1.5 w-full rounded-lg border border-line bg-white px-2.5 py-2 text-[13px]"
                  >
                    {SOURCE_OPTIONS.map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </select>
                  <label className="mt-3.5 block text-[12px] font-semibold text-ink2">Age</label>
                  <select
                    value={filters.age}
                    onChange={(e) => setFilters((f) => ({ ...f, age: e.target.value as Filters["age"] }))}
                    className="mt-1.5 w-full rounded-lg border border-line bg-white px-2.5 py-2 text-[13px]"
                  >
                    <option value="any">Any</option>
                    <option value="today">Today</option>
                    <option value="week">This week</option>
                  </select>
                  <button
                    onClick={() => setFilters({ minConf: 0, source: "Any", age: "any" })}
                    className="mt-4 text-[12.5px] font-semibold text-violet hover:underline"
                  >
                    Clear filters
                  </button>
                </span>
              </>
            )}
          </span>
          <span className="relative">
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              aria-label="Sort suggestions"
              className="appearance-none rounded-[10px] border border-line bg-white py-2 pr-9 pl-3.5 text-[13px] font-semibold text-ink2 shadow-none transition-colors hover:border-[#cfd2e0]"
            >
              <option value="confidence">Sort by: Confidence</option>
              <option value="newest">Sort by: Newest</option>
              <option value="oldest">Sort by: Oldest</option>
            </select>
            <I n="chevD" size={13} className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-muted" />
          </span>
          <button
            onClick={approveAll}
            disabled={busy || pending.length === 0}
            className="btn-violet flex items-center gap-1.5 px-4 py-2 text-[13.5px] disabled:opacity-60"
          >
            <I n="check" size={15} sw={2.4} />
            {confirmAll ? `Confirm — approve all ${pending.length}?` : `Approve All (${pending.length})`}
          </button>
        </div>
      </div>

      {notesOpen && <AddNotePanel />}

      {/* Tabs */}
      <div className="mt-5 inline-flex max-w-full flex-wrap gap-1 rounded-full border border-line bg-white p-1">
        {CATEGORY_TABS.map((t) => {
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[13px] font-semibold whitespace-nowrap transition-colors ${
                active ? "bg-violet-tint text-violet" : "text-ink2 hover:bg-canvas"
              }`}
            >
              {t.label}
              <span
                className={`inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[11px] font-bold ${
                  active ? "bg-violet text-white" : "bg-canvas text-muted"
                }`}
              >
                {counts[t.key] ?? 0}
              </span>
            </button>
          );
        })}
      </div>

      {/* List + detail panel */}
      <div className="mt-4 flex items-start gap-5">
        <div className="card min-w-0 flex-1 overflow-hidden">
          <div className="divide-y divide-line/70">
            {pending.length === 0 ? (
              <p className="px-5 py-6 text-[13.5px] leading-relaxed text-muted">
                {connected
                  ? "Queue is clear — the AI has nothing waiting."
                  : "No proposals yet — connect your CRM and the AI will prepare updates for you."}
              </p>
            ) : rows.length === 0 ? (
              <p className="px-5 py-6 text-[13.5px] leading-relaxed text-muted">
                No suggestions match these filters.{" "}
                <button
                  onClick={() => {
                    setFilters({ minConf: 0, source: "Any", age: "any" });
                    setTab("all");
                  }}
                  className="font-semibold text-violet hover:underline"
                >
                  Clear filters
                </button>
              </p>
            ) : (
              rows.map((v) => (
                <QueueRow
                  key={v.id}
                  view={v}
                  selected={selectedView?.id === v.id}
                  checked={checked.has(v.id)}
                  onSelect={selectRow}
                  onToggleCheck={toggleCheck}
                />
              ))
            )}
          </div>
          {pending.length > 0 && (
            <div className="flex items-center gap-3 border-t border-line px-4 py-3">
              <span className="h-2 w-2 shrink-0 rounded-full bg-green-bright" />
              <span className="flex-1 text-[13px] font-medium text-ink2">
                {rows.length} suggestion{rows.length === 1 ? "" : "s"} ready for your review
              </span>
              {checked.size > 0 && (
                <>
                  <button
                    onClick={bulkApprove}
                    disabled={busy}
                    className="btn-violet px-3.5 py-1.5 text-[12.5px] disabled:opacity-60"
                  >
                    Approve selected ({checked.size})
                  </button>
                  <button
                    onClick={bulkReject}
                    disabled={busy}
                    className="rounded-[10px] bg-[#fdecec] px-3.5 py-1.5 text-[12.5px] font-semibold text-red transition-colors hover:bg-[#fbdbdb] disabled:opacity-60"
                  >
                    Reject selected ({checked.size})
                  </button>
                </>
              )}
              <span className="flex shrink-0 items-center gap-2">
                <span className="text-[13px] font-medium text-ink2">Select all</span>
                <RowCheckbox checked={allListedChecked} onToggle={toggleSelectAll} label="Select all suggestions" />
              </span>
            </div>
          )}
        </div>

        {selectedView && (
          <ApprovalPanel
            view={selectedView}
            onClose={() => {
              setSelId(null);
              setPanelClosed(true);
            }}
          />
        )}
      </div>

      {/* History */}
      <div className="mt-7 mb-3 flex items-baseline gap-3">
        <h2 className="text-[15px] font-bold">Decided</h2>
        {decidedTotal > decided.length && (
          <span className="text-[12.5px] text-muted">
            Latest {decided.length} of {decidedTotal}
          </span>
        )}
      </div>
      {decidedTotal === 0 ? (
        <p className="text-[13.5px] text-muted">Nothing decided yet</p>
      ) : (
        <div className="card divide-y divide-line/70 overflow-hidden">
          {decided.map((v) => (
            <div key={v.id} className="flex items-center gap-3.5 px-5 py-3">
              <span
                className={`inline-flex shrink-0 rounded-full px-2.5 py-[3px] text-[11px] font-bold capitalize ${
                  v.status === "applied"
                    ? "bg-green-tint text-green"
                    : v.status === "rejected"
                      ? "bg-[#fdecec] text-red"
                      : v.status === "undone"
                        ? "bg-amber-tint text-amber"
                        : "bg-canvas text-muted"
                }`}
              >
                {v.status}
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-[13.5px] leading-snug font-medium">{v.title}</div>
                <div className="mt-0.5 text-[11.5px] leading-snug text-muted">{v.sourceLine ?? v.reason}</div>
              </div>
              <span className="shrink-0 text-[12px] whitespace-nowrap text-muted">
                {timeAgo(v.decidedAt ?? v.createdAt)}
              </span>
              {v.status === "applied" && <UndoButton id={v.id} />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
