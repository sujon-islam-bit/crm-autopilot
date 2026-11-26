"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { I } from "./icons";
import type { ProposalView } from "../lib/view";
import { confidenceTone } from "../lib/view";
import { approveAction, rejectAction } from "../lib/actions";

export function ConfidencePill({ value }: { value: number | null }) {
  if (value == null) return null;
  const tone = confidenceTone(value);
  const cls =
    tone === "green"
      ? "bg-green-tint text-green"
      : tone === "amber"
        ? "bg-amber-tint text-amber"
        : "bg-canvas text-muted";
  return (
    <span className={`inline-flex w-[42px] shrink-0 items-center justify-center rounded-full px-2 py-[3px] text-[12px] font-bold ${cls}`}>
      {value}%
    </span>
  );
}

export default function ProposalRow({
  view,
  first = false,
  selected = false,
  onSelect,
  wrap = false,
  menu = false,
}: {
  view: ProposalView;
  first?: boolean;
  selected?: boolean;
  onSelect: (v: ProposalView) => void;
  /** Wrap long titles/source lines instead of truncating (Approvals page). */
  wrap?: boolean;
  /** Render the ⋮ as a dropdown menu (Review details / Ignore) instead of a
   *  plain select button (Approvals page). The dashboard keeps the plain
   *  button so its approved behaviour is unchanged. */
  menu?: boolean;
}) {
  const router = useRouter();
  const [busy, start] = useTransition();
  const [menuPos, setMenuPos] = useState<{ top: number; right: number } | null>(null);

  const approve = (e: React.MouseEvent) => {
    e.stopPropagation();
    start(async () => {
      await approveAction(view.id);
      router.refresh();
    });
  };
  const ignore = (e: React.MouseEvent) => {
    e.stopPropagation();
    setMenuPos(null);
    start(async () => {
      await rejectAction(view.id);
      router.refresh();
    });
  };
  const toggleMenu = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (menuPos) {
      setMenuPos(null);
      return;
    }
    const r = e.currentTarget.getBoundingClientRect();
    const MENU_H = 92;
    const top = r.bottom + MENU_H + 6 > window.innerHeight ? r.top - MENU_H - 4 : r.bottom + 4;
    setMenuPos({ top, right: Math.max(8, window.innerWidth - r.right) });
  };

  return (
    <div
      onClick={() => onSelect(view)}
      className={`relative flex cursor-pointer items-center gap-3 px-4 py-[13px] transition-colors hover:bg-[#fafaff] ${
        selected ? "bg-[#f4f7ff]" : ""
      }`}
    >
      {first && <span className="absolute top-2 bottom-2 left-0 w-[3px] rounded-full bg-primary" />}
      <ConfidencePill value={view.confidence} />
      <div className="min-w-0 flex-1">
        <div className={wrap ? "text-[14px] leading-snug font-semibold text-ink" : "truncate text-[14px] font-semibold text-ink"}>
          {view.title}
        </div>
        <div className={wrap ? "mt-0.5 text-[12px] leading-snug text-muted" : "mt-0.5 truncate text-[12px] text-muted"}>
          {view.sourceLine ?? view.subline ?? view.reason}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2" onClick={(e) => e.stopPropagation()}>
        {view.cta !== "review" && (
          <button onClick={approve} disabled={busy} className="btn-primary px-3.5 py-[7px] text-[12.5px] disabled:opacity-60">
            Approve
          </button>
        )}
        {view.cta === "approve-preview" && (
          <button onClick={() => onSelect(view)} className="btn-outline px-4 py-[7px] text-[13px]">
            Preview
          </button>
        )}
        {view.cta === "approve-ignore" && (
          <button onClick={ignore} disabled={busy} className="btn-outline px-3.5 py-[7px] text-[12.5px] disabled:opacity-60">
            Ignore
          </button>
        )}
        {view.cta === "review" && (
          <button onClick={() => onSelect(view)} className="btn-outline px-3.5 py-[7px] text-[12.5px] font-semibold text-primary">
            Review
          </button>
        )}
        {menu ? (
          <button
            onClick={toggleMenu}
            className="flex h-8 w-7 items-center justify-center rounded-lg text-faint hover:bg-canvas hover:text-ink2"
            aria-label="More options"
            aria-expanded={menuPos !== null}
          >
            <I n="dots" size={16} />
          </button>
        ) : (
          <button
            onClick={() => onSelect(view)}
            className="flex h-8 w-7 items-center justify-center rounded-lg text-faint hover:bg-canvas hover:text-ink2"
            aria-label="More options"
          >
            <I n="dots" size={16} />
          </button>
        )}
      </div>
      {menu && menuPos && (
        <>
          <span className="fixed inset-0 z-30 cursor-default" onClick={(e) => { e.stopPropagation(); setMenuPos(null); }} />
          <span
            className="fixed z-40 block w-44 rounded-xl border border-line bg-white p-1 shadow-[0_16px_40px_-12px_rgba(23,23,40,0.3)]"
            style={{ top: menuPos.top, right: menuPos.right }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={(e) => { e.stopPropagation(); setMenuPos(null); onSelect(view); }}
              className="flex w-full items-center rounded-lg px-3 py-2 text-left text-[13px] font-medium text-ink2 hover:bg-canvas"
            >
              Review details
            </button>
            <button
              onClick={ignore}
              disabled={busy}
              className="flex w-full items-center rounded-lg px-3 py-2 text-left text-[13px] font-medium text-ink2 hover:bg-canvas disabled:opacity-60"
            >
              Ignore
            </button>
          </span>
        </>
      )}
    </div>
  );
}
