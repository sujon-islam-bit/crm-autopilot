import { Suspense } from "react";
import { connection } from "next/server";
import { requireWorkspace } from "../../../lib/session";
import { prisma } from "../../../lib/db";
import { toProposalView } from "../../../lib/view";
import ApprovalsClient from "../../../components/ApprovalsClient";

async function Inner() {
  await connection();
  const { workspace, user } = await requireWorkspace();
  const [pendingRows, decidedRows, decidedTotal, connectionCount, contacts, deals] = await Promise.all([
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
    prisma.crmContact.findMany({ where: { workspaceId: workspace.id }, orderBy: { name: "asc" } }),
    prisma.crmDeal.findMany({ where: { workspaceId: workspace.id } }),
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

  const dealMap = new Map(deals.map((d) => [d.externalId, d]));
  const contactEmails = new Set(
    contacts.map((c) => c.email?.toLowerCase()).filter((e): e is string => Boolean(e)),
  );
  const dealStages = new Map(deals.map((d) => [d.externalId, d.stage]));
  const fallbackName =
    user.name?.trim() || user.email.split("@")[0].replace(/^./, (ch) => ch.toUpperCase());

  const peopleFor = (p: (typeof pendingRows)[number]): string[] => {
    const det = (p.detail ?? {}) as Record<string, unknown>;
    const names: string[] = [];
    if (p.dealExternalId) {
      const deal = dealMap.get(p.dealExternalId);
      if (deal?.ownerName) names.push(deal.ownerName);
      const contact = deal?.company ? contacts.find((c) => c.company === deal.company) : undefined;
      if (contact && !names.includes(contact.name)) names.push(contact.name);
    } else if (p.type === "new_contact" && typeof det.name === "string") {
      names.push(det.name);
    } else if (p.type === "followup_draft" && typeof det.toName === "string") {
      names.push(det.toName);
    }
    if (names.length === 0) names.push(fallbackName);
    return names.slice(0, 2);
  };

  const toViews = async (rows: typeof pendingRows) =>
    Promise.all(
      rows.map(async (p) => {
        const deal = p.dealExternalId ? (dealMap.get(p.dealExternalId) ?? null) : null;
        return toProposalView(p, deal, { people: peopleFor(p), contactEmails, dealStages });
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
