"use client";

import { I } from "./icons";
import { timeAgo } from "../lib/constants";
import { confidenceTone, type ProposalView, type IconKind } from "../lib/view";

export const TILE_STYLES: Record<IconKind, string> = {
  building: "bg-[#e8effe] text-primary",
  building2: "bg-[#e8effe] text-primary",
  userPlus: "bg-green-tint text-green",
  calendar: "bg-violet-tint text-violet",
  mail: "bg-[#fdeeda] text-[#d97a06]",
  shield: "bg-green-tint text-green",
  users: "bg-violet-tint text-violet",
  mailOpen: "bg-[#e8effe] text-primary",
};

export function BarsPill({ value }: { value: number | null }) {
  if (value == null) return null;
  const tone = confidenceTone(value);
  const cls =
    tone === "green" || value >= 70
      ? "bg-green-tint text-green"
      : tone === "amber"
        ? "bg-amber-tint text-amber"
        : "bg-canvas text-muted";
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-[5px] text-[12.5px] font-bold ${cls}`}
    >
      <I n="bars" size={12} sw={2.6} />
      {value}%
    </span>
  );
}

export function MiniAvatar({ name, size = 28 }: { name: string; size?: number }) {
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white ring-2 ring-white"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.36,
        background: "linear-gradient(135deg,#7aa5f8,#2b6bf0 55%,#7c5cf0)",
      }}
    >
      {initials}
    </span>
  );
}

export function RowCheckbox({
  checked,
  onToggle,
  label,
}: {
  checked: boolean;
  onToggle: () => void;
  label: string;
}) {
  return (
    <button
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-[5px] border transition-colors ${
        checked ? "border-violet bg-violet text-white" : "border-[#cfd2e0] bg-white hover:border-violet"
      }`}
    >
      {checked && <I n="check" size={12} sw={3} />}
    </button>
  );
}

export default function QueueRow({
  view,
  selected,
  checked,
  onSelect,
  onToggleCheck,
}: {
  view: ProposalView;
  selected: boolean;
  checked: boolean;
  onSelect: (v: ProposalView) => void;
  onToggleCheck: (id: string) => void;
}) {
  return (
    <div
      onClick={() => onSelect(view)}
      data-proposal-row={view.id}
      className={`flex cursor-pointer items-center gap-3.5 px-4 py-3.5 transition-colors hover:bg-[#fafaff] ${
        selected ? "bg-violet-soft hover:bg-violet-soft" : ""
      }`}
    >
      <RowCheckbox checked={checked} onToggle={() => onToggleCheck(view.id)} label={`Select: ${view.title}`} />
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] ${TILE_STYLES[view.iconKind]}`}>
        <I n={view.iconKind === "mailOpen" ? "mail" : view.iconKind} size={19} sw={1.9} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-[14.5px] leading-snug font-semibold text-ink">{view.title}</div>
        <div className="mt-0.5 text-[12.5px] leading-snug text-muted">
          {view.subline ?? view.sourceLine ?? view.reason}
        </div>
      </div>
      <BarsPill value={view.confidence} />
      <span className="flex shrink-0 items-center gap-1 text-[12px] whitespace-nowrap text-faint">
        <I n="clock" size={13} />
        {timeAgo(view.createdAt)}
      </span>
      {view.avatars.length > 0 && (
        <span className="flex shrink-0 -space-x-2">
          {view.avatars.slice(0, 2).map((name, i) => (
            <MiniAvatar key={i} name={name} />
          ))}
        </span>
      )}
      <span
        className="flex shrink-0 overflow-hidden rounded-[9px] border border-line bg-white"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={() => onSelect(view)}
          className="px-3.5 py-[7px] text-[13px] font-medium text-ink2 transition-colors hover:bg-canvas"
        >
          View Details
        </button>
        <button
          onClick={() => onSelect(view)}
          aria-label="More detail options"
          className="border-l border-line px-2 text-muted transition-colors hover:bg-canvas"
        >
          <I n="chevD" size={13} />
        </button>
      </span>
    </div>
  );
}
