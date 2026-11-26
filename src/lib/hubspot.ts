import "server-only";

import { decryptSecret, encryptSecret } from "@/lib/crypto";
import { prisma } from "@/lib/prisma";

/**
 * HubSpot integration: OAuth connect, encrypted token storage with
 * automatic refresh, and the small CRM API surface the product needs
 * (read deals with stage labels, move a deal's stage, create a task).
 *
 * One developer app serves every customer (HUBSPOT_CLIENT_ID/SECRET in
 * env). Each workspace's tokens live encrypted in its Connection row —
 * the same pattern as BuilderAI's credential store.
 */

const API = "https://api.hubapi.com";

export const HUBSPOT_SCOPES = [
  "oauth",
  "crm.objects.contacts.read",
  "crm.objects.contacts.write",
  "crm.objects.companies.read",
  "crm.objects.companies.write",
  "crm.objects.deals.read",
  "crm.objects.deals.write",
].join(" ");

export function hubspotConfigured(): boolean {
  return Boolean(process.env.HUBSPOT_CLIENT_ID && process.env.HUBSPOT_CLIENT_SECRET);
}

export function hubspotAppUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3200").replace(/\/$/, "");
}

export function hubspotAuthorizeUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.HUBSPOT_CLIENT_ID ?? "",
    redirect_uri: `${hubspotAppUrl()}/api/connections/hubspot/callback`,
    scope: HUBSPOT_SCOPES,
    state,
  });
  return `https://app.hubspot.com/oauth/authorize?${params.toString()}`;
}

type TokenSet = {
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // epoch ms
};

async function tokenRequest(body: Record<string, string>): Promise<TokenSet> {
  const res = await fetch(`${API}/oauth/v1/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.HUBSPOT_CLIENT_ID ?? "",
      client_secret: process.env.HUBSPOT_CLIENT_SECRET ?? "",
      ...body,
    }),
  });
  if (!res.ok) throw new Error(`HubSpot token request failed: ${res.status}`);
  const json = (await res.json()) as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
  };
  return {
    accessToken: json.access_token,
    refreshToken: json.refresh_token,
    expiresAt: Date.now() + json.expires_in * 1000,
  };
}

export async function exchangeHubspotCode(code: string): Promise<TokenSet> {
  return tokenRequest({
    grant_type: "authorization_code",
    redirect_uri: `${hubspotAppUrl()}/api/connections/hubspot/callback`,
    code,
  });
}

export async function saveHubspotConnection(
  workspaceId: string,
  userId: string,
  tokens: TokenSet,
): Promise<void> {
  const portal = await hubspotPortalInfo(tokens.accessToken).catch(() => null);
  const data = encryptSecret(JSON.stringify(tokens));
  const existing = await prisma.connection.findFirst({
    where: { workspaceId, provider: "hubspot" },
  });
  if (existing) {
    await prisma.connection.update({
      where: { id: existing.id },
      data: { data, accountEmail: portal?.label ?? existing.accountEmail },
    });
  } else {
    await prisma.connection.create({
      data: {
        workspaceId,
        provider: "hubspot",
        accountEmail: portal?.label ?? null,
        data,
        createdById: userId,
      },
    });
  }
  await prisma.auditEvent.create({
    data: {
      workspaceId,
      action: "connected",
      summary: `HubSpot connected${portal?.label ? ` — ${portal.label}` : ""}`,
    },
  });
}

/** A valid access token for the workspace's HubSpot, refreshing if needed. */
export async function hubspotAccessToken(workspaceId: string): Promise<string | null> {
  const conn = await prisma.connection.findFirst({
    where: { workspaceId, provider: "hubspot" },
  });
  if (!conn) return null;
  const plain = decryptSecret(conn.data);
  if (!plain) return null;
  let tokens: TokenSet;
  try {
    tokens = JSON.parse(plain) as TokenSet;
  } catch {
    return null;
  }
  if (tokens.expiresAt - Date.now() > 60_000) return tokens.accessToken;
  const fresh = await tokenRequest({
    grant_type: "refresh_token",
    refresh_token: tokens.refreshToken,
  });
  await prisma.connection.update({
    where: { id: conn.id },
    data: { data: encryptSecret(JSON.stringify(fresh)) },
  });
  return fresh.accessToken;
}

async function hubspotFetch(token: string, path: string, init?: RequestInit) {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) throw new Error(`HubSpot ${path} failed: ${res.status}`);
  return res.json();
}

export async function hubspotPortalInfo(
  token: string,
): Promise<{ hubId: number; label: string } | null> {
  const info = (await hubspotFetch(token, `/oauth/v1/access-tokens/${token}`)) as {
    hub_id?: number;
    user?: string;
  };
  if (!info.hub_id) return null;
  return { hubId: info.hub_id, label: info.user ?? `Portal ${info.hub_id}` };
}

/** Map of dealstage internal value → display label, from the portal itself. */
export async function hubspotStageLabels(token: string): Promise<Map<string, string>> {
  const prop = (await hubspotFetch(token, "/crm/v3/properties/deals/dealstage")) as {
    options?: { value: string; label: string }[];
  };
  return new Map((prop.options ?? []).map((o) => [o.value, o.label]));
}

export type HubspotDeal = {
  id: string;
  name: string;
  amount: number | null;
  stageValue: string;
  stageLabel: string;
  closeDate: string | null;
  lastModified: string | null;
};

export async function hubspotListDeals(token: string): Promise<HubspotDeal[]> {
  const labels = await hubspotStageLabels(token);
  const json = (await hubspotFetch(
    token,
    "/crm/v3/objects/deals?limit=100&properties=dealname,amount,dealstage,closedate",
  )) as {
    results?: {
      id: string;
      updatedAt?: string;
      properties: {
        dealname?: string;
        amount?: string;
        dealstage?: string;
        closedate?: string;
      };
    }[];
  };
  return (json.results ?? []).map((d) => ({
    id: d.id,
    name: d.properties.dealname ?? "Untitled deal",
    amount: d.properties.amount ? Number(d.properties.amount) : null,
    stageValue: d.properties.dealstage ?? "",
    stageLabel: labels.get(d.properties.dealstage ?? "") ?? d.properties.dealstage ?? "Unknown",
    closeDate: d.properties.closedate ?? null,
    lastModified: d.updatedAt ?? null,
  }));
}

/** Move a deal to a new stage (internal value). Used by approved proposals. */
export async function hubspotSetDealStage(token: string, dealId: string, stageValue: string) {
  return hubspotFetch(token, `/crm/v3/objects/deals/${dealId}`, {
    method: "PATCH",
    body: JSON.stringify({ properties: { dealstage: stageValue } }),
  });
}
