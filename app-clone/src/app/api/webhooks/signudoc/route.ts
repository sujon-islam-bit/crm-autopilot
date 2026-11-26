import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import { verifySignudocWebhook } from "@/lib/signudoc";
import type { Prisma } from "@/generated/prisma/client";

// SignuDoc webhook: when an envelope completes, the deal gets a "move to Won"
// proposal in the Review Queue (never auto-applied — a human approves).
export async function POST(req: Request) {
  const raw = await req.text();
  const signature = req.headers.get("x-signudoc-signature");
  if (!verifySignudocWebhook(raw, signature)) {
    return NextResponse.json({ error: "bad signature" }, { status: 401 });
  }
  let payload: {
    event?: string;
    type?: string;
    status?: string;
    envelopeId?: string;
    data?: { envelopeId?: string; status?: string; metadata?: { dealExternalId?: string } };
    metadata?: { dealExternalId?: string };
  };
  try {
    payload = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }
  const event = (payload.event ?? payload.type ?? payload.status ?? payload.data?.status ?? "").toLowerCase();
  const envelopeId = payload.envelopeId ?? payload.data?.envelopeId ?? "";
  const dealExternalId =
    payload.metadata?.dealExternalId ?? payload.data?.metadata?.dealExternalId ?? "";

  let request = envelopeId
    ? await prisma.signatureRequest.findFirst({ where: { envelopeId } })
    : null;
  if (!request && dealExternalId) {
    request = await prisma.signatureRequest.findFirst({
      where: { dealExternalId, status: { in: ["requested", "sent"] } },
      orderBy: { createdAt: "desc" },
    });
  }
  if (!request) return NextResponse.json({ ok: true, ignored: true });

  if (event.includes("complete") || event.includes("signed")) {
    await prisma.signatureRequest.update({
      where: { id: request.id },
      data: { status: "completed" },
    });
    const deal = await prisma.crmDeal.findUnique({
      where: {
        workspaceId_externalId: {
          workspaceId: request.workspaceId,
          externalId: request.dealExternalId,
        },
      },
    });
    if (deal && deal.stage !== "Won") {
      const existing = await prisma.proposal.findFirst({
        where: {
          workspaceId: request.workspaceId,
          type: "deal_stage",
          dealExternalId: deal.externalId,
          status: "pending",
        },
      });
      if (!existing) {
        const proposal = await prisma.proposal.create({
          data: {
            workspaceId: request.workspaceId,
            type: "deal_stage",
            title: `Move ${deal.name} to Won — contract signed`,
            detail: {
              field: "stage",
              fromValue: deal.stage,
              toValue: "Won",
              dealName: deal.name,
              company: deal.company,
              amount: deal.amount,
            } as Prisma.InputJsonValue,
            reason: `"${request.title}" was signed by ${request.signerName} in SignuDoc`,
            source: "signudoc",
            dealExternalId: deal.externalId,
            status: "pending",
          },
        });
        await audit(request.workspaceId, "proposed", `SignuDoc signed: ${proposal.title}`, {
          meta: { proposalId: proposal.id, signatureRequestId: request.id },
        });
      }
    }
  } else if (event.includes("decline")) {
    await prisma.signatureRequest.update({
      where: { id: request.id },
      data: { status: "declined" },
    });
  }
  return NextResponse.json({ ok: true });
}
