import { money, fmtDate } from "./constants";
import { categoryFor, type ProposalCategory } from "./category";

type AnyRec = Record<string, unknown>;

export type DiffRow = {
  field: string;
  current: string;
  proposed: string;
  pill?: boolean;
  /** Set when the user may edit this proposed value before approval. */
  edit?: "stage" | "date" | "text" | "number";
  /** ISO value for date rows (the input's value; `proposed` is display). */
  iso?: string;
};
export type CascadeRow = { icon: "slack" | "chart" | "sync" | "mail" | "user"; text: string };
export type Evidence = {
  kind: "call" | "email" | "chat";
  title: string;
  quote: string;
  meta: string;
  duration?: string;
} | null;

export type IconKind =
  | "building"
  | "building2"
  | "userPlus"
  | "calendar"
  | "mail"
  | "shield"
  | "users"
  | "mailOpen";

export type ProposalView = {
  id: string;
  type: string;
  category: ProposalCategory;
  iconKind: IconKind;
  title: string;
  confidence: number | null;
  status: string;
  reason: string;
  description: string;
  createdAt: string;
  decidedAt: string | null;
  sourceLine: string | null;
  subline: string | null;
  sourceTag: string;
  sourceFull: string | null;
  avatars: string[];
  conflicts: string[];
  dealExternalId: string | null;
  cta: "approve-preview" | "approve-ignore" | "review";
  diffRows: DiffRow[];
  requiredOk: boolean;
  cascade: CascadeRow[];
  evidence: Evidence;
};

export type ProposalViewCtx = {
  /** People shown as monogram avatars on the row (owner, contact, …). */
  people?: string[];
  /** Lowercased emails of contacts already in the CRM (conflict check). */
  contactEmails?: Set<string>;
  /** Current stage per deal externalId (stale-proposal conflict check). */
  dealStages?: Map<string, string>;
};

type ProposalLike = {
  id: string;
  type: string;
  category?: string;
  title: string;
  confidence: number | null;
  status: string;
  reason: string;
  createdAt: Date;
  decidedAt?: Date | null;
  dealExternalId?: string | null;
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

const SOURCE_TAG: Record<string, string> = {
  zoom: "Zoom",
  gmail: "Gmail",
  chat: "WhatsApp",
  calendar: "Meeting",
  manual: "Call",
  call: "Call",
  support: "Gmail",
};

const EVIDENCE_LABEL: Record<string, string> = {
  zoom: "Zoom Call",
  gmail: "Gmail Thread",
  chat: "WhatsApp",
  calendar: "Meeting",
  manual: "Call Notes",
  call: "Call",
  support: "Support Email",
};

export function toProposalView(
  p: ProposalLike,
  deal: DealLike,
  ctx?: ProposalViewCtx,
): ProposalView {
  const d = (p.detail ?? {}) as AnyRec;
  const s = (v: unknown) => (typeof v === "string" ? v : v == null ? "" : String(v));

  const category = (p.category as ProposalCategory | undefined) ?? categoryFor(p.type, d);

  // ---- icon tile kind ----
  let iconKind: IconKind = "building";
  const seededIcon = s(d.iconKind) as IconKind | "";
  if (seededIcon) iconKind = seededIcon;
  else if (p.type === "new_contact") iconKind = "userPlus";
  else if (p.type === "deal_field") iconKind = s(d.field) === "closeDate" ? "calendar" : "building2";
  else if (p.type === "followup_draft") iconKind = "mail";
  else if (p.type === "task") iconKind = "mailOpen";
  else if (p.type === "hygiene_fix") iconKind = s(d.kind) === "merge" ? "users" : "building2";

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
      edit: (s(r.edit) || undefined) as DiffRow["edit"],
      iso: s(r.iso) || undefined,
    }));
  } else if (p.type === "deal_stage") {
    diffRows = [
      { field: "Stage", current: s(d.fromValue) || deal?.stage || "—", proposed: s(d.toValue), pill: true, edit: "stage" as const },
    ];
    if (d.closeToValue)
      diffRows.push({
        field: "Close Date",
        current: deal?.closeDate ? fmtDate(deal.closeDate) : "—",
        proposed: fmtDate(s(d.closeToValue)),
        edit: "date",
        iso: s(d.closeToValue).slice(0, 10),
      });
    if (deal?.amount != null)
      diffRows.push({ field: "Amount", current: money(deal.amount), proposed: money(deal.amount) });
    if (deal?.closeDate && !d.closeToValue)
      diffRows.push({ field: "Close Date", current: fmtDate(deal.closeDate), proposed: fmtDate(deal.closeDate) });
  } else if (p.type === "deal_field") {
    const field = s(d.field);
    if (field === "closeDate") {
      diffRows = [
        {
          field: "Close Date",
          current: d.fromValue ? fmtDate(s(d.fromValue)) : "—",
          proposed: fmtDate(s(d.toValue)),
          edit: "date",
          iso: s(d.toValue).slice(0, 10),
        },
      ];
    } else if (field === "amount") {
      diffRows = [
        { field: "Amount", current: d.fromValue != null ? money(Number(d.fromValue)) : "—", proposed: money(Number(d.toValue)), edit: "number" },
      ];
    } else if (field === "healthFlag") {
      diffRows = [{ field: "Status", current: "Active", proposed: "Stalled", pill: true }];
    }
    if (deal?.amount != null && field !== "amount")
      diffRows.push({ field: "Amount", current: money(deal.amount), proposed: money(deal.amount) });
  } else if (p.type === "new_contact") {
    diffRows = [
      { field: "Name", current: "—", proposed: s(d.name), edit: "text" },
      { field: "Email", current: "—", proposed: s(d.email) || "—", edit: "text" },
      { field: "Company", current: "—", proposed: s(d.company) || "—", edit: "text" },
      { field: "Title", current: "—", proposed: s(d.title) || "—", edit: "text" },
    ];
  } else if (p.type === "new_deal") {
    diffRows = [
      { field: "Deal", current: "—", proposed: s(d.name), edit: "text" },
      { field: "Company", current: "—", proposed: s(d.company) || "—", edit: "text" },
      { field: "Amount", current: "—", proposed: d.amount != null ? money(Number(d.amount)) : "—", edit: "number" },
      { field: "Stage", current: "—", proposed: s(d.stage) || "New", pill: true, edit: "stage" },
    ];
  } else if (p.type === "followup_draft") {
    diffRows = [
      { field: "To", current: "—", proposed: s(d.toName) || s(d.toEmail), edit: "text" },
      { field: "Subject", current: "—", proposed: s(d.subject) || "Follow-up", edit: "text" },
    ];
    if (s(d.draftBody))
      diffRows.push({ field: "Draft", current: "—", proposed: s(d.draftBody) });
  } else if (p.type === "task") {
    diffRows = [{ field: "Task", current: "—", proposed: s(d.taskTitle) || p.title, edit: "text" }];
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
    const label = EVIDENCE_LABEL[p.capture.source] ?? EVIDENCE_LABEL[p.capture.kind] ?? "Source";
    const time = p.capture.occurredAt.toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
    });
    evidence = {
      kind: isCall ? "call" : p.capture.kind === "chat" ? "chat" : "email",
      title:
        s(d.evidenceTitle) ||
        `${p.capture.source === "zoom" ? "Zoom Call" : p.capture.title} — ${fmtDate(p.capture.occurredAt)}`,
      quote: s(d.evidenceQuote) || p.capture.snippet || p.capture.body.slice(0, 160),
      meta: `— ${label} • ${fmtDate(p.capture.occurredAt)} • ${time}`,
      duration: s(d.duration) || undefined,
    };
  }

  // ---- conflicts (computed from live CRM state, never invented) ----
  const conflicts: string[] = [];
  if (ctx) {
    if (p.type === "new_contact") {
      const email = s(d.email).toLowerCase();
      if (email && ctx.contactEmails?.has(email)) {
        conflicts.push("A contact with this email already exists in your CRM.");
      }
    }
    if ((p.type === "deal_stage" || p.type === "deal_field") && p.dealExternalId) {
      const from = s(d.fromValue);
      const nowStage = ctx.dealStages?.get(p.dealExternalId);
      if (from && nowStage && nowStage !== from) {
        conflicts.push(`This deal has moved since the suggestion was made (now ${nowStage}).`);
      }
    }
  }

  const sourceTag = p.capture
    ? (SOURCE_TAG[p.capture.source] ?? SOURCE_TAG[p.capture.kind] ?? "Other")
    : "Other";

  return {
    id: p.id,
    type: p.type,
    category,
    iconKind,
    title: p.title,
    confidence: p.confidence,
    status: p.status,
    reason: p.reason,
    description: s(d.description) || p.reason,
    createdAt: p.createdAt.toISOString(),
    decidedAt: p.decidedAt ? p.decidedAt.toISOString() : null,
    sourceLine,
    subline,
    sourceTag,
    sourceFull: p.capture?.body || null,
    avatars: ctx?.people ?? [],
    conflicts,
    dealExternalId: p.dealExternalId ?? null,
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

// ---- Pipeline board: one deal, serialised for the client ----
export type DealActivity = { title: string; status: string; when: string };
export type DealInsight = {
  /** "Going cold" | "No reply" | "Promise due" | "Progressed" | "Latest signal" | "On track" */
  label: string;
  tone: "red" | "amber" | "purple" | "green" | "grey";
  text: string;
  /** e.g. "Zoom Call • Nov 24, 2026" — the evidence behind the latest proposal, when one exists */
  source: string | null;
  quote: string | null;
};
export type DealView = {
  id: string;
  externalId: string;
  name: string;
  company: string | null;
  stage: string;
  amount: number | null;
  closeDate: string | null; // pre-formatted
  ownerName: string | null;
  lastActivityLabel: string; // "2d ago"
  health: { flag: "going_cold" | "no_reply" | "promise_due"; label: string; note: string | null } | null;
  contact: { name: string; title: string | null; email: string | null } | null;
  signatureStatus: string | null;
  activity: DealActivity[];
  latestReason: string | null;
  // ---- Pipeline Compare extras (only the pipeline page fills these) ----
  prevStage?: string;
  daysInStage?: number | null;
  risk?: "High" | "Medium" | "Low" | null;
  insight?: DealInsight | null;
  tabFlags?: { progressed: boolean; stalled: boolean; slipped: boolean };
};
