import "server-only";

import { hubspotAccessToken, hubspotListDeals } from "@/lib/hubspot";
import { prisma } from "@/lib/prisma";

/**
 * Mirror sync: pull the workspace's HubSpot deals into CrmDeal so the
 * Dashboard and Pipeline screens are fast and can carry AI health
 * flags. Existing mirror rows keep their AI flags; stage/amount/name
 * always follow HubSpot (the CRM is the source of truth).
 */
export async function syncHubspotDeals(workspaceId: string): Promise<number> {
  const token = await hubspotAccessToken(workspaceId);
  if (!token) return 0;
  const deals = await hubspotListDeals(token);

  for (const deal of deals) {
    await prisma.crmDeal.upsert({
      where: { workspaceId_externalId: { workspaceId, externalId: deal.id } },
      create: {
        workspaceId,
        externalId: deal.id,
        name: deal.name,
        stage: deal.stageLabel,
        amount: deal.amount,
        lastActivityAt: deal.lastModified ? new Date(deal.lastModified) : null,
      },
      update: {
        name: deal.name,
        stage: deal.stageLabel,
        amount: deal.amount,
        lastActivityAt: deal.lastModified ? new Date(deal.lastModified) : null,
      },
    });
  }
  return deals.length;
}
