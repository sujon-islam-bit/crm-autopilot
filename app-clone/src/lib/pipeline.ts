import "server-only";
import { prisma } from "./db";
import { STAGES, fmtDate, moneyShort, timeAgo } from "./constants";
import { effectiveHealth } from "./health";
import type { DealInsight, DealView } from "./view";

/**
 * Pipeline Compare data — every number on the page traces to rows:
 * - Stage history is reconstructed from APPLIED deal_stage proposals
 *   (detail.fromValue → detail.toValue at appliedAt). A deal's stage at
 *   time t is the fromValue of its earliest stage event after t, or its
 *   current stage when no later event exists; before createdAt the deal
 *   does not exist. Close-date slips come from applied deal_field
 *   proposals with field = "closeDate".
 * - KPI deltas compare the period against the previous equal-length
 *   period (creations / stage events) or against the reconstructed value
 *   at the period's start (pipeline value / win rate). When the base side
 *   has no data, the delta is null and the UI shows "—" — never a
 *   fabricated percentage.
 */

const DAY = 86_400_000;
export const TERMINAL_STAGES = ["Won", "Lost"];
const STAGE_INDEX = new Map<string, number>(STAGES.map((s, i) => [s, i]));

export type PeriodKey = "7" | "30" | "90" | "custom";
export type PeriodSpec = {
  key: PeriodKey;
  days: number;
  start: Date;
  end: Date;
  prevStart: Date;
  prevEnd: Date;
};

export function resolvePeriod(sp: { period?: string; from?: string; to?: string }): PeriodSpec {
  const end = new Date();
  if (sp.period === "custom" && sp.from && sp.to) {
    const start = new Date(`${sp.from}T00:00:00`);
    const customEnd = new Date(`${sp.to}T23:59:59`);
    if (!Number.isNaN(start.getTime()) && !Number.isNaN(customEnd.getTime()) && customEnd > start) {
      const days = Math.max(1, Math.round((customEnd.getTime() - start.getTime()) / DAY));
      return {
        key: "custom",
        days,
        start,
        end: customEnd,
        prevStart: new Date(start.getTime() - days * DAY),
        prevEnd: start,
      };
    }
  }
  const days = sp.period === "7" ? 7 : sp.period === "90" ? 90 : 30;
  const start = new Date(end.getTime() - days * DAY);
  return {
    key: String(days) as PeriodKey,
    days,
    start,
    end,
    prevStart: new Date(start.getTime() - days * DAY),
    prevEnd: start,
  };
}

type StageEvent = { at: Date; from: string; to: string; reason: string };
type CloseEvent = { at: Date; from: string; to: string };

export type KpiDelta = { dir: "up" | "down" | "flat" | "none"; text: string } | null;
export type Kpi = {
  key: string;
  label: string;
  icon: "trend" | "dollar" | "checkCircle" | "hourglass";
  tile: string; // tailwind classes for the icon tile
  color: string; // sparkline colour
  value: string;
  delta: KpiDelta;
  spark: number[];
};
export type MovementRow = { stage: string; label: string; current: number; previous: number };
export type Insight = { kind: "growth" | "stage" | "risk"; headline: string; text: string };

const EVIDENCE_LABEL: Record<string, string> = {
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

export async function getPipelineData(workspaceId: string, period: PeriodSpec) {
  const now = new Date();
  const [deals, contacts, proposals, signatures, connectionCount] = await Promise.all([
    prisma.crmDeal.findMany({ where: { workspaceId }, orderBy: { amount: "desc" } }),
    prisma.crmContact.findMany({ where: { workspaceId }, orderBy: { name: "asc" } }),
    prisma.proposal.findMany({
      where: { workspaceId, dealExternalId: { not: null } },
      orderBy: { createdAt: "desc" },
      include: { capture: true },
    }),
    prisma.signatureRequest.findMany({ where: { workspaceId }, orderBy: { createdAt: "desc" } }),
    prisma.connection.count({ where: { workspaceId } }),
  ]);

  // ---- stage / close-date history per deal (applied proposals only) ----
  const stageEvents = new Map<string, StageEvent[]>();
  const closeEvents = new Map<string, CloseEvent[]>();
  const propsByDeal = new Map<string, typeof proposals>();
  for (const p of proposals) {
    if (!p.dealExternalId) continue;
    const arr = propsByDeal.get(p.dealExternalId) ?? [];
    arr.push(p);
    propsByDeal.set(p.dealExternalId, arr);
    if (p.status !== "applied" || !p.appliedAt) continue;
    const d = (p.detail ?? {}) as Record<string, unknown>;
    const s = (v: unknown) => (typeof v === "string" ? v : "");
    if (p.type === "deal_stage") {
      const from = s(d.fromValue) || s(d._prevStage);
      const to = s(d.toValue);
      if (from && to) {
        const list = stageEvents.get(p.dealExternalId) ?? [];
        list.push({ at: p.appliedAt, from, to, reason: p.reason });
        stageEvents.set(p.dealExternalId, list);
      }
    } else if (p.type === "deal_field" && s(d.field) === "closeDate") {
      const from = s(d.fromValue) || s(d._prevCloseDate);
      const to = s(d.toValue);
      if (from && to) {
        const list = closeEvents.get(p.dealExternalId) ?? [];
        list.push({ at: p.appliedAt, from, to });
        closeEvents.set(p.dealExternalId, list);
      }
    }
  }
  for (const list of stageEvents.values()) list.sort((a, b) => a.at.getTime() - b.at.getTime());
  for (const list of closeEvents.values()) list.sort((a, b) => a.at.getTime() - b.at.getTime());

  const dealByExt = new Map(deals.map((d) => [d.externalId, d]));
  function stageAt(externalId: string, t: Date): string | null {
    const deal = dealByExt.get(externalId);
    if (!deal) return null;
    if (t.getTime() < deal.createdAt.getTime()) return null;
    for (const e of stageEvents.get(externalId) ?? []) {
      if (e.at.getTime() > t.getTime()) return e.from;
    }
    return deal.stage;
  }

  function snapshot(t: Date) {
    let total = 0;
    let openValue = 0;
    let won = 0;
    let lost = 0;
    for (const d of deals) {
      const s = stageAt(d.externalId, t);
      if (s == null) continue;
      total++;
      if (s === "Won") won++;
      else if (s === "Lost") lost++;
      else openValue += d.amount ?? 0;
    }
    return { total, openValue, won, lost };
  }
  const winRate = (won: number, lost: number) => (won + lost > 0 ? (won / (won + lost)) * 100 : null);

  const inWindow = (t: Date, a: Date, b: Date) => t.getTime() >= a.getTime() && t.getTime() <= b.getTime();
  const createdIn = (a: Date, b: Date) => deals.filter((d) => inWindow(d.createdAt, a, b)).length;
  const wonEventsIn = (a: Date, b: Date) => {
    let n = 0;
    for (const list of stageEvents.values())
      for (const e of list) if (e.to === "Won" && inWindow(e.at, a, b)) n++;
    return n;
  };

  // ---- sparkline samples (12 points across the period) ----
  const SAMPLES = 12;
  const sampleTimes = Array.from({ length: SAMPLES }, (_, i) => {
    if (i === SAMPLES - 1) return period.end;
    return new Date(period.start.getTime() + ((period.end.getTime() - period.start.getTime()) * i) / (SAMPLES - 1));
  });
  const snaps = sampleTimes.map((t) => snapshot(t));

  // ---- KPIs ----
  const endSnap = snapshot(period.end);
  const startSnap = snapshot(period.start);
  const rateNow = winRate(endSnap.won, endSnap.lost);
  const rateStart = winRate(startSnap.won, startSnap.lost);
  // "Now" figures come from the deal rows themselves (the same convention
  // as the dashboard's open total); the reconstruction supplies the
  // period-start base and the trend samples.
  const openNow = deals.reduce((s, d) => (TERMINAL_STAGES.includes(d.stage) ? s : s + (d.amount ?? 0)), 0);

  let lastRate = 0;
  const rateSpark = snaps.map((s) => {
    const r = winRate(s.won, s.lost);
    if (r != null) lastRate = r;
    return lastRate;
  });

  const kpis: Kpi[] = [
    {
      key: "deals",
      label: "Total Deals",
      icon: "trend",
      tile: "bg-violet-tint text-violet",
      color: "#6c3ce9",
      value: String(deals.length),
      delta: pctDelta(createdIn(period.start, period.end), createdIn(period.prevStart, period.prevEnd)),
      spark: snaps.map((s, i) => (i === snaps.length - 1 ? deals.length : s.total)),
    },
    {
      key: "value",
      label: "Total Pipeline Value",
      icon: "dollar",
      tile: "bg-primary-tint text-primary",
      color: "#2b6bf0",
      value: moneyShort(openNow),
      delta: pctDelta(openNow, startSnap.openValue),
      spark: snaps.map((s, i) => (i === snaps.length - 1 ? openNow : s.openValue)),
    },
    {
      key: "won",
      label: "Won Deals",
      icon: "checkCircle",
      tile: "bg-green-tint text-green",
      color: "#22b573",
      value: String(endSnap.won),
      delta: pctDelta(wonEventsIn(period.start, period.end), wonEventsIn(period.prevStart, period.prevEnd)),
      spark: snaps.map((s) => s.won),
    },
    {
      key: "winrate",
      label: "Win Rate",
      icon: "hourglass",
      tile: "bg-purple-tint text-purple",
      color: "#8b5cf6",
      value: rateNow != null ? `${rateNow.toFixed(1)}%` : "—",
      delta:
        rateNow == null || rateStart == null
          ? null
          : (() => {
              const pts = rateNow - rateStart;
              if (Math.abs(pts) < 0.05) return { dir: "flat" as const, text: "0.0 pts" };
              return { dir: pts > 0 ? ("up" as const) : ("down" as const), text: `${pts > 0 ? "+" : "−"}${Math.abs(pts).toFixed(1)} pts` };
            })(),
      spark: rateSpark,
    },
  ];

  // ---- Pipeline Movement (current vs at period start, per stage) ----
  const movement: MovementRow[] = STAGES.map((stage) => {
    let current = 0;
    let previous = 0;
    for (const d of deals) {
      if (d.stage === stage) current += d.amount ?? 0;
      if (stageAt(d.externalId, period.start) === stage) previous += d.amount ?? 0;
    }
    return { stage, label: stage === "Won" ? "Closed Won" : stage, current, previous };
  });

  // ---- rows ----
  const contactByCompany = new Map<string, (typeof contacts)[number]>();
  for (const c of contacts) {
    if (c.company && !contactByCompany.has(c.company)) contactByCompany.set(c.company, c);
  }
  const sigByDeal = new Map<string, string>();
  for (const s of signatures) {
    if (!sigByDeal.has(s.dealExternalId)) sigByDeal.set(s.dealExternalId, s.status);
  }

  const isForward = (e: StageEvent) => {
    if (e.to === "Lost") return false;
    const fi = STAGE_INDEX.get(e.from);
    const ti = STAGE_INDEX.get(e.to);
    return fi != null && ti != null && ti > fi;
  };

  let stalledCount = 0;
  const rows: DealView[] = deals.map((d) => {
    const events = stageEvents.get(d.externalId) ?? [];
    const closes = closeEvents.get(d.externalId) ?? [];
    const lastEvent = events[events.length - 1];
    const enteredAt = lastEvent?.at ?? d.createdAt;
    const terminal = TERMINAL_STAGES.includes(d.stage);
    const health = effectiveHealth(d);
    const progressed = events.some((e) => isForward(e) && inWindow(e.at, period.start, period.end));
    const slipped = closes.some(
      (e) => inWindow(e.at, period.start, period.end) && new Date(e.to).getTime() > new Date(e.from).getTime(),
    );
    const stalled = !terminal && health != null;
    if (stalled) stalledCount++;

    const dealProps = propsByDeal.get(d.externalId) ?? [];
    const latest = dealProps[0];
    const contact = d.company ? contactByCompany.get(d.company) : undefined;

    // AI insight for the drawer: health flag first, then the newest
    // proposal's own reason/evidence — real rows only.
    let insight: DealInsight;
    const evidenceOf = (p: (typeof dealProps)[number] | undefined) => {
      if (!p?.capture) return { source: null as string | null, quote: null as string | null };
      const det = (p.detail ?? {}) as Record<string, unknown>;
      const quote =
        (typeof det.evidenceQuote === "string" && det.evidenceQuote) || p.capture.snippet || null;
      const label = EVIDENCE_LABEL[p.capture.source] ?? EVIDENCE_LABEL[p.capture.kind] ?? "Source";
      return { source: `${label} • ${fmtDate(p.capture.occurredAt)}`, quote };
    };
    if (health) {
      const ev = evidenceOf(latest);
      insight = {
        label: health.label,
        tone: health.flag === "going_cold" ? "red" : health.flag === "no_reply" ? "amber" : "purple",
        text: latest?.reason || health.note || "Flagged by the AI from recent activity.",
        source: ev.source,
        quote: ev.quote,
      };
    } else if (progressed) {
      const fwd = [...events].reverse().find((e) => isForward(e) && inWindow(e.at, period.start, period.end));
      const ev = evidenceOf(latest);
      insight = {
        label: "Progressed",
        tone: "green",
        text: fwd?.reason || latest?.reason || "This deal moved forward in the selected period.",
        source: ev.source,
        quote: ev.quote,
      };
    } else if (latest) {
      insight = {
        label: "Latest signal",
        tone: "grey",
        text: latest.reason || "The AI is tracking this deal.",
        source: evidenceOf(latest).source,
        quote: evidenceOf(latest).quote,
      };
    } else {
      insight = { label: "On track", tone: "grey", text: "No AI flags on this deal right now.", source: null, quote: null };
    }

    return {
      id: d.id,
      externalId: d.externalId,
      name: d.name,
      company: d.company,
      stage: d.stage,
      amount: d.amount,
      closeDate: d.closeDate ? fmtDate(d.closeDate) : null,
      ownerName: d.ownerName,
      lastActivityLabel: timeAgo(d.lastActivityAt),
      health: health ? { flag: health.flag, label: health.label, note: health.note } : null,
      contact: contact ? { name: contact.name, title: contact.title, email: contact.email } : null,
      signatureStatus: sigByDeal.get(d.externalId) ?? null,
      activity: dealProps.slice(0, 4).map((p) => ({
        title: p.title,
        status: p.status,
        when: timeAgo(p.createdAt),
      })),
      latestReason: latest?.reason || null,
      prevStage: lastEvent?.from ?? d.stage,
      daysInStage: terminal ? null : Math.max(0, Math.floor((now.getTime() - enteredAt.getTime()) / DAY)),
      risk: terminal ? null : health ? (health.flag === "going_cold" ? "High" : "Medium") : "Low",
      insight,
      tabFlags: { progressed, stalled, slipped },
    };
  });

  // ---- tab counts ----
  const tabCounts = {
    all: rows.length,
    progressed: rows.filter((r) => r.tabFlags?.progressed).length,
    stalled: stalledCount,
    slipped: rows.filter((r) => r.tabFlags?.slipped).length,
    wonLost: rows.filter((r) => TERMINAL_STAGES.includes(r.stage)).length,
  };

  // ---- Key Insights (computed from the same numbers) ----
  const valueDelta = openNow - startSnap.openValue;
  const valuePct = startSnap.openValue > 0 ? Math.round((valueDelta / startSnap.openValue) * 100) : null;
  const growth: Insight =
    valuePct == null
      ? {
          kind: "growth",
          headline: "Pipeline is just getting started",
          text: "There was no open pipeline value at the start of this period.",
        }
      : {
          kind: "growth",
          headline: `Pipeline is ${valueDelta >= 0 ? "up" : "down"} ${Math.abs(valuePct)}%`,
          text: `Your total pipeline value ${valueDelta >= 0 ? "increased" : "decreased"} by ${moneyShort(Math.abs(valueDelta))} compared to the previous ${period.days} days.`,
        };
  let stageInsight: Insight = {
    kind: "stage",
    headline: "No stage grew this period",
    text: "Stage values are flat or down versus the start of the period.",
  };
  let bestGain = 0;
  let bestRow: MovementRow | null = null;
  for (const m of movement) {
    const gain = m.current - m.previous;
    if (gain > bestGain) {
      bestGain = gain;
      bestRow = m;
    }
  }
  if (bestRow) {
    stageInsight = {
      kind: "stage",
      headline: `${bestRow.label} stage is growing`,
      text:
        bestRow.previous > 0
          ? `Value in this stage grew ${Math.round((bestGain / bestRow.previous) * 100)}% compared to the start of the period.`
          : `This stage held $0 at the start of the period and now holds ${moneyShort(bestRow.current)}.`,
    };
  }
  const riskInsight: Insight =
    stalledCount > 0
      ? {
          kind: "risk",
          headline: `Watch: ${stalledCount} ${stalledCount === 1 ? "deal is" : "deals are"} at risk`,
          text: "These deals have no activity for 7+ days.",
        }
      : {
          kind: "risk",
          headline: "No deals at risk",
          text: "Every open deal has had activity in the last 7 days.",
        };

  const owners = [...new Set(deals.map((d) => d.ownerName).filter((o): o is string => Boolean(o)))].sort();

  return {
    kpis,
    movement,
    insights: [growth, stageInsight, riskInsight],
    tabCounts,
    rows,
    owners,
    hasConnection: connectionCount > 0,
    openTotal: openNow,
  };
}
