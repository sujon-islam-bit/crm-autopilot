"use client";

import { useState } from "react";
import ProposalRow from "./ProposalRow";
import DetailDrawer from "./DetailDrawer";
import AddNotePanel from "./AddNotePanel";
import { UndoButton, CheckUpdatesButton } from "./buttons";
import { I } from "./icons";
import { timeAgo } from "../lib/constants";
import type { ProposalView } from "../lib/view";

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
  const [selected, setSelected] = useState<ProposalView | null>(null);
  const [notesOpen, setNotesOpen] = useState(false);
  const count = pending.length;
  const subline =
    count === 0 ? "Nothing waiting for your decision" : `${count} waiting for your decision`;

  return (
    <div className="px-7 pt-5 pb-7">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[24px] font-extrabold tracking-tight">Approvals</h1>
          <p className="mt-1 text-[13.5px] text-muted">{subline}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2.5 pt-1">
          <button
            onClick={() => setNotesOpen((o) => !o)}
            aria-expanded={notesOpen}
            className="btn-outline flex items-center gap-1.5 px-4 py-2 text-[13px] font-semibold"
          >
            <I n="plus" size={14} sw={2.2} /> Add notes
          </button>
          <CheckUpdatesButton />
        </div>
      </div>

      {notesOpen && <AddNotePanel />}

      {/* Pending */}
      <div className="card mt-5 overflow-hidden">
        <div className="divide-y divide-line/70">
          {pending.length === 0 && (
            <p className="px-5 py-6 text-[13.5px] leading-relaxed text-muted">
              {connected
                ? "Queue is clear — the AI has nothing waiting."
                : "No proposals yet — connect your CRM and the AI will prepare updates for you."}
            </p>
          )}
          {pending.map((v, i) => (
            <ProposalRow key={v.id} view={v} first={i === 0} selected={selected?.id === v.id} onSelect={setSelected} wrap menu />
          ))}
        </div>
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

      {selected && (
        <div className="fixed inset-0 z-30">
          <DetailDrawer view={selected} onClose={() => setSelected(null)} overlay />
        </div>
      )}
    </div>
  );
}
