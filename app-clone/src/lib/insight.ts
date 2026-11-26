/**
 * AI deal insight — the close-likelihood shown on Deals & Contacts.
 *
 * The percentage is NOT a model guess: it is a transparent, reproducible
 * formula over the deal's real state, and every adjustment that fires is
 * returned as a reason line so the UI can show its working.
 *
 *   base by stage        New 10 · Discovery 25 · Contacted 40 ·
 *                        Meeting booked 55 · Proposal sent 70 · Negotiation 85
 *   silence              −2 per full day without activity beyond day 3,
 *                        capped at −25
 *   health flag          going cold −15 · no reply −10 · promise due −5
 *   pending stage move   +5 when a proposal to a LATER stage waits in
 *                        Approvals (buyer momentum the AI detected)
 *   pending follow-up    −5 when a follow-up draft waits (unanswered thread)
 *   close date passed    −10 (deal still open past its close date)
 *   tight close date     −5 when the close date is ≤14 days away and the
 *                        deal has not reached Proposal sent yet
 * Open deals clamp to 2–97. Won = 100, Lost = 0 (no adjustments).
 */

export const STAGE_ORDER = [
  "New",
  "Discovery",
  "Contacted",
  "Meeting booked",
  "Proposal sent",
  "Negotiation",
  "Won",
  "Lost",
];

export const STAGE_BASE: Record<string, number> = {
  New: 10,
  Discovery: 25,
  Contacted: 40,
  "Meeting booked": 55,
  "Proposal sent": 70,
  Negotiation: 85,
};

export type InsightReason = { text: string; points: number };
export type DealInsightResult = {
  pct: number;
  summary: string;
  reasons: InsightReason[];
};

export type InsightInput = {
  stage: string;
  daysSilent: number;
  healthFlag: "going_cold" | "no_reply" | "promise_due" | null;
  healthLabel: string | null;
  hasPendingStageProposal: boolean;
  pendingStageTo: string | null;
  hasPendingFollowup: boolean;
  closeDate: Date | null;
  now: Date;
};

const HEALTH_POINTS: Record<string, number> = {
  going_cold: -15,
  no_reply: -10,
  promise_due: -5,
};

export function computeCloseLikelihood(input: InsightInput): DealInsightResult {
  const { stage, daysSilent, healthFlag, healthLabel } = input;
  if (stage === "Won") {
    return {
      pct: 100,
      summary: "This deal is closed — it was won.",
      reasons: [{ text: "Stage: Won — closed", points: 100 }],
    };
  }
  if (stage === "Lost") {
    return {
      pct: 0,
      summary: "This deal is closed — it was lost.",
      reasons: [{ text: "Stage: Lost — closed", points: 0 }],
    };
  }

  const base = STAGE_BASE[stage] ?? 10;
  const reasons: InsightReason[] = [{ text: `Stage: ${stage}`, points: base }];
  let pct = base;

  if (daysSilent > 3) {
    const pts = -Math.min(25, 2 * (daysSilent - 3));
    reasons.push({ text: `No activity for ${daysSilent} days`, points: pts });
    pct += pts;
  }
  if (healthFlag && HEALTH_POINTS[healthFlag]) {
    reasons.push({
      text: `${healthLabel ?? healthFlag} flag`,
      points: HEALTH_POINTS[healthFlag],
    });
    pct += HEALTH_POINTS[healthFlag];
  }
  if (input.hasPendingStageProposal) {
    reasons.push({
      text: `Move to ${input.pendingStageTo ?? "a later stage"} waiting in Approvals`,
      points: 5,
    });
    pct += 5;
  }
  if (input.hasPendingFollowup) {
    reasons.push({ text: "Follow-up draft waiting (unanswered thread)", points: -5 });
    pct -= 5;
  }
  if (input.closeDate) {
    const ms = input.closeDate.getTime() - input.now.getTime();
    const stageIdx = STAGE_ORDER.indexOf(stage);
    const proposalIdx = STAGE_ORDER.indexOf("Proposal sent");
    if (ms < 0) {
      reasons.push({ text: "Close date has passed", points: -10 });
      pct -= 10;
    } else if (ms <= 14 * 86_400_000 && stageIdx >= 0 && stageIdx < proposalIdx) {
      reasons.push({ text: "Close date within 14 days, still early-stage", points: -5 });
      pct -= 5;
    }
  }

  pct = Math.max(2, Math.min(97, pct));
  const summary = `This deal is ${pct}% likely to close, based on its stage (${stage}), ${daysSilent} ${
    daysSilent === 1 ? "day" : "days"
  } since last activity${healthFlag ? `, and a ${(healthLabel ?? "").toLowerCase()} flag` : ""}.`;
  return { pct, summary, reasons };
}
