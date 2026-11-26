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

/* Per-type dressing: a tinted icon chip and a slim accent bar down
   the card's left edge, so the kind of proposal reads at a glance. */
const iconProps = {
  width: 15,
  height: 15,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.9,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

const TYPE_STYLE: Record<string, { chip: string; bar: string; icon: React.ReactNode }> = {
  deal_stage: {
    chip: "bg-lime-100 text-lime-800",
    bar: "bg-lime-deep",
    icon: (
      <svg {...iconProps}>
        <path d="M7 5 3.5 8.5 7 12" />
        <path d="M3.5 8.5H17" />
        <path d="m17 12 3.5 3.5L17 19" />
        <path d="M20.5 15.5H7" />
      </svg>
    ),
  },
  deal_field: {
    chip: "bg-sky-50 text-sky-700",
    bar: "bg-sky-400",
    icon: (
      <svg {...iconProps}>
        <path d="M16.9 4.4a2.1 2.1 0 0 1 3 3L9.2 18.1l-4.3 1.2 1.2-4.3L16.9 4.4Z" />
        <path d="m14.8 6.5 3 3" />
      </svg>
    ),
  },
  new_contact: {
    chip: "bg-violet-50 text-violet-600",
    bar: "bg-violet-400",
    icon: (
      <svg {...iconProps}>
        <circle cx="10" cy="8" r="3.4" />
        <path d="M3.8 19.6c.7-3 3.1-4.6 6.2-4.6 1.1 0 2.2.2 3.1.7" />
        <path d="M18.6 8.2v5.6M15.8 11h5.6" />
      </svg>
    ),
  },
  new_deal: {
    chip: "bg-emerald-50 text-emerald-600",
    bar: "bg-emerald-400",
    icon: (
      <svg {...iconProps}>
        <rect x="3" y="7.5" width="18" height="12" rx="2.5" />
        <path d="M9 7.5V6.2A2.2 2.2 0 0 1 11.2 4h1.6A2.2 2.2 0 0 1 15 6.2v1.3" />
        <path d="M3 12.8h18" />
      </svg>
    ),
  },
  followup_draft: {
    chip: "bg-amber-50 text-amber-600",
    bar: "bg-amber-400",
    icon: (
      <svg {...iconProps}>
        <rect x="3" y="5.5" width="18" height="13" rx="2.5" />
        <path d="m4.5 7.5 7.5 5.5 7.5-5.5" />
      </svg>
    ),
  },
  task: {
    chip: "bg-stone-100 text-stone-500",
    bar: "bg-stone-300",
    icon: (
      <svg {...iconProps}>
        <rect x="4" y="4" width="16" height="16" rx="4.5" />
        <path d="m8.6 12.4 2.4 2.4 4.4-5.3" />
      </svg>
    ),
  },
};

const TYPE_FALLBACK = {
  chip: "bg-lime-100 text-lime-800",
  bar: "bg-lime-deep",
  icon: (
    <svg {...iconProps}>
      <circle cx="12" cy="12" r="3.4" />
    </svg>
  ),
};

const SOURCE_LABEL: Record<string, string> = {
  gmail: "Gmail",
  calendar: "Calendar",
  signudoc: "SignuDoc",
  hubspot: "HubSpot",
};

const STATUS_STYLE: Record<string, string> = {
  applied: "bg-emerald-50 text-emerald-700 ring-emerald-600/15",
  rejected: "bg-stone-100 text-stone-500 ring-stone-500/10",
  undone: "bg-amber-50 text-amber-700 ring-amber-600/15",
  failed: "bg-red-50 text-red-700 ring-red-600/15",
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

  const style = TYPE_STYLE[proposal.type] ?? TYPE_FALLBACK;

  return (
    <article className="card card-hover relative overflow-hidden p-6">
      <span aria-hidden className={`absolute inset-y-0 left-0 w-[3px] ${style.bar}`} />
      <div className="flex items-center gap-2.5">
        <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-[10px] ${style.chip}`}>
          {style.icon}
        </span>
        <span className="text-[13px] font-bold tracking-[-0.01em] text-stone-800">
          {TYPE_LABEL[proposal.type] ?? "Update"}
        </span>
        <span className="ml-auto shrink-0 text-xs text-stone-400">
          via {SOURCE_LABEL[proposal.source] ?? proposal.source}
          <span aria-hidden className="mx-1.5 text-stone-300">
            ·
          </span>
          <span className="tnum">{timeAgo(new Date(proposal.createdAt))}</span>
        </span>
      </div>

      <h3 className="mt-3.5 text-[16px] font-bold leading-snug tracking-[-0.01em] text-stone-900">
        {proposal.title}
      </h3>
      <p className="mt-2.5 rounded-xl bg-warm px-3.5 py-2.5 text-sm leading-relaxed text-stone-600">
        {proposal.reason}
      </p>

      {draftBody && (
        <blockquote className="mt-3 rounded-xl border border-line-soft bg-warm px-4 py-3 text-sm italic leading-relaxed text-stone-600">
          “{draftBody}”
        </blockquote>
      )}

      <div className="mt-4 flex items-center gap-2.5">
        {proposal.status === "pending" && (
          <>
            <button
              onClick={() => act(approveProposal)}
              disabled={busy}
              className="rounded-xl bg-pine px-5 py-2.5 text-sm font-semibold text-white shadow-[0_8px_18px_-8px_rgba(11,79,58,0.55)] transition duration-200 hover:bg-pine-dark hover:shadow-[0_10px_22px_-8px_rgba(11,79,58,0.5)] disabled:opacity-50 disabled:shadow-none"
            >
              Approve
            </button>
            <button
              onClick={() => act(rejectProposal)}
              disabled={busy}
              className="rounded-xl border-[1.5px] border-line bg-white px-5 py-2.5 text-sm font-semibold text-stone-600 transition duration-200 hover:border-stone-300 hover:bg-warm disabled:opacity-50"
            >
              Reject
            </button>
          </>
        )}
        {proposal.status === "applied" && (
          <>
            <span
              className={`rounded-full px-2.5 py-1 text-xs font-bold ring-1 ring-inset ${STATUS_STYLE.applied}`}
            >
              Applied to your CRM
            </span>
            <button
              onClick={() => act(undoProposal)}
              disabled={busy}
              className="text-sm font-semibold text-pine hover:underline disabled:opacity-50"
            >
              Undo
            </button>
          </>
        )}
        {(proposal.status === "rejected" || proposal.status === "undone" || proposal.status === "failed") && (
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-bold ring-1 ring-inset ${STATUS_STYLE[proposal.status]}`}
          >
            {proposal.status === "rejected" ? "Rejected" : proposal.status === "undone" ? "Undone" : "Failed"}
          </span>
        )}
      </div>
    </article>
  );
}
