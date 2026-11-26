"use client";

import { I } from "./icons";
import type { DealView } from "../lib/view";
import { money } from "../lib/constants";
import { healthChipClass } from "../lib/health";
import { SignatureButton } from "./buttons";

/**
 * Deal detail drawer — same overlay family as DetailDrawer (identical shell
 * classes), showing the deal's real mirror data: fields, primary contact,
 * health state, the proposals recorded against it, and the SignuDoc action.
 * Render inside a `fixed inset-0` wrapper (Approvals pattern) or a relative
 * parent (Dashboard pattern).
 */
export default function DealDrawer({ deal, onClose }: { deal: DealView; onClose: () => void }) {
  return (
    <div className="card absolute top-5 right-7 bottom-7 z-30 flex w-[372px] flex-col overflow-y-auto p-[18px] shadow-[0_24px_64px_-12px_rgba(23,23,40,0.28)]">
      <div className="flex items-start gap-2.5">
        <span className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[10px] bg-primary-tint text-primary">
          <I n="briefcase" size={17} />
        </span>
        <h3 className="flex-1 text-[14.5px] leading-snug font-bold text-ink">{deal.name}</h3>
        <button onClick={onClose} className="text-faint hover:text-ink" aria-label="Close">
          <I n="x" size={16} />
        </button>
      </div>

      <div className="mt-3 flex items-center gap-2.5">
        <span className="text-[22px] leading-none font-extrabold tracking-tight">{money(deal.amount)}</span>
        <span className="rounded-md bg-primary-tint px-2 py-[3px] text-[12px] font-semibold text-primary">
          {deal.stage}
        </span>
        {deal.health && (
          <span
            className={`flex items-center gap-1 rounded-full px-2 py-[3px] text-[11px] font-bold ${healthChipClass(deal.health.flag)}`}
          >
            <I n="alert" size={10} sw={2.6} />
            {deal.health.label}
          </span>
        )}
      </div>

      {deal.health?.note && (
        <p className="mt-2.5 text-[12.5px] leading-snug text-muted">{deal.health.note}</p>
      )}

      <SectionTitle title="Deal details" />
      <div className="overflow-hidden rounded-xl border border-line">
        <Row label="Company" value={deal.company ?? "—"} />
        <Row label="Stage" value={deal.stage} />
        <Row label="Amount" value={money(deal.amount)} />
        <Row label="Close date" value={deal.closeDate ?? "—"} />
        <Row label="Owner" value={deal.ownerName ?? "—"} />
        <Row label="Last activity" value={deal.lastActivityLabel} />
        <Row
          label="Primary contact"
          value={
            deal.contact ? (
              <>
                <span className="font-medium text-ink">{deal.contact.name}</span>
                {deal.contact.title && <span className="text-muted"> · {deal.contact.title}</span>}
                {deal.contact.email && <span className="block text-[11.5px] text-muted">{deal.contact.email}</span>}
              </>
            ) : (
              "—"
            )
          }
          last
        />
      </div>

      <SectionTitle title="Recent activity" />
      {deal.activity.length > 0 ? (
        <div className="flex flex-col gap-2">
          {deal.activity.map((a, i) => (
            <div key={i} className="flex items-start gap-2.5 rounded-xl border border-line px-3 py-2.5">
              <StatusPill status={a.status} />
              <span className="min-w-0 flex-1 text-[12.5px] leading-snug font-medium text-ink2">{a.title}</span>
              <span className="shrink-0 text-[11px] text-faint">{a.when}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-[12.5px] text-muted">No proposals recorded for this deal yet.</p>
      )}
      {deal.latestReason && (
        <div className="mt-2.5 rounded-xl bg-canvas px-3.5 py-3">
          <div className="text-[11px] font-bold tracking-wide text-muted uppercase">Latest signal</div>
          <p className="mt-1 text-[12.5px] leading-snug text-ink2 italic">“{deal.latestReason}”</p>
        </div>
      )}

      <SectionTitle title="Signature" />
      {deal.signatureStatus ? (
        <div className="rounded-[10px] bg-canvas px-3.5 py-2.5 text-[12.5px] font-medium text-ink2">
          {deal.signatureStatus === "completed"
            ? "Completed — signed via SignuDoc."
            : deal.signatureStatus === "sent"
              ? "Sent via SignuDoc — waiting for the signature."
              : deal.signatureStatus === "declined"
                ? "Declined by the signer."
                : "Requested — SignuDoc isn't connected yet, so nothing has been sent."}
        </div>
      ) : (
        <div>
          <SignatureButton dealExternalId={deal.externalId} />
          <p className="mt-2 text-[12px] leading-snug text-muted">
            Sends the agreement through your SignuDoc instance when one is connected.
          </p>
        </div>
      )}
    </div>
  );
}

function SectionTitle({ title }: { title: string }) {
  return (
    <div className="mt-4 mb-2 flex items-center gap-1.5">
      <h4 className="text-[13.5px] font-bold text-ink">{title}</h4>
      <I n="info" size={13} className="text-faint" />
    </div>
  );
}

function Row({
  label,
  value,
  last = false,
}: {
  label: string;
  value: React.ReactNode;
  last?: boolean;
}) {
  return (
    <div className={`flex gap-3 px-3.5 py-2.5 text-[12.5px] ${last ? "" : "border-b border-line/70"}`}>
      <span className="w-[104px] shrink-0 text-muted">{label}</span>
      <span className="min-w-0 flex-1 text-ink2">{value}</span>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const cls =
    status === "applied"
      ? "bg-green-tint text-green"
      : status === "pending"
        ? "bg-amber-tint text-amber"
        : "bg-canvas text-muted";
  return (
    <span className={`shrink-0 rounded-full px-2 py-[2px] text-[10.5px] font-bold capitalize ${cls}`}>
      {status}
    </span>
  );
}
