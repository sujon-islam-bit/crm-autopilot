import { Suspense } from "react";
import { connection } from "next/server";
import Sidebar from "../../components/Sidebar";
import TopBar from "../../components/TopBar";
import { requireWorkspace } from "../../lib/session";
import { prisma } from "../../lib/db";
import { timeAgo } from "../../lib/constants";
import { can } from "../../lib/permissions";

const ROLE_LABEL: Record<string, string> = {
  owner: "Owner",
  admin: "Admin",
  manager: "Manager",
  rep: "Sales Rep",
  viewer: "Viewer",
  member: "Member",
};

async function Shell({ children }: { children: React.ReactNode }) {
  await connection();
  const { user, workspace, role, roleLabel } = await requireWorkspace();
  const [conn, auditsToday] = await Promise.all([
    prisma.connection.findFirst({
      where: { workspaceId: workspace.id, lastSyncAt: { not: null } },
      orderBy: { lastSyncAt: "desc" },
    }),
    prisma.auditEvent.count({
      where: { workspaceId: workspace.id, createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } },
    }),
  ]);
  // The Approvals badge follows the same scope as the Approvals list: a
  // Sales Rep only counts suggestions tied to deals they own.
  let pendingCount: number;
  if (role === "rep") {
    const ownDeals = await prisma.crmDeal.findMany({
      where: { workspaceId: workspace.id, ownerName: user.name },
      select: { externalId: true },
    });
    pendingCount = await prisma.proposal.count({
      where: {
        workspaceId: workspace.id,
        status: "pending",
        dealExternalId: { in: ownDeals.map((d) => d.externalId) },
      },
    });
  } else {
    pendingCount = await prisma.proposal.count({ where: { workspaceId: workspace.id, status: "pending" } });
  }
  const providerLabel =
    conn?.provider === "hubspot"
      ? "HubSpot"
      : conn?.provider === "salesforce"
        ? "Salesforce"
        : conn?.provider === "google"
          ? "Google"
          : "CRM";
  const syncText = conn?.lastSyncAt ? `${providerLabel} • ${timeAgo(conn.lastSyncAt)}` : "Not synced yet";
  // OTP signups can arrive with an empty profile name — fall back to the
  // email handle so the shell never renders a blank user.
  const rawName = user.name.trim();
  const emailHandle = user.email.split("@")[0].replace(/[._-]+/g, " ").trim();
  const displayName =
    rawName || (emailHandle ? emailHandle.charAt(0).toUpperCase() + emailHandle.slice(1) : "New user");

  // Page visibility (sidebar mirrors the server-side page gates).
  const hiddenHrefs = [
    ...(!can(role, "pages.cleanup") ? ["/hygiene"] : []),
    ...(!can(role, "pages.history") ? ["/activity"] : []),
    ...(!can(role, "pages.connections") ? ["/connections"] : []),
  ];

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        pendingCount={pendingCount}
        userName={displayName}
        userRole={roleLabel ?? ROLE_LABEL[role] ?? "Member"}
        hiddenHrefs={hiddenHrefs}
      />
      <div className="flex min-w-0 flex-1 flex-col overflow-y-auto">
        <TopBar healthScore={workspace.healthScore} syncText={syncText} bellCount={auditsToday} userName={displayName} />
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center text-sm text-muted">Loading…</div>
      }
    >
      <Shell>{children}</Shell>
    </Suspense>
  );
}
