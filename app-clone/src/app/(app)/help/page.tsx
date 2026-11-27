import { Suspense } from "react";
import { connection } from "next/server";
import { requireWorkspace } from "../../../lib/session";
import { prisma } from "../../../lib/db";
import HelpClient, { type HelpWorkspaceData } from "./HelpClient";

export const metadata = { title: "Help · Vouchso" };

const PROVIDER_LABEL: Record<string, string> = {
  hubspot: "HubSpot",
  salesforce: "Salesforce",
  google: "Google",
  outlook: "Microsoft Outlook",
  microsoft: "Microsoft",
  signudoc: "SignuDoc",
};

async function HelpInner() {
  await connection();
  const { user, workspace, role } = await requireWorkspace();

  // Help is visible to every role. The workspace card mirrors the shell's
  // scoping: a Sales Rep's pending count covers only their own deals.
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
    pendingCount = await prisma.proposal.count({
      where: { workspaceId: workspace.id, status: "pending" },
    });
  }

  const connections = await prisma.connection.findMany({
    where: { workspaceId: workspace.id },
    select: { provider: true },
    orderBy: { createdAt: "asc" },
  });

  const data: HelpWorkspaceData = {
    pendingCount: pendingCount,
    healthScore: workspace.healthScore ?? null,
    connectedApps: connections.map((c) => PROVIDER_LABEL[c.provider] ?? c.provider),
  };

  return <HelpClient data={data} />;
}

export default function HelpPage() {
  return (
    <Suspense
      fallback={<div className="animate-pulse px-7 pt-5 text-[13px] text-[#8a8fa3]">Loading help…</div>}
    >
      <HelpInner />
    </Suspense>
  );
}
