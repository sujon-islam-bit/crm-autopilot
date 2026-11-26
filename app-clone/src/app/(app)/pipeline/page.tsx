import { Suspense } from "react";
import { connection } from "next/server";
import { requireWorkspace } from "../../../lib/session";
import { prisma } from "../../../lib/db";
import { getDashboardData } from "../../../lib/data";
import { STAGES, money, fmtDate, timeAgo } from "../../../lib/constants";
import { effectiveHealth } from "../../../lib/health";
import type { DealView } from "../../../lib/view";
import PipelineClient from "./PipelineClient";

async function Inner() {
  await connection();
  const { workspace } = await requireWorkspace();
  const W = workspace.id;

  const [deals, contacts, proposals, signatures, dash] = await Promise.all([
    prisma.crmDeal.findMany({ where: { workspaceId: W }, orderBy: { amount: "desc" } }),
    prisma.crmContact.findMany({ where: { workspaceId: W }, orderBy: { name: "asc" } }),
    prisma.proposal.findMany({
      where: { workspaceId: W, dealExternalId: { not: null } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.signatureRequest.findMany({ where: { workspaceId: W }, orderBy: { createdAt: "desc" } }),
    getDashboardData(W),
  ]);

  // Primary contact for a deal = first contact (name order) at its company.
  const contactByCompany = new Map<string, (typeof contacts)[number]>();
  for (const c of contacts) {
    if (c.company && !contactByCompany.has(c.company)) contactByCompany.set(c.company, c);
  }
  const propsByDeal = new Map<string, typeof proposals>();
  for (const p of proposals) {
    if (!p.dealExternalId) continue;
    const arr = propsByDeal.get(p.dealExternalId) ?? [];
    arr.push(p);
    propsByDeal.set(p.dealExternalId, arr);
  }
  const sigByDeal = new Map<string, string>();
  for (const s of signatures) {
    if (!sigByDeal.has(s.dealExternalId)) sigByDeal.set(s.dealExternalId, s.status);
  }

  const views: DealView[] = deals.map((d) => {
    const contact = d.company ? contactByCompany.get(d.company) : undefined;
    const dealProps = propsByDeal.get(d.externalId) ?? [];
    const health = effectiveHealth(d);
    return {
      id: d.id,
      externalId: d.externalId,
      name: d.name,
      company: d.company,
      stage: d.stage,
      amount: d.amount,
      closeDate: d.closeDate ? fmtDate(d.closeDate) : null,
      ownerName: d.ownerName,
      lastActivityLabel: timeAgo(d.lastActivityAt),
      health: health ? { flag: health.flag, label: health.label, note: health.note } : null,
      contact: contact ? { name: contact.name, title: contact.title, email: contact.email } : null,
      signatureStatus: sigByDeal.get(d.externalId) ?? null,
      activity: dealProps.slice(0, 4).map((p) => ({
        title: p.title,
        status: p.status,
        when: timeAgo(p.createdAt),
      })),
      latestReason: dealProps[0]?.reason || null,
    };
  });

  const open = deals.filter((d) => d.stage !== "Won");
  const openTotal = open.reduce((s, d) => s + (d.amount ?? 0), 0);

  return (
    <PipelineClient
      stages={STAGES}
      deals={views}
      pulse={dash.pulse}
      pulseNow={dash.pulseNow}
      pulseDelta={dash.pulseDelta}
      openTotalLabel={money(openTotal)}
      openCount={open.length}
      connected={dash.hasConnection}
    />
  );
}

export default function PipelinePage() {
  return (
    <Suspense fallback={<div className="px-7 pt-6 text-sm text-muted">Loading…</div>}>
      <Inner />
    </Suspense>
  );
}
