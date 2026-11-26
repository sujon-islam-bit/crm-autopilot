import "server-only";
import { prisma } from "./db";
import { timeAgo } from "./constants";
import { fmtDateTime } from "./history";
import { getHistoryData } from "./history";
import { getGuardrails } from "./guardrails";
import {
  CATALOG,
  FUTURE_APPS,
  DEFAULT_SYNC_FREQUENCY,
  defaultPermissions,
  type CatalogApp,
} from "./catalog";

/**
 * Connections screen data — every status and number traces to real rows:
 *
 * - A catalog app is "Connected" ONLY when a Connection row exists for its
 *   provider in this workspace. Nothing is seeded or faked.
 * - Connected Apps = number of catalog apps with a live row; its delta is
 *   the count of Connection rows created in the last 30 days ("+N this
 *   month"), or null when none were.
 * - Last Sync reuses History's derivation exactly (latest apply batch or
 *   connection lastSyncAt, whichever is newer) and History's status rule
 *   (≥1 connection + no failed applies in 30 days = Healthy), so the two
 *   screens can never disagree.
 * - API Usage has no live source before a real CRM connects, so the card
 *   shows "—" — no percentage is invented.
 * - Active Automations = the number of ENABLED Data Guardrails (effective
 *   values from GuardrailSetting; defaults are all-on).
 * - Integration Summary:
 *     Connected = catalog apps with a live Connection row.
 *     Issues    = proposals whose apply FAILED in the last 30 days
 *                 (status "failed", decidedAt within 30 days).
 *     Pending   = catalog apps not yet connected.
 *     Healthy % = connected apps with no failed sync / connected apps.
 *                 Failed applies are written to the workspace's CRM, so
 *                 when Issues > 0 the connected CRM apps (HubSpot /
 *                 Salesforce) count as the affected ones; every other
 *                 connected app counts as healthy. 0 connected → 0%.
 * - Recent Activity = the workspace's latest 4 AuditEvent rows, any
 *   action (applies, proposals, scans, connection events).
 * - Per-app permissions + sync frequency are preferences stored on the
 *   Connection row (settings JSON, keyed by catalog app id), merged over
 *   the catalog defaults (reads on, writes off).
 */

type SettingsJson = {
  apps?: Record<
    string,
    { permissions?: Record<string, boolean>; syncFrequency?: string }
  >;
  reconnectedAt?: string;
};

export type AppView = {
  id: string;
  provider: string;
  name: string;
  category: string;
  blurb: string;
  icon: string;
  color: string;
  tint: string;
  connected: boolean;
  accountEmail: string | null;
  accountLabel: string | null;
  connectedLabel: string | null;
  lastSyncLabel: string | null;
  lastSyncAgo: string | null;
  permissions: { key: string; label: string; desc: string; kind: "read" | "write"; on: boolean }[];
  syncFrequency: string;
};

export type ConnectionsData = {
  apps: AppView[];
  futureApps: typeof FUTURE_APPS;
  connectedCount: number;
  availableCount: number;
  connectedThisMonth: number | null;
  connSpark: number[];
  lastSyncAgo: string | null;
  syncStatusLabel: "All systems healthy" | "Needs attention" | "Not connected";
  automations: number;
  summary: { healthyPct: number; connected: number; issues: number; pending: number };
  activity: { action: string; summary: string; ago: string; color: string }[];
  hasConnection: boolean;
};

const ACTION_COLORS: Record<string, string> = {
  applied: "#22b573",
  synced: "#22b573",
  connected: "#22b573",
  captured: "#2b6bf0",
  proposed: "#6c3ce9",
  rejected: "#e5484d",
  failed: "#e5484d",
  disconnected: "#e5484d",
  undone: "#f5a623",
  rolled_back: "#f5a623",
};

const DAY = 86400000;

function parseSettings(raw: unknown): SettingsJson {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) return raw as SettingsJson;
  return {};
}

export async function getConnectionsData(workspaceId: string): Promise<ConnectionsData> {
  const now = new Date();
  const since30 = new Date(now.getTime() - 30 * DAY);

  const [rows, guardrails, history, issues, activityRows] = await Promise.all([
    prisma.connection.findMany({ where: { workspaceId }, orderBy: { createdAt: "asc" } }),
    getGuardrails(workspaceId),
    getHistoryData(workspaceId),
    prisma.proposal.count({
      where: { workspaceId, status: "failed", decidedAt: { gte: since30 } },
    }),
    prisma.auditEvent.findMany({
      where: { workspaceId },
      orderBy: { createdAt: "desc" },
      take: 4,
      select: { action: true, summary: true, createdAt: true },
    }),
  ]);

  const byProvider = new Map(rows.map((r) => [r.provider, r]));

  const apps: AppView[] = CATALOG.map((app: CatalogApp) => {
    const row = byProvider.get(app.provider);
    const settings = row ? parseSettings(row.settings) : {};
    const appSettings = settings.apps?.[app.id];
    const defaults = defaultPermissions(app);
    const stored = appSettings?.permissions ?? {};
    return {
      id: app.id,
      provider: app.provider,
      name: app.name,
      category: app.category,
      blurb: app.blurb,
      icon: app.icon,
      color: app.color,
      tint: app.tint,
      connected: Boolean(row),
      accountEmail: row?.accountEmail ?? null,
      accountLabel: row?.accountEmail ?? null,
      connectedLabel: row ? fmtDateTime(row.createdAt) : null,
      lastSyncLabel: row?.lastSyncAt ? fmtDateTime(row.lastSyncAt) : null,
      lastSyncAgo: row?.lastSyncAt ? timeAgo(row.lastSyncAt) : null,
      permissions: app.permissions.map((p) => ({
        ...p,
        on: stored[p.key] ?? defaults[p.key],
      })),
      syncFrequency: appSettings?.syncFrequency ?? DEFAULT_SYNC_FREQUENCY,
    };
  });

  const connectedApps = apps.filter((a) => a.connected);
  const connectedCount = connectedApps.length;
  const availableCount = apps.length - connectedCount;

  const createdLast30 = rows.filter((r) => r.createdAt >= since30).length;
  const connectedThisMonth = createdLast30 > 0 ? createdLast30 : null;

  // Cumulative connected-app count by day (30 points) for the card sparkline.
  const dayStart = (d: Date) => {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
  };
  const connSpark: number[] = [];
  for (let i = 29; i >= 0; i--) {
    const end = dayStart(new Date(now.getTime() - i * DAY));
    end.setHours(23, 59, 59, 999);
    connSpark.push(rows.filter((r) => r.createdAt <= end).length);
  }

  const automations = Object.values(guardrails.effective).filter(Boolean).length;

  // Summary — definitions in the header comment.
  const affectedCrm = issues > 0 ? connectedApps.filter((a) => a.provider === "hubspot" || a.provider === "salesforce").length : 0;
  const healthyApps = connectedCount - affectedCrm;
  const healthyPct = connectedCount === 0 ? 0 : Math.round((healthyApps / connectedCount) * 100);

  const syncStatusLabel: ConnectionsData["syncStatusLabel"] =
    rows.length === 0 ? "Not connected" : history.status === "Healthy" ? "All systems healthy" : "Needs attention";

  return {
    apps,
    futureApps: FUTURE_APPS,
    connectedCount,
    availableCount,
    connectedThisMonth,
    connSpark,
    lastSyncAgo: history.lastChangeAgo,
    syncStatusLabel,
    automations,
    summary: {
      healthyPct,
      connected: connectedCount,
      issues,
      pending: availableCount,
    },
    activity: activityRows.map((a) => ({
      action: a.action,
      summary: a.summary,
      ago: timeAgo(a.createdAt),
      color: ACTION_COLORS[a.action] ?? "#8a8fa3",
    })),
    hasConnection: rows.length > 0,
  };
}
