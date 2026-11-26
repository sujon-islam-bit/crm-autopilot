"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { I, SlackIcon } from "./icons";
import { BarsPill } from "./QueueRow";
import { STAGES } from "../lib/constants";
import type { ProposalView } from "../lib/view";
import { approveAction, rejectAction, approveEditedAction } from "../lib/actions";

export default function ApprovalPanel({
  view,
  onClose,
  canDecide = true,
}: {
  view: ProposalView;
  onClose: () => void;
  canDecide?: boolean;
}) {
  const router = useRouter();
  const [busy, start] = useTransition();
  const [editing, setEditing] = useState(false);
  const [showSource, setShowSource] = useState(false);
  const [values, setValues] = useState<Record<string, string>>({});

  // Reset local state whenever the panel switches to another proposal.
  useEffect(() => {
    setEditing(false);
    setShowSource(false);
    const init: Record<string, string> = {};
    for (const r of view.diffRows) {
      init[r.field] = r.edit === "date" ? (r.iso ?? r.proposed) : r.proposed;
    }
    setValues(init);
  }, [view.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const approve = () =>
    start(async () => {
      await approveAction(view.id);
      router.refresh();
    });
  const reject = () =>
    start(async () => {
      await rejectAction(view.id);
      router.refresh();
    });
  const saveAndApprove = () =>
    start(async () => {
      const edits = view.diffRows
        .filter((r) => r.edit)
        .map((r) => ({ field: r.field, proposed: values[r.field] ?? r.proposed }));
      await approveEditedAction(view.id, edits);
      setEditing(false);
      router.refresh();
    });

  return (
    <aside className="card w-[400px] shrink-0 self-start p-5" data-detail-panel>
      {/* Header */}
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-violet-tint text-violet">
          <I n={view.iconKind === "mailOpen" ? "mail" : view.iconKind} size={19} sw={1.9} />
        </span>
        <h3 className="min-w-0 flex-1 text-[15.5px] leading-snug font-bold text-ink">{view.title}</h3>
        <BarsPill value={view.confidence} />
        {view.belowThreshold && (
          <span className="inline-flex shrink-0 items-center rounded-full bg-amber-tint px-2.5 py-[5px] text-[11.5px] font-bold whitespace-nowrap text-amber">
            Below threshold
          </span>
        )}
        <button onClick={onClose} className="shrink-0 text-faint hover:text-ink" aria-label="Close details">
          <I n="x" size={16} />
        </button>
      </div>
      <p className="mt-2.5 text-[13.5px] leading-relaxed text-ink2">{view.description}</p>

      {/* Field Changes */}
      <div className="mt-4 border-t border-line/70 pt-4">
        <div className="mb-2 flex items-center gap-2">
          <I n="file" size={15} className="text-violet" />
          <h4 className="text-[14px] font-bold text-ink">Field Changes</h4>
        </div>
        <table className="w-full text-[12.5px]">
          <thead>
            <tr className="text-left text-muted">
              <th className="py-1.5 pr-2 font-medium">Field</th>
              <th className="py-1.5 pr-2 font-medium">Current Value</th>
              <th className="py-1.5 font-medium">Proposed Value</th>
            </tr>
          </thead>
          <tbody>
            {view.diffRows.map((r, i) => (
              <tr key={i} className="border-t border-line/60">
                <td className="py-2.5 pr-2 align-top font-semibold whitespace-nowrap text-ink">{r.field}</td>
                <td className="py-2.5 pr-2 align-top text-ink2">{r.current}</td>
                <td className="py-2.5 align-top font-medium text-ink">
                  {editing && r.edit ? (
                    r.edit === "stage" ? (
                      <select
                        value={values[r.field] ?? r.proposed}
                        onChange={(e) => setValues((v) => ({ ...v, [r.field]: e.target.value }))}
                        className="w-full rounded-lg border border-line bg-white px-2 py-1.5 text-[12.5px]"
                      >
                        {STAGES.map((st) => (
                          <option key={st} value={st}>
                            {st}
                          </option>
                        ))}
                      </select>
                    ) : r.edit === "date" ? (
                      <input
                        type="date"
                        value={values[r.field] ?? r.iso ?? ""}
                        onChange={(e) => setValues((v) => ({ ...v, [r.field]: e.target.value }))}
                        className="w-full rounded-lg border border-line bg-white px-2 py-1.5 text-[12.5px]"
                      />
                    ) : (
                      <input
                        type="text"
                        value={values[r.field] ?? r.proposed}
                        onChange={(e) => setValues((v) => ({ ...v, [r.field]: e.target.value }))}
                        className="w-full rounded-lg border border-line bg-white px-2 py-1.5 text-[12.5px]"
                      />
                    )
                  ) : r.pill ? (
                    <span className="inline-block rounded-md bg-violet-tint px-2 py-[3px] text-[12px] font-semibold text-violet">
                      {r.proposed}
                    </span>
                  ) : (
                    r.proposed
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {view.requiredOk && (
          <div className="mt-1 flex items-center gap-1.5 text-[12px] font-medium text-green">
            <I n="check" size={13} sw={2.6} /> All required fields satisfied
          </div>
        )}
      </div>

      {/* Cascade Preview */}
      <div className="mt-4 border-t border-line/70 pt-4">
        <div className="mb-2.5 flex items-center gap-2">
          <I n="zap" size={15} className="text-violet" fill />
          <h4 className="flex-1 text-[14px] font-bold text-ink">Cascade Preview</h4>
          {view.conflicts.length === 0 ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-green-tint px-2.5 py-[3px] text-[11.5px] font-bold text-green">
              <I n="check" size={11} sw={3} /> No conflicts
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-[#fdecec] px-2.5 py-[3px] text-[11.5px] font-bold text-red">
              <I n="alert" size={11} sw={2.4} /> {view.conflicts.length} conflict{view.conflicts.length === 1 ? "" : "s"}
            </span>
          )}
        </div>
        <div className="flex flex-col gap-2">
          {view.conflicts.map((c, i) => (
            <div key={`c${i}`} className="flex items-center gap-3 rounded-xl bg-[#fdecec]/70 px-3 py-2.5">
              <span className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-lg bg-white text-red">
                <I n="alert" size={15} />
              </span>
              <span className="text-[12.5px] leading-snug font-medium text-ink2">{c}</span>
            </div>
          ))}
          {view.cascade.map((c, i) => (
            <div key={i} className="flex items-center gap-3 px-1 py-0.5">
              {c.icon === "slack" ? (
                <SlackIcon size={30} />
              ) : (
                <span className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-lg bg-green-tint text-green">
                  <I n={c.icon === "chart" ? "trend" : c.icon === "mail" ? "mail" : c.icon === "user" ? "userPlus" : "sync"} size={15} />
                </span>
              )}
              <span className="text-[12.5px] leading-snug font-medium text-ink2">{c.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Source Evidence */}
      <div className="mt-4 border-t border-line/70 pt-4">
        <div className="mb-2.5 flex items-center gap-2">
          <I n="quote" size={15} className="text-violet" fill />
          <h4 className="flex-1 text-[14px] font-bold text-ink">Source Evidence</h4>
          {view.sourceFull && (
            <button
              onClick={() => setShowSource((v) => !v)}
              className="text-[12.5px] font-semibold text-violet hover:underline"
            >
              {showSource ? "Hide Source" : "View Source"}
            </button>
          )}
        </div>
        {view.evidence ? (
          <div className="rounded-xl bg-violet-soft px-4 py-3.5">
            <p className="text-[13.5px] leading-relaxed text-ink">“{view.evidence.quote}”</p>
            <p className="mt-2 text-[12px] text-muted">{view.evidence.meta}</p>
          </div>
        ) : (
          <p className="text-[12.5px] leading-relaxed text-muted">
            Based on CRM activity patterns — no single source message.
          </p>
        )}
        {showSource && view.sourceFull && (
          <div className="mt-2.5 max-h-56 overflow-y-auto rounded-xl border border-line bg-white px-4 py-3">
            <p className="text-[12.5px] leading-relaxed whitespace-pre-wrap text-ink2">{view.sourceFull}</p>
          </div>
        )}
      </div>

      {/* Actions */}
      {view.status === "pending" && !canDecide ? (
        <div className="mt-5 rounded-[10px] bg-canvas px-3.5 py-2.5 text-[12.5px] leading-relaxed font-medium text-ink2">
          Your role is read-only here — you can review this suggestion, but only a teammate with
          approval rights can act on it.
        </div>
      ) : view.status === "pending" ? (
        editing ? (
          <div className="mt-5 flex gap-2.5">
            <button
              onClick={saveAndApprove}
              disabled={busy}
              className="btn-violet flex flex-1 items-center justify-center gap-1.5 px-4 py-2.5 text-[13.5px] disabled:opacity-60"
            >
              <I n="check" size={15} sw={2.4} /> Save &amp; Approve
            </button>
            <button
              onClick={() => setEditing(false)}
              disabled={busy}
              className="btn-outline px-4 py-2.5 text-[13.5px] font-semibold disabled:opacity-60"
            >
              Cancel
            </button>
          </div>
        ) : (
          <div className="mt-5 flex gap-2.5">
            <button
              onClick={approve}
              disabled={busy}
              className="btn-violet flex flex-1 items-center justify-center gap-1.5 px-4 py-2.5 text-[13.5px] disabled:opacity-60"
            >
              <I n="check" size={15} sw={2.4} /> Approve &amp; Sync
            </button>
            <button
              onClick={() => setEditing(true)}
              disabled={busy}
              className="btn-outline flex items-center justify-center gap-1.5 px-4 py-2.5 text-[13.5px] font-semibold disabled:opacity-60"
            >
              <I n="pencil" size={14} /> Edit
            </button>
            <button
              onClick={reject}
              disabled={busy}
              className="flex items-center justify-center gap-1.5 rounded-[10px] bg-[#fdecec] px-4 py-2.5 text-[13.5px] font-semibold text-red transition-colors hover:bg-[#fbdbdb] disabled:opacity-60"
            >
              <I n="x" size={14} sw={2.2} /> Reject
            </button>
          </div>
        )
      ) : (
        <div className="mt-5 rounded-[10px] bg-canvas px-3.5 py-2.5 text-[12.5px] font-medium text-ink2 capitalize">
          Status: {view.status}
        </div>
      )}
    </aside>
  );
}
