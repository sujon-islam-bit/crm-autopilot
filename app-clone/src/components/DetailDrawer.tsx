"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { I, SlackIcon } from "./icons";
import type { ProposalView } from "../lib/view";
import { ConfidencePill } from "./ProposalRow";
import { approveAction, rejectAction } from "../lib/actions";

export default function DetailDrawer({
  view,
  onClose,
  overlay = false,
  canDecide = true,
}: {
  view: ProposalView;
  onClose: () => void;
  overlay?: boolean;
  /** False for roles without proposals.decide on this proposal (Viewer, or
   *  a Sales Rep outside their own deals): the Approve & Sync / Reject
   *  buttons are replaced by a read-only note. Server enforces the same. */
  canDecide?: boolean;
}) {
  const router = useRouter();
  const [busy, start] = useTransition();

  const approve = () =>
    start(async () => {
      await approveAction(view.id);
      onClose();
      router.refresh();
    });
  const reject = () =>
    start(async () => {
      await rejectAction(view.id);
      onClose();
      router.refresh();
    });

  return (
    <div
      className={
        overlay
          ? "card absolute top-5 right-7 bottom-7 z-30 flex w-[372px] flex-col overflow-y-auto p-[18px] shadow-[0_24px_64px_-12px_rgba(23,23,40,0.28)]"
          : "card flex w-[372px] shrink-0 flex-col self-start p-[18px]"
      }
    >
      <div className="flex items-start gap-2">
        <I n="sparkle" size={17} className="mt-0.5 shrink-0 text-primary" fill />
        <h3 className="flex-1 text-[14.5px] leading-snug font-bold text-ink">{view.title}</h3>
        <ConfidencePill value={view.confidence} />
        <button onClick={onClose} className="text-faint hover:text-ink" aria-label="Close">
          <I n="x" size={16} />
        </button>
      </div>

      {view.status === "pending" && !canDecide ? (
        <div className="mt-3.5 rounded-[10px] bg-canvas px-3.5 py-2.5 text-[12.5px] leading-relaxed font-medium text-ink2">
          Your role is read-only here — you can review this suggestion, but only a teammate with
          approval rights can act on it.
        </div>
      ) : view.status === "pending" ? (
        <div className="mt-3.5 flex gap-2.5">
          <button
            onClick={approve}
            disabled={busy}
            className="btn-primary flex flex-1 items-center justify-center gap-1.5 px-4 py-2.5 text-[13.5px] disabled:opacity-60"
          >
            <I n="check" size={15} sw={2.4} /> Approve &amp; Sync
          </button>
          <button
            onClick={reject}
            disabled={busy}
            className="btn-outline flex flex-1 items-center justify-center gap-1.5 px-4 py-2.5 text-[13.5px] disabled:opacity-60"
          >
            <I n="x" size={14} sw={2.2} /> Reject
          </button>
        </div>
      ) : (
        <div className="mt-4 rounded-[10px] bg-canvas px-3.5 py-2.5 text-[12.5px] font-medium text-ink2 capitalize">
          Status: {view.status}
        </div>
      )}

      <SectionTitle n={1} title="Field Diff" />
      <div className="overflow-hidden rounded-xl border border-line">
        <table className="w-full text-[12.5px]">
          <thead>
            <tr className="bg-[#fafaff] text-left text-muted">
              <th className="px-3.5 py-2 font-medium">Field</th>
              <th className="px-3.5 py-2 font-medium">Current Value</th>
              <th className="px-3.5 py-2 font-medium">Proposed Value</th>
            </tr>
          </thead>
          <tbody>
            {view.diffRows.map((r, i) => (
              <tr key={i} className="border-t border-line/70">
                <td className="px-3.5 py-2.5 font-medium text-ink2">{r.field}</td>
                <td className="px-3.5 py-2.5 text-ink2">{r.current}</td>
                <td className="px-3.5 py-2.5 font-medium text-ink">
                  {r.pill ? (
                    <span className="rounded-md bg-purple-tint px-2 py-[3px] text-[12px] font-semibold text-purple">
                      {r.proposed}
                    </span>
                  ) : r.field === "Close Date" ? (
                    <span className="inline-flex items-center gap-1.5">
                      <I n="calendar" size={12} className="text-muted" /> {r.proposed}
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
          <div className="flex items-center gap-1.5 border-t border-line/70 bg-green-tint/60 px-3.5 py-2 text-[12px] font-medium text-green">
            <I n="check" size={13} sw={2.6} /> All required fields satisfied
          </div>
        )}
      </div>

      <SectionTitle n={2} title="Cascade Preview" />
      <div className="flex flex-col gap-2">
        {view.cascade.map((c, i) => (
          <div key={i} className="flex items-center gap-3 rounded-xl border border-line px-3 py-2.5">
            {c.icon === "slack" ? (
              <SlackIcon size={30} />
            ) : (
              <span className="flex h-[30px] w-[30px] items-center justify-center rounded-lg bg-primary-tint text-primary">
                <I n={c.icon === "chart" ? "trend" : c.icon === "mail" ? "mail" : c.icon === "user" ? "userPlus" : "sync"} size={15} />
              </span>
            )}
            <span className="text-[12.5px] leading-snug font-medium text-ink2">{c.text}</span>
          </div>
        ))}
      </div>

      <SectionTitle n={3} title="Source Evidence" />
      {view.evidence ? (
        <div>
          <div className="flex items-center gap-3.5">
            {view.evidence.kind === "call" ? (
              <span className="relative flex h-[84px] w-[148px] shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-[#3a3f5c] via-[#2a2d45] to-[#1d1f31]">
                <span className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-black/40 to-transparent" />
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur-sm">
                  <I n="play" size={16} fill />
                </span>
                {view.evidence.duration && (
                  <span className="absolute right-2 bottom-2 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                    {view.evidence.duration}
                  </span>
                )}
              </span>
            ) : (
              <span className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-xl bg-primary-tint text-primary">
                <I n={view.evidence.kind === "chat" ? "msg" : "mail"} size={20} />
              </span>
            )}
            <div className="min-w-0">
              <div className="text-[13.5px] leading-snug font-semibold text-ink">{view.evidence.title}</div>
              <div className="mt-1 text-[12.5px] text-muted italic">“{view.evidence.quote}”</div>
            </div>
          </div>
          <button className="btn-outline mt-3.5 w-full py-2.5 text-[13px] font-semibold text-primary">
            View Full Source <I n="arrowR" size={13} className="ml-1 inline" sw={2.2} />
          </button>
        </div>
      ) : (
        <p className="text-[12.5px] text-muted">Based on CRM activity patterns — no single source message.</p>
      )}

      <div className="mt-4 flex items-start gap-2.5 rounded-xl bg-primary-tint/60 px-3.5 py-3">
        <I n="shield" size={16} className="mt-0.5 shrink-0 text-primary" />
        <p className="text-[12.5px] leading-snug text-ink2">
          This change will be reversible via History.
        </p>
      </div>
    </div>
  );
}

function SectionTitle({ n, title }: { n: number; title: string }) {
  return (
    <div className="mt-4 mb-2 flex items-center gap-1.5">
      <h4 className="text-[13.5px] font-bold text-ink">
        {n}. {title}
      </h4>
      <I n="info" size={13} className="text-faint" />
    </div>
  );
}
