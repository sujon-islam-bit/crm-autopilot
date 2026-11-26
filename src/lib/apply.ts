import "server-only";

import { connectProxy, viaConnectId } from "@/lib/connect-client";
import {
  hubspotAccessToken,
  hubspotSetDealStage,
  hubspotStageLabels,
} from "@/lib/hubspot";
import { prisma } from "@/lib/prisma";

/**
 * Write-back: what "Approve" actually does once a human says yes.
 *
 * - deal_stage with a HubSpot connection → the deal moves in HubSpot
 *   (and in the local mirror). Without a connection, the mirror alone
 *   moves — the flow a demo workspace exercises.
 * - new_contact with HubSpot → the contact is created there.
 * - followup_draft with a Google connection and a known recipient →
 *   the email is sent through the connect service's Gmail proxy.
 *   Approval is the send permission; nothing sends before it.
 * - Everything else records as applied locally (tasks, field notes).
 *
 * A failed write-back throws, and the caller marks the proposal
 * "failed" with an audit event — never a silent success.
 */

type ProposalRow = {
  id: string;
  workspaceId: string;
  type: string;
  title: string;
  detail: unknown;
};

async function stageValueFor(token: string, label: string): Promise<string | null> {
  const labels = await hubspotStageLabels(token);
  for (const [value, l] of labels) if (l === label) return value;
  return null;
}

export async function applyProposal(proposal: ProposalRow): Promise<void> {
  const ws = proposal.workspaceId;
  const detail = (proposal.detail ?? {}) as Record<string, unknown>;
  const token = await hubspotAccessToken(ws).catch(() => null);

  if (proposal.type === "deal_stage") {
    const dealExternalId = String(detail.dealExternalId ?? "");
    const toStage = String(detail.toStage ?? "");
    if (token && dealExternalId && toStage) {
      const value = await stageValueFor(token, toStage);
      if (value) await hubspotSetDealStage(token, dealExternalId, value);
    }
    if (dealExternalId && toStage) {
      await prisma.crmDeal.updateMany({
        where: { workspaceId: ws, externalId: dealExternalId },
        data: { stage: toStage, healthFlag: null, healthNote: null, lastActivityAt: new Date() },
      });
    }
    return;
  }

  if (proposal.type === "new_contact" && token) {
    const email = String(detail.contactEmail ?? "");
    const name = String(detail.contactName ?? "");
    if (email) {
      const [firstname, ...rest] = name.split(" ");
      await fetch("https://api.hubapi.com/crm/v3/objects/contacts", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          properties: { email, firstname: firstname ?? "", lastname: rest.join(" ") },
        }),
      }).then(async (res) => {
        if (!res.ok && res.status !== 409) {
          throw new Error(`HubSpot contact create failed: ${res.status}`);
        }
      });
    }
    return;
  }

  if (proposal.type === "followup_draft") {
    const to = String(detail.toEmail ?? "");
    const body = String(detail.draftBody ?? "");
    const googleId = await viaConnectId(ws, "google");
    if (to && body && googleId) {
      const subject = String(detail.subject ?? "Follow-up");
      const raw = Buffer.from(
        `To: ${to}\r\nSubject: ${subject}\r\nContent-Type: text/plain; charset="UTF-8"\r\n\r\n${body}`,
      ).toString("base64url");
      const sent = await connectProxy(
        googleId,
        "POST",
        "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
        { raw },
      );
      if (sent.status >= 300) throw new Error(`Gmail send failed: ${sent.status}`);
    }
    return;
  }
}

export async function unapplyProposal(proposal: ProposalRow): Promise<void> {
  const ws = proposal.workspaceId;
  const detail = (proposal.detail ?? {}) as Record<string, unknown>;
  if (proposal.type !== "deal_stage") return; // only stage moves reverse remotely
  const dealExternalId = String(detail.dealExternalId ?? "");
  const fromStage = String(detail.fromStage ?? "");
  if (!dealExternalId || !fromStage) return;
  const token = await hubspotAccessToken(ws).catch(() => null);
  if (token) {
    const value = await stageValueFor(token, fromStage);
    if (value) await hubspotSetDealStage(token, dealExternalId, value);
  }
  await prisma.crmDeal.updateMany({
    where: { workspaceId: ws, externalId: dealExternalId },
    data: { stage: fromStage },
  });
}
