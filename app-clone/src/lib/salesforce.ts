import "server-only";
import { prisma } from "./db";
import { encryptJson, decryptJson } from "./crypto";
import { audit } from "./audit";
import { refreshHealthFlags } from "./engine";

export function salesforceConfigured(): boolean {
  return !!(process.env.SALESFORCE_CLIENT_ID && process.env.SALESFORCE_CLIENT_SECRET);
}

function redirectUri(): string {
  return `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3200"}/api/connections/salesforce/callback`;
}

export function salesforceAuthorizeUrl(state: string): string {
  const u = new URL("https://login.salesforce.com/services/oauth2/authorize");
  u.searchParams.set("response_type", "code");
  u.searchParams.set("client_id", process.env.SALESFORCE_CLIENT_ID || "");
  u.searchParams.set("redirect_uri", redirectUri());
  u.searchParams.set("scope", "api refresh_token");
  u.searchParams.set("state", state);
  return u.toString();
}

type Tokens = { accessToken: string; refreshToken: string; instanceUrl: string };

async function sfToken(instance: string, params: Record<string, string>): Promise<Tokens> {
  const res = await fetch(`${instance}/services/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.SALESFORCE_CLIENT_ID || "",
      client_secret: process.env.SALESFORCE_CLIENT_SECRET || "",
      ...params,
    }),
  });
  if (!res.ok) throw new Error(`Salesforce token request failed (${res.status})`);
  const d = (await res.json()) as {
    access_token: string;
    refresh_token?: string;
    instance_url: string;
  };
  return {
    accessToken: d.access_token,
    refreshToken: d.refresh_token ?? "",
    instanceUrl: d.instance_url,
  };
}

export async function salesforceExchange(code: string): Promise<Tokens> {
  return sfToken("https://login.salesforce.com", {
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri(),
  });
}

export async function saveSalesforceConnection(workspaceId: string, tokens: Tokens) {
  await prisma.connection.upsert({
    where: { workspaceId_provider: { workspaceId, provider: "salesforce" } },
    create: { workspaceId, provider: "salesforce", data: encryptJson(tokens) },
    update: { data: encryptJson(tokens) },
  });
  await audit(workspaceId, "connected", "Salesforce connected", {});
}

export async function getSalesforceAuth(
  workspaceId: string,
): Promise<{ token: string; instanceUrl: string } | null> {
  const conn = await prisma.connection.findUnique({
    where: { workspaceId_provider: { workspaceId, provider: "salesforce" } },
  });
  if (!conn) return null;
  let tokens: Tokens;
  try {
    tokens = decryptJson<Tokens>(conn.data);
  } catch {
    return null;
  }
  if (!tokens.accessToken || !tokens.instanceUrl) return null;
  return { token: tokens.accessToken, instanceUrl: tokens.instanceUrl };
}

async function sfFetch(auth: { token: string; instanceUrl: string }, path: string, init?: RequestInit) {
  const res = await fetch(`${auth.instanceUrl}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${auth.token}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) throw new Error(`Salesforce ${path} failed (${res.status})`);
  return res.status === 204 ? null : res.json().catch(() => null);
}

// Salesforce stage names <-> our display labels (defaults; unknown SF stages
// are kept as their own label so nothing is silently rewritten).
const SF_TO_LABEL: Record<string, string> = {
  Prospecting: "New",
  Qualification: "Contacted",
  "Needs Analysis": "Contacted",
  "Value Proposition": "Meeting booked",
  "Id. Decision Makers": "Meeting booked",
  Perception: "Proposal sent",
  "Proposal/Price Quote": "Proposal sent",
  "Negotiation/Review": "Negotiation",
  "Closed Won": "Won",
};
const LABEL_TO_SF: Record<string, string> = Object.fromEntries(
  Object.entries(SF_TO_LABEL).map(([k, v]) => [v, k]),
);

export async function syncSalesforceDeals(workspaceId: string): Promise<number> {
  const auth = await getSalesforceAuth(workspaceId);
  if (!auth) throw new Error("Salesforce is not connected");
  const soql =
    "SELECT Id, Name, Amount, StageName, CloseDate, LastModifiedDate, Account.Name FROM Opportunity LIMIT 200";
  const d = (await sfFetch(
    auth,
    `/services/data/v59.0/query?q=${encodeURIComponent(soql)}`,
  )) as {
    records?: {
      Id: string;
      Name: string;
      Amount: number | null;
      StageName: string;
      CloseDate: string | null;
      LastModifiedDate: string;
      Account?: { Name?: string } | null;
    }[];
  };
  let n = 0;
  for (const r of d.records ?? []) {
    await prisma.crmDeal.upsert({
      where: { workspaceId_externalId: { workspaceId, externalId: r.Id } },
      create: {
        workspaceId,
        externalId: r.Id,
        source: "salesforce",
        name: r.Name || "Untitled deal",
        company: r.Account?.Name ?? null,
        stage: SF_TO_LABEL[r.StageName] ?? r.StageName,
        amount: r.Amount,
        closeDate: r.CloseDate ? new Date(r.CloseDate) : null,
        lastActivityAt: new Date(r.LastModifiedDate),
      },
      update: {
        name: r.Name || "Untitled deal",
        company: r.Account?.Name ?? null,
        stage: SF_TO_LABEL[r.StageName] ?? r.StageName,
        amount: r.Amount,
        closeDate: r.CloseDate ? new Date(r.CloseDate) : null,
        lastActivityAt: new Date(r.LastModifiedDate),
      },
    });
    n++;
  }
  await prisma.connection.updateMany({
    where: { workspaceId, provider: "salesforce" },
    data: { lastSyncAt: new Date() },
  });
  await refreshHealthFlags(workspaceId);
  await audit(workspaceId, "synced", `Salesforce sync: ${n} deals`, {});
  return n;
}

export async function salesforcePatchDeal(
  workspaceId: string,
  externalId: string,
  fields: { stageLabel?: string; amount?: number; closeDate?: string },
) {
  const auth = await getSalesforceAuth(workspaceId);
  if (!auth) throw new Error("Salesforce is not connected");
  const body: Record<string, unknown> = {};
  if (fields.stageLabel) body.StageName = LABEL_TO_SF[fields.stageLabel] ?? fields.stageLabel;
  if (fields.amount != null) body.Amount = fields.amount;
  if (fields.closeDate) body.CloseDate = fields.closeDate;
  await sfFetch(auth, `/services/data/v59.0/sobjects/Opportunity/${externalId}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export async function salesforceCreateContact(
  workspaceId: string,
  c: { name: string; email?: string; title?: string },
) {
  const auth = await getSalesforceAuth(workspaceId);
  if (!auth) throw new Error("Salesforce is not connected");
  const [first, ...rest] = (c.name || "").split(" ");
  await sfFetch(auth, "/services/data/v59.0/sobjects/Contact", {
    method: "POST",
    body: JSON.stringify({
      FirstName: first || c.name,
      LastName: rest.join(" ") || c.name,
      Email: c.email,
      Title: c.title,
    }),
  });
}
