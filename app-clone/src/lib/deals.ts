import "server-only";
import { prisma } from "./db";
import { fmtDate, timeAgo, daysSilent, moneyShort } from "./constants";
import { effectiveHealth } from "./health";
import { computeCloseLikelihood, STAGE_ORDER, type DealInsightResult } from "./insight";
import { getPipelineData, resolvePeriod, type KpiDelta } from "./pipeline";
import { decryptJson } from "./crypto";

/**
 * Deals & Contacts data — every number traces to rows:
 * - The Total Deals / Pipeline Value / Won Deals stat cards reuse the
 *   Pipeline Compare 30-day KPIs verbatim, so the two screens can never
 *   disagree. Total Accounts is computed here (distinct companies across
 *   deals + contacts + hand-created accounts; delta/sparkline from each
 *   company's first-seen record).
 * - At Risk = open deals whose effective health flag is set (same rules
 *   as Pipeline's Stalled tab).
 * - The AI insight percentage comes from lib/insight.ts — a transparent
 *   formula over stage / silence / flags / pending proposals / close
 *   date, with every adjustment returned as a reason line.
 * - A deal's timeline/notes are the captures, proposals and audit rows
 *   actually recorded against it (captures link through proposals;
 *   audits link through meta.proposalId). Nothing is inferred from
 *   titles or text matching.
 */

const DAY = 86_400_000;
const TERMINAL = ["Won", "Lost"];

export type StatCard = {
  key: string;
  label: string;
  icon: string;
  tile: string;
  color: string;
  value: string;
  delta: KpiDelta;
  spark: number[];
};

export type TimelineEvent = {
  kind: "capture" | "proposal" | "audit";
  title: string;
  sub: string | null;
  status: string | null;
  when: string;
  ts: number;
};

export type DealNote = {
  id: string;
  kind: string;
  sourceLabel: string;
  title: string;
  when: string;
  text: string;
};

export type DealRow = {
  id: string;
  externalId: string;
  name: string;
  company: string | null;
  subline: string | null;
  stage: string;
  amount: number | null;
  ownerName: string | null;
  lastActivityLabel: string;
  lastActivityISO: string;
  daysSilent: number;
  closeDateLabel: string | null;
  closeDateISO: string | null;
  risk: "High" | "Medium" | "Low" | null;
  health: { flag: string; label: string; note: string | null } | null;
  contact: { name: string; title: string | null; email: string | null } | null;
  description: string | null;
  industry: string | null;
  insight: DealInsightResult;
  riskFactors: { label: string; detail: string }[];
  nextAction: { type: "proposal"; title: string } | { type: "followup" } | null;
  pendingCount: number;
  recent: TimelineEvent[];
  timeline: TimelineEvent[];
  notes: DealNote[];
  signatureStatus: string | null;
};

export type AccountRow = {
  name: string;
  industry: string | null;
  dealsCount: number;
  openValue: number;
  contactsCount: number;
  lastActivityLabel: string;
  dealIds: string[];
  contactIds: string[];
};

export type ContactRow = {
  id: string;
  name: string;
  title: string | null;
  company: string | null;
  email: string | null;
  industry: string | null;
  addedLabel: string;
  deals: { id: string; name: string; stage: string; amount: number | null }[];
  proposals: { title: string; status: string; when: string }[];
};

export type RecentRow = {
  type: "deal" | "contact";
  id: string;
  name: string;
  detail: string;
  when: string;
  ts: number;
};

const SOURCE_LABEL: Record<string, string> = {
  zoom: "Zoom Call",
  gmail: "Gmail Thread",
  chat: "WhatsApp",
  calendar: "Meeting",
  manual: "Call Notes",
  call: "Call",
  support: "Support Email",
};

function pctDelta(cur: number, base: number): KpiDelta {
  if (base <= 0) return null;
  const pct = Math.round(((cur - base) / base) * 100);
  if (pct === 0) return { dir: "flat", text: "0%" };
  return { dir: pct > 0 ? "up" : "down", text: `${pct > 0 ? "+" : "−"}${Math.abs(pct)}%` };
}

export async function getDealsData(workspaceId: string, scopeOwnerName?: string) {
  const now = new Date();
  let [pipeline, deals, contacts, accountsTable, proposals, signatures, audits, connections] =
    await Promise.all([
      getPipelineData(workspaceId, resolvePeriod({ period: "30" })),
      prisma.crmDeal.findMany({ where: { workspaceId }, orderBy: { amount: "desc" } }),
      prisma.crmContact.findMany({ where: { workspaceId }, orderBy: { name: "asc" } }),
      prisma.crmAccount.findMany({ where: { workspaceId } }),
      prisma.proposal.findMany({
        where: { workspaceId },
        orderBy: { createdAt: "desc" },
        include: { capture: true },
      }),
      prisma.signatureRequest.findMany({ where: { workspaceId }, orderBy: { createdAt: "desc" } }),
      prisma.auditEvent.findMany({ where: { workspaceId }, orderBy: { createdAt: "desc" } }),
      prisma.connection.findMany({ where: { workspaceId } }),
    ]);

  // Sales Rep scope (Settings → Team): the page only ever shows records
  // tied to deals the rep owns — every list/stat below derives from these
  // filtered arrays, so nothing outside the scope can leak through.
  const scoped = scopeOwnerName !== undefined;
  if (scoped) {
    const owner = (scopeOwnerName ?? "").trim().toLowerCase();
    deals = deals.filter((d) => (d.ownerName ?? "").trim().toLowerCase() === owner && owner !== "");
    const dealIds = new Set(deals.map((d) => d.externalId));
    const companies = new Set(deals.map((d) => d.company).filter((c): c is string => Boolean(c)));
    contacts = contacts.filter((c) => c.company != null && companies.has(c.company));
    accountsTable = accountsTable.filter((a) => companies.has(a.name));
    proposals = proposals.filter((p) => p.dealExternalId != null && dealIds.has(p.dealExternalId));
    signatures = signatures.filter((s) => dealIds.has(s.dealExternalId));
    const propIds = new Set(proposals.map((p) => p.id));
    audits = audits.filter((a) => {
      const meta = (a.meta ?? {}) as Record<string, unknown>;
      return (
        (typeof meta.proposalId === "string" && propIds.has(meta.proposalId)) ||
        (typeof meta.dealExternalId === "string" && dealIds.has(meta.dealExternalId))
      );
    });
  }

  // ---- company facts: industry (mode of its contacts' industries, else
  // the hand-created account row) + first-seen date ----
  const industryVotes = new Map<string, Map<string, number>>();
  for (const c of contacts) {
    if (!c.company || !c.industry) continue;
    const m = industryVotes.get(c.company) ?? new Map<string, number>();
    m.set(c.industry, (m.get(c.industry) ?? 0) + 1);
    industryVotes.set(c.company, m);
  }
  const accountByName = new Map(accountsTable.map((a) => [a.name, a]));
  const industryOf = (company: string | null): string | null => {
    if (!company) return null;
    const votes = industryVotes.get(company);
    if (votes && votes.size > 0) {
      return [...votes.entries()].sort((a, b) => b[1] - a[1])[0][0];
    }
    return accountByName.get(company)?.industry ?? null;
  };
  const firstSeen = new Map<string, number>();
  const seen = (company: string | null, at: Date) => {
    if (!company) return;
    const t = at.getTime();
    if (!firstSeen.has(company) || t < firstSeen.get(company)!) firstSeen.set(company, t);
  };
  for (const d of deals) seen(d.company, d.createdAt);
  for (const c of contacts) seen(c.company, c.createdAt);
  for (const a of accountsTable) seen(a.name, a.createdAt);

  // ---- stat cards ----
  const kpiByKey = new Map(pipeline.kpis.map((k) => [k.key, k]));
  const totalAccounts = firstSeen.size;
  const inWin = (t: number, a: number, b: number) => t >= a && t <= b;
  const acctNew = (a: number, b: number) => [...firstSeen.values()].filter((t) => inWin(t, a, b)).length;
  const acctSpark: number[] = [];
  for (let i = 0; i < 12; i++) {
    const t = now.getTime() - 30 * DAY + (30 * DAY * i) / 11;
    acctSpark.push([...firstSeen.values()].filter((x) => x <= t).length);
  }
  const stats: StatCard[] = [
    {
      key: "deals",
      label: "Total Deals",
      icon: "handshake",
      tile: "bg-violet-tint text-violet",
      color: "#6c3ce9",
      value: kpiByKey.get("deals")?.value ?? String(deals.length),
      delta: kpiByKey.get("deals")?.delta ?? null,
      spark: kpiByKey.get("deals")?.spark ?? [],
    },
    {
      key: "accounts",
      label: "Total Accounts",
      icon: "building",
      tile: "bg-violet-tint text-violet",
      color: "#2b6bf0",
      value: String(totalAccounts),
      delta: pctDelta(
        acctNew(now.getTime() - 30 * DAY, now.getTime()),
        acctNew(now.getTime() - 60 * DAY, now.getTime() - 30 * DAY),
      ),
      spark: acctSpark,
    },
    {
      key: "value",
      label: "Pipeline Value",
      icon: "dollar",
      tile: "bg-green-tint text-green",
      color: "#22b573",
      value: kpiByKey.get("value")?.value ?? "—",
      delta: kpiByKey.get("value")?.delta ?? null,
      spark: kpiByKey.get("value")?.spark ?? [],
    },
    {
      key: "won",
      label: "Won Deals",
      icon: "trophy",
      tile: "bg-violet-tint text-violet",
      color: "#6c3ce9",
      value: kpiByKey.get("won")?.value ?? "0",
      delta: kpiByKey.get("won")?.delta ?? null,
      spark: kpiByKey.get("won")?.spark ?? [],
    },
  ];

  // Scoped (Sales Rep) stat cards: the Pipeline KPIs are workspace-wide,
  // so the three deal cards are recomputed from the scoped deals instead.
  if (scoped) {
    const openSum = deals
      .filter((d) => !TERMINAL.includes(d.stage))
      .reduce((s, d) => s + (d.amount ?? 0), 0);
    const byKey = new Map(stats.map((s) => [s.key, s]));
    const dealsCard = byKey.get("deals");
    if (dealsCard) Object.assign(dealsCard, { value: String(deals.length), delta: null, spark: [] });
    const valueCard = byKey.get("value");
    if (valueCard) Object.assign(valueCard, { value: moneyShort(openSum), delta: null, spark: [] });
    const wonCard = byKey.get("won");
    if (wonCard)
      Object.assign(wonCard, {
        value: String(deals.filter((d) => d.stage === "Won").length),
        delta: null,
        spark: [],
      });
  }

  // ---- per-deal assembly ----
  const propsByDeal = new Map<string, typeof proposals>();
  for (const p of proposals) {
    if (!p.dealExternalId) continue;
    const arr = propsByDeal.get(p.dealExternalId) ?? [];
    arr.push(p);
    propsByDeal.set(p.dealExternalId, arr);
  }
  const auditsByProposal = new Map<string, typeof audits>();
  for (const a of audits) {
    const pid = (a.meta as Record<string, unknown> | null)?.proposalId;
    if (typeof pid !== "string") continue;
    const arr = auditsByProposal.get(pid) ?? [];
    arr.push(a);
    auditsByProposal.set(pid, arr);
  }
  const sigByDeal = new Map<string, string>();
  for (const s of signatures) if (!sigByDeal.has(s.dealExternalId)) sigByDeal.set(s.dealExternalId, s.status);
  const contactByCompany = new Map<string, (typeof contacts)[number]>();
  for (const c of contacts) {
    if (c.company && !contactByCompany.has(c.company)) contactByCompany.set(c.company, c);
  }

  const dealRows: DealRow[] = deals.map((d) => {
    const terminal = TERMINAL.includes(d.stage);
    const health = effectiveHealth(d);
    const silent = daysSilent(d.lastActivityAt);
    const dealProps = propsByDeal.get(d.externalId) ?? [];
    const pending = dealProps.filter((p) => p.status === "pending");
    const pendingStage = pending.find((p) => p.type === "deal_stage");
    const pendingStageTo =
      pendingStage && typeof (pendingStage.detail as Record<string, unknown>)?.toValue === "string"
        ? ((pendingStage.detail as Record<string, unknown>).toValue as string)
        : null;
    const stageIdx = STAGE_ORDER.indexOf(d.stage);
    const toIdx = pendingStageTo ? STAGE_ORDER.indexOf(pendingStageTo) : -1;

    const insight = computeCloseLikelihood({
      stage: d.stage,
      daysSilent: silent,
      healthFlag: (health?.flag as "going_cold" | "no_reply" | "promise_due" | null) ?? null,
      healthLabel: health?.label ?? null,
      hasPendingStageProposal: Boolean(pendingStage && toIdx > stageIdx),
      pendingStageTo,
      hasPendingFollowup: pending.some((p) => p.type === "followup_draft"),
      closeDate: d.closeDate,
      now,
    });

    // risk factors — each from a real signal
    const riskFactors: { label: string; detail: string }[] = [];
    if (health) riskFactors.push({ label: health.label, detail: health.note ?? "Flagged from recent activity." });
    if (silent >= 7 && !terminal)
      riskFactors.push({ label: "Going quiet", detail: `No activity for ${silent} days (last: ${fmtDate(d.lastActivityAt)}).` });
    const slipped = dealProps.find(
      (p) =>
        p.status === "applied" &&
        p.type === "deal_field" &&
        (p.detail as Record<string, unknown>)?.field === "closeDate" &&
        new Date(String((p.detail as Record<string, unknown>).toValue)) >
          new Date(String((p.detail as Record<string, unknown>).fromValue)),
    );
    if (slipped) {
      const det = slipped.detail as Record<string, unknown>;
      riskFactors.push({
        label: "Close date slipped",
        detail: `Moved from ${fmtDate(String(det.fromValue))} to ${fmtDate(String(det.toValue))}.`,
      });
    }
    const oldestPending = pending[pending.length - 1];
    if (oldestPending) {
      const ageDays = Math.floor((now.getTime() - oldestPending.createdAt.getTime()) / DAY);
      riskFactors.push({
        label: "Waiting on approval",
        detail: `"${oldestPending.title}" has been waiting ${ageDays === 0 ? "since today" : `${ageDays} ${ageDays === 1 ? "day" : "days"}`} in Approvals.`,
      });
    }
    if (d.closeDate && d.closeDate.getTime() < now.getTime() && !terminal)
      riskFactors.push({ label: "Close date passed", detail: `Was due ${fmtDate(d.closeDate)} and is still open.` });

    // timeline: captures + proposals + audits recorded against this deal
    const events: TimelineEvent[] = [];
    const seenCaptures = new Set<string>();
    for (const p of dealProps) {
      events.push({
        kind: "proposal",
        title: p.title,
        sub: p.reason || null,
        status: p.status,
        when: timeAgo(p.createdAt),
        ts: p.createdAt.getTime(),
      });
      if (p.capture && !seenCaptures.has(p.capture.id)) {
        seenCaptures.add(p.capture.id);
        events.push({
          kind: "capture",
          title: p.capture.title,
          sub: `${SOURCE_LABEL[p.capture.source] ?? "Source"}${p.capture.snippet ? ` — ${p.capture.snippet}` : ""}`,
          status: null,
          when: timeAgo(p.capture.occurredAt),
          ts: p.capture.occurredAt.getTime(),
        });
      }
      for (const a of auditsByProposal.get(p.id) ?? []) {
        events.push({
          kind: "audit",
          title: a.summary,
          sub: null,
          status: a.action,
          when: timeAgo(a.createdAt),
          ts: a.createdAt.getTime(),
        });
      }
    }
    events.sort((a, b) => b.ts - a.ts);

    const notes: DealNote[] = [];
    const seenNotes = new Set<string>();
    for (const p of dealProps) {
      if (!p.capture || seenNotes.has(p.capture.id)) continue;
      seenNotes.add(p.capture.id);
      notes.push({
        id: p.capture.id,
        kind: p.capture.kind,
        sourceLabel: SOURCE_LABEL[p.capture.source] ?? SOURCE_LABEL[p.capture.kind] ?? "Note",
        title: p.capture.title,
        when: timeAgo(p.capture.occurredAt),
        text: p.capture.snippet || p.capture.body.slice(0, 280),
      });
    }

    const contact = d.company ? contactByCompany.get(d.company) : undefined;
    const topPending = pending[0];
    return {
      id: d.id,
      externalId: d.externalId,
      name: d.name,
      company: d.company,
      subline: contact?.name ?? industryOf(d.company),
      stage: d.stage,
      amount: d.amount,
      ownerName: d.ownerName,
      lastActivityLabel: timeAgo(d.lastActivityAt),
      lastActivityISO: d.lastActivityAt.toISOString(),
      daysSilent: silent,
      closeDateLabel: d.closeDate ? fmtDate(d.closeDate) : null,
      closeDateISO: d.closeDate ? d.closeDate.toISOString() : null,
      risk: terminal ? null : health ? (health.flag === "going_cold" ? "High" : "Medium") : "Low",
      health: health ? { flag: health.flag, label: health.label, note: health.note } : null,
      contact: contact ? { name: contact.name, title: contact.title, email: contact.email } : null,
      description: dealProps[0]?.reason || notes[0]?.text || null,
      industry: industryOf(d.company),
      insight,
      riskFactors,
      nextAction: terminal
        ? null
        : topPending
          ? { type: "proposal" as const, title: topPending.title }
          : { type: "followup" as const },
      pendingCount: pending.length,
      recent: events.slice(0, 3),
      timeline: events,
      notes,
      signatureStatus: sigByDeal.get(d.externalId) ?? null,
    };
  });

  // ---- accounts ----
  const accountRows: AccountRow[] = [...firstSeen.keys()]
    .map((name) => {
      const aDeals = deals.filter((d) => d.company === name);
      const aContacts = contacts.filter((c) => c.company === name);
      const last = Math.max(
        ...aDeals.map((d) => d.lastActivityAt.getTime()),
        ...aContacts.map((c) => c.createdAt.getTime()),
        accountByName.get(name)?.createdAt.getTime() ?? 0,
        0,
      );
      return {
        name,
        industry: industryOf(name),
        dealsCount: aDeals.length,
        openValue: aDeals
          .filter((d) => !TERMINAL.includes(d.stage))
          .reduce((s, d) => s + (d.amount ?? 0), 0),
        contactsCount: aContacts.length,
        lastActivityLabel: last > 0 ? timeAgo(new Date(last)) : "—",
        dealIds: aDeals.map((d) => d.id),
        contactIds: aContacts.map((c) => c.id),
      };
    })
    .sort((a, b) => b.openValue - a.openValue || a.name.localeCompare(b.name));

  // ---- contacts ----
  const contactRows: ContactRow[] = contacts.map((c) => {
    const related = proposals.filter((p) => {
      const det = (p.detail ?? {}) as Record<string, unknown>;
      return (
        (typeof det.email === "string" && c.email && det.email.toLowerCase() === c.email.toLowerCase()) ||
        p.title.includes(c.name)
      );
    });
    return {
      id: c.id,
      name: c.name,
      title: c.title,
      company: c.company,
      email: c.email,
      industry: c.industry,
      addedLabel: timeAgo(c.createdAt),
      deals: deals
        .filter((d) => c.company && d.company === c.company)
        .map((d) => ({ id: d.id, name: d.name, stage: d.stage, amount: d.amount })),
      proposals: related.slice(0, 4).map((p) => ({ title: p.title, status: p.status, when: timeAgo(p.createdAt) })),
    };
  });

  // ---- recently updated (last 7 days) ----
  const recent: RecentRow[] = [];
  for (const d of deals) {
    let ts = d.lastActivityAt.getTime();
    for (const p of propsByDeal.get(d.externalId) ?? []) {
      ts = Math.max(ts, p.createdAt.getTime(), p.decidedAt?.getTime() ?? 0);
    }
    if (now.getTime() - ts <= 7 * DAY) {
      recent.push({
        type: "deal",
        id: d.id,
        name: d.name,
        detail: `${d.stage}${d.amount != null ? ` · $${Math.round(d.amount).toLocaleString("en-US")}` : ""}`,
        when: timeAgo(new Date(ts)),
        ts,
      });
    }
  }
  for (const c of contacts) {
    if (now.getTime() - c.createdAt.getTime() <= 7 * DAY) {
      recent.push({
        type: "contact",
        id: c.id,
        name: c.name,
        detail: `New contact${c.company ? ` · ${c.company}` : ""}`,
        when: timeAgo(c.createdAt),
        ts: c.createdAt.getTime(),
      });
    }
  }
  recent.sort((a, b) => b.ts - a.ts);

  // ---- CRM link: only a real (numeric) HubSpot portal counts ----
  let crmPortalId: string | null = null;
  const hs = connections.find((c) => c.provider === "hubspot");
  if (hs) {
    try {
      const data = decryptJson(hs.data) as Record<string, unknown>;
      const pid = typeof data.portalId === "string" ? data.portalId : "";
      if (/^\d+$/.test(pid)) crmPortalId = pid;
    } catch {
      crmPortalId = null;
    }
  }

  const owners = [...new Set(deals.map((d) => d.ownerName).filter((o): o is string => Boolean(o)))].sort();
  return {
    stats,
    dealRows,
    accountRows,
    contactRows,
    recent,
    owners,
    hasUnassigned: deals.some((d) => !d.ownerName),
    crmPortalId,
    hasConnection: connections.length > 0,
    counts: {
      deals: dealRows.length,
      accounts: accountRows.length,
      contacts: contactRows.length,
      atRisk: dealRows.filter((r) => r.risk === "High" || r.risk === "Medium").length,
    },
  };
}
