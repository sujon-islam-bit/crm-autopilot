import { daysSilent } from "./constants";

export type HealthFlag = "going_cold" | "no_reply" | "promise_due";
export type HealthInfo = { flag: HealthFlag; label: string; note: string | null };

export const HEALTH_LABEL: Record<HealthFlag, string> = {
  going_cold: "Going cold",
  no_reply: "No reply",
  promise_due: "Promise due",
};

/**
 * The deal's effective health state, following the SAME rules as the
 * engine's refreshHealthFlags (src/lib/engine.ts):
 *  - a stored promise_due is never overwritten;
 *  - a stored flag (written by an engine run or an approved proposal) wins;
 *  - otherwise derive from silence: Proposal sent / Negotiation quiet for
 *    >= 7 days = going cold; Contacted / Discovery quiet for >= 14 days =
 *    no reply. Won deals are never flagged.
 * Read-only — this derives for display what the engine would write.
 */
export function effectiveHealth(deal: {
  stage: string;
  lastActivityAt: Date | string;
  healthFlag: string | null;
  healthNote: string | null;
}): HealthInfo | null {
  if (deal.healthFlag === "promise_due") {
    return { flag: "promise_due", label: HEALTH_LABEL.promise_due, note: deal.healthNote };
  }
  if (deal.healthFlag === "going_cold" || deal.healthFlag === "no_reply") {
    return { flag: deal.healthFlag, label: HEALTH_LABEL[deal.healthFlag], note: deal.healthNote };
  }
  if (deal.stage === "Won") return null;
  const silent = daysSilent(deal.lastActivityAt);
  if ((deal.stage === "Proposal sent" || deal.stage === "Negotiation") && silent >= 7) {
    return {
      flag: "going_cold",
      label: HEALTH_LABEL.going_cold,
      note: `No activity for ${silent} days at ${deal.stage}`,
    };
  }
  if ((deal.stage === "Contacted" || deal.stage === "Discovery") && silent >= 14) {
    return { flag: "no_reply", label: HEALTH_LABEL.no_reply, note: `No activity for ${silent} days` };
  }
  return null;
}

/** Chip classes per flag: cold = red, no reply = amber, promise = purple. */
export function healthChipClass(flag: HealthFlag): string {
  if (flag === "going_cold") return "bg-[#fdecec] text-red";
  if (flag === "no_reply") return "bg-amber-tint text-amber";
  return "bg-purple-tint text-purple";
}
