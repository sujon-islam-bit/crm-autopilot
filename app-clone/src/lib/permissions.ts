/**
 * Team roles + permission enforcement (Settings → Workspace → Team).
 *
 * The 5-role system is LOCKED (Sujon, 2026-11-26 23:20, ChatGPT's plan):
 *   Owner    — everything, incl. billing, ownership transfer, workspace delete
 *   Admin    — members, integrations, hygiene, review queue, sync & rollback,
 *              AI settings — NO billing, NO ownership transfer
 *   Manager  — team pipeline/deals/reports, review queue (team scope) —
 *              NO billing, security, team management or settings writes
 *   Sales Rep— own deals/contacts only: review own AI suggestions, edit
 *              follow-up drafts, own approved actions
 *   Viewer   — read-only everywhere; no mutations at all
 *
 * `can()` is the single gate every mutating server action checks — the UI
 * mirrors it (disabled buttons), but the server is the enforcement.
 * Client-safe: no server-only imports, so client components can use the
 * labels/matrix for display.
 */

export const ROLE_KEYS = ["owner", "admin", "manager", "rep", "viewer"] as const;
export type RoleKey = (typeof ROLE_KEYS)[number];

export const ROLE_LABELS: Record<RoleKey, string> = {
  owner: "Owner",
  admin: "Admin",
  manager: "Manager",
  rep: "Sales Rep",
  viewer: "Viewer",
};

/** Roles stored before the 5-role system ("member") read as Manager-level
 *  display only; enforcement normalises unknown roles to the most
 *  restrictive (viewer) so a stray value can never grant access. */
export function normalizeRole(raw: string | null | undefined): RoleKey {
  // Canonical storage is the lowercase key ("owner"); label forms ("Owner",
  // "Sales Rep") from older writes are accepted too.
  switch ((raw ?? "").trim().toLowerCase().replace(/\s+/g, " ")) {
    case "owner":
      return "owner";
    case "admin":
      return "admin";
    case "manager":
      return "manager";
    case "rep":
    case "sales rep":
    case "salesrep":
      return "rep";
    case "viewer":
      return "viewer";
    default:
      return "viewer";
  }
}

export type Action =
  /** Approve / reject / edit-approve / undo a proposal, roll back a batch. */
  | "proposals.decide"
  /** Create proposals from Data Cleanup (merge / fix / log / follow-up). */
  | "hygiene.propose"
  /** Change Data Guardrails. */
  | "guardrails.write"
  /** Create deals/contacts/accounts, send a signature request. */
  | "deals.write"
  /** Connect/disconnect apps, change connection settings, sync now. */
  | "connections.write"
  /** Workspace settings: name, company details, AI preferences, retention. */
  | "settings.write"
  /** Invite members, change roles, remove members. */
  | "team.write"
  /** Transfer workspace ownership (Owner only). */
  | "team.transferOwnership"
  /** Billing: view plan/usage, upgrade, invoices. */
  | "billing.view"
  /** Run the AI engine scan ("Check for updates") / add notes. */
  | "engine.run"
  /** See the Connections page at all (Owner/Admin only). */
  | "pages.connections"
  /** See the Data Cleanup page (hidden for Sales Reps). */
  | "pages.cleanup"
  /** See the History page (hidden for Sales Reps). */
  | "pages.history";

const MATRIX: Record<Action, Record<RoleKey, boolean>> = {
  "proposals.decide": { owner: true, admin: true, manager: true, rep: true, viewer: false },
  "hygiene.propose": { owner: true, admin: true, manager: false, rep: false, viewer: false },
  "guardrails.write": { owner: true, admin: true, manager: false, rep: false, viewer: false },
  "deals.write": { owner: true, admin: true, manager: true, rep: true, viewer: false },
  "connections.write": { owner: true, admin: true, manager: false, rep: false, viewer: false },
  "settings.write": { owner: true, admin: true, manager: false, rep: false, viewer: false },
  "team.write": { owner: true, admin: true, manager: false, rep: false, viewer: false },
  "team.transferOwnership": { owner: true, admin: false, manager: false, rep: false, viewer: false },
  "billing.view": { owner: true, admin: false, manager: false, rep: false, viewer: false },
  "engine.run": { owner: true, admin: true, manager: true, rep: false, viewer: false },
  // Page visibility (Sujon's middle path, adopted 2026-11-27): Connections
  // is an admin surface — Owner/Admin only. Data Cleanup + History stay
  // readable for Viewer/Manager but are hidden from Sales Reps, whose
  // work lives in Approvals + Deals & Contacts.
  "pages.connections": { owner: true, admin: true, manager: false, rep: false, viewer: false },
  "pages.cleanup": { owner: true, admin: true, manager: true, rep: false, viewer: true },
  "pages.history": { owner: true, admin: true, manager: true, rep: false, viewer: true },
};

export function can(role: string | null | undefined, action: Action): boolean {
  return MATRIX[action][normalizeRole(role)];
}

/** Roles whose proposal/deal scope is the whole team (vs. own records). */
export function hasTeamScope(role: string | null | undefined): boolean {
  const r = normalizeRole(role);
  return r === "owner" || r === "admin" || r === "manager";
}

/**
 * Record ownership for scope checks. Deals carry the owner's display name
 * (`ownerName`); a Sales Rep owns the records whose ownerName matches their
 * own profile name. (The demo's deals all belong to "Md Yasses", the Owner,
 * so a Rep correctly sees an empty actionable scope there.)
 */
export function ownsDeal(userName: string | null | undefined, dealOwnerName: string | null | undefined): boolean {
  if (!userName || !dealOwnerName) return false;
  return userName.trim().toLowerCase() === dealOwnerName.trim().toLowerCase();
}

/** Rows of the Roles & Permissions matrix shown in Settings. Each row is
 *  [label, owner, admin, manager, rep, viewer] and MUST match `can()` and
 *  the read-scoping exactly — it is generated from the same constants. */
export const PERMISSION_MATRIX_ROWS: { label: string; access: Record<RoleKey, string> }[] = [
  { label: "View dashboard, pipeline, deals & reports", access: { owner: "✓", admin: "✓", manager: "✓", rep: "Own records", viewer: "✓" } },
  { label: "Data Cleanup page", access: { owner: "✓", admin: "✓", manager: "View", rep: "—", viewer: "View" } },
  { label: "History page", access: { owner: "✓", admin: "✓", manager: "✓", rep: "—", viewer: "View" } },
  { label: "Approve, reject & edit AI proposals", access: { owner: "✓", admin: "✓", manager: "✓", rep: "Own deals only", viewer: "—" } },
  { label: "Undo changes & roll back sync batches", access: { owner: "✓", admin: "✓", manager: "✓", rep: "Own deals only", viewer: "—" } },
  { label: "Create deals, contacts & accounts", access: { owner: "✓", admin: "✓", manager: "✓", rep: "✓", viewer: "—" } },
  { label: "Send signature requests", access: { owner: "✓", admin: "✓", manager: "✓", rep: "Own deals only", viewer: "—" } },
  { label: "Propose clean-ups from Data Cleanup", access: { owner: "✓", admin: "✓", manager: "—", rep: "—", viewer: "—" } },
  { label: "Change Data Guardrails", access: { owner: "✓", admin: "✓", manager: "—", rep: "—", viewer: "—" } },
  { label: "Connections page", access: { owner: "✓", admin: "✓", manager: "—", rep: "—", viewer: "—" } },
  { label: "Connect & manage integrations", access: { owner: "✓", admin: "✓", manager: "—", rep: "—", viewer: "—" } },
  { label: "Workspace & AI settings", access: { owner: "✓", admin: "✓", manager: "—", rep: "—", viewer: "—" } },
  { label: "Invite members, change roles, remove members", access: { owner: "✓", admin: "✓", manager: "—", rep: "—", viewer: "—" } },
  { label: "Transfer ownership & delete workspace", access: { owner: "✓", admin: "—", manager: "—", rep: "—", viewer: "—" } },
  { label: "Billing & plan", access: { owner: "✓", admin: "—", manager: "—", rep: "—", viewer: "—" } },
];
