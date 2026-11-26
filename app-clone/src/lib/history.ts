import "server-only";
import { prisma } from "./db";
import { timeAgo, fmtDate } from "./constants";
import { decryptJson } from "./crypto";

/**
 * History (Sync & Rollback) data.
 *
 * This product has no external sync engine yet — the honest equivalent of
 * a "sync" is an APPLY BATCH: the set of proposals one approve action
 * wrote to the CRM together, stamped with a shared Proposal.batchId.
 * Every number on the screen traces to those rows:
 *
 * - Total Synced Records = proposals ever applied (appliedAt set, any
 *   current status) + captures the engine has processed (processedAt
 *   set). Its delta compares the same two event streams in the last
 *   30 days vs the 30 days before.
 * - A batch's "+n / −m" = proposals ever applied in it / of those, how
 *   many have since been undone back to pending.
 * - A batch is "Partial" when some of its applies failed, "Rolled back"
 *   once a rolled_back audit exists for it.
 * - The rollback window is 7 days from the batch's latest apply.
 */

type Detail = Record<string, unknown>;
const str = (v: unknown): string => (typeof v === "string" ? v : v == null ? "" : String(v));
const DAY = 86400000;

export function fmtDateTime(d: Date | string): string {
  const t = typeof d === "string" ? new Date(d) : d;
  const date = t.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const time = t.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  return `${date} • ${time}`;
}

export type BatchProposalView = {
  id: string;
  title: string;
  type: string;
  status: string; // applied | pending (undone) | failed
  restoreLine: string;
};

export type BatchView = {
  batchId: string;
  at: string; // ISO, latest apply in the batch
  atLabel: string;
  atAgo: string;
  source: string;
  applied: number;
  undone: number;
  failed: number;
  status: "Success" | "Partial" | "Failed" | "Rolled back";
  details: string;
  approvedBy: string;
  revertable: boolean;
  revertableUntil: string | null;
  contacts: number;
  deals: number;
  fieldsUpdated: number;
  breakdown: { label: string; count: number; color: string }[];
  warnings: string[];
  notes: string[];
  proposals: BatchProposalView[];
};

export type ConnectionView = {
  provider: string;
  label: string;
  accountEmail: string | null;
  connectedLabel: string;
  lastSyncAgo: string | null;
  permissions: string;
};

export type HistoryData = {
  status: "Healthy" | "Needs attention" | "Not connected";
  lastChangeAgo: string | null;
  totalSynced: number;
  syncedDeltaPct: number | null;
  syncedSpark: number[];
  statusSpark: number[];
  lastBatch: { batchId: string; atLabel: string; atAgo: string } | null;
  pendingActions: number;
  batches: BatchView[];
  connections: ConnectionView[];
  hasConnection: boolean;
  api: {
    batches: number;
    capturesProcessed: number;
    proposalsCreated: number;
    proposalsDecided: number;
    model: string;
  };
};

const PROVIDER_LABEL: Record<string, string> = {
  hubspot: "HubSpot",
  salesforce: "Salesforce",
  google: "Google",
  outlook: "Outlook",
  signudoc: "SignuDoc",
};

/**
 * The seed's rep-time history rows ("Applied update N — pipeline hygiene")
 * are deal_stage proposals whose detail records only the minutes saved —
 * no deal, no field payload. They are real applied changes (they count
 * as changes), but they must not invent a field, a deal or a stage move.
 */
function isGeneric(p: { type: string; detail: Detail }): boolean {
  const d = p.detail;
  return (
    (p.type === "deal_stage" || p.type === "deal_field") &&
    !d.fromValue &&
    !d.toValue &&
    !d.field &&
    !d.closeToValue &&
    typeof d.amountTo !== "number"
  );
}

function fieldChanges(p: { type: string; detail: Detail }): number {
  const d = p.detail;
  switch (p.type) {
    case "deal_stage":
      if (isGeneric(p)) return 0;
      return 1 + (d.closeToValue ? 1 : 0) + (typeof d.amountTo === "number" ? 1 : 0);
    case "deal_field":
      return 1;
    case "hygiene_fix":
      if (d.kind === "industry") return Array.isArray(d._industryIds) ? d._industryIds.length : Number(d.count) || 1;
      return 1;
    case "new_contact":
      return d._createdContactId ? 4 : 0;
    default:
      return 0;
  }
}

function contactsTouched(p: { type: string; detail: Detail }): number {
  const d = p.detail;
  if (p.type === "new_contact") return d._createdContactId ? 1 : 0;
  if (p.type === "hygiene_fix") {
    if (d.kind === "industry") return Array.isArray(d._industryIds) ? d._industryIds.length : Number(d.count) || 0;
    if (d.kind === "merge" || d.kind === "enrich") return 1;
  }
  return 0;
}

function breakdownOf(p: { type: string; detail: Detail }): { label: string; color: string } {
  if (isGeneric(p)) return { label: "Pipeline hygiene", color: "#8a8fa3" };
  if (p.type === "deal_stage") return { label: "Stage changes", color: "#2b6bf0" };
  if (p.type === "new_contact" || p.type === "new_deal") return { label: "New records", color: "#22b573" };
  if (p.type === "followup_draft" || p.type === "task") return { label: "Follow-ups & tasks", color: "#f5a623" };
  if (p.type === "hygiene_fix" && p.detail.kind === "merge") return { label: "Merges", color: "#e5639a" };
  return { label: "Field updates", color: "#6c3ce9" };
}

function restoreLine(p: { type: string; title: string; detail: Detail }): string {
  const d = p.detail;
  switch (p.type) {
    case "deal_stage": {
      if (isGeneric({ type: p.type, detail: d })) {
        return "Returns to the review queue — no CRM field change was recorded for this update";
      }
      const prev = str(d._prevStage) || str(d.fromValue);
      let s = prev ? `Stage returns to ${prev}` : "Stage change is reversed";
      if (d.closeToValue) {
        s += ` · close date returns to ${d._prevCloseDate ? fmtDate(str(d._prevCloseDate)) : "—"}`;
      }
      if (typeof d.amountTo === "number") {
        s += ` · amount returns to ${typeof d._prevAmount === "number" ? "$" + d._prevAmount.toLocaleString("en-US") : "—"}`;
      }
      return s;
    }
    case "deal_field": {
      if (d.field === "closeDate") return `Close date returns to ${d._prevCloseDate ? fmtDate(str(d._prevCloseDate)) : "—"}`;
      if (d.field === "amount") return `Amount returns to ${typeof d._prevAmount === "number" ? "$" + d._prevAmount.toLocaleString("en-US") : "—"}`;
      if (d.field === "healthFlag") return "Stalled flag is removed";
      return "Field returns to its previous value";
    }
    case "new_contact":
      return d._createdContactId ? `Contact ${str(d.name) || "created by this change"} is removed` : "No record was created — nothing to remove";
    case "new_deal":
      return d._createdDealId ? `Deal ${str(d.name) || "created by this change"} is removed` : "No record was created — nothing to remove";
    case "hygiene_fix": {
      if (d.kind === "merge") return "The merged duplicate record is restored";
      if (d.kind === "enrich") return `Title returns to ${str(d._prevTitle) || "—"}`;
      if (d.kind === "industry") return `Industry is cleared on ${Array.isArray(d._industryIds) ? d._industryIds.length : Number(d.count) || 0} contacts`;
      return "Cleanup change is reversed";
    }
    case "followup_draft":
      return "The approved draft returns to the review queue";
    case "task":
      return "The task returns to the review queue";
    default:
      return "Change is reversed";
  }
}

export async function getHistoryData(workspaceId: string): Promise<HistoryData> {
  const now = new Date();
  const since30 = new Date(now.getTime() - 30 * DAY);
  const since60 = new Date(now.getTime() - 60 * DAY);

  const [batched, connections, pendingActions, processed, allProposals, rolledBackAudits, appliedAudits, owner] =
    await Promise.all([
      prisma.proposal.findMany({
        where: { workspaceId, batchId: { not: null } },
        orderBy: { appliedAt: "desc" },
      }),
      prisma.connection.findMany({ where: { workspaceId }, orderBy: { createdAt: "asc" } }),
      prisma.proposal.count({ where: { workspaceId, status: "pending" } }),
      prisma.capture.findMany({
        where: { workspaceId, processedAt: { not: null } },
        select: { processedAt: true },
      }),
      prisma.proposal.findMany({
        where: { workspaceId },
        select: { status: true, appliedAt: true, decidedAt: true },
      }),
      prisma.auditEvent.findMany({ where: { workspaceId, action: "rolled_back" }, select: { meta: true } }),
      prisma.auditEvent.findMany({
        where: { workspaceId, action: "applied" },
        select: { userId: true, meta: true },
      }),
      prisma.membership.findFirst({
        where: { workspaceId, role: "owner" },
        include: { user: { select: { name: true } } },
      }),
    ]);

  const rolledBackIds = new Set(
    rolledBackAudits.map((a) => str((a.meta as Detail | null)?.batchId)).filter(Boolean),
  );
  const approverByProposal = new Map<string, string>();
  const userIds = [...new Set(appliedAudits.map((a) => a.userId).filter(Boolean))] as string[];
  if (userIds.length > 0) {
    const users = await prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true } });
    const nameById = new Map(users.map((u) => [u.id, u.name]));
    for (const a of appliedAudits) {
      const pid = str((a.meta as Detail | null)?.proposalId);
      if (pid && a.userId && nameById.get(a.userId)) approverByProposal.set(pid, nameById.get(a.userId)!);
    }
  }
  const ownerName = owner?.user.name ?? "";

  // CRM source label for approval batches: the connected CRM's name.
  const crmConn = connections.find((c) => c.provider === "hubspot" || c.provider === "salesforce");
  const source = crmConn ? PROVIDER_LABEL[crmConn.provider] : "CRM";

  // Later-batch overwrite check: for each deal+field, the newest change
  // that is still live (status applied) is what a rollback would clobber.
  const appliedAll = batched.filter((p) => p.appliedAt && p.status === "applied");
  const newestFieldChange = new Map<string, { at: number; batchId: string }>();
  for (const p of appliedAll) {
    if (!p.dealExternalId) continue;
    const d = p.detail as Detail;
    const fields: string[] = [];
    if (p.type === "deal_stage") fields.push("stage");
    if (p.type === "deal_field") fields.push(str(d.field) || "field");
    if (d.closeToValue) fields.push("closeDate");
    if (typeof d.amountTo === "number") fields.push("amount");
    for (const f of fields) {
      const key = `${p.dealExternalId}:${f}`;
      const cur = newestFieldChange.get(key);
      if (!cur || p.appliedAt!.getTime() > cur.at) {
        newestFieldChange.set(key, { at: p.appliedAt!.getTime(), batchId: p.batchId! });
      }
    }
  }
  const dealNames = new Map<string, string>();
  if (appliedAll.some((p) => p.dealExternalId)) {
    const deals = await prisma.crmDeal.findMany({ where: { workspaceId }, select: { externalId: true, name: true } });
    for (const d of deals) dealNames.set(d.externalId, d.name);
  }

  // ---- group proposals into batches ----
  const groups = new Map<string, typeof batched>();
  for (const p of batched) {
    const arr = groups.get(p.batchId!) ?? [];
    arr.push(p);
    groups.set(p.batchId!, arr);
  }

  const batches: BatchView[] = [];
  for (const [batchId, rows] of groups) {
    const appliedRows = rows.filter((p) => p.appliedAt);
    if (appliedRows.length === 0 && !rows.some((p) => p.status === "failed")) continue;
    const at = appliedRows.reduce((max, p) => (p.appliedAt! > max ? p.appliedAt! : max), appliedRows[0]?.appliedAt ?? rows[0].decidedAt ?? rows[0].createdAt);
    const applied = appliedRows.length;
    const undone = appliedRows.filter((p) => p.status === "pending").length;
    const failed = rows.filter((p) => p.status === "failed").length;
    const rolledBack = rolledBackIds.has(batchId);
    const status: BatchView["status"] = rolledBack
      ? "Rolled back"
      : failed > 0 && applied > 0
        ? "Partial"
        : failed > 0
          ? "Failed"
          : "Success";

    const contacts = rows.reduce((s, p) => s + (p.appliedAt ? contactsTouched({ type: p.type, detail: p.detail as Detail }) : 0), 0);
    const fieldsUpdated = rows.reduce((s, p) => s + (p.appliedAt ? fieldChanges({ type: p.type, detail: p.detail as Detail }) : 0), 0);
    const dealIds = new Set<string>();
    let createdDeals = 0;
    for (const p of rows) {
      if (!p.appliedAt) continue;
      if (p.dealExternalId) dealIds.add(p.dealExternalId);
      if (p.type === "new_deal" && (p.detail as Detail)._createdDealId) createdDeals++;
    }
    const dealsCount = dealIds.size + createdDeals;

    const detailParts: string[] = [];
    if (contacts > 0) detailParts.push(`Contacts: ${contacts}`);
    if (dealsCount > 0) detailParts.push(`Deals: ${dealsCount}`);
    if (fieldsUpdated > 0) detailParts.push(`Fields: ${fieldsUpdated}`);
    const hygieneCount = rows.filter((p) => p.appliedAt && isGeneric({ type: p.type, detail: p.detail as Detail })).length;
    if (hygieneCount > 0) detailParts.push(`Hygiene updates: ${hygieneCount}`);
    if (detailParts.length === 0) {
      const fu = rows.filter((p) => p.appliedAt && (p.type === "followup_draft" || p.type === "task")).length;
      if (fu > 0) detailParts.push(`Follow-ups: ${fu}`);
    }

    const breakdownMap = new Map<string, { label: string; count: number; color: string }>();
    for (const p of rows) {
      if (!p.appliedAt) continue;
      const b = breakdownOf({ type: p.type, detail: p.detail as Detail });
      const cur = breakdownMap.get(b.label) ?? { ...b, count: 0 };
      cur.count++;
      breakdownMap.set(b.label, cur);
    }

    // Preview warnings: a newer batch changed the same deal field after
    // this one — rolling back restores the older value over it.
    const warnings: string[] = [];
    const seenWarn = new Set<string>();
    for (const p of appliedRows) {
      if (!p.dealExternalId || p.status !== "applied") continue;
      const d = p.detail as Detail;
      const fields: string[] = [];
      if (p.type === "deal_stage") fields.push("stage");
      if (p.type === "deal_field") fields.push(str(d.field) || "field");
      if (d.closeToValue) fields.push("closeDate");
      if (typeof d.amountTo === "number") fields.push("amount");
      for (const f of fields) {
        const newest = newestFieldChange.get(`${p.dealExternalId}:${f}`);
        if (newest && newest.batchId !== batchId && !seenWarn.has(`${p.dealExternalId}:${f}`)) {
          seenWarn.add(`${p.dealExternalId}:${f}`);
          const label = f === "stage" ? "stage" : f === "closeDate" ? "close date" : f;
          warnings.push(
            `A later batch also changed ${dealNames.get(p.dealExternalId) ?? "a deal"}'s ${label} — rolling this back restores the older value and overwrites that newer change.`,
          );
        }
      }
    }
    const notes: string[] = [];
    if (undone > 0 && !rolledBack) {
      notes.push(`${undone} change${undone === 1 ? " was" : "s were"} already undone one by one — ${undone === 1 ? "it won't" : "they won't"} be touched again.`);
    }
    if (rows.some((p) => p.type === "followup_draft" && p.appliedAt)) {
      notes.push("Follow-up drafts are only drafted on approval — nothing was sent, so there is nothing to unsend.");
    }
    if (rows.some((p) => p.type === "hygiene_fix" && (p.detail as Detail).kind === "merge" && p.appliedAt)) {
      notes.push("Merged contacts are restored from the snapshot kept on the merge change.");
    }

    const approver = rows.map((p) => approverByProposal.get(p.id)).find(Boolean) ?? ownerName;
    const revertableUntil = new Date(at.getTime() + 7 * DAY);
    const revertable = !rolledBack && status !== "Failed" && undone < applied && now <= revertableUntil;

    batches.push({
      batchId,
      at: at.toISOString(),
      atLabel: fmtDateTime(at),
      atAgo: timeAgo(at),
      source,
      applied,
      undone,
      failed,
      status,
      details: detailParts.join(", "),
      approvedBy: approver,
      revertable,
      revertableUntil: fmtDateTime(revertableUntil),
      contacts,
      deals: dealsCount,
      fieldsUpdated,
      breakdown: [...breakdownMap.values()].sort((a, b) => b.count - a.count),
      warnings,
      notes,
      proposals: [...rows]
        .sort((a, b) => (b.appliedAt?.getTime() ?? 0) - (a.appliedAt?.getTime() ?? 0))
        .map((p) => ({
          id: p.id,
          title: p.title,
          type: p.type,
          status: p.status,
          restoreLine: restoreLine({ type: p.type, title: p.title, detail: p.detail as Detail }),
        })),
    });
  }
  batches.sort((a, b) => b.at.localeCompare(a.at));

  // ---- overview ----
  const appliedEver = allProposals.filter((p) => p.appliedAt);
  const totalSynced = appliedEver.length + processed.length;
  const eventsIn = (from: Date, to: Date) =>
    appliedEver.filter((p) => p.appliedAt! >= from && p.appliedAt! < to).length +
    processed.filter((c) => c.processedAt! >= from && c.processedAt! < to).length;
  const last30 = eventsIn(since30, now);
  const prior30 = eventsIn(since60, since30);
  const syncedDeltaPct = prior30 > 0 ? Math.round(((last30 - prior30) / prior30) * 100) : null;

  const dayStart = (d: Date) => {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
  };
  const cumulative = (days: number, times: number[]) => {
    const out: number[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const end = dayStart(new Date(now.getTime() - i * DAY));
      end.setHours(23, 59, 59, 999);
      out.push(times.filter((t) => t <= end.getTime()).length);
    }
    return out;
  };
  const syncedTimes = [
    ...appliedEver.map((p) => p.appliedAt!.getTime()),
    ...processed.map((c) => c.processedAt!.getTime()),
  ];
  const syncedSpark = cumulative(30, syncedTimes);
  const statusSpark = cumulative(14, appliedEver.map((p) => p.appliedAt!.getTime()));

  const failedLast30 = allProposals.filter(
    (p) => p.status === "failed" && p.decidedAt && p.decidedAt >= since30,
  ).length;
  const status: HistoryData["status"] =
    connections.length === 0 ? "Not connected" : failedLast30 > 0 ? "Needs attention" : "Healthy";

  const latestBatchAt = batches.length > 0 ? new Date(batches[0].at) : null;
  const latestConnSync = connections.reduce<Date | null>(
    (max, c) => (c.lastSyncAt && (!max || c.lastSyncAt > max) ? c.lastSyncAt : max),
    null,
  );
  const lastChange = [latestBatchAt, latestConnSync].filter(Boolean).sort((a, b) => b!.getTime() - a!.getTime())[0] ?? null;

  const connectionViews: ConnectionView[] = connections.map((c) => {
    let permissions = "Read and write CRM records";
    try {
      const data = decryptJson<Detail>(c.data);
      if (Array.isArray(data.scopes) && data.scopes.length > 0) {
        permissions = `Scopes: ${(data.scopes as unknown[]).map((s) => str(s)).join(", ")}`;
      } else if (c.provider === "google") {
        permissions = "Gmail, Calendar, Drive and Docs access";
      } else if (c.provider === "signudoc") {
        permissions = "Send signature requests and receive signing events";
      }
    } catch {
      permissions = "Read and write CRM records";
    }
    return {
      provider: c.provider,
      label: PROVIDER_LABEL[c.provider] ?? c.provider,
      accountEmail: c.accountEmail,
      connectedLabel: fmtDate(c.createdAt),
      lastSyncAgo: c.lastSyncAt ? timeAgo(c.lastSyncAt) : null,
      permissions,
    };
  });

  return {
    status,
    lastChangeAgo: lastChange ? timeAgo(lastChange) : null,
    totalSynced,
    syncedDeltaPct,
    syncedSpark,
    statusSpark,
    lastBatch: batches.length > 0 ? { batchId: batches[0].batchId, atLabel: batches[0].atLabel, atAgo: batches[0].atAgo } : null,
    pendingActions,
    batches,
    connections: connectionViews,
    hasConnection: connections.length > 0,
    api: {
      batches: batches.length,
      capturesProcessed: processed.length,
      proposalsCreated: allProposals.length,
      proposalsDecided: allProposals.filter((p) => p.decidedAt).length,
      model: process.env.AI_MODEL || "gemini-3.5-flash-lite",
    },
  };
}
