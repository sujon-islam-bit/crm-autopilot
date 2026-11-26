import "server-only";
import { prisma } from "./db";
import { encryptJson, decryptJson } from "./crypto";
import { audit } from "./audit";
import { refreshHealthFlags } from "./engine";

export function hubspotConfigured(): boolean {
  return !!(process.env.HUBSPOT_CLIENT_ID && process.env.HUBSPOT_CLIENT_SECRET);
}

function redirectUri(): string {
  return `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3200"}/api/connections/hubspot/callback`;
}

const SCOPES =
  "oauth crm.objects.contacts.read crm.objects.contacts.write crm.objects.companies.read crm.objects.deals.read crm.objects.deals.write";

export function hubspotAuthorizeUrl(state: string): string {
  const u = new URL("https://app.hubspot.com/oauth/authorize");
  u.searchParams.set("client_id", process.env.HUBSPOT_CLIENT_ID || "");
  u.searchParams.set("scope", SCOPES);
  u.searchParams.set("redirect_uri", redirectUri());
  u.searchParams.set("state", state);
  return u.toString();
}

type Tokens = { accessToken: string; refreshToken: string; expiresAt: number };

async function tokenRequest(params: Record<string, string>): Promise<Tokens> {
  const res = await fetch("https://api.hubapi.com/oauth/v1/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.HUBSPOT_CLIENT_ID || "",
      client_secret: process.env.HUBSPOT_CLIENT_SECRET || "",
      redirect_uri: redirectUri(),
      ...params,
    }),
  });
  if (!res.ok) throw new Error(`HubSpot token request failed (${res.status})`);
  const d = (await res.json()) as { access_token: string; refresh_token: string; expires_in: number };
  return {
    accessToken: d.access_token,
    refreshToken: d.refresh_token,
    expiresAt: Date.now() + (d.expires_in - 60) * 1000,
  };
}

export async function hubspotExchange(code: string): Promise<Tokens> {
  return tokenRequest({ grant_type: "authorization_code", code });
}

export async function saveHubspotConnection(workspaceId: string, tokens: Tokens) {
  const info = await hubspotPortalEmail(tokens.accessToken).catch(() => null);
  await prisma.connection.upsert({
    where: { workspaceId_provider: { workspaceId, provider: "hubspot" } },
    create: {
      workspaceId,
      provider: "hubspot",
      accountEmail: info,
      data: encryptJson(tokens),
    },
    update: { accountEmail: info, data: encryptJson(tokens) },
  });
  await audit(workspaceId, "connected", "HubSpot connected", {});
}

async function hubspotPortalEmail(token: string): Promise<string | null> {
  const res = await fetch(`https://api.hubapi.com/oauth/v1/access-tokens/${token}`);
  if (!res.ok) return null;
  const d = (await res.json()) as { user?: string; hub_domain?: string };
  return d.user ?? d.hub_domain ?? null;
}

export async function getHubspotToken(workspaceId: string): Promise<string | null> {
  const conn = await prisma.connection.findUnique({
    where: { workspaceId_provider: { workspaceId, provider: "hubspot" } },
  });
  if (!conn) return null;
  let tokens: Tokens;
  try {
    tokens = decryptJson<Tokens>(conn.data);
  } catch {
    return null;
  }
  if (!tokens.accessToken) return null;
  if (Date.now() > tokens.expiresAt) {
    try {
      const fresh = await tokenRequest({
        grant_type: "refresh_token",
        refresh_token: tokens.refreshToken,
      });
      await prisma.connection.update({
        where: { id: conn.id },
        data: { data: encryptJson(fresh) },
      });
      return fresh.accessToken;
    } catch {
      return null;
    }
  }
  return tokens.accessToken;
}

async function hsFetch(token: string, path: string, init?: RequestInit) {
  const res = await fetch(`https://api.hubapi.com${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) throw new Error(`HubSpot ${path} failed (${res.status})`);
  return res.json();
}

/** dealstage value -> display label, from the portal's own property config. */
export async function hubspotStageMap(token: string): Promise<Map<string, string>> {
  const d = (await hsFetch(token, "/crm/v3/properties/deals/dealstage")) as {
    options?: { value: string; label: string }[];
  };
  return new Map((d.options ?? []).map((o) => [o.value, o.label]));
}

export async function syncHubspotDeals(workspaceId: string): Promise<number> {
  const token = await getHubspotToken(workspaceId);
  if (!token) throw new Error("HubSpot is not connected");
  const stageMap = await hubspotStageMap(token).catch(() => new Map<string, string>());
  const d = (await hsFetch(
    token,
    "/crm/v3/objects/deals?limit=100&properties=dealname,amount,dealstage,closedate,hs_lastmodifieddate",
  )) as {
    results?: {
      id: string;
      properties: Record<string, string | null>;
    }[];
  };
  let n = 0;
  for (const r of d.results ?? []) {
    const p = r.properties;
    const label = stageMap.get(p.dealstage ?? "") ?? p.dealstage ?? "New";
    await prisma.crmDeal.upsert({
      where: { workspaceId_externalId: { workspaceId, externalId: r.id } },
      create: {
        workspaceId,
        externalId: r.id,
        source: "hubspot",
        name: p.dealname || "Untitled deal",
        stage: label,
        amount: p.amount ? Number(p.amount) : null,
        closeDate: p.closedate ? new Date(p.closedate) : null,
        lastActivityAt: p.hs_lastmodifieddate ? new Date(p.hs_lastmodifieddate) : new Date(),
      },
      update: {
        name: p.dealname || "Untitled deal",
        stage: label,
        amount: p.amount ? Number(p.amount) : null,
        closeDate: p.closedate ? new Date(p.closedate) : null,
        lastActivityAt: p.hs_lastmodifieddate ? new Date(p.hs_lastmodifieddate) : new Date(),
      },
    });
    n++;
  }
  await prisma.connection.updateMany({
    where: { workspaceId, provider: "hubspot" },
    data: { lastSyncAt: new Date() },
  });
  await refreshHealthFlags(workspaceId);
  await audit(workspaceId, "synced", `HubSpot sync: ${n} deals`, {});
  return n;
}

export async function hubspotPatchDeal(
  workspaceId: string,
  externalId: string,
  props: Record<string, string>,
  stageLabel?: string,
) {
  const token = await getHubspotToken(workspaceId);
  if (!token) throw new Error("HubSpot is not connected");
  const body = { ...props };
  if (stageLabel) {
    const map = await hubspotStageMap(token);
    const value = [...map.entries()].find(([, l]) => l === stageLabel)?.[0];
    if (value) body.dealstage = value;
  }
  await hsFetch(token, `/crm/v3/objects/deals/${externalId}`, {
    method: "PATCH",
    body: JSON.stringify({ properties: body }),
  });
}

export async function hubspotCreateContact(
  workspaceId: string,
  c: { name: string; email?: string; company?: string; title?: string },
) {
  const token = await getHubspotToken(workspaceId);
  if (!token) throw new Error("HubSpot is not connected");
  const [firstname, ...rest] = (c.name || "").split(" ");
  await hsFetch(token, "/crm/v3/objects/contacts", {
    method: "POST",
    body: JSON.stringify({
      properties: {
        firstname: firstname || c.name,
        lastname: rest.join(" "),
        email: c.email,
        company: c.company,
        jobtitle: c.title,
      },
    }),
  });
}
