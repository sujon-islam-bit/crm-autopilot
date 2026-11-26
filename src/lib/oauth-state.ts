import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * Signed OAuth state for provider connect flows: the state carries the
 * workspace id, is HMAC-signed with the app encryption key, and expires
 * after 10 minutes — so a callback can be trusted to belong to the
 * workspace that started the flow.
 */

function sign(payload: string): string {
  return createHmac("sha256", process.env.ENCRYPTION_KEY ?? "").update(payload).digest("base64url");
}

export function makeOAuthState(workspaceId: string): string {
  const body = JSON.stringify({
    w: workspaceId,
    n: randomBytes(8).toString("hex"),
    exp: Date.now() + 10 * 60 * 1000,
  });
  const encoded = Buffer.from(body).toString("base64url");
  return `${encoded}.${sign(encoded)}`;
}

export function readOAuthState(state: string): string | null {
  const [encoded, signature] = state.split(".");
  if (!encoded || !signature) return null;
  const expected = sign(encoded);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const parsed = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as {
      w: string;
      exp: number;
    };
    if (Date.now() > parsed.exp) return null;
    return parsed.w;
  } catch {
    return null;
  }
}
