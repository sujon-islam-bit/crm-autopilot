import "server-only";
import crypto from "node:crypto";

// SignuDoc (open-source, self-hosted) integration. The customer runs their own
// SignuDoc instance; we talk to its REST API and receive signed webhooks.
export function signudocConfigured(): boolean {
  return !!(process.env.SIGNUDOC_BASE_URL && process.env.SIGNUDOC_API_KEY);
}

export async function signudocCreateEnvelope(input: {
  title: string;
  signerName: string;
  signerEmail: string;
  dealExternalId: string;
}): Promise<{ envelopeId: string }> {
  const base = (process.env.SIGNUDOC_BASE_URL || "").replace(/\/$/, "");
  const res = await fetch(`${base}/api/envelopes`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.SIGNUDOC_API_KEY}`,
    },
    body: JSON.stringify({
      title: input.title,
      signers: [{ name: input.signerName, email: input.signerEmail }],
      metadata: { dealExternalId: input.dealExternalId },
    }),
  });
  if (!res.ok) throw new Error(`SignuDoc create envelope failed (${res.status})`);
  const d = (await res.json().catch(() => ({}))) as { id?: string; envelopeId?: string };
  return { envelopeId: d.id ?? d.envelopeId ?? "" };
}

/** HMAC-SHA256 check when a webhook secret is configured; open (dev) otherwise. */
export function verifySignudocWebhook(rawBody: string, signature: string | null): boolean {
  const secret = process.env.SIGNUDOC_WEBHOOK_SECRET;
  if (!secret) return true;
  if (!signature) return false;
  const expect = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  const got = signature.replace(/^sha256=/, "");
  try {
    return crypto.timingSafeEqual(Buffer.from(got, "hex"), Buffer.from(expect, "hex"));
  } catch {
    return false;
  }
}
