import "server-only";
import crypto from "node:crypto";

// HMAC-signed OAuth state carrying the workspace id (10-minute expiry), so a
// provider callback can be tied back to the workspace that started the flow.
function secret() {
  return crypto
    .createHash("sha256")
    .update((process.env.BETTER_AUTH_SECRET || "dev") + "::oauth-state")
    .digest();
}

export function signState(workspaceId: string): string {
  const payload = Buffer.from(
    JSON.stringify({ w: workspaceId, exp: Date.now() + 10 * 60 * 1000 }),
  ).toString("base64url");
  const sig = crypto.createHmac("sha256", secret()).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

export function verifyState(state: string): string | null {
  const [payload, sig] = (state || "").split(".");
  if (!payload || !sig) return null;
  const expect = crypto.createHmac("sha256", secret()).update(payload).digest("base64url");
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expect))) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      w: string;
      exp: number;
    };
    if (Date.now() > data.exp) return null;
    return data.w;
  } catch {
    return null;
  }
}
