"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

import { approveProposal, rejectProposal, undoProposal } from "@/lib/actions/proposals";
import { timeAgo } from "@/lib/format";

export type ProposalView = {
  id: string;
  type: string;
  title: string;
  reason: string;
  source: string;
  status: string;
  createdAt: string; // ISO
  detail: Record<string, unknown> | null;
};

const TYPE_LABEL: Record<string, string> = {
  deal_stage: "Deal update",
  deal_field: "Deal update",
  new_contact: "New contact",
  new_deal: "New deal",
  followup_draft: "Follow-up draft",
  task: "Task",
};

const SOURCE_LABEL: Record<string, string> = {
  gmail: "Gmail",
  calendar: "Calendar",
  signudoc: "SignuDoc",
  hubspot: "HubSpot",
};

const STATUS_STYLE: Record<string, string> = {
  applied: "bg-emerald-50 text-emerald-700",
  rejected: "bg-neutral-100 text-neutral-500",
  undone: "bg-amber-50 text-amber-700",
  failed: "bg-red-50 text-red-700",
};

/**
 * One AI proposal as a card: what will change, why, where the evidence
 * came from, and the decision buttons. This is the product's core
 * interaction — a human always decides before the CRM changes.
 */
export default function ProposalCard({ proposal }: { proposal: ProposalView }) {
  const router = useRouter();
  const [busy, start] = useTransition();
  const draftBody = typeof proposal.detail?.draftBody === "string" ? proposal.detail.draftBody : null;

  function act(fn: (id: string) => Promise<void>) {
    start(async () => {
      await fn(proposal.id);
      router.refresh();
    });
  }

  return (
    <article className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-[0_6px_20px_rgba(30,40,60,0.04)]">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-brand-soft px-2.5 py-0.5 text-xs font-bold text-brand">
          {TYPE_LABEL[proposal.type] ?? "Update"}
        </span>
        <span className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-semibold text-neutral-500">
          via {SOURCE_LABEL[proposal.source] ?? proposal.source}
        </span>
        <span className="ml-auto text-xs text-neutral-400">
          {timeAgo(new Date(proposal.createdAt))}
        </span>
      </div>

      <h3 className="mt-3 text-[16px] font-bold leading-snug text-neutral-900">{proposal.title}</h3>
      <p className="mt-1 text-sm leading-relaxed text-neutral-500">{proposal.reason}</p>

      {draftBody && (
        <blockquote className="mt-3 rounded-xl bg-neutral-50 px-4 py-3 text-sm italic leading-relaxed text-neutral-600">
          “{draftBody}”
        </blockquote>
      )}

      <div className="mt-4 flex items-center gap-2.5">
        {proposal.status === "pending" && (
          <>
            <button
              onClick={() => act(approveProposal)}
              disabled={busy}
              className="rounded-lg bg-neutral-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-neutral-700 disabled:opacity-50"
            >
              Approve
            </button>
            <button
              onClick={() => act(rejectProposal)}
              disabled={busy}
              className="rounded-lg border-[1.5px] border-neutral-200 bg-white px-5 py-2.5 text-sm font-semibold text-neutral-600 transition hover:bg-neutral-50 disabled:opacity-50"
            >
              Reject
            </button>
          </>
        )}
        {proposal.status === "applied" && (
          <>
            <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${STATUS_STYLE.applied}`}>
              Applied to your CRM
            </span>
            <button
              onClick={() => act(undoProposal)}
              disabled={busy}
              className="text-sm font-semibold text-brand hover:underline disabled:opacity-50"
            >
              Undo
            </button>
          </>
        )}
        {(proposal.status === "rejected" || proposal.status === "undone" || proposal.status === "failed") && (
          <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${STATUS_STYLE[proposal.status]}`}>
            {proposal.status === "rejected" ? "Rejected" : proposal.status === "undone" ? "Undone" : "Failed"}
          </span>
        )}
      </div>
    </article>
  );
}
