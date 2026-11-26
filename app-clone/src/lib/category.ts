/**
 * Review Queue tab categories. Engine types map onto the five tabs:
 * deal_stage / deal_field / new_deal → Deal Updates, new_contact → New
 * Contacts, followup_draft / task → Follow-ups, hygiene fixes split by
 * kind (duplicate/industry/enrich → Enrichment, unlogged → Follow-ups,
 * stale → Deal Updates, anything else → Field Fixes).
 */
export type ProposalCategory =
  | "deal_update"
  | "new_contact"
  | "enrichment"
  | "followup"
  | "field_fix";

export const CATEGORY_TABS: { key: ProposalCategory | "all"; label: string }[] = [
  { key: "all", label: "All Suggestions" },
  { key: "deal_update", label: "Deal Updates" },
  { key: "new_contact", label: "New Contacts" },
  { key: "enrichment", label: "Enrichment" },
  { key: "followup", label: "Follow-ups" },
  { key: "field_fix", label: "Field Fixes" },
];

export function categoryFor(
  type: string,
  detail?: Record<string, unknown> | null,
): ProposalCategory {
  switch (type) {
    case "new_contact":
      return "new_contact";
    case "followup_draft":
    case "task":
      return "followup";
    case "hygiene_fix": {
      const kind = String(detail?.kind ?? "");
      if (kind === "duplicate" || kind === "industry" || kind === "enrich") return "enrichment";
      if (kind === "unlogged") return "followup";
      if (kind === "stale") return "deal_update";
      return "field_fix";
    }
    default:
      return "deal_update";
  }
}
