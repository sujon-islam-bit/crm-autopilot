/**
 * The Connections catalog — pure data, shared by the server data layer and
 * the client. Statuses are NOT stored here: a card is "Connected" only when
 * a real Connection row exists for the app's provider in the workspace.
 *
 * Gmail and Google Calendar are separate cards (as in the design) but share
 * the single "google" Connection row — one Google grant covers both, which
 * matches the Connection schema's provider vocabulary.
 *
 * Permissions follow the read-only-start rule: every READ permission
 * defaults ON, every WRITE permission defaults OFF. Nothing here grants
 * anything by itself — the values are preferences stored on the Connection
 * row (see lib/connections.ts) and shown honestly as such.
 */

export type PermissionDef = {
  key: string;
  label: string;
  desc: string;
  kind: "read" | "write";
};

export type CatalogApp = {
  id: string;
  provider: string;
  name: string;
  category: string;
  blurb: string;
  icon: string;
  color: string;
  tint: string;
  permissions: PermissionDef[];
};

export type FutureApp = {
  id: string;
  name: string;
  category: string;
  blurb: string;
  icon: string;
  color: string;
  tint: string;
};

const read = (key: string, label: string, desc: string): PermissionDef => ({ key, label, desc, kind: "read" });
const write = (key: string, label: string, desc: string): PermissionDef => ({ key, label, desc, kind: "write" });

export const CATALOG: CatalogApp[] = [
  {
    id: "hubspot",
    provider: "hubspot",
    name: "HubSpot",
    category: "CRM & Marketing",
    blurb: "Sync contacts, deals and activities with HubSpot.",
    icon: "plug",
    color: "#ff7a59",
    tint: "#ffe9e2",
    permissions: [
      read("read_contacts", "Read contacts", "Names, emails, titles and companies."),
      read("read_deals", "Read deals", "Amounts, stages, close dates and owners."),
      read("read_activities", "Read activities", "Notes, calls and meetings logged in HubSpot."),
      write("write_stages", "Update deal stages", "Move a deal when you approve a stage change."),
      write("write_fields", "Update contact & deal fields", "Amounts, close dates and contact details you approve."),
      write("write_tasks", "Create follow-up tasks", "Tasks created from approved follow-ups."),
    ],
  },
  {
    id: "salesforce",
    provider: "salesforce",
    name: "Salesforce",
    category: "CRM Platform",
    blurb: "Sync your data with Salesforce.",
    icon: "layers",
    color: "#00a1e0",
    tint: "#e1f3fc",
    permissions: [
      read("read_accounts", "Read accounts & contacts", "Account and contact records in Salesforce."),
      read("read_opps", "Read opportunities", "Amounts, stages and close dates."),
      write("write_stages", "Update opportunity stages", "Move an opportunity when you approve it."),
      write("write_fields", "Update fields", "Fields on accounts, contacts and opportunities you approve."),
      write("write_tasks", "Create tasks", "Tasks created from approved follow-ups."),
    ],
  },
  {
    id: "gmail",
    provider: "google",
    name: "Gmail",
    category: "Email",
    blurb: "Import emails and send follow-ups.",
    icon: "mail",
    color: "#ea4335",
    tint: "#fdecea",
    permissions: [
      read("read_threads", "Read email threads", "Full conversations with your buyers — the AI reads these to propose updates."),
      read("read_headers", "Read sender, subject & labels", "Who wrote, about what, and how the thread is labelled."),
      read("read_meeting_mail", "Read meeting-related email", "Invites, reschedules and post-meeting follow-ups."),
      write("write_send", "Send follow-up emails", "Only ever sent after you approve the draft."),
      write("write_drafts", "Create email drafts", "Drafts wait in Gmail until you send them."),
      write("write_log", "Log emails to the CRM", "Attach important threads to deals and contacts."),
    ],
  },
  {
    id: "gcal",
    provider: "google",
    name: "Google Calendar",
    category: "Calendar",
    blurb: "Sync meetings and events.",
    icon: "calendar",
    color: "#4285f4",
    tint: "#e8f0fe",
    permissions: [
      read("read_events", "Read calendar events", "Meetings the AI uses to propose updates."),
      read("read_attendees", "Read attendees & titles", "Who was in the meeting and what it was about."),
      read("read_notes", "Read meeting notes links", "Docs attached to calendar events."),
      write("write_create", "Create calendar events", "Follow-up meetings you approve."),
      write("write_update", "Update event details", "Titles, times and attendee changes you approve."),
    ],
  },
  {
    id: "slack",
    provider: "slack",
    name: "Slack",
    category: "Team Communication",
    blurb: "Get notifications and alerts.",
    icon: "msg",
    color: "#611f69",
    tint: "#f2e7f5",
    permissions: [
      read("read_channels", "Read channel list", "So you can choose where alerts are posted."),
      write("write_notify", "Post notifications", "Sync summaries posted to a channel."),
      write("write_alerts", "Send approval alerts", "Ping the team when approvals are waiting."),
    ],
  },
  {
    id: "zoom",
    provider: "zoom",
    name: "Zoom",
    category: "Video Meetings",
    blurb: "Sync meetings and transcripts.",
    icon: "play",
    color: "#2d8cff",
    tint: "#e5f2ff",
    permissions: [
      read("read_meetings", "Read meeting list", "Past and upcoming Zoom meetings."),
      read("read_transcripts", "Read transcripts & recordings", "The AI reads transcripts to propose updates."),
      write("write_summaries", "Save summaries to records", "Attach meeting summaries to deals and contacts."),
    ],
  },
];

export const FUTURE_APPS: FutureApp[] = [
  { id: "outlook", name: "Microsoft Outlook", category: "Email", blurb: "Import Outlook email and send follow-ups.", icon: "mail", color: "#0072c6", tint: "#e5f1fa" },
  { id: "ms365cal", name: "Microsoft 365 Calendar", category: "Calendar", blurb: "Sync Outlook meetings and events.", icon: "calendar", color: "#0078d4", tint: "#e5f2fa" },
  { id: "gmeet", name: "Google Meet", category: "Video Meetings", blurb: "Sync Meet recordings and transcripts.", icon: "play", color: "#00832d", tint: "#e6f4ea" },
  { id: "linkedin", name: "LinkedIn Enrichment", category: "Enrichment", blurb: "Enrich contacts with LinkedIn data.", icon: "users", color: "#0a66c2", tint: "#e7f1fa" },
  { id: "notion", name: "Notion", category: "Notes & Docs", blurb: "Sync notes and docs into your CRM context.", icon: "file", color: "#37352f", tint: "#efefed" },
  { id: "customapi", name: "Custom API / Webhooks", category: "Developer", blurb: "Connect any tool with a custom API or webhooks.", icon: "gear", color: "#6c3ce9", tint: "#efeaff" },
];

export const PROVIDER_NAMES: Record<string, string> = {
  hubspot: "HubSpot",
  salesforce: "Salesforce",
  google: "Google",
  slack: "Slack",
  zoom: "Zoom",
  outlook: "Outlook",
  signudoc: "SignuDoc",
};

export const SYNC_FREQUENCIES = ["Real-time", "Hourly", "Daily"] as const;
export const DEFAULT_SYNC_FREQUENCY = "Hourly";

/** Default permission values: reads ON, writes OFF (read-only start). */
export function defaultPermissions(app: CatalogApp): Record<string, boolean> {
  return Object.fromEntries(app.permissions.map((p) => [p.key, p.kind === "read"]));
}

export function appById(id: string): CatalogApp | undefined {
  return CATALOG.find((a) => a.id === id);
}
