export const STAGES = [
  "New",
  "Discovery",
  "Contacted",
  "Meeting booked",
  "Proposal sent",
  "Negotiation",
  "Won",
] as const;

export type StageLabel = (typeof STAGES)[number];

export function money(n: number | null | undefined): string {
  if (n == null) return "—";
  return "$" + Math.round(n).toLocaleString("en-US");
}

export function moneyShort(n: number): string {
  if (n >= 1_000_000) return "$" + (n / 1_000_000).toFixed(2).replace(/\.?0+$/, "") + "M";
  if (n >= 1_000) return "$" + Math.round(n / 1_000) + "K";
  return "$" + Math.round(n);
}

export function timeAgo(d: Date | string): string {
  const t = typeof d === "string" ? new Date(d) : d;
  const s = Math.max(1, Math.floor((Date.now() - t.getTime()) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  if (days < 30) return `${days}d ago`;
  return t.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function daysSilent(d: Date | string): number {
  const t = typeof d === "string" ? new Date(d) : d;
  return Math.floor((Date.now() - t.getTime()) / 86400000);
}

/** Start of the current week (Monday 00:00 local). */
export function startOfWeek(from = new Date()): Date {
  const d = new Date(from);
  d.setHours(0, 0, 0, 0);
  const dow = (d.getDay() + 6) % 7; // Monday = 0
  d.setDate(d.getDate() - dow);
  return d;
}

export function fmtDate(d: Date | string): string {
  const t = typeof d === "string" ? new Date(d) : d;
  return t.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
