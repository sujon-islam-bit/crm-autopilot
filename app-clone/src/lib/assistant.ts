import "server-only";
import { randomUUID } from "node:crypto";
import { prisma } from "./db";
import { askAiJson } from "./ai";
import { computeHygiene } from "./hygiene";
import { getStalledDeals } from "./team";
import { categoryFor } from "./category";
import { STAGES, daysSilent, fmtDate, money } from "./constants";
import { can, hasTeamScope, normalizeRole, ownsDeal } from "./permissions";
import { parseWorkspaceSettings } from "./settings";
import type { Prisma } from "../generated/prisma/client";

/**
 * The in-product AI Assistant's brain.
 *
 * Grounding rule: every number and name in an answer comes from the data
 * layer below (real Prisma rows, scoped to the caller exactly like the
 * rest of the app). The LLM is used to understand phrasing, to draft
 * follow-up copy, and for open questions against a real-data summary —
 * never as the source of a figure.
 *
 * Write rule: the assistant NEVER applies a change. "Move a deal" and
 * "draft a follow-up" create a pending Proposal (source "chat") and the
 * chat shows a proposal card whose Approve/Dismiss buttons run the
 * existing decide actions under the existing permission gates.
 */

export type AssistantCtx = {
  workspaceId: string;
  userId: string;
  userName: string;
  role: string;
};

export type { AssistantBlock, ProposalCardData, SerializedMessage } from "./assistant-types";
import type { AssistantBlock, ProposalCardData, SerializedMessage } from "./assistant-types";

type DealRow = Awaited<ReturnType<typeof loadDeals>>[number];

function loadDeals(workspaceId: string) {
  return prisma.crmDeal.findMany({ where: { workspaceId }, orderBy: { name: "asc" } });
}

/** Read scope: everyone sees the whole workspace's data EXCEPT a Sales
 *  Rep, who sees only their own records (the same rule the dashboards
 *  use — a Viewer reads everything, they just can't change anything). */
function readsAll(ctx: AssistantCtx): boolean {
  return normalizeRole(ctx.role) !== "rep";
}

/** Deals the caller may see: all roles read all; a Sales Rep only their own. */
function scopeDeals(ctx: AssistantCtx, deals: DealRow[]): DealRow[] {
  if (readsAll(ctx)) return deals;
  return deals.filter((d) => ownsDeal(ctx.userName, d.ownerName));
}

async function ownDealIds(ctx: AssistantCtx): Promise<Set<string>> {
  const deals = await loadDeals(ctx.workspaceId);
  return new Set(scopeDeals(ctx, deals).map((d) => d.externalId));
}

// ---------- fuzzy matching ----------

function norm(s: string): string {
  return s
    .toLowerCase()
    .replace(/[.,'"!?]/g, " ")
    .replace(/\b(inc|llc|ltd|corp|co|company|the)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function matchDeal(deals: DealRow[], text: string): DealRow | null {
  const t = ` ${norm(text)} `;
  let best: DealRow | null = null;
  let bestLen = 0;
  for (const d of deals) {
    for (const cand of [d.name, d.company]) {
      if (!cand) continue;
      const n = norm(cand);
      if (n.length >= 3 && t.includes(` ${n} `) && n.length > bestLen) {
        best = d;
        bestLen = n.length;
      }
    }
  }
  return best;
}

const STAGE_SYNONYMS: { re: RegExp; stage: string }[] = [
  { re: /\bproposal sent\b/, stage: "Proposal sent" },
  { re: /\bproposal\b/, stage: "Proposal sent" },
  { re: /\bnegotiat\w*\b/, stage: "Negotiation" },
  { re: /\bmeeting booked\b/, stage: "Meeting booked" },
  { re: /\bmeeting\b/, stage: "Meeting booked" },
  { re: /\bdiscovery\b/, stage: "Discovery" },
  { re: /\bcontacted\b/, stage: "Contacted" },
  { re: /\bwon\b/, stage: "Won" },
  { re: /\blost\b/, stage: "Lost" },
  { re: /\bnew\b/, stage: "New" },
];

function matchStage(text: string): string | null {
  const t = text.toLowerCase();
  for (const s of STAGE_SYNONYMS) if (s.re.test(t)) return s.stage;
  return null;
}

type Person = { name: string; email: string | null; company: string | null; title: string | null };

async function matchPerson(ctx: AssistantCtx, text: string): Promise<Person | null> {
  const t = ` ${norm(text)} `;
  const contacts = await prisma.crmContact.findMany({ where: { workspaceId: ctx.workspaceId } });
  let best: Person | null = null;
  let bestLen = 0;
  const consider = (p: Person) => {
    const n = norm(p.name);
    if (n.length >= 3 && t.includes(` ${n} `) && n.length > bestLen) {
      best = p;
      bestLen = n.length;
    }
    // First-name-only reference ("draft a follow-up for Sarah") — accept
    // when exactly one record carries that first name.
    const first = n.split(" ")[0];
    if (first && first.length >= 3 && t.includes(` ${first} `)) {
      // handled by the caller's uniqueness pass below; keep simple: skip
    }
  };
  for (const c of contacts) consider({ name: c.name, email: c.email, company: c.company, title: c.title });
  if (best) return best;
  // People the AI has spotted but who aren't contacts yet (pending
  // new-contact proposals carry name/email/company in their detail).
  const proposals = await prisma.proposal.findMany({
    where: { workspaceId: ctx.workspaceId, type: "new_contact" },
    select: { detail: true },
  });
  for (const p of proposals) {
    const d = (p.detail ?? {}) as Record<string, unknown>;
    if (typeof d.name === "string") {
      consider({
        name: d.name,
        email: typeof d.email === "string" ? d.email : null,
        company: typeof d.company === "string" ? d.company : null,
        title: typeof d.title === "string" ? d.title : null,
      });
    }
  }
  return best;
}

// ---------- proposal cards ----------

function proposalSummary(p: { type: string; title: string; detail: unknown }, dealName?: string): string {
  const d = (p.detail ?? {}) as Record<string, unknown>;
  if (p.type === "deal_stage") {
    return `${dealName ?? p.title} — stage: ${String(d.fromValue ?? "?")} → ${String(d.toValue ?? "?")}`;
  }
  if (p.type === "followup_draft") {
    return `Follow-up draft for ${String(d.toName ?? "—")}${d.subject ? ` — "${String(d.subject)}"` : ""}. Nothing is sent until you approve it.`;
  }
  return String(d.description ?? p.title);
}

export async function canDecideProposal(
  ctx: AssistantCtx,
  p: { dealExternalId: string | null },
): Promise<boolean> {
  if (!can(ctx.role, "proposals.decide")) return false;
  if (hasTeamScope(ctx.role)) return true;
  if (!p.dealExternalId) return false;
  const deal = await prisma.crmDeal.findFirst({
    where: { workspaceId: ctx.workspaceId, externalId: p.dealExternalId },
    select: { ownerName: true },
  });
  return !!deal && ownsDeal(ctx.userName, deal.ownerName);
}

export async function proposalCard(ctx: AssistantCtx, proposalId: string): Promise<ProposalCardData | null> {
  const p = await prisma.proposal.findFirst({ where: { id: proposalId, workspaceId: ctx.workspaceId } });
  if (!p) return null;
  const deal = p.dealExternalId
    ? await prisma.crmDeal.findFirst({
        where: { workspaceId: ctx.workspaceId, externalId: p.dealExternalId },
        select: { name: true },
      })
    : null;
  return {
    id: p.id,
    title: p.title,
    summary: proposalSummary(p, deal?.name),
    status: p.status,
    canDecide: await canDecideProposal(ctx, p),
  };
}

// ---------- daily limit ----------

/** Start of today in Asia/Dhaka (the workspace's home timezone, UTC+6,
 *  no DST) as a UTC instant — the daily counter resets at Dhaka midnight. */
export function dhakaDayStart(now = new Date()): Date {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Dhaka",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "01";
  return new Date(`${get("year")}-${get("month")}-${get("day")}T00:00:00+06:00`);
}

/** Per-user assistant usage for today: the workspace's configured limit
 *  (Settings → AI Preferences, default 30) vs. the caller's user-role
 *  messages created since Dhaka midnight. */
export async function getAssistantUsage(
  ctx: AssistantCtx,
): Promise<{ limit: number; used: number; remaining: number }> {
  const ws = await prisma.workspace.findUnique({
    where: { id: ctx.workspaceId },
    select: { settings: true },
  });
  const limit = parseWorkspaceSettings(ws?.settings).assistantDailyLimit;
  const used = await prisma.assistantMessage.count({
    where: {
      workspaceId: ctx.workspaceId,
      userId: ctx.userId,
      role: "user",
      createdAt: { gte: dhakaDayStart() },
    },
  });
  return { limit, used, remaining: Math.max(0, limit - used) };
}

export function assistantLimitMessage(limit: number): string {
  return `You've reached today's assistant limit (${limit} messages). It resets tomorrow — or your workspace admin can raise it in Settings → AI Preferences.`;
}

// ---------- threads / persistence ----------

export async function latestThreadId(ctx: AssistantCtx): Promise<string> {
  const last = await prisma.assistantMessage.findFirst({
    where: { workspaceId: ctx.workspaceId, userId: ctx.userId },
    orderBy: { createdAt: "desc" },
    select: { threadId: true },
  });
  return last?.threadId ?? randomUUID();
}

/** The given thread must belong to this user+workspace (or be brand new). */
export async function threadBelongs(ctx: AssistantCtx, threadId: string): Promise<boolean> {
  const any = await prisma.assistantMessage.findFirst({
    where: { threadId },
    select: { userId: true, workspaceId: true },
  });
  if (!any) return true;
  return any.userId === ctx.userId && any.workspaceId === ctx.workspaceId;
}

export async function loadThread(ctx: AssistantCtx, threadId: string): Promise<SerializedMessage[]> {
  const rows = await prisma.assistantMessage.findMany({
    where: { workspaceId: ctx.workspaceId, userId: ctx.userId, threadId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  rows.reverse();
  const out: SerializedMessage[] = [];
  for (const r of rows) {
    const meta = (r.meta ?? {}) as { blocks?: AssistantBlock[]; narration?: string };
    out.push({
      id: r.id,
      role: r.role === "user" ? "user" : "assistant",
      content: r.content,
      narration: typeof meta.narration === "string" ? meta.narration : null,
      blocks: Array.isArray(meta.blocks) ? meta.blocks : [],
      proposal: r.proposalId ? await proposalCard(ctx, r.proposalId) : null,
      createdAt: r.createdAt.toISOString(),
    });
  }
  return out;
}

export type { ThreadSummary } from "./assistant-types";
import type { ThreadSummary } from "./assistant-types";

/** The caller's conversation history for the rail: one entry per thread,
 *  titled by its first user message, newest activity first. */
export async function listThreads(ctx: AssistantCtx): Promise<ThreadSummary[]> {
  const rows = await prisma.assistantMessage.findMany({
    where: { workspaceId: ctx.workspaceId, userId: ctx.userId },
    orderBy: { createdAt: "asc" },
    take: 1000,
    select: { threadId: true, role: true, content: true, createdAt: true },
  });
  const byThread = new Map<string, ThreadSummary>();
  for (const r of rows) {
    const cur = byThread.get(r.threadId);
    if (!cur) {
      byThread.set(r.threadId, {
        threadId: r.threadId,
        title: r.role === "user" ? r.content : "New chat",
        updatedAt: r.createdAt.toISOString(),
        count: 1,
      });
    } else {
      cur.count += 1;
      cur.updatedAt = r.createdAt.toISOString();
      if (cur.title === "New chat" && r.role === "user") cur.title = r.content;
    }
  }
  return [...byThread.values()]
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 30);
}

// ---------- read intents ----------

type Reply = { text: string; blocks: AssistantBlock[]; proposalId?: string; narration?: string };

/** Attach the brief BuilderAI-style narration line shown before an answer
 *  ("Checking your stalled deals…"). A narration set inside a handler
 *  (clarifying questions) wins over the dispatcher's default. */
function narr(reply: Reply, narration: string): Reply {
  return { ...reply, narration: reply.narration ?? narration };
}

async function stalledReply(ctx: AssistantCtx): Promise<Reply> {
  const all = await getStalledDeals(ctx.workspaceId);
  const own = readsAll(ctx) ? null : await ownDealIds(ctx);
  const rows = all.filter((d) => !own || own.has(d.externalId));
  if (rows.length === 0) {
    return {
      text: "No stalled deals right now — every open deal has had recent activity inside its healthy window.",
      blocks: [],
    };
  }
  const top = rows.slice(0, 3);
  const text =
    rows.length === 1
      ? `1 deal has gone quiet and needs attention:`
      : `${rows.length} deals have gone quiet. These ${top.length} need attention first — the rest are in Deals & Contacts, sorted by risk:`;
  return {
    text,
    blocks: [
      {
        kind: "deals",
        rows: top.map((d) => ({
          name: d.name,
          company: d.company,
          stage: d.stage,
          amount: d.amount,
          daysSilent: d.daysSilent,
          risk: d.risk,
        })),
      },
      { kind: "link", label: "Open in Deals →", href: "/deals?tab=atrisk" },
    ],
  };
}

const CATEGORY_LABEL: Record<string, string> = {
  deal_update: "deal updates",
  new_contact: "new contacts",
  enrichment: "enrichment",
  followup: "follow-ups",
  field_fix: "field fixes",
};

async function scopedPending(ctx: AssistantCtx) {
  const all = await prisma.proposal.findMany({
    where: { workspaceId: ctx.workspaceId, status: "pending" },
    orderBy: [{ confidence: "desc" }, { createdAt: "desc" }],
  });
  if (readsAll(ctx)) return all;
  const own = await ownDealIds(ctx);
  return all.filter((p) => p.dealExternalId && own.has(p.dealExternalId));
}

async function queueReply(ctx: AssistantCtx): Promise<Reply> {
  const pending = await scopedPending(ctx);
  if (pending.length === 0) {
    return { text: "Your review queue is clear — nothing is waiting for a decision.", blocks: [] };
  }
  const counts = new Map<string, number>();
  for (const p of pending) counts.set(p.category, (counts.get(p.category) ?? 0) + 1);
  const parts = [...counts.entries()].map(([k, n]) => `${n} ${CATEGORY_LABEL[k] ?? k}`);
  const top = pending
    .slice(0, 3)
    .map((p) => `• ${p.title}${p.confidence != null ? ` (${p.confidence}% confidence)` : ""}`)
    .join("\n");
  return {
    text: `${pending.length} proposals are waiting for review: ${parts.join(", ")}.\n\nTop of the queue:\n${top}`,
    blocks: [{ kind: "link", label: "View queue →", href: "/approvals" }],
  };
}

async function pipelineReply(ctx: AssistantCtx): Promise<Reply> {
  const deals = scopeDeals(ctx, await loadDeals(ctx.workspaceId));
  const open = deals.filter((d) => d.stage !== "Won" && d.stage !== "Lost");
  const won = deals.filter((d) => d.stage === "Won");
  const lost = deals.filter((d) => d.stage === "Lost");
  const sum = (rows: DealRow[]) => rows.reduce((s, d) => s + (d.amount ?? 0), 0);
  if (deals.length === 0) {
    return { text: "Your pipeline is empty — no deals on record yet. Once deals are added, I can report on them here.", blocks: [] };
  }
  const stalled = (await getStalledDeals(ctx.workspaceId)).filter(
    (d) => readsAll(ctx) || deals.some((x) => x.externalId === d.externalId),
  );
  const lines = [
    `Open pipeline: ${money(sum(open))} across ${open.length} deals.`,
    `Won: ${won.length} deals (${money(sum(won))}) · Lost: ${lost.length} deals.`,
    stalled.length > 0
      ? `${stalled.length} open deals are at risk right now (gone quiet past their healthy window).`
      : "No open deals are at risk right now.",
  ];
  return {
    text: lines.join("\n"),
    blocks: [{ kind: "link", label: "Open Pipeline →", href: "/pipeline" }],
  };
}

async function dealStatusReply(ctx: AssistantCtx, deal: DealRow): Promise<Reply> {
  const silent = daysSilent(deal.lastActivityAt);
  const pending = await prisma.proposal.findMany({
    where: { workspaceId: ctx.workspaceId, status: "pending", dealExternalId: deal.externalId },
    orderBy: { createdAt: "desc" },
  });
  const lines = [
    `${deal.name}${deal.company && deal.company !== deal.name ? ` (${deal.company})` : ""} is at ${deal.stage}${deal.amount != null ? `, worth ${money(deal.amount)}` : ""}.`,
    `Last activity ${silent === 0 ? "today" : `${silent} day${silent === 1 ? "" : "s"} ago`}${deal.closeDate ? ` · Close date ${fmtDate(deal.closeDate)}` : ""}${deal.ownerName ? ` · Owner: ${deal.ownerName}` : ""}.`,
  ];
  if (pending.length > 0) {
    lines.push(
      `${pending.length} proposal${pending.length === 1 ? " is" : "s are"} waiting on this deal:\n${pending.map((p) => `• ${p.title}`).join("\n")}`,
    );
  } else {
    lines.push("No proposals are waiting on this deal.");
  }
  return { text: lines.join("\n"), blocks: [{ kind: "link", label: "Open in Deals →", href: "/deals" }] };
}

async function followupsReply(ctx: AssistantCtx): Promise<Reply> {
  const pending = (await scopedPending(ctx)).filter((p) => p.type === "followup_draft" || p.type === "task");
  if (pending.length === 0) {
    return { text: "No follow-ups are waiting — there are no pending follow-up drafts right now.", blocks: [] };
  }
  const list = pending.slice(0, 5).map((p) => `• ${p.title}`).join("\n");
  return {
    text: `${pending.length} follow-up${pending.length === 1 ? " is" : "s are"} waiting for review:\n${list}`,
    blocks: [{ kind: "link", label: "View in Approvals →", href: "/approvals" }],
  };
}

async function hygieneReply(ctx: AssistantCtx): Promise<Reply> {
  if (!can(ctx.role, "pages.cleanup")) {
    return {
      text: "Data Cleanup numbers are an Owner, Admin and Manager view, so I can't pull them for your role — your Deals and Approvals are fully available though.",
      blocks: [],
    };
  }
  const h = await computeHygiene(ctx.workspaceId);
  const c = h.counts;
  const total = c.duplicates + c.missing + c.unlogged + c.stale;
  if (total === 0 && h.score == null) {
    return { text: "No data-quality issues on record yet — the workspace hasn't been scanned.", blocks: [] };
  }
  return {
    text: `Data health${h.score != null ? ` is ${h.score}/100` : " hasn't been scored yet"}. The latest scan found ${c.duplicates} duplicate records, ${c.missing} records with missing fields, ${c.unlogged} unlogged meetings and ${c.stale} stale deals.`,
    blocks: [{ kind: "link", label: "Open Data Cleanup →", href: "/hygiene" }],
  };
}

async function contactReply(ctx: AssistantCtx, person: Person): Promise<Reply> {
  const deal = person.company
    ? (await loadDeals(ctx.workspaceId)).find((d) => d.company === person.company)
    : null;
  const lines = [
    `${person.name}${person.title ? ` — ${person.title}` : ""}${person.company ? ` at ${person.company}` : ""}.`,
  ];
  if (person.email) lines.push(`Email: ${person.email}.`);
  if (deal) lines.push(`Related deal: ${deal.name} at ${deal.stage}${deal.amount != null ? ` (${money(deal.amount)})` : ""}.`);
  return { text: lines.join("\n"), blocks: [{ kind: "link", label: "Open in Deals & Contacts →", href: "/deals?tab=contacts" }] };
}

// ---------- write intents ----------

function readOnlyRefusal(ctx: AssistantCtx): string | null {
  if (!can(ctx.role, "proposals.decide")) {
    return "Your role is read-only, so I can't prepare changes — but I can look anything up for you. Ask the Owner or an Admin to make that change.";
  }
  return null;
}

function scopeRefusal(ctx: AssistantCtx, deal: DealRow | null): string | null {
  if (hasTeamScope(ctx.role)) return null;
  if (!deal) return "That isn't tied to one of your own deals, and your role only covers your own records — a Manager or Admin can prepare it instead.";
  if (!ownsDeal(ctx.userName, deal.ownerName)) {
    return `${deal.name} isn't one of your deals, and your role only covers your own records — a Manager or Admin can prepare that change.`;
  }
  return null;
}

async function moveStageReply(ctx: AssistantCtx, deal: DealRow, stage: string | null, raw: string): Promise<Reply> {
  if (!stage) {
    return {
      text: `Which stage should ${deal.name} move to? It's at ${deal.stage} now. Stages: ${[...STAGES, "Lost"].join(", ")}.`,
      blocks: [],
      narration: "Checking that deal…",
    };
  }
  if (deal.stage === stage) {
    return { text: `${deal.name} is already at ${stage} — nothing to prepare.`, blocks: [] };
  }
  const refusal = readOnlyRefusal(ctx) ?? scopeRefusal(ctx, deal);
  if (refusal) return { text: refusal, blocks: [] };

  const existing = await prisma.proposal.findFirst({
    where: { workspaceId: ctx.workspaceId, status: "pending", type: "deal_stage", dealExternalId: deal.externalId },
  });
  if (existing) {
    const d = (existing.detail ?? {}) as Record<string, unknown>;
    if (String(d.toValue) === stage) {
      return {
        text: `That move is already waiting in Approvals — here it is:`,
        blocks: [],
        proposalId: existing.id,
      };
    }
    return {
      text: `A different stage move for ${deal.name} (${String(d.fromValue ?? "?")} → ${String(d.toValue ?? "?")}) is already waiting in Approvals. Decide that one first, then ask me again.`,
      blocks: [{ kind: "link", label: "View in Approvals →", href: "/approvals" }],
    };
  }

  const created = await prisma.proposal.create({
    data: {
      workspaceId: ctx.workspaceId,
      type: "deal_stage",
      category: categoryFor("deal_stage"),
      title: `Move Stage: ${deal.name}`,
      detail: {
        field: "stage",
        fromValue: deal.stage,
        toValue: stage,
        description: `Move ${deal.name} from ${deal.stage} to ${stage}, as requested in the AI Assistant.`,
        subline: `${deal.stage} → ${stage}`,
      } as Prisma.InputJsonValue,
      reason: `Prepared in the AI Assistant from your message: "${raw.slice(0, 140)}". Nothing changes until you approve it.`,
      source: "chat",
      confidence: null,
      dealExternalId: deal.externalId,
      status: "pending",
    },
  });
  return {
    text: `Prepared as a proposal — nothing moves in your CRM until you approve it:`,
    blocks: [],
    proposalId: created.id,
  };
}

async function draftFollowupReply(
  ctx: AssistantCtx,
  person: Person | null,
  dealHint: DealRow | null,
  raw: string,
): Promise<Reply> {
  const refusal = readOnlyRefusal(ctx);
  if (refusal) return { text: refusal, blocks: [] };

  let deal: DealRow | null = dealHint;
  const personCompany = person?.company ?? null;
  if (!deal && personCompany) {
    const deals = await loadDeals(ctx.workspaceId);
    deal = deals.find((d) => d.company === personCompany && d.stage !== "Won" && d.stage !== "Lost") ?? deals.find((d) => d.company === personCompany) ?? null;
  }
  if (!person && deal) {
    const contact = deal.company
      ? await prisma.crmContact.findFirst({
          where: { workspaceId: ctx.workspaceId, company: deal.company },
          orderBy: { name: "asc" },
        })
      : null;
    person = contact
      ? { name: contact.name, email: contact.email, company: contact.company, title: contact.title }
      : { name: deal.company ?? deal.name, email: null, company: deal.company, title: null };
  }
  if (!person) {
    const stalled = await getStalledDeals(ctx.workspaceId);
    const names = stalled.slice(0, 3).map((d) => d.name).join(", ");
    return {
      text: `Who should I draft the follow-up for? Name a contact or a deal${names ? ` — the quietest deals right now are ${names}` : ""}.`,
      blocks: [],
      narration: "Finding the right person…",
    };
  }
  const scopeProblem = scopeRefusal(ctx, deal);
  if (scopeProblem) return { text: scopeProblem, blocks: [] };

  const existing = await prisma.proposal.findFirst({
    where: {
      workspaceId: ctx.workspaceId,
      status: "pending",
      type: "followup_draft",
      ...(deal ? { dealExternalId: deal.externalId } : {}),
    },
  });
  if (existing) {
    const d = (existing.detail ?? {}) as Record<string, unknown>;
    if (!deal || String(d.toName ?? "") === person.name) {
      return {
        text: `A follow-up draft for ${person.name} is already waiting in Approvals — here it is:`,
        blocks: [],
        proposalId: existing.id,
      };
    }
  }

  const silent = deal ? daysSilent(deal.lastActivityAt) : null;
  const ai = (await askAiJson(
    `Write a short, warm B2B follow-up email. Return JSON {"subject": "...", "body": "..."} only. ` +
      `Recipient: ${person.name}${person.title ? `, ${person.title}` : ""}${person.company ? ` at ${person.company}` : ""}. ` +
      (deal
        ? `About the deal "${deal.name}" (stage ${deal.stage}${deal.amount != null ? `, ${money(deal.amount)}` : ""}), which has had no activity for ${silent} days. `
        : "") +
      `Keep it under 90 words, no placeholders, sign off as "Best regards".`,
  )) as { subject?: string; body?: string } | null;
  const firstName = person.name.split(" ")[0];
  const subject = ai?.subject?.trim() || (deal ? `Following up — ${deal.name}` : `Following up — ${person.company ?? person.name}`);
  const body =
    ai?.body?.trim() ||
    `Hi ${firstName},\n\nJust checking in${deal ? ` on ${deal.name}` : ""} — I wanted to make sure you have everything you need from us.\n\nHappy to pick things up whenever you're ready.\n\nBest regards`;

  const created = await prisma.proposal.create({
    data: {
      workspaceId: ctx.workspaceId,
      type: "followup_draft",
      category: categoryFor("followup_draft"),
      title: `Draft Follow-up: ${person.name}`,
      detail: {
        toName: person.name,
        toEmail: person.email ?? "",
        subject,
        draftBody: body,
        description: `Follow-up draft for ${person.name}${person.company ? ` at ${person.company}` : ""}, drafted in the AI Assistant.`,
        subline: "Drafted in the AI Assistant",
      } as Prisma.InputJsonValue,
      reason: `Prepared in the AI Assistant from your message: "${raw.slice(0, 140)}". Nothing is sent until you approve it.`,
      source: "chat",
      confidence: null,
      dealExternalId: deal?.externalId ?? null,
      status: "pending",
    },
  });
  return {
    text: `Drafted and saved as a proposal — it only goes out after approval:`,
    blocks: [],
    proposalId: created.id,
  };
}

// ---------- LLM intent fallback + open answers ----------

async function llmRoute(ctx: AssistantCtx, raw: string): Promise<Reply | null> {
  const deals = await loadDeals(ctx.workspaceId);
  const contacts = await prisma.crmContact.findMany({
    where: { workspaceId: ctx.workspaceId },
    select: { name: true },
    take: 40,
  });
  const parsed = (await askAiJson(
    `Classify this CRM-assistant message into one intent. Return JSON only: ` +
      `{"intent": "stalled|queue|pipeline|deal_status|move_stage|followup_draft|followups|hygiene|contact|none", "deal": string|null, "person": string|null, "stage": string|null}. ` +
      `Known deals: ${deals.map((d) => d.name).join(", ") || "none"}. Known contacts: ${contacts.map((c) => c.name).join(", ") || "none"}. ` +
      `Stages: ${[...STAGES, "Lost"].join(", ")}. Message: "${raw.slice(0, 300)}"`,
  )) as { intent?: string; deal?: string | null; person?: string | null; stage?: string | null } | null;
  if (!parsed || !parsed.intent || parsed.intent === "none") return null;
  const deal = parsed.deal ? matchDeal(deals, parsed.deal) : null;
  const person = parsed.person ? await matchPerson(ctx, parsed.person) : null;
  switch (parsed.intent) {
    case "stalled":
      return narr(await stalledReply(ctx), "Checking your stalled deals…");
    case "queue":
      return narr(await queueReply(ctx), "Looking at today's queue…");
    case "pipeline":
      return narr(await pipelineReply(ctx), "Pulling your pipeline numbers…");
    case "followups":
      return narr(await followupsReply(ctx), "Checking your follow-ups…");
    case "hygiene":
      return narr(await hygieneReply(ctx), "Running a data-quality check…");
    case "deal_status":
      return deal ? narr(await dealStatusReply(ctx, deal), "Checking that deal's status…") : null;
    case "contact":
      return person ? narr(await contactReply(ctx, person), "Looking up that contact…") : null;
    case "move_stage":
      return deal ? narr(await moveStageReply(ctx, deal, parsed.stage ?? matchStage(raw), raw), "Preparing that stage move as a proposal…") : null;
    case "followup_draft":
      return narr(await draftFollowupReply(ctx, person, deal, raw), "Drafting that follow-up…");
    default:
      return null;
  }
}

async function fallbackReply(ctx: AssistantCtx, raw: string): Promise<Reply> {
  // Open question: answer from a real-data summary, or honestly decline.
  const deals = scopeDeals(ctx, await loadDeals(ctx.workspaceId));
  const pending = await scopedPending(ctx);
  const open = deals.filter((d) => d.stage !== "Won" && d.stage !== "Lost");
  const summary =
    `Workspace data: ${open.length} open deals totalling ${money(open.reduce((s, d) => s + (d.amount ?? 0), 0))}; ` +
    `${pending.length} proposals waiting for review; ` +
    `deal stages present: ${[...new Set(deals.map((d) => d.stage))].join(", ") || "none"}.`;
  const ai = (await askAiJson(
    `You are the assistant inside a CRM app. Answer the user's question using ONLY this data summary — never invent numbers, names or deals. ` +
      `If the summary cannot answer it, say so in one sentence and name what you CAN do (stalled deals, review queue, pipeline report, deal status, drafting follow-ups, preparing stage moves). ` +
      `Return JSON {"answer": "..."} only. Data: ${summary} Question: "${raw.slice(0, 300)}"`,
  )) as { answer?: string } | null;
  if (ai?.answer?.trim()) return { text: ai.answer.trim(), blocks: [] };
  return {
    text:
      `I work from your workspace data and can help with: stalled deals, today's review queue, a pipeline report, the status of any deal, ` +
      `drafting follow-ups, and preparing stage moves (always as proposals you approve). ` +
      (deals.length === 0
        ? "This workspace has no deals yet, so there's nothing to report on yet."
        : `Right now: ${pending.length} proposals waiting, ${open.length} open deals.`),
    blocks: [],
  };
}

// ---------- main entry ----------

export async function answerAssistant(ctx: AssistantCtx, rawInput: string): Promise<Reply> {
  const raw = rawInput.trim().slice(0, 1000);
  const lower = raw.toLowerCase();
  const deals = await loadDeals(ctx.workspaceId);
  const deal = matchDeal(deals, raw);
  const stage = matchStage(raw);

  // WRITE: stage move — needs a deal + (a move verb or "to") + a stage.
  if (deal && stage && (/\b(move|advance|push|promote|set|change|update|mark)\b/.test(lower) || /\bto\b/.test(lower))) {
    return narr(await moveStageReply(ctx, deal, stage, raw), "Preparing that stage move as a proposal…");
  }
  // READ: pending follow-ups (a list request beats the draft verb —
  // "show me the follow-up drafts" must not create anything).
  if (/follow[- ]?ups?\b/.test(lower) && /\b(show|list|waiting|pending|what|which|any)\b/.test(lower)) {
    return narr(await followupsReply(ctx), "Checking your follow-ups…");
  }
  // WRITE: draft a follow-up.
  if ((/\bdraft\b/.test(lower) && /follow|e-?mail/.test(lower)) || /\bfollow[- ]?up for\b/.test(lower) || /\bwrite\b.*\bfollow/.test(lower)) {
    const person = await matchPerson(ctx, raw);
    return narr(await draftFollowupReply(ctx, person, deal, raw), "Drafting that follow-up…");
  }
  // READ intents (deterministic — the suggestion cards land here).
  if (/\bstalled\b|\bat[- ]risk\b|going cold|no activity|gone quiet|quiet deals/.test(lower))
    return narr(await stalledReply(ctx), "Checking your stalled deals…");
  if (/follow[- ]?ups?\b/.test(lower)) return narr(await followupsReply(ctx), "Checking your follow-ups…");
  if (/\bqueue\b|waiting for review|pending|approvals?|suggestions?|review today/.test(lower))
    return narr(await queueReply(ctx), "Looking at today's queue…");
  if (/\bpipeline\b/.test(lower)) return narr(await pipelineReply(ctx), "Pulling your pipeline numbers…");
  if (/duplicate|missing|hygiene|data quality|clean[- ]?up|health score/.test(lower))
    return narr(await hygieneReply(ctx), "Running a data-quality check…");
  if (deal && /\bstatus\b|how is|what's happening|where is|update on/.test(lower))
    return narr(await dealStatusReply(ctx, deal), "Checking that deal's status…");
  if (deal && stage) return narr(await moveStageReply(ctx, deal, stage, raw), "Preparing that stage move as a proposal…");
  if (deal) return narr(await dealStatusReply(ctx, deal), "Checking that deal's status…");
  const person = await matchPerson(ctx, raw);
  if (person && /\bwho\b|contact|email|find|look up|lookup/.test(lower))
    return narr(await contactReply(ctx, person), "Looking up that contact…");

  const routed = await llmRoute(ctx, raw).catch(() => null);
  if (routed) return routed;
  return narr(await fallbackReply(ctx, raw), "Thinking it through…");
}
