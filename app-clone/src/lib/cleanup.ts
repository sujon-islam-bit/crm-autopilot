import "server-only";
import { prisma } from "./db";
import { computeHygiene } from "./hygiene";
import { getGuardrails, GUARDRAIL_RULES, type GuardrailKey } from "./guardrails";
import { effectiveHealth } from "./health";
import { fmtDate, timeAgo, daysSilent } from "./constants";
import type { DealView } from "./view";

/**
 * Data Cleanup (Data Hygiene design) — every number traces to rows:
 * - counts/score come from computeHygiene (the same source as the
 *   dashboard donut, so the two pages can never disagree);
 * - duplicate groups are the live contacts grouped by normalised email;
 * - missing-field suggestions are derived ONLY from data that exists:
 *   a title carried by the contact's duplicate record, or an email that
 *   literally appears in a capture mentioning the contact. Anything else
 *   is honestly "No suggestion yet";
 * - the trend is the HealthSnapshot history written by real scans.
 */

const DAY = 86_400_000;

function norm(s: string | null | undefined): string {
  return (s ?? "").trim().toLowerCase();
}

export type ContactRow = {
  id: string;
  name: string;
  email: string | null;
  title: string | null;
  company: string | null;
  industry: string | null;
  addedLabel: string;
};

export type DupGroup = {
  email: string;
  records: ContactRow[];
  pendingMerge: boolean;
};

export type MissingRow = {
  id: string;
  recordKind: "contact" | "deal";
  name: string;
  context: string | null;
  fields: string[];
  fieldLabels: string[];
  suggestion: { value: string; sourceLabel: string } | null;
  inApprovals: string | null;
};

export type StaleRow = {
  deal: DealView;
  daysSilent: number;
  inApprovals: boolean;
};

export type UnloggedRow = {
  id: string;
  title: string;
  sourceLabel: string;
  dateLabel: string;
  relLabel: string;
  inApprovals: boolean;
};

export type ActivityRow = {
  icon: "check" | "info";
  title: string;
  subline: string;
  when: string;
};

export type GuardrailRuleView = {
  key: GuardrailKey;
  label: string;
  desc: string;
  saved: boolean;
  effective: boolean;
};

export type CleanupData = {
  score: number | null;
  scoreDelta: number | null;
  verdict: string | null;
  counts: { duplicates: number; missing: number; unlogged: number; stale: number };
  duplicatesPaused: boolean;
  topIssues: { kind: "duplicate" | "missing" | "stale" | "unlogged"; title: string; subline: string; count: number }[];
  trend: { points: { label: string; score: number }[]; days: number };
  guardrails: { master: boolean; rules: GuardrailRuleView[] };
  recentActivity: ActivityRow[];
  dupGroups: DupGroup[];
  missingRows: MissingRow[];
  staleRows: StaleRow[];
  unloggedRows: UnloggedRow[];
  hasConnection: boolean;
};

const FIELD_LABEL: Record<string, string> = {
  owner: "Owner",
  title: "Job title",
  email: "Email",
  company: "Company",
  amount: "Amount",
};

const SOURCE_LABEL: Record<string, string> = {
  calendar: "Calendar",
  zoom: "Zoom",
  gmail: "Gmail",
  outlook: "Outlook",
  manual: "Manual",
  chat: "Chat",
  support: "Support",
};

function verdictFor(score: number | null): string | null {
  if (score == null) return null;
  if (score >= 90) return "Your CRM data is in excellent shape!";
  if (score >= 70) return "Your CRM data is in good shape — a few fixes will polish it.";
  return "Your CRM data needs attention — start with the top issues below.";
}

export async function getCleanupData(workspaceId: string, periodDays: number): Promise<CleanupData> {
  const h = await computeHygiene(workspaceId);
  const guardrails = await getGuardrails(workspaceId);

  const [contacts, deals, captures, pending, hygieneProposals, audits, snapshots, connectionCount] =
    await Promise.all([
      prisma.crmContact.findMany({ where: { workspaceId }, orderBy: { createdAt: "asc" } }),
      prisma.crmDeal.findMany({ where: { workspaceId } }),
      prisma.capture.findMany({ where: { workspaceId }, orderBy: { occurredAt: "desc" } }),
      prisma.proposal.findMany({ where: { workspaceId, status: "pending" } }),
      prisma.proposal.findMany({ where: { workspaceId, type: "hygiene_fix" }, select: { id: true, detail: true } }),
      prisma.auditEvent.findMany({ where: { workspaceId }, orderBy: { createdAt: "desc" }, take: 40 }),
      prisma.healthSnapshot.findMany({
        where: { workspaceId, date: { gte: new Date(new Date().setHours(0, 0, 0, 0) - (periodDays - 1) * DAY) } },
        orderBy: { date: "asc" },
      }),
      prisma.connection.count({ where: { workspaceId } }),
    ]);

  const dealById = new Map(deals.map((d) => [d.id, d]));
  const captureById = new Map(captures.map((c) => [c.id, c]));
  const pendingDetail = (p: (typeof pending)[number]) => (p.detail ?? {}) as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === "string" ? v : v == null ? "" : String(v));

  // ---------- duplicate groups ----------
  const pendingMergeContactIds = new Set<string>();
  for (const p of pending) {
    if (p.type !== "hygiene_fix") continue;
    const d = pendingDetail(p);
    if (str(d.kind) === "merge") {
      if (d.masterId) pendingMergeContactIds.add(str(d.masterId));
      if (d.duplicateId) pendingMergeContactIds.add(str(d.duplicateId));
    }
  }
  const groupsByEmail = new Map<string, typeof contacts>();
  for (const c of contacts) {
    const key = norm(c.email);
    if (!key) continue;
    groupsByEmail.set(key, [...(groupsByEmail.get(key) ?? []), c]);
  }
  const dupGroups: DupGroup[] = [...groupsByEmail.entries()]
    .filter(([, recs]) => recs.length > 1)
    .map(([email, recs]) => ({
      email,
      records: recs.map((c) => ({
        id: c.id,
        name: c.name,
        email: c.email,
        title: c.title,
        company: c.company,
        industry: c.industry,
        addedLabel: fmtDate(c.createdAt),
      })),
      pendingMerge: recs.some((c) => pendingMergeContactIds.has(c.id)),
    }))
    .sort((a, b) => a.records[0].name.localeCompare(b.records[0].name));

  // ---------- missing fields ----------
  const enrichByContact = new Map<string, string>();
  for (const p of pending) {
    if (p.type !== "hygiene_fix") continue;
    const d = pendingDetail(p);
    if (str(d.kind) === "enrich" && d.contactId) enrichByContact.set(str(d.contactId), str(d.toTitle));
  }
  const contactById = new Map(contacts.map((c) => [c.id, c]));
  const emailRegex = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;

  const missingRows: MissingRow[] = h.missing.map((item) => {
    const fields = item.detail
      .replace(/^Missing:\s*/, "")
      .split(",")
      .map((f) => f.trim())
      .filter(Boolean);
    if (item.contactId) {
      const c = contactById.get(item.contactId);
      let suggestion: MissingRow["suggestion"] = null;
      if (c && fields.includes("title")) {
        const twin = contacts.find((o) => o.id !== c.id && norm(o.email) === norm(c.email) && o.title);
        if (twin) suggestion = { value: twin.title!, sourceLabel: "From the duplicate record" };
      }
      if (c && !suggestion && fields.includes("email")) {
        for (const cap of captures) {
          const text = `${cap.title}\n${cap.fromLabel ?? ""}\n${cap.body}`;
          if (!text.toLowerCase().includes(c.name.toLowerCase())) continue;
          const found = text.match(emailRegex);
          if (found && found.length > 0) {
            suggestion = { value: found[0], sourceLabel: `From "${cap.title}"` };
            break;
          }
        }
      }
      return {
        id: c?.id ?? item.contactId,
        recordKind: "contact" as const,
        name: item.label,
        context: c?.company ?? null,
        fields,
        fieldLabels: fields.map((f) => FIELD_LABEL[f] ?? f),
        suggestion,
        inApprovals: enrichByContact.get(item.contactId) ?? null,
      };
    }
    const deal = item.dealId ? dealById.get(item.dealId) : undefined;
    return {
      id: deal?.id ?? item.dealId ?? item.label,
      recordKind: "deal" as const,
      name: item.label,
      context: deal?.company ?? null,
      fields,
      fieldLabels: fields.map((f) => FIELD_LABEL[f] ?? f),
      suggestion: null,
      inApprovals: null,
    };
  });

  // ---------- stale deals ----------
  const contactByCompany = new Map<string, (typeof contacts)[number]>();
  for (const c of [...contacts].sort((a, b) => a.name.localeCompare(b.name))) {
    if (c.company && !contactByCompany.has(c.company)) contactByCompany.set(c.company, c);
  }
  const signatures = await prisma.signatureRequest.findMany({ where: { workspaceId } });
  const sigByDeal = new Map<string, string>();
  for (const s of signatures) if (!sigByDeal.has(s.dealExternalId)) sigByDeal.set(s.dealExternalId, s.status);
  const allProposals = await prisma.proposal.findMany({
    where: { workspaceId },
    orderBy: { createdAt: "desc" },
    include: { capture: true },
  });
  const propsByDeal = new Map<string, typeof allProposals>();
  for (const p of allProposals) {
    if (!p.dealExternalId) continue;
    propsByDeal.set(p.dealExternalId, [...(propsByDeal.get(p.dealExternalId) ?? []), p]);
  }

  const staleRows: StaleRow[] = h.stale
    .map((item) => {
      const deal = item.dealId ? dealById.get(item.dealId) : undefined;
      if (!deal) return null;
      const health = effectiveHealth(deal);
      const dealProps = propsByDeal.get(deal.externalId) ?? [];
      const latest = dealProps[0];
      const contact = deal.company ? contactByCompany.get(deal.company) : undefined;
      const view: DealView = {
        id: deal.id,
        externalId: deal.externalId,
        name: deal.name,
        company: deal.company,
        stage: deal.stage,
        amount: deal.amount,
        closeDate: deal.closeDate ? fmtDate(deal.closeDate) : null,
        ownerName: deal.ownerName,
        lastActivityLabel: timeAgo(deal.lastActivityAt),
        health: health ? { flag: health.flag, label: health.label, note: health.note } : null,
        contact: contact ? { name: contact.name, title: contact.title, email: contact.email } : null,
        signatureStatus: sigByDeal.get(deal.externalId) ?? null,
        activity: dealProps.slice(0, 4).map((p) => ({
          title: p.title,
          status: p.status,
          when: timeAgo(p.createdAt),
        })),
        latestReason: latest?.reason || null,
        insight: health
          ? {
              label: health.label,
              tone: health.flag === "going_cold" ? "red" : health.flag === "no_reply" ? "amber" : "purple",
              text: latest?.reason || health.note || "Flagged by the AI from recent activity.",
              source: null,
              quote: null,
            }
          : latest
            ? { label: "Latest signal", tone: "grey", text: latest.reason || "The AI is tracking this deal.", source: null, quote: null }
            : { label: "On track", tone: "grey", text: "No AI flags on this deal right now.", source: null, quote: null },
      };
      return {
        deal: view,
        daysSilent: daysSilent(deal.lastActivityAt),
        inApprovals: pending.some(
          (p) => p.dealExternalId === deal.externalId && (p.type === "followup_draft" || p.type === "task"),
        ),
      };
    })
    .filter((r): r is StaleRow => r !== null)
    .sort((a, b) => b.daysSilent - a.daysSilent);

  // ---------- unlogged activities ----------
  const pendingByCapture = new Set(
    pending.filter((p) => p.captureId).map((p) => p.captureId as string),
  );
  const unloggedRows: UnloggedRow[] = h.unlogged.map((item) => {
    const cap = item.captureId ? captureById.get(item.captureId) : undefined;
    return {
      id: cap?.id ?? item.captureId ?? item.label,
      title: item.label,
      sourceLabel: cap ? (SOURCE_LABEL[cap.source] ?? "Calendar") : "Calendar",
      dateLabel: cap ? fmtDate(cap.occurredAt) : "",
      relLabel: cap ? timeAgo(cap.occurredAt) : "",
      inApprovals: item.captureId ? pendingByCapture.has(item.captureId) : false,
    };
  });

  // ---------- top issues ----------
  const fieldHistogram = new Map<string, number>();
  for (const row of missingRows) for (const f of row.fields) fieldHistogram.set(f, (fieldHistogram.get(f) ?? 0) + 1);
  const sortedFields = [...fieldHistogram.entries()].sort((a, b) => b[1] - a[1]);
  const dominant =
    sortedFields.length > 0 && (sortedFields.length === 1 || sortedFields[0][1] > sortedFields[1][1])
      ? sortedFields[0]
      : null;
  const missingSubline = dominant
    ? dominant[0] === "title"
      ? `${dominant[1]} contacts are missing job title`
      : dominant[0] === "email"
        ? `${dominant[1]} contacts are missing an email`
        : dominant[0] === "owner"
          ? `${dominant[1]} deals are missing an owner`
          : `${dominant[1]} records are missing ${dominant[0]}`
    : `${h.counts.missing} records are missing a field`;
  const topIssues: CleanupData["topIssues"] = [
    { kind: "duplicate", title: "Duplicate Contacts", subline: `${h.counts.duplicates} contacts may be duplicates`, count: h.counts.duplicates },
    { kind: "missing", title: "Missing Fields", subline: missingSubline, count: h.counts.missing },
    { kind: "stale", title: "Stale Deals", subline: `${h.counts.stale} deals have no activity for 7+ days`, count: h.counts.stale },
    { kind: "unlogged", title: "Unlogged Meetings", subline: `${h.counts.unlogged} meetings are not logged in CRM`, count: h.counts.unlogged },
  ];

  // ---------- recent activity (cleanup-related audit rows only) ----------
  const hygieneKindById = new Map<string, string>();
  for (const p of hygieneProposals) {
    const d = (p.detail ?? {}) as Record<string, unknown>;
    hygieneKindById.set(p.id, str(d.kind));
  }
  const ACTIVITY_TITLE: Record<string, Record<string, string>> = {
    merge: { proposed: "Duplicate contacts found", applied: "Duplicate contacts merged", undone: "Merge undone" },
    industry: { proposed: "Missing field detected", applied: "Missing field filled", undone: "Field fill undone" },
    enrich: { proposed: "Missing field detected", applied: "Contact enriched", undone: "Enrichment undone" },
    unlogged: { proposed: "Unlogged meeting found", applied: "Meeting logged", undone: "Log entry undone" },
    stale: { proposed: "Stale deal flagged", applied: "Stale deal reactivated", undone: "Reactivation undone" },
  };
  const recentActivity: ActivityRow[] = [];
  for (const a of audits) {
    const meta = (a.meta ?? {}) as Record<string, unknown>;
    const pid = typeof meta.proposalId === "string" ? meta.proposalId : null;
    const isScan = a.action === "synced" && /scan/i.test(a.summary);
    if (!isScan && !(pid && hygieneKindById.has(pid))) continue;
    const kind = pid ? hygieneKindById.get(pid) : undefined;
    const title = isScan
      ? "Data health scan"
      : (ACTIVITY_TITLE[kind ?? ""]?.[a.action] ?? (a.action === "applied" ? "Cleanup applied" : "Cleanup suggested"));
    recentActivity.push({
      icon: a.action === "applied" ? "check" : "info",
      title,
      subline: a.summary.replace(/^AI proposed:\s*/, "").replace(/^Applied:\s*/, ""),
      when: timeAgo(a.createdAt),
    });
    if (recentActivity.length >= 4) break;
  }

  // ---------- trend ----------
  const trend = {
    points: snapshots.map((s) => ({
      label: s.date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      score: s.score,
    })),
    days: periodDays,
  };

  return {
    score: h.score,
    scoreDelta: h.scoreDelta,
    verdict: verdictFor(h.score),
    counts: h.counts,
    duplicatesPaused: h.duplicatesPaused,
    topIssues,
    trend,
    guardrails: {
      master: guardrails.master,
      rules: GUARDRAIL_RULES.map((r) => ({
        key: r.key,
        label: r.label,
        desc: r.desc,
        saved: guardrails.saved[r.key],
        effective: guardrails.effective[r.key],
      })),
    },
    recentActivity,
    dupGroups: h.duplicatesPaused ? [] : dupGroups,
    missingRows,
    staleRows,
    unloggedRows,
    hasConnection: connectionCount > 0,
  };
}
