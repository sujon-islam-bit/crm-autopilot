import { money, fmtDate } from "./constants";

type AnyRec = Record<string, unknown>;

export type DiffRow = { field: string; current: string; proposed: string; pill?: boolean };
export type CascadeRow = { icon: "slack" | "chart" | "sync" | "mail" | "user"; text: string };
export type Evidence = {
  kind: "call" | "email" | "chat";
  title: string;
  quote: string;
  duration?: string;
} | null;

export type ProposalView = {
  id: string;
  type: string;
  title: string;
  confidence: number | null;
  status: string;
  reason: string;
  createdAt: string;
  decidedAt: string | null;
  sourceLine: string | null;
  subline: string | null;
  cta: "approve-preview" | "approve-ignore" | "review";
  diffRows: DiffRow[];
  requiredOk: boolean;
  cascade: CascadeRow[];
  evidence: Evidence;
};

type ProposalLike = {
  id: string;
  type: string;
  title: string;
  confidence: number | null;
  status: string;
  reason: string;
  createdAt: Date;
  decidedAt?: Date | null;
  detail: unknown;
  capture?: {
    kind: string;
    source: string;
    title: string;
    snippet: string;
    body: string;
    occurredAt: Date;
  } | null;
};

type DealLike = {
  name: string;
  company: string | null;
  stage: string;
  amount: number | null;
  closeDate: Date | null;
} | null;

const SOURCE_LABEL: Record<string, string> = {
  zoom: "Zoom",
  gmail: "Gmail thread",
  calendar: "Calendar",
  call: "Call notes",
  chat: "Chat",
  outlook: "Outlook",
};

export function toProposalView(p: ProposalLike, deal: DealLike): ProposalView {
  const d = (p.detail ?? {}) as AnyRec;
  const s = (v: unknown) => (typeof v === "string" ? v : v == null ? "" : String(v));

  // ---- source line ----
  let sourceLine: string | null = s(d.sourceLine) || null;
  if (!sourceLine && p.capture) {
    const label = SOURCE_LABEL[p.capture.source] ?? SOURCE_LABEL[p.capture.kind] ?? "Source";
    const q = p.capture.snippet ? ` • "${p.capture.snippet.slice(0, 42)}"` : "";
    sourceLine = `Src: ${label}${q}`;
  }
  const subline = s(d.subline) || null;

  // ---- cta ----
  let cta: ProposalView["cta"] = "approve-preview";
  if (s(d.cta) === "review") cta = "review";
  else if (p.type === "new_contact") cta = "approve-ignore";

  // ---- diff rows ----
  let diffRows: DiffRow[] = [];
  if (Array.isArray(d.diffRows)) {
    diffRows = (d.diffRows as AnyRec[]).map((r) => ({
      field: s(r.field),
      current: s(r.current),
      proposed: s(r.proposed),
      pill: Boolean(r.pill),
    }));
  } else if (p.type === "deal_stage") {
    diffRows = [
      { field: "Stage", current: s(d.fromValue) || deal?.stage || "—", proposed: s(d.toValue), pill: true },
    ];
    if (deal?.amount != null)
      diffRows.push({ field: "Amount", current: money(deal.amount), proposed: money(deal.amount) });
    if (deal?.closeDate)
      diffRows.push({ field: "Close Date", current: fmtDate(deal.closeDate), proposed: fmtDate(deal.closeDate) });
  } else if (p.type === "deal_field") {
    const field = s(d.field);
    if (field === "closeDate") {
      diffRows = [
        { field: "Close Date", current: d.fromValue ? fmtDate(s(d.fromValue)) : "—", proposed: fmtDate(s(d.toValue)) },
      ];
    } else if (field === "amount") {
      diffRows = [
        { field: "Amount", current: d.fromValue != null ? money(Number(d.fromValue)) : "—", proposed: money(Number(d.toValue)) },
      ];
    } else if (field === "healthFlag") {
      diffRows = [{ field: "Status", current: "Active", proposed: "Stalled", pill: true }];
    }
    if (deal?.amount != null && field !== "amount")
      diffRows.push({ field: "Amount", current: money(deal.amount), proposed: money(deal.amount) });
  } else if (p.type === "new_contact") {
    diffRows = [
      { field: "Name", current: "—", proposed: s(d.name) },
      { field: "Email", current: "—", proposed: s(d.email) || "—" },
      { field: "Company", current: "—", proposed: s(d.company) || "—" },
      { field: "Title", current: "—", proposed: s(d.title) || "—" },
    ];
  } else if (p.type === "new_deal") {
    diffRows = [
      { field: "Deal", current: "—", proposed: s(d.name) },
      { field: "Company", current: "—", proposed: s(d.company) || "—" },
      { field: "Amount", current: "—", proposed: d.amount != null ? money(Number(d.amount)) : "—" },
      { field: "Stage", current: "—", proposed: s(d.stage) || "New", pill: true },
    ];
  } else if (p.type === "followup_draft") {
    diffRows = [
      { field: "To", current: "—", proposed: s(d.toName) || s(d.toEmail) },
      { field: "Subject", current: "—", proposed: s(d.subject) || "Follow-up" },
    ];
  } else if (p.type === "task") {
    diffRows = [{ field: "Task", current: "—", proposed: s(d.taskTitle) || p.title }];
  }

  const requiredOk =
    typeof d.requiredOk === "boolean" ? d.requiredOk : p.type.startsWith("deal") ? deal?.amount != null : true;

  // ---- cascade ----
  let cascade: CascadeRow[] = [];
  if (Array.isArray(d.cascade)) {
    cascade = (d.cascade as AnyRec[]).map((r) => ({
      icon: (s(r.icon) as CascadeRow["icon"]) || "sync",
      text: s(r.text),
    }));
  } else if (p.type === "deal_stage") {
    cascade = [
      { icon: "sync", text: "Updates the deal in your CRM and in Deals & Contacts" },
      ...(deal?.amount
        ? [{ icon: "chart" as const, text: `Moves ${money(deal.amount)} into the ${s(d.toValue)} pipeline` }]
        : []),
    ];
  } else if (p.type === "new_contact") {
    cascade = [{ icon: "user", text: "Adds the contact to your CRM and Contacts list" }];
  } else if (p.type === "followup_draft") {
    cascade = [{ icon: "mail", text: "Sends only after approval — from your connected Gmail" }];
  } else {
    cascade = [{ icon: "sync", text: "Updates your CRM — nothing is sent without approval" }];
  }

  // ---- evidence ----
  let evidence: Evidence = null;
  if (p.capture) {
    const isCall = p.capture.kind === "call" || p.capture.kind === "meeting";
    evidence = {
      kind: isCall ? "call" : p.capture.kind === "chat" ? "chat" : "email",
      title:
        s(d.evidenceTitle) ||
        `${p.capture.source === "zoom" ? "Zoom Call" : p.capture.title} — ${fmtDate(p.capture.occurredAt)}`,
      quote: p.capture.snippet || p.capture.body.slice(0, 160),
      duration: s(d.duration) || undefined,
    };
  }

  return {
    id: p.id,
    type: p.type,
    title: p.title,
    confidence: p.confidence,
    status: p.status,
    reason: p.reason,
    createdAt: p.createdAt.toISOString(),
    decidedAt: p.decidedAt ? p.decidedAt.toISOString() : null,
    sourceLine,
    subline,
    cta,
    diffRows,
    requiredOk,
    cascade,
    evidence,
  };
}

export function confidenceTone(c: number | null): "green" | "amber" | "grey" {
  if (c == null) return "grey";
  if (c >= 80) return "green";
  if (c >= 60) return "amber";
  return "grey";
}
