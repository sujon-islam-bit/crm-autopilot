"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { I } from "./icons";
import { rollbackBatchAction } from "@/lib/actions";
import type { HistoryData, BatchView } from "@/lib/history";

type Tab = "sync" | "apps" | "batches" | "rollback" | "api";
type PanelTab = "changes" | "details" | "rollback";

const CARD = "rounded-2xl border border-[#e9e7f5] bg-white shadow-[0_1px_2px_rgba(30,27,75,0.04)]";
const TH = "text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-[#9aa0b5]";

function Spark({ data, color, w = 92, h = 34 }: { data: number[]; color: string; w?: number; h?: number }) {
  if (data.length < 2) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - 3 - ((v - min) / range) * (h - 8)}`).join(" ");
  const last = pts.split(" ").pop()!.split(",");
  return (
    <svg width={w} height={h} className="shrink-0">
      <polyline points={pts} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={last[0]} cy={last[1]} r={3} fill={color} />
    </svg>
  );
}

function Donut({ segments, size = 118 }: { segments: { count: number; color: string }[]; size?: number }) {
  const total = segments.reduce((s, x) => s + x.count, 0);
  const r = size / 2 - 9;
  const c = 2 * Math.PI * r;
  const cx = size / 2;
  let acc = 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
      <circle cx={cx} cy={cx} r={r} fill="none" stroke="#efeaf9" strokeWidth={13} />
      {total > 0 &&
        segments.map((s, i) => {
          const frac = s.count / total;
          const off = acc;
          acc += frac;
          return (
            <circle
              key={i}
              cx={cx}
              cy={cx}
              r={r}
              fill="none"
              stroke={s.color}
              strokeWidth={13}
              strokeDasharray={`${Math.max(frac * c - 2.5, 0.5)} ${c}`}
              strokeDashoffset={-off * c}
              transform={`rotate(-90 ${cx} ${cx})`}
            />
          );
        })}
    </svg>
  );
}

function StatusPill({ status }: { status: BatchView["status"] }) {
  const cls =
    status === "Success"
      ? "bg-[#e5f7ec] text-[#1d9e57]"
      : status === "Partial"
        ? "bg-[#fdf3e0] text-[#c47f12]"
        : status === "Rolled back"
          ? "bg-[#eef0f6] text-[#6f7490]"
          : "bg-[#fdecec] text-[#d64545]";
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-[3px] text-[11px] font-bold ${cls}`}>
      <span className="h-[5px] w-[5px] rounded-full bg-current" />
      {status}
    </span>
  );
}

function SourceGlyph({ source, size = 30 }: { source: string; size?: number }) {
  const letter = source.charAt(0).toUpperCase();
  const tint =
    source === "HubSpot"
      ? "bg-[#ffe9e2] text-[#e4572e]"
      : source === "Salesforce"
        ? "bg-[#e3f0fd] text-[#1b6ac9]"
        : "bg-[#efeafd] text-[#6c3ce9]";
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-lg font-extrabold ${tint}`}
      style={{ width: size, height: size, fontSize: size * 0.45 }}
    >
      {letter}
    </span>
  );
}

function ChangesCell({ b }: { b: BatchView }) {
  return (
    <span className="whitespace-nowrap text-[13px] font-semibold">
      <span className="text-[#1d9e57]">+{b.applied}</span>
      <span className="text-[#9aa0b5]"> / </span>
      <span className="text-[#d64545]">−{b.undone}</span>
    </span>
  );
}

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: "sync", label: "Sync History", icon: "sync" },
  { id: "apps", label: "Connected Apps", icon: "plug" },
  { id: "batches", label: "Batch History", icon: "box" },
  { id: "rollback", label: "Rollback", icon: "undo" },
  { id: "api", label: "API Usage", icon: "bars" },
];

/* ---------------- detail panel ---------------- */

function DetailPanel({
  batch,
  onRollback,
}: {
  batch: BatchView;
  onRollback: (b: BatchView) => void;
}) {
  const [tab, setTab] = useState<PanelTab>("changes");
  const total = batch.breakdown.reduce((s, x) => s + x.count, 0);
  const stillApplied = batch.proposals.filter((p) => p.status === "applied").length;

  return (
    <aside className={`${CARD} flex min-h-0 flex-col overflow-hidden`}>
      <div className="border-b border-[#f0eef9] px-5 pb-4 pt-5">
        <div className="flex items-start gap-3">
          <span className="mt-[1px] text-[#22b573]">
            <I n={batch.status === "Rolled back" ? "undo" : batch.status === "Failed" ? "alert" : "checkCircle"} size={26} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="truncate text-[15px] font-extrabold tracking-[-0.01em] text-[#17142b]">Sync #{batch.batchId}</h3>
              <StatusPill status={batch.status} />
            </div>
            <p className="mt-1 text-[12px] text-[#8a8fa3]">Applied · {batch.atLabel}</p>
          </div>
        </div>
        <div className="mt-4 flex gap-5 border-b border-transparent text-[13px] font-semibold">
          {(["changes", "details", "rollback"] as PanelTab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`relative pb-2 capitalize transition ${
                tab === t ? "text-[#6c3ce9]" : "text-[#6f7490] hover:text-[#17142b]"
              }`}
            >
              {t}
              {tab === t && <span className="absolute inset-x-0 -bottom-[1px] h-[2px] rounded-full bg-[#6c3ce9]" />}
            </button>
          ))}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
        {tab === "changes" && (
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.09em] text-[#9aa0b5]">Changes Summary</p>
            <div className="mt-3 grid grid-cols-3 gap-2.5">
              {[
                { label: "Contacts", value: batch.contacts, icon: "users", tint: "bg-[#efeafd] text-[#6c3ce9]" },
                { label: "Deals", value: batch.deals, icon: "briefcase", tint: "bg-[#e8f0fe] text-[#2b6bf0]" },
                { label: "Fields Updated", value: batch.fieldsUpdated, icon: "pencil", tint: "bg-[#e5f7ec] text-[#1d9e57]" },
              ].map((t) => (
                <div key={t.label} className="rounded-xl bg-[#faf9fe] px-3 py-3">
                  <span className={`inline-flex h-7 w-7 items-center justify-center rounded-lg ${t.tint}`}>
                    <I n={t.icon} size={14} />
                  </span>
                  <div className="mt-2 text-[17px] font-extrabold leading-none text-[#17142b]">{t.value}</div>
                  <div className="mt-1 text-[10.5px] font-medium leading-tight text-[#8a8fa3]">{t.label}</div>
                </div>
              ))}
            </div>

            <p className="mt-5 text-[11px] font-bold uppercase tracking-[0.09em] text-[#9aa0b5]">Change Breakdown</p>
            {total > 0 ? (
              <div className="mt-3 flex items-center gap-4">
                <Donut segments={batch.breakdown} />
                <div className="min-w-0 flex-1 space-y-2">
                  {batch.breakdown.map((s) => (
                    <div key={s.label} className="flex items-center gap-2 text-[12px]">
                      <span className="h-[8px] w-[8px] shrink-0 rounded-full" style={{ background: s.color }} />
                      <span className="min-w-0 flex-1 truncate font-medium text-[#3c3a55]">{s.label}</span>
                      <span className="font-bold text-[#17142b]">{Math.round((s.count / total) * 100)}%</span>
                      <span className="w-5 text-right text-[#9aa0b5]">{s.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="mt-2 text-[12.5px] text-[#8a8fa3]">No changes in this batch.</p>
            )}

            <div className="mt-5 flex gap-2 rounded-xl bg-[#f4fbf7] px-3.5 py-3 text-[12px] leading-relaxed text-[#2c6e4c]">
              <span className="mt-[1px] shrink-0 text-[#22b573]">
                <I n="check" size={13} />
              </span>
              Every change in this batch was approved by a person before it synced — nothing is auto-applied.
            </div>
          </div>
        )}

        {tab === "details" && (
          <div>
            <dl className="space-y-2.5 text-[12.5px]">
              {[
                ["Batch ID", batch.batchId],
                ["Source", batch.source],
                ["Approved by", batch.approvedBy || "—"],
                ["Applied at", batch.atLabel],
                ["Status", batch.status],
                ["Revertable until", batch.status === "Rolled back" ? "—" : (batch.revertableUntil ?? "—")],
              ].map(([k, v]) => (
                <div key={k} className="flex items-baseline justify-between gap-3">
                  <dt className="shrink-0 text-[#8a8fa3]">{k}</dt>
                  <dd className="text-right font-semibold text-[#17142b]">{v}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-5 text-[11px] font-bold uppercase tracking-[0.09em] text-[#9aa0b5]">Changes in this batch</p>
            <div className="mt-2.5 space-y-2">
              {batch.proposals.map((p) => (
                <div key={p.id} className="flex items-start gap-2.5 rounded-xl bg-[#faf9fe] px-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="text-[12.5px] font-semibold leading-snug text-[#17142b]">{p.title}</p>
                    <p className="mt-0.5 text-[11.5px] leading-snug text-[#8a8fa3]">{p.restoreLine}</p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2 py-[2px] text-[10.5px] font-bold ${
                      p.status === "applied"
                        ? "bg-[#e5f7ec] text-[#1d9e57]"
                        : p.status === "failed"
                          ? "bg-[#fdecec] text-[#d64545]"
                          : "bg-[#fdf3e0] text-[#c47f12]"
                    }`}
                  >
                    {p.status === "applied" ? "Applied" : p.status === "failed" ? "Failed" : "Undone"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "rollback" && (
          <div>
            {batch.status === "Rolled back" ? (
              <div className="rounded-xl bg-[#f4f5fa] px-4 py-3.5 text-[12.5px] leading-relaxed text-[#3c3a55]">
                This sync was rolled back. Its {batch.applied} change{batch.applied === 1 ? " is" : "s are"} back in the
                Approvals queue as pending proposals.
              </div>
            ) : !batch.revertable ? (
              <div className="rounded-xl bg-[#f4f5fa] px-4 py-3.5 text-[12.5px] leading-relaxed text-[#3c3a55]">
                {stillApplied === 0
                  ? "Nothing left to roll back — every change in this batch has already been undone."
                  : "The 7-day rollback window for this sync has closed, so these changes can no longer be reverted from here."}
              </div>
            ) : (
              <div>
                <div className="flex gap-2.5 rounded-xl bg-[#f4fbf7] px-4 py-3.5 text-[12.5px] leading-relaxed text-[#2c6e4c]">
                  <span className="mt-[1px] shrink-0 text-[#22b573]">
                    <I n="shield" size={15} />
                  </span>
                  <span>
                    <span className="font-bold">Rollback is available for this sync.</span> You can revert these changes
                    within 7 days — until {batch.revertableUntil}.
                  </span>
                </div>
                {batch.warnings.map((w) => (
                  <div key={w} className="mt-2.5 flex gap-2.5 rounded-xl bg-[#fdf6e7] px-4 py-3 text-[12.5px] leading-relaxed text-[#8a5d0d]">
                    <span className="mt-[1px] shrink-0 text-[#e8a13a]">
                      <I n="alert" size={14} />
                    </span>
                    {w}
                  </div>
                ))}
                <button
                  onClick={() => onRollback(batch)}
                  className="mt-4 w-full rounded-xl border border-[#f0c6c6] bg-[#fdf1f1] py-2.5 text-[13px] font-bold text-[#d64545] transition hover:bg-[#fbe4e4]"
                >
                  Rollback Sync
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}

/* ---------------- rollback flow (3 steps) ---------------- */

function RollbackModal({
  batch,
  onClose,
  onDone,
}: {
  batch: BatchView;
  onClose: () => void;
  onDone: () => void;
}) {
  const [step, setStep] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [reverted, setReverted] = useState(0);
  const toRevert = batch.proposals.filter((p) => p.status === "applied");

  const confirm = () => {
    setBusy(true);
    setError("");
    rollbackBatchAction(batch.batchId)
      .then((r) => {
        setBusy(false);
        if (r.ok) {
          setReverted(r.reverted ?? toRevert.length);
          setStep(3);
        } else {
          setError(r.error ?? "Rollback failed");
        }
      })
      .catch(() => {
        setBusy(false);
        setError("Rollback failed — please try again");
      });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#17142b]/45 p-4" onClick={onClose}>
      <div
        className="max-h-[86vh] w-[560px] overflow-y-auto rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b border-[#f0eef9] px-6 py-4">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#fdf1f1] text-[#d64545]">
            <I n="undo" size={17} />
          </span>
          <div className="flex-1">
            <h3 className="text-[15px] font-extrabold text-[#17142b]">Roll back sync #{batch.batchId}</h3>
            <p className="text-[12px] text-[#8a8fa3]">
              Step {step} of 3 — {step === 1 ? "Preview" : step === 2 ? "Confirm" : "Verify"}
            </p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-[#8a8fa3] transition hover:bg-[#f4f2fb] hover:text-[#17142b]">
            <I n="x" size={16} />
          </button>
        </div>

        {step === 1 && (
          <div className="px-6 py-5">
            <p className="text-[13px] leading-relaxed text-[#3c3a55]">
              These {toRevert.length} change{toRevert.length === 1 ? "" : "s"} will be reverted, newest first. The
              proposals return to Approvals as pending, so nothing is lost — you can approve them again.
            </p>
            <div className="mt-4 space-y-2">
              {toRevert.map((p) => (
                <div key={p.id} className="rounded-xl bg-[#faf9fe] px-3.5 py-2.5">
                  <p className="text-[13px] font-semibold leading-snug text-[#17142b]">{p.title}</p>
                  <p className="mt-0.5 text-[12px] leading-snug text-[#8a8fa3]">{p.restoreLine}</p>
                </div>
              ))}
              {toRevert.length === 0 && (
                <p className="text-[13px] text-[#8a8fa3]">Nothing in this batch is still applied.</p>
              )}
            </div>
            {batch.warnings.map((w) => (
              <div key={w} className="mt-3 flex gap-2.5 rounded-xl bg-[#fdf6e7] px-4 py-3 text-[12.5px] leading-relaxed text-[#8a5d0d]">
                <span className="mt-[1px] shrink-0 text-[#e8a13a]">
                  <I n="alert" size={14} />
                </span>
                {w}
              </div>
            ))}
            {batch.notes.map((n) => (
              <p key={n} className="mt-3 flex gap-2 text-[12.5px] leading-relaxed text-[#6f7490]">
                <span className="mt-[1px] shrink-0">
                  <I n="info" size={13} />
                </span>
                {n}
              </p>
            ))}
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={onClose} className="rounded-xl border border-[#e6e3f2] px-4 py-2 text-[13px] font-semibold text-[#3c3a55] transition hover:bg-[#faf9fe]">
                Cancel
              </button>
              <button
                onClick={() => setStep(2)}
                disabled={toRevert.length === 0}
                className="rounded-xl bg-[#6c3ce9] px-4 py-2 text-[13px] font-bold text-white transition hover:bg-[#5b31c9] disabled:opacity-40"
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="px-6 py-5">
            <p className="text-[13.5px] leading-relaxed text-[#3c3a55]">
              Roll back <span className="font-bold text-[#17142b]">{toRevert.length} change{toRevert.length === 1 ? "" : "s"}</span> from{" "}
              <span className="font-bold text-[#17142b]">{batch.atLabel}</span>? The CRM returns to exactly what it was
              before this sync, and each change goes back to the Approvals queue.
            </p>
            {error && <p className="mt-3 rounded-xl bg-[#fdecec] px-4 py-3 text-[12.5px] font-medium text-[#b33535]">{error}</p>}
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setStep(1)} disabled={busy} className="rounded-xl border border-[#e6e3f2] px-4 py-2 text-[13px] font-semibold text-[#3c3a55] transition hover:bg-[#faf9fe] disabled:opacity-40">
                Back
              </button>
              <button
                onClick={confirm}
                disabled={busy}
                className="rounded-xl bg-[#d64545] px-4 py-2 text-[13px] font-bold text-white transition hover:bg-[#bc3535] disabled:opacity-50"
              >
                {busy ? "Rolling back…" : `Roll back ${toRevert.length} change${toRevert.length === 1 ? "" : "s"}`}
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="px-6 py-6 text-center">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#e5f7ec] text-[#1d9e57]">
              <I n="check" size={22} />
            </span>
            <h4 className="mt-3 text-[15px] font-extrabold text-[#17142b]">
              {reverted} change{reverted === 1 ? "" : "s"} rolled back
            </h4>
            <p className="mx-auto mt-1.5 max-w-[420px] text-[13px] leading-relaxed text-[#6f7490]">
              The CRM is restored to its state before this sync. The {reverted} proposal{reverted === 1 ? " is" : "s are"}{" "}
              back in Approvals as pending, and the rollback is recorded in this batch&apos;s history.
            </p>
            <button
              onClick={onDone}
              className="mt-5 rounded-xl bg-[#6c3ce9] px-5 py-2 text-[13px] font-bold text-white transition hover:bg-[#5b31c9]"
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------------- main ---------------- */

export default function HistoryClient({ data, period }: { data: HistoryData; period: number }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [tab, setTab] = useState<Tab>("sync");
  const [selectedId, setSelectedId] = useState<string | null>(data.batches[0]?.batchId ?? null);
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [stripFilter, setStripFilter] = useState<"all" | "revertable">("all");
  const [rollbackFor, setRollbackFor] = useState<BatchView | null>(null);

  const selected = data.batches.find((b) => b.batchId === selectedId) ?? data.batches[0] ?? null;
  const periodBatches = useMemo(() => {
    const cutoff = Date.now() - period * 86400000;
    return data.batches.filter((b) => new Date(b.at).getTime() >= cutoff);
  }, [data.batches, period]);
  const stripBatches = (stripFilter === "revertable" ? data.batches.filter((b) => b.revertable) : data.batches).slice(0, 3);
  const showPanel = (tab === "sync" || tab === "batches") && selected !== null;

  const openRollback = (b: BatchView) => {
    setMenuFor(null);
    setRollbackFor(b);
  };

  const batchRow = (b: BatchView, withMenu = true) => (
    <tr
      key={b.batchId}
      onClick={() => setSelectedId(b.batchId)}
      className={`cursor-pointer border-t border-[#f4f2fb] transition hover:bg-[#faf9fe] ${
        selected?.batchId === b.batchId && showPanel ? "bg-[#faf8ff]" : ""
      }`}
    >
      <td className="whitespace-nowrap px-5 py-3.5 text-[13px] font-medium text-[#3c3a55]">{b.atLabel}</td>
      <td className="px-3 py-3.5">
        <span className="flex items-center gap-2.5">
          <SourceGlyph source={b.source} />
          <span className="text-[13px] font-semibold text-[#17142b]">{b.source}</span>
        </span>
      </td>
      <td className="px-3 py-3.5">
        <ChangesCell b={b} />
      </td>
      <td className="px-3 py-3.5">
        <StatusPill status={b.status} />
      </td>
      <td className="max-w-[260px] truncate px-3 py-3.5 text-[12.5px] text-[#6f7490]">{b.details || "—"}</td>
      <td className="px-5 py-3.5">
        <span className="flex items-center justify-end gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setSelectedId(b.batchId);
              if (tab !== "sync" && tab !== "batches") setTab("batches");
            }}
            className="rounded-lg border border-[#e6e3f2] px-3 py-1.5 text-[12px] font-semibold text-[#3c3a55] transition hover:border-[#6c3ce9] hover:text-[#6c3ce9]"
          >
            View
          </button>
          {withMenu && (
            <span className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuFor(menuFor === b.batchId ? null : b.batchId);
                }}
                className="rounded-lg p-1.5 text-[#8a8fa3] transition hover:bg-[#f4f2fb] hover:text-[#17142b]"
                aria-label="More actions"
              >
                <I n="dots" size={15} />
              </button>
              {menuFor === b.batchId && (
                <>
                  <span className="fixed inset-0 z-10" onClick={() => setMenuFor(null)} />
                  <span className="absolute right-0 top-full z-20 mt-1 block w-[168px] rounded-xl border border-[#e9e7f5] bg-white py-1.5 shadow-[0_12px_32px_rgba(30,27,75,0.14)]">
                    <button
                      onClick={() => {
                        setSelectedId(b.batchId);
                        setMenuFor(null);
                      }}
                      className="block w-full px-3.5 py-2 text-left text-[12.5px] font-medium text-[#3c3a55] hover:bg-[#faf9fe]"
                    >
                      View details
                    </button>
                    <button
                      onClick={() => b.revertable && openRollback(b)}
                      disabled={!b.revertable}
                      className="block w-full px-3.5 py-2 text-left text-[12.5px] font-medium text-[#d64545] hover:bg-[#fdf6f6] disabled:cursor-not-allowed disabled:text-[#b9bdcf]"
                    >
                      Rollback
                    </button>
                  </span>
                </>
              )}
            </span>
          )}
        </span>
      </td>
    </tr>
  );

  return (
    <div>
      {/* header */}
      <div className="flex items-center gap-3.5">
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#efeafd] text-[#6c3ce9]">
          <I n="sync" size={20} />
        </span>
        <div>
          <h2 className="text-[24px] font-extrabold leading-tight tracking-[-0.02em] text-[#17142b]">History</h2>
          <p className="text-[13px] text-[#6f7490]">See every change, and roll anything back if needed.</p>
        </div>
      </div>

      {/* overview cards */}
      <div className="mt-5 grid grid-cols-4 gap-4">
        <div className={`${CARD} flex items-center gap-3.5 px-5 py-4`}>
          <span
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${
              data.status === "Healthy"
                ? "bg-[#e5f7ec] text-[#1d9e57]"
                : data.status === "Needs attention"
                  ? "bg-[#fdf3e0] text-[#c47f12]"
                  : "bg-[#eef0f6] text-[#8a8fa3]"
            }`}
          >
            <I n={data.status === "Healthy" ? "check" : "alert"} size={19} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[11.5px] font-medium text-[#8a8fa3]">Sync Status</p>
            <p
              className={`text-[19px] font-extrabold leading-tight ${
                data.status === "Healthy" ? "text-[#1d9e57]" : data.status === "Needs attention" ? "text-[#c47f12]" : "text-[#6f7490]"
              }`}
            >
              {data.status}
            </p>
            <p className="text-[11.5px] leading-snug text-[#8a8fa3]">
              {data.lastChangeAgo ? `Last change: ${data.lastChangeAgo}` : "No changes yet"}
            </p>
          </div>
          <Spark data={data.statusSpark} color="#22b573" />
        </div>

        <div className={`${CARD} flex items-center gap-3.5 px-5 py-4`}>
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#efeafd] text-[#6c3ce9]">
            <I n="database" size={19} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[11.5px] font-medium text-[#8a8fa3]">Total Synced Records</p>
            <p className="text-[19px] font-extrabold leading-tight text-[#17142b]">{data.totalSynced.toLocaleString("en-US")}</p>
            <p className="text-[11.5px] text-[#8a8fa3]">
              {data.syncedDeltaPct === null ? (
                "—"
              ) : (
                <>
                  <span className={data.syncedDeltaPct >= 0 ? "font-bold text-[#1d9e57]" : "font-bold text-[#d64545]"}>
                    {data.syncedDeltaPct >= 0 ? "↑" : "↓"} {Math.abs(data.syncedDeltaPct)}%
                  </span>{" "}
                  vs previous 30d
                </>
              )}
            </p>
          </div>
          <Spark data={data.syncedSpark} color="#6c3ce9" />
        </div>

        <div className={`${CARD} flex items-center gap-3.5 px-5 py-4`}>
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#e8f0fe] text-[#2b6bf0]">
            <I n="clock" size={19} />
          </span>
          <div className="min-w-0">
            <p className="text-[11.5px] font-medium text-[#8a8fa3]">Last Sync</p>
            <p className="text-[19px] font-extrabold leading-tight text-[#17142b]">{data.lastBatch ? data.lastBatch.atAgo : "—"}</p>
            <p className="text-[11.5px] text-[#8a8fa3]">{data.lastBatch ? data.lastBatch.atLabel : "No syncs yet"}</p>
          </div>
        </div>

        <div className={`${CARD} flex items-center gap-3.5 px-5 py-4`}>
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#fdf3e0] text-[#e8a13a]">
            <I n="alert" size={19} />
          </span>
          <div className="min-w-0">
            <p className="text-[11.5px] font-medium text-[#8a8fa3]">Pending Actions</p>
            <p className="text-[19px] font-extrabold leading-tight text-[#17142b]">{data.pendingActions}</p>
            {data.pendingActions > 0 ? (
              <Link href="/approvals" className="text-[11.5px] font-bold text-[#6c3ce9] hover:underline">
                Requires Review →
              </Link>
            ) : (
              <p className="text-[11.5px] text-[#8a8fa3]">Nothing waiting</p>
            )}
          </div>
        </div>
      </div>

      {/* tabs */}
      <div className="mt-5 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 rounded-full px-4 py-2 text-[13px] font-semibold transition ${
              tab === t.id
                ? "bg-[#6c3ce9] text-white shadow-[0_4px_14px_rgba(108,60,233,0.35)]"
                : "border border-[#e6e3f2] bg-white text-[#3c3a55] hover:border-[#c9bdf5] hover:text-[#6c3ce9]"
            }`}
          >
            <I n={t.icon} size={14} />
            {t.label}
          </button>
        ))}
      </div>

      {/* tab bodies */}
      <div className={`mt-4 grid items-start gap-4 ${showPanel ? "grid-cols-[minmax(0,1fr)_380px]" : "grid-cols-1"}`}>
        <div className="min-w-0">
          {tab === "sync" && (
            <div className="space-y-4">
              <div className={`${CARD} overflow-hidden`}>
                <div className="flex items-center justify-between px-5 pb-1 pt-4">
                  <h3 className="text-[15px] font-extrabold text-[#17142b]">Sync Activity</h3>
                  <label className="relative flex items-center">
                    <select
                      value={period}
                      onChange={(e) => router.push(`/activity?period=${e.target.value}`)}
                      className="appearance-none rounded-lg border border-[#e6e3f2] bg-white py-1.5 pl-3 pr-8 text-[12.5px] font-semibold text-[#3c3a55] outline-none transition hover:border-[#c9bdf5]"
                    >
                      <option value={7}>Last 7 days</option>
                      <option value={30}>Last 30 days</option>
                      <option value={90}>Last 90 days</option>
                    </select>
                    <span className="pointer-events-none absolute right-2.5 text-[#8a8fa3]">
                      <I n="chevD" size={13} />
                    </span>
                  </label>
                </div>
                {periodBatches.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr>
                          <th className={`${TH} px-5 pb-2 pt-2`}>Date &amp; Time</th>
                          <th className={`${TH} px-3 pb-2 pt-2`}>Source</th>
                          <th className={`${TH} px-3 pb-2 pt-2`}>Changes</th>
                          <th className={`${TH} px-3 pb-2 pt-2`}>Status</th>
                          <th className={`${TH} px-3 pb-2 pt-2`}>Details</th>
                          <th className={`${TH} px-5 pb-2 pt-2 text-right`}>Action</th>
                        </tr>
                      </thead>
                      <tbody>{periodBatches.map((b) => batchRow(b))}</tbody>
                    </table>
                  </div>
                ) : (
                  <p className="px-5 py-8 text-center text-[13px] text-[#8a8fa3]">
                    {data.batches.length === 0
                      ? "No sync activity yet — when you approve AI changes in Approvals, each apply becomes a batch here."
                      : `No sync activity in the last ${period} days.`}
                  </p>
                )}
              </div>

              {!data.hasConnection && (
                <div className={`${CARD} flex items-center gap-4 border-dashed px-5 py-4`}>
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#efeafd] text-[#6c3ce9]">
                    <I n="plug" size={17} />
                  </span>
                  <div className="flex-1">
                    <p className="text-[13.5px] font-bold text-[#17142b]">Connect your CRM</p>
                    <p className="text-[12.5px] text-[#6f7490]">
                      Approved changes sync to your CRM. Connect HubSpot or Salesforce and every apply shows up here.
                    </p>
                  </div>
                  <Link href="/connections" className="shrink-0 rounded-xl bg-[#6c3ce9] px-4 py-2 text-[12.5px] font-bold text-white transition hover:bg-[#5b31c9]">
                    Connect
                  </Link>
                </div>
              )}

              {/* rollback strip */}
              <div className={`${CARD} overflow-hidden`}>
                <div className="flex items-center justify-between px-5 pb-1 pt-4">
                  <div>
                    <h3 className="text-[15px] font-extrabold text-[#17142b]">Rollback Management</h3>
                    <p className="mt-0.5 text-[12px] text-[#8a8fa3]">Revert changes from any sync batch within the allowed time window.</p>
                  </div>
                  <span className="flex items-center gap-3">
                    <label className="relative flex items-center">
                      <select
                        value={stripFilter}
                        onChange={(e) => setStripFilter(e.target.value as "all" | "revertable")}
                        className="appearance-none rounded-lg border border-[#e6e3f2] bg-white py-1.5 pl-3 pr-8 text-[12.5px] font-semibold text-[#3c3a55] outline-none transition hover:border-[#c9bdf5]"
                      >
                        <option value="all">All Batches</option>
                        <option value="revertable">Revertable only</option>
                      </select>
                      <span className="pointer-events-none absolute right-2.5 text-[#8a8fa3]">
                        <I n="chevD" size={13} />
                      </span>
                    </label>
                    <button onClick={() => setTab("rollback")} className="whitespace-nowrap text-[12.5px] font-bold text-[#6c3ce9] hover:underline">
                      View All →
                    </button>
                  </span>
                </div>
                {stripBatches.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr>
                          <th className={`${TH} px-5 pb-2 pt-2`}>Batch ID</th>
                          <th className={`${TH} px-3 pb-2 pt-2`}>Date &amp; Time</th>
                          <th className={`${TH} px-3 pb-2 pt-2`}>Source</th>
                          <th className={`${TH} px-3 pb-2 pt-2`}>Changes</th>
                          <th className={`${TH} px-3 pb-2 pt-2`}>Revertable Until</th>
                          <th className={`${TH} px-5 pb-2 pt-2 text-right`}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stripBatches.map((b) => (
                          <tr key={b.batchId} className="border-t border-[#f4f2fb]">
                            <td className="whitespace-nowrap px-5 py-3 font-mono text-[12px] font-semibold text-[#3c3a55]">{b.batchId}</td>
                            <td className="whitespace-nowrap px-3 py-3 text-[12.5px] text-[#3c3a55]">{b.atLabel}</td>
                            <td className="px-3 py-3 text-[12.5px] font-semibold text-[#17142b]">{b.source}</td>
                            <td className="px-3 py-3">
                              <ChangesCell b={b} />
                            </td>
                            <td className="whitespace-nowrap px-3 py-3 text-[12.5px] text-[#3c3a55]">
                              {b.status === "Rolled back" ? "—" : b.revertableUntil}
                            </td>
                            <td className="px-5 py-3 text-right">
                              {b.revertable ? (
                                <button
                                  onClick={() => openRollback(b)}
                                  className="rounded-lg border border-[#f0c6c6] px-3 py-1.5 text-[12px] font-bold text-[#d64545] transition hover:bg-[#fdf1f1]"
                                >
                                  Rollback
                                </button>
                              ) : (
                                <span className="text-[12px] font-medium text-[#9aa0b5]">
                                  {b.status === "Rolled back" ? "Rolled back" : "Window closed"}
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="px-5 py-6 text-[13px] text-[#8a8fa3]">No batches to show.</p>
                )}
              </div>
            </div>
          )}

          {tab === "batches" && (
            <div className={`${CARD} overflow-hidden`}>
              <div className="px-5 pb-1 pt-4">
                <h3 className="text-[15px] font-extrabold text-[#17142b]">Batch History</h3>
                <p className="mt-0.5 text-[12px] text-[#8a8fa3]">Every apply action, grouped as one batch.</p>
              </div>
              {data.batches.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr>
                        <th className={`${TH} px-5 pb-2 pt-2`}>Batch ID</th>
                        <th className={`${TH} px-3 pb-2 pt-2`}>Date &amp; Time</th>
                        <th className={`${TH} px-3 pb-2 pt-2`}>Source</th>
                        <th className={`${TH} px-3 pb-2 pt-2`}>Changes</th>
                        <th className={`${TH} px-3 pb-2 pt-2`}>Approved by</th>
                        <th className={`${TH} px-3 pb-2 pt-2`}>Sync Status</th>
                        <th className={`${TH} px-3 pb-2 pt-2`}>Revertable</th>
                        <th className={`${TH} px-5 pb-2 pt-2 text-right`}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.batches.map((b) => (
                        <tr
                          key={b.batchId}
                          onClick={() => setSelectedId(b.batchId)}
                          className={`cursor-pointer border-t border-[#f4f2fb] transition hover:bg-[#faf9fe] ${
                            selected?.batchId === b.batchId ? "bg-[#faf8ff]" : ""
                          }`}
                        >
                          <td className="whitespace-nowrap px-5 py-3.5 font-mono text-[12px] font-semibold text-[#3c3a55]">{b.batchId}</td>
                          <td className="whitespace-nowrap px-3 py-3.5 text-[12.5px] text-[#3c3a55]">{b.atLabel}</td>
                          <td className="px-3 py-3.5">
                            <span className="flex items-center gap-2">
                              <SourceGlyph source={b.source} size={24} />
                              <span className="text-[12.5px] font-semibold text-[#17142b]">{b.source}</span>
                            </span>
                          </td>
                          <td className="px-3 py-3.5">
                            <ChangesCell b={b} />
                          </td>
                          <td className="whitespace-nowrap px-3 py-3.5 text-[12.5px] text-[#3c3a55]">{b.approvedBy || "—"}</td>
                          <td className="px-3 py-3.5">
                            <StatusPill status={b.status} />
                          </td>
                          <td className="px-3 py-3.5">
                            {b.status === "Rolled back" ? (
                              <span className="text-[12px] font-medium text-[#9aa0b5]">Rolled back</span>
                            ) : b.revertable ? (
                              <span className="inline-flex rounded-full bg-[#e5f7ec] px-2.5 py-[3px] text-[11px] font-bold text-[#1d9e57]">Yes</span>
                            ) : (
                              <span className="text-[12px] font-medium text-[#9aa0b5]">No</span>
                            )}
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedId(b.batchId);
                              }}
                              className="rounded-lg border border-[#e6e3f2] px-3 py-1.5 text-[12px] font-semibold text-[#3c3a55] transition hover:border-[#6c3ce9] hover:text-[#6c3ce9]"
                            >
                              View
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="px-5 py-8 text-center text-[13px] text-[#8a8fa3]">No batches yet — approved changes will appear here.</p>
              )}
            </div>
          )}

          {tab === "rollback" && (
            <div className={`${CARD} overflow-hidden`}>
              <div className="px-5 pb-1 pt-4">
                <h3 className="text-[15px] font-extrabold text-[#17142b]">Rollback Management</h3>
                <p className="mt-0.5 text-[12px] text-[#8a8fa3]">
                  Revert changes from any sync batch within 7 days of the sync. A rollback restores the CRM and returns
                  the changes to Approvals as pending proposals.
                </p>
              </div>
              {data.batches.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr>
                        <th className={`${TH} px-5 pb-2 pt-2`}>Batch ID</th>
                        <th className={`${TH} px-3 pb-2 pt-2`}>Date &amp; Time</th>
                        <th className={`${TH} px-3 pb-2 pt-2`}>Source</th>
                        <th className={`${TH} px-3 pb-2 pt-2`}>Changes</th>
                        <th className={`${TH} px-3 pb-2 pt-2`}>Revertable Until</th>
                        <th className={`${TH} px-3 pb-2 pt-2`}>Status</th>
                        <th className={`${TH} px-5 pb-2 pt-2 text-right`}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.batches.map((b) => (
                        <tr key={b.batchId} className="border-t border-[#f4f2fb]">
                          <td className="whitespace-nowrap px-5 py-3.5 font-mono text-[12px] font-semibold text-[#3c3a55]">{b.batchId}</td>
                          <td className="whitespace-nowrap px-3 py-3.5 text-[12.5px] text-[#3c3a55]">{b.atLabel}</td>
                          <td className="px-3 py-3.5 text-[12.5px] font-semibold text-[#17142b]">{b.source}</td>
                          <td className="px-3 py-3.5">
                            <ChangesCell b={b} />
                          </td>
                          <td className="whitespace-nowrap px-3 py-3.5 text-[12.5px] text-[#3c3a55]">
                            {b.status === "Rolled back" ? "—" : b.revertableUntil}
                          </td>
                          <td className="px-3 py-3.5">
                            <StatusPill status={b.status} />
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            {b.revertable ? (
                              <button
                                onClick={() => openRollback(b)}
                                className="rounded-lg border border-[#f0c6c6] px-3 py-1.5 text-[12px] font-bold text-[#d64545] transition hover:bg-[#fdf1f1]"
                              >
                                Rollback
                              </button>
                            ) : (
                              <span className="text-[12px] font-medium text-[#9aa0b5]">
                                {b.status === "Rolled back" ? "Rolled back" : "Window closed"}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="px-5 py-8 text-center text-[13px] text-[#8a8fa3]">Nothing to roll back yet.</p>
              )}
            </div>
          )}

          {tab === "apps" && (
            <div className="space-y-4">
              {data.connections.length > 0 ? (
                <div className="grid grid-cols-2 gap-4">
                  {data.connections.map((c) => (
                    <div key={c.provider} className={`${CARD} px-5 py-4`}>
                      <div className="flex items-center gap-3">
                        <SourceGlyph source={c.label} size={38} />
                        <div className="min-w-0 flex-1">
                          <p className="text-[14px] font-extrabold text-[#17142b]">{c.label}</p>
                          <p className="flex items-center gap-1.5 text-[12px] font-medium text-[#1d9e57]">
                            <span className="h-[7px] w-[7px] rounded-full bg-[#22b573]" />
                            Connected
                          </p>
                        </div>
                      </div>
                      <dl className="mt-3.5 space-y-1.5 text-[12.5px]">
                        {c.accountEmail && (
                          <div className="flex justify-between gap-3">
                            <dt className="text-[#8a8fa3]">Account</dt>
                            <dd className="truncate font-semibold text-[#17142b]">{c.accountEmail}</dd>
                          </div>
                        )}
                        <div className="flex justify-between gap-3">
                          <dt className="text-[#8a8fa3]">Connected</dt>
                          <dd className="font-semibold text-[#17142b]">{c.connectedLabel}</dd>
                        </div>
                        <div className="flex justify-between gap-3">
                          <dt className="text-[#8a8fa3]">Last sync</dt>
                          <dd className="font-semibold text-[#17142b]">{c.lastSyncAgo ?? "—"}</dd>
                        </div>
                        <div className="flex justify-between gap-3">
                          <dt className="shrink-0 text-[#8a8fa3]">Permissions</dt>
                          <dd className="text-right font-semibold text-[#17142b]">{c.permissions}</dd>
                        </div>
                      </dl>
                      {c.provider === "hubspot" || c.provider === "salesforce" ? (
                        <p className="mt-3 rounded-lg bg-[#faf9fe] px-3 py-2 text-[11.5px] text-[#6f7490]">
                          This is the workspace&apos;s CRM connection — approved changes sync here.
                        </p>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : (
                <div className={`${CARD} px-5 py-8 text-center`}>
                  <p className="text-[14px] font-bold text-[#17142b]">No apps connected yet</p>
                  <p className="mx-auto mt-1 max-w-[420px] text-[12.5px] text-[#6f7490]">
                    Connect your CRM and tools so approved changes can sync and new activity can flow in.
                  </p>
                </div>
              )}
              <div className={`${CARD} flex items-center gap-4 border-dashed px-5 py-4`}>
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#efeafd] text-[#6c3ce9]">
                  <I n="plug" size={17} />
                </span>
                <div className="flex-1">
                  <p className="text-[13.5px] font-bold text-[#17142b]">Connect more apps</p>
                  <p className="text-[12.5px] text-[#6f7490]">HubSpot, Salesforce, Google, Outlook and SignuDoc are managed on the Connections page.</p>
                </div>
                <Link href="/connections" className="shrink-0 rounded-xl bg-[#6c3ce9] px-4 py-2 text-[12.5px] font-bold text-white transition hover:bg-[#5b31c9]">
                  Manage connections →
                </Link>
              </div>
            </div>
          )}

          {tab === "api" && (
            <div className="space-y-4">
              <div className="grid grid-cols-5 gap-4">
                {[
                  { label: "Apply batches", value: String(data.api.batches), icon: "box" },
                  { label: "Captures processed", value: String(data.api.capturesProcessed), icon: "inbox" },
                  { label: "Proposals created", value: String(data.api.proposalsCreated), icon: "sparkle" },
                  { label: "Proposals decided", value: String(data.api.proposalsDecided), icon: "check" },
                ].map((t) => (
                  <div key={t.label} className={`${CARD} px-4 py-4`}>
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#efeafd] text-[#6c3ce9]">
                      <I n={t.icon} size={15} />
                    </span>
                    <p className="mt-2.5 text-[20px] font-extrabold leading-none text-[#17142b]">{t.value}</p>
                    <p className="mt-1.5 text-[11.5px] font-medium leading-tight text-[#8a8fa3]">{t.label}</p>
                  </div>
                ))}
                <div className={`${CARD} px-4 py-4`}>
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#e8f0fe] text-[#2b6bf0]">
                    <I n="bulb" size={15} />
                  </span>
                  <p className="mt-2.5 break-words text-[13px] font-extrabold leading-snug text-[#17142b]">{data.api.model}</p>
                  <p className="mt-1.5 text-[11.5px] font-medium leading-tight text-[#8a8fa3]">AI model</p>
                </div>
              </div>
              <div className={`${CARD} px-5 py-4`}>
                <h3 className="text-[14px] font-extrabold text-[#17142b]">Limits &amp; metering</h3>
                <p className="mt-1 text-[12.5px] leading-relaxed text-[#6f7490]">
                  Live API metering starts when a real CRM is connected. Until then, the counters above come from this
                  workspace&apos;s own records.
                </p>
                <div className="mt-3 divide-y divide-[#f4f2fb]">
                  {["API calls & rate limits", "Webhook deliveries", "Failed requests & retry queue", "Sync latency"].map((label) => (
                    <div key={label} className="flex items-center justify-between py-2.5">
                      <span className="text-[13px] font-medium text-[#3c3a55]">{label}</span>
                      <span className="rounded-full bg-[#eef0f6] px-2.5 py-[3px] text-[11px] font-bold text-[#6f7490]">
                        Starts with a live CRM connection
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {showPanel && selected && <DetailPanel batch={selected} onRollback={openRollback} />}
      </div>

      {rollbackFor && (
        <RollbackModal
          batch={rollbackFor}
          onClose={() => setRollbackFor(null)}
          onDone={() => {
            setRollbackFor(null);
            startTransition(() => router.refresh());
          }}
        />
      )}
    </div>
  );
}
