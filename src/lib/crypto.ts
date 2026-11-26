import "server-only";

import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

/**
 * AES-256-GCM encryption for stored OAuth tokens — the same pattern as
 * BuilderAI's BYOK store (builder-ai/src/lib/byok.ts), adapted to this
 * service's own key (CONNECT_ENCRYPTION_KEY) so the two apps stay fully
 * independent. Stored shape: "v1:<iv>:<tag>:<ciphertext>", all base64.
 * Plaintext tokens never leave the server: no page or API response
 * includes them.
 */

function encryptionKey(): Buffer {
  return createHash("sha256").update(process.env.ENCRYPTION_KEY ?? "").digest();
}

export function encryptSecret(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const data = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1:${iv.toString("base64")}:${tag.toString("base64")}:${data.toString("base64")}`;
}

export function decryptSecret(stored: string): string | null {
  try {
    const [version, iv, tag, data] = stored.split(":");
    if (version !== "v1" || !iv || !tag || !data) return null;
    const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(iv, "base64"));
    decipher.setAuthTag(Buffer.from(tag, "base64"));
    return Buffer.concat([decipher.update(Buffer.from(data, "base64")), decipher.final()]).toString("utf8");
  } catch {
    return null;
  }
}
