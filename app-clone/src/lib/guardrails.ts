import "server-only";
import { prisma } from "./db";

/**
 * Data Guardrails (Data Cleanup) — per-workspace prevention rules.
 * A workspace with no GuardrailSetting row runs on the defaults: master on,
 * every rule on. The EFFECTIVE value of a rule is `master && rule` — the
 * master switch turns everything off without erasing the saved choices.
 */
export type GuardrailKey =
  | "autoEnrich"
  | "preventInvalidStage"
  | "requireNextStep"
  | "detectDuplicates"
  | "flagSuspicious";

export type Guardrails = {
  hasRow: boolean;
  master: boolean;
  /** Saved per-rule switches (before the master is applied). */
  saved: Record<GuardrailKey, boolean>;
  /** Effective switches (master applied) — what the product obeys. */
  effective: Record<GuardrailKey, boolean>;
  /** Duplicate count frozen when detection was last switched off. */
  lastDupCount: number | null;
};

export const GUARDRAIL_RULES: { key: GuardrailKey; label: string; desc: string }[] = [
  {
    key: "autoEnrich",
    label: "Auto-enrich new contacts",
    desc: "Let the AI suggest missing titles, companies and industries for new contacts.",
  },
  {
    key: "preventInvalidStage",
    label: "Prevent invalid stage changes",
    desc: "Block stage moves that skip steps or go backwards without a reason.",
  },
  {
    key: "requireNextStep",
    label: "Require a next-step date",
    desc: "Flag deals that sit in an active stage with no next step planned.",
  },
  {
    key: "detectDuplicates",
    label: "Detect duplicate emails",
    desc: "Scan contacts for records that share the same email address.",
  },
  {
    key: "flagSuspicious",
    label: "Flag suspicious updates",
    desc: "Surface unusual changes — big amount swings, silent stage jumps — for review.",
  },
];

const DEFAULTS: Record<GuardrailKey, boolean> = {
  autoEnrich: true,
  preventInvalidStage: true,
  requireNextStep: true,
  detectDuplicates: true,
  flagSuspicious: true,
};

export async function getGuardrails(workspaceId: string): Promise<Guardrails> {
  const row = await prisma.guardrailSetting.findUnique({ where: { workspaceId } });
  const master = row?.enabled ?? true;
  const saved: Record<GuardrailKey, boolean> = {
    autoEnrich: row?.autoEnrich ?? DEFAULTS.autoEnrich,
    preventInvalidStage: row?.preventInvalidStage ?? DEFAULTS.preventInvalidStage,
    requireNextStep: row?.requireNextStep ?? DEFAULTS.requireNextStep,
    detectDuplicates: row?.detectDuplicates ?? DEFAULTS.detectDuplicates,
    flagSuspicious: row?.flagSuspicious ?? DEFAULTS.flagSuspicious,
  };
  const effective = Object.fromEntries(
    Object.entries(saved).map(([k, v]) => [k, master && v]),
  ) as Record<GuardrailKey, boolean>;
  return { hasRow: Boolean(row), master, saved, effective, lastDupCount: row?.lastDupCount ?? null };
}
