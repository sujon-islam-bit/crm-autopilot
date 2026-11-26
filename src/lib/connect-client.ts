import "server-only";

import { decryptSecret } from "@/lib/crypto";
import { prisma } from "@/lib/prisma";

/**
 * Client for our own connect service (builderai-connect): it holds the
 * Google connection and runs API calls through its proxy, so this app
 * never touches Google tokens directly. A workspace's google
 * Connection row stores only { viaConnect: true, connectionId }.
 */

export function connectServiceConfigured(): boolean {
  return Boolean(process.env.CONNECT_SERVICE_URL && process.env.CONNECT_API_KEY);
}

export function googleConnectUrl(workspaceId: string, appUrl: string): string {
  const base = (process.env.CONNECT_SERVICE_URL ?? "").replace(/\/$/, "");
  const params = new URLSearchParams({
    user: `crm:${workspaceId}`,
    return_url: `${appUrl}/api/connections/google/callback`,
  });
  return `${base}/connect/google?${params.toString()}`;
}

export type ProxyResult = { status: number; data: unknown };

export async function connectProxy(
  connectionId: string,
  method: string,
  path: string,
  body?: unknown,
): Promise<ProxyResult> {
  const base = (process.env.CONNECT_SERVICE_URL ?? "").replace(/\/$/, "");
  const res = await fetch(`${base}/api/proxy`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-connect-key": process.env.CONNECT_API_KEY ?? "",
    },
    body: JSON.stringify({ connectionId, method, path, ...(body !== undefined ? { body } : {}) }),
  });
  const json = (await res.json().catch(() => ({}))) as ProxyResult & { error?: string };
  if (!res.ok) throw new Error(json.error ?? `Connect proxy failed: ${res.status}`);
  return json;
}

/** The connect-service connection id stored for a workspace's provider. */
export async function viaConnectId(workspaceId: string, provider: string): Promise<string | null> {
  const conn = await prisma.connection.findFirst({ where: { workspaceId, provider } });
  if (!conn) return null;
  const plain = decryptSecret(conn.data);
  if (!plain) return null;
  try {
    const parsed = JSON.parse(plain) as { viaConnect?: boolean; connectionId?: string };
    return parsed.viaConnect && parsed.connectionId ? parsed.connectionId : null;
  } catch {
    return null;
  }
}
