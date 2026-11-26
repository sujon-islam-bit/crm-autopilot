import "server-only";

// Client for our own connect service (builderai-connect). BuilderAI/CRM never
// holds provider tokens — the connect service does the call and returns only
// the result. Contract: POST /api/proxy, header x-connect-key, body
// {connectionId, method, path, body?} -> {status, data}.
export function connectConfigured(): boolean {
  return !!(process.env.CONNECT_SERVICE_URL && process.env.CONNECT_API_KEY);
}

export function connectBase(): string {
  return (process.env.CONNECT_SERVICE_URL || "https://builderai-connect.vercel.app").replace(/\/$/, "");
}

export async function connectProxy(
  connectionId: string,
  method: string,
  path: string,
  body?: unknown,
): Promise<{ status: number; data: unknown }> {
  const res = await fetch(`${connectBase()}/api/proxy`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-connect-key": process.env.CONNECT_API_KEY || "",
    },
    body: JSON.stringify({ connectionId, method, path, body }),
  });
  const data = (await res.json().catch(() => null)) as { status?: number; data?: unknown } | null;
  if (data && typeof data.status === "number") return { status: data.status, data: data.data };
  return { status: res.status, data };
}
