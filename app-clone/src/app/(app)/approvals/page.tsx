import { Suspense } from "react";
import { connection } from "next/server";
import { requireWorkspace } from "../../../lib/session";
import { prisma } from "../../../lib/db";
import { toProposalView } from "../../../lib/view";
import ApprovalsClient from "../../../components/ApprovalsClient";

async function Inner() {
  await connection();
  const { workspace } = await requireWorkspace();
  const [pendingRows, decidedRows, decidedTotal, connectionCount] = await Promise.all([
    prisma.proposal.findMany({
      where: { workspaceId: workspace.id, status: "pending" },
      include: { capture: true },
    }),
    prisma.proposal.findMany({
      where: { workspaceId: workspace.id, status: { not: "pending" } },
      orderBy: { decidedAt: "desc" },
      take: 10,
      include: { capture: true },
    }),
    prisma.proposal.count({ where: { workspaceId: workspace.id, status: { not: "pending" } } }),
    prisma.connection.count({ where: { workspaceId: workspace.id } }),
  ]);

  // Confidence descending, nulls last, newest first within a tier.
  pendingRows.sort((a, b) => {
    if (a.confidence == null && b.confidence == null) return b.createdAt.getTime() - a.createdAt.getTime();
    if (a.confidence == null) return 1;
    if (b.confidence == null) return -1;
    if (b.confidence !== a.confidence) return b.confidence - a.confidence;
    return b.createdAt.getTime() - a.createdAt.getTime();
  });
  // History: newest decision first (fall back to creation time).
  decidedRows.sort(
    (a, b) => (b.decidedAt ?? b.createdAt).getTime() - (a.decidedAt ?? a.createdAt).getTime(),
  );

  const toViews = async (rows: typeof pendingRows) =>
    Promise.all(
      rows.map(async (p) => {
        const deal = p.dealExternalId
          ? await prisma.crmDeal.findFirst({ where: { workspaceId: workspace.id, externalId: p.dealExternalId } })
          : null;
        return toProposalView(p, deal);
      }),
    );

  return (
    <ApprovalsClient
      pending={await toViews(pendingRows)}
      decided={await toViews(decidedRows)}
      decidedTotal={decidedTotal}
      connected={connectionCount > 0}
    />
  );
}

export default function ApprovalsPage() {
  return (
    <Suspense fallback={<div className="px-7 pt-6 text-sm text-muted">Loading…</div>}>
      <Inner />
    </Suspense>
  );
}
