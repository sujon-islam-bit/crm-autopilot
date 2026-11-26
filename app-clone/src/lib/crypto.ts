import "server-only";
import crypto from "node:crypto";

// AES-256-GCM token encryption. Key = SHA-256 of ENCRYPTION_KEY (any long string works).
function key() {
  return crypto.createHash("sha256").update(process.env.ENCRYPTION_KEY || "dev-key").digest();
}

export function encryptJson(value: unknown): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key(), iv);
  const plain = Buffer.from(JSON.stringify(value), "utf8");
  const enc = Buffer.concat([cipher.update(plain), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString("base64"), tag.toString("base64"), enc.toString("base64")].join(".");
}

export function decryptJson<T>(payload: string): T {
  const [ivB, tagB, dataB] = payload.split(".");
  const decipher = crypto.createDecipheriv("aes-256-gcm", key(), Buffer.from(ivB, "base64"));
  decipher.setAuthTag(Buffer.from(tagB, "base64"));
  const dec = Buffer.concat([decipher.update(Buffer.from(dataB, "base64")), decipher.final()]);
  return JSON.parse(dec.toString("utf8")) as T;
}
