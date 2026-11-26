import "server-only";
import { prisma } from "./db";
import { normalizeRole, ROLE_LABELS, type RoleKey } from "./permissions";

/** Workspace-scoped settings (Workspace.settings JSON). */
export type WorkspaceSettings = {
  companyName: string;
  location: string;
  /** AI Preferences: proposals below this confidence get a marker in Approvals. */
  confidenceThreshold: number;
  analysisFocus: "balanced" | "deals" | "quality" | "enrichment" | "followups";
  /** Security: how long activity history is kept, in months. */
  dataRetentionMonths: number;
};

export const WORKSPACE_SETTINGS_DEFAULTS: WorkspaceSettings = {
  companyName: "",
  location: "",
  // 50%: the demo's pending proposals run 73–96, so the standing state shows
  // no "Below threshold" markers until someone deliberately raises this.
  confidenceThreshold: 50,
  analysisFocus: "balanced",
  dataRetentionMonths: 12,
};

export function parseWorkspaceSettings(raw: unknown): WorkspaceSettings {
  const o = raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
  const focus = String(o.analysisFocus ?? "");
  return {
    companyName: typeof o.companyName === "string" ? o.companyName : "",
    location: typeof o.location === "string" ? o.location : "",
    confidenceThreshold:
      typeof o.confidenceThreshold === "number" && [50, 60, 70, 80, 90].includes(o.confidenceThreshold)
        ? o.confidenceThreshold
        : WORKSPACE_SETTINGS_DEFAULTS.confidenceThreshold,
    analysisFocus: (["balanced", "deals", "quality", "enrichment", "followups"].includes(focus)
      ? focus
      : "balanced") as WorkspaceSettings["analysisFocus"],
    dataRetentionMonths:
      typeof o.dataRetentionMonths === "number" && [6, 12, 24].includes(o.dataRetentionMonths)
        ? o.dataRetentionMonths
        : 12,
  };
}

/** Per-user notification preferences (Membership.settings JSON). */
export type NotificationPrefs = {
  emailNotifications: boolean;
  slackNotifications: boolean;
  approvalReminders: boolean;
  syncAlerts: boolean;
  frequency: "instant" | "daily" | "weekly";
};

export const NOTIFICATION_DEFAULTS: NotificationPrefs = {
  emailNotifications: true,
  slackNotifications: true,
  approvalReminders: true,
  syncAlerts: true,
  frequency: "instant",
};

export function parseNotificationPrefs(raw: unknown): NotificationPrefs {
  const o = raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
  const bool = (v: unknown, dflt: boolean) => (typeof v === "boolean" ? v : dflt);
  const freq = String(o.frequency ?? "");
  return {
    emailNotifications: bool(o.emailNotifications, true),
    slackNotifications: bool(o.slackNotifications, true),
    approvalReminders: bool(o.approvalReminders, true),
    syncAlerts: bool(o.syncAlerts, true),
    frequency: (["instant", "daily", "weekly"].includes(freq) ? freq : "instant") as NotificationPrefs["frequency"],
  };
}

export type MemberView = {
  membershipId: string;
  userId: string;
  name: string;
  email: string;
  role: RoleKey;
  roleLabel: string;
  joinedAt: string;
  isSelf: boolean;
};

export type InviteView = {
  id: string;
  email: string;
  role: RoleKey;
  token: string;
  expiresAt: string;
  createdAt: string;
};

export type SessionView = {
  id: string;
  createdAt: string;
  expiresAt: string;
  ipAddress: string | null;
  userAgent: string | null;
  current: boolean;
};

export async function getSettingsData(workspaceId: string, userId: string, currentSessionId: string | null) {
  const [workspace, memberships, invites, selfMembership, sessions, connectionCount, slackConnected] =
    await Promise.all([
      prisma.workspace.findUnique({ where: { id: workspaceId } }),
      prisma.membership.findMany({
        where: { workspaceId },
        include: { user: true },
        orderBy: { createdAt: "asc" },
      }),
      prisma.invite.findMany({
        where: { workspaceId, status: "pending" },
        orderBy: { createdAt: "desc" },
      }),
      prisma.membership.findFirst({ where: { workspaceId, userId } }),
      prisma.session.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
      }),
      prisma.connection.count({ where: { workspaceId } }),
      prisma.connection.findFirst({ where: { workspaceId, provider: "slack" }, select: { id: true } }),
    ]);
  if (!workspace) throw new Error("workspace not found");

  const settings = parseWorkspaceSettings(workspace.settings);
  const notifications = parseNotificationPrefs(selfMembership?.settings);

  const members: MemberView[] = memberships.map((m) => {
    const role = normalizeRole(m.role);
    return {
      membershipId: m.id,
      userId: m.userId,
      name: m.user.name?.trim() || m.user.email.split("@")[0],
      email: m.user.email,
      role,
      roleLabel: m.roleLabel ?? ROLE_LABELS[role],
      joinedAt: m.createdAt.toISOString(),
      isSelf: m.userId === userId,
    };
  });

  const inviteViews: InviteView[] = invites
    .filter((i) => i.expiresAt.getTime() > Date.now())
    .map((i) => ({
      id: i.id,
      email: i.email,
      role: normalizeRole(i.role),
      token: i.token,
      expiresAt: i.expiresAt.toISOString(),
      createdAt: i.createdAt.toISOString(),
    }));

  const sessionViews: SessionView[] = sessions.map((s) => ({
    id: s.id,
    createdAt: s.createdAt.toISOString(),
    expiresAt: s.expiresAt.toISOString(),
    ipAddress: s.ipAddress,
    userAgent: s.userAgent,
    current: currentSessionId != null && s.id === currentSessionId,
  }));

  // Billing (honest counts, last 30 days): sync operations = distinct apply
  // batches; AI analyses = proposals the engine created.
  const since = new Date(Date.now() - 30 * 86400000);
  const [appliedRows, analysesCount] = await Promise.all([
    prisma.proposal.findMany({
      where: { workspaceId, appliedAt: { gte: since }, batchId: { not: null } },
      select: { batchId: true },
    }),
    prisma.proposal.count({ where: { workspaceId, createdAt: { gte: since } } }),
  ]);
  const syncOps = new Set(appliedRows.map((r) => r.batchId)).size;

  return {
    workspace: {
      id: workspace.id,
      name: workspace.name,
      plan: workspace.plan,
      settings,
    },
    members,
    invites: inviteViews,
    notifications,
    sessions: sessionViews,
    connectionCount,
    slackConnected: Boolean(slackConnected),
    billing: { syncOps, analysesCount },
    selfRole: normalizeRole(selfMembership?.role),
  };
}

export type SettingsData = Awaited<ReturnType<typeof getSettingsData>>;
