import { Suspense } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { requireWorkspace } from "@/lib/session";
import { prisma } from "@/lib/db";
import { getHistoryData } from "@/lib/history";
import { can, hasTeamScope, ownsDeal } from "@/lib/permissions";
import HistoryClient from "@/components/HistoryClient";

export const metadata = { title: "History · Vouchso" };

async function HistoryInner({ period }: { period: number }) {
  await connection();
  const { workspace, user, role } = await requireWorkspace();
  // Page visibility: History is hidden for Sales Reps.
  if (!can(role, "pages.history")) redirect("/dashboard");
  const data = await getHistoryData(workspace.id);

  // UI gating mirror of rollbackBatchAction: the Rollback buttons render
  // only for batches this user may actually roll back. Team-scope roles
  // (Owner/Admin/Manager) may roll back any batch; a Sales Rep only a
  // batch whose still-applied proposals ALL belong to their own deals;
  // a Viewer (no proposals.decide) gets none. The server enforces the
  // same rule — this only hides buttons that would error.
  let rollbackBatches: string[] = [];
  if (can(role, "proposals.decide")) {
    if (hasTeamScope(role)) {
      rollbackBatches = data.batches.map((b) => b.batchId);
    } else {
      const applied = await prisma.proposal.findMany({
        where: { workspaceId: workspace.id, batchId: { not: null }, status: "applied" },
        select: { batchId: true, dealExternalId: true },
      });
      const deals = await prisma.crmDeal.findMany({
        where: { workspaceId: workspace.id },
        select: { externalId: true, ownerName: true },
      });
      const ownerById = new Map(deals.map((d) => [d.externalId, d.ownerName]));
      const byBatch = new Map<string, boolean>();
      for (const p of applied) {
        if (!p.batchId) continue;
        const inScope = !!p.dealExternalId && ownsDeal(user.name, ownerById.get(p.dealExternalId));
        byBatch.set(p.batchId, (byBatch.get(p.batchId) ?? true) && inScope);
      }
      rollbackBatches = [...byBatch.entries()].filter(([, ok]) => ok).map(([id]) => id);
    }
  }

  return <HistoryClient data={data} period={period} rollbackBatches={rollbackBatches} />;
}

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const sp = await searchParams;
  const period = sp.period === "7" ? 7 : sp.period === "90" ? 90 : 30;
  return (
    <Suspense
      fallback={<div className="animate-pulse text-[13px] text-[#8a8fa3]">Loading history…</div>}
    >
      <HistoryInner period={period} />
    </Suspense>
  );
}
