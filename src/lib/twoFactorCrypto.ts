import { randomBytes, createCipheriv, createDecipheriv, hkdfSync } from "node:crypto";

// ── 2FA secret encryption at rest ──────────────────────────────────────────
// The TOTP secret is what makes a 2FA code; stored in clear, a copy of the database would let
// someone generate valid codes. It is kept encrypted (AES-256-GCM) with a key that lives in the
// environment, never in the database. Values written before this existed are plain base32 and
// are still read (and can be converted with scripts/encrypt-2fa-secrets.ts).
const ENC_PREFIX = "v1:";

function twoFactorKey(): Buffer {
  const raw = process.env.TWO_FACTOR_KEY || process.env.SESSION_SECRET;
  if (!raw) throw new Error("Falta TWO_FACTOR_KEY (o SESSION_SECRET) para proteger el secreto del 2FA.");
  return Buffer.from(hkdfSync("sha256", raw, "agileology-2fa", "two-factor-secret", 32));
}

export function encryptTwoFactorSecret(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", twoFactorKey(), iv);
  const data = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return `${ENC_PREFIX}${iv.toString("base64")}:${cipher.getAuthTag().toString("base64")}:${data.toString("base64")}`;
}

export function decryptTwoFactorSecret(stored: string): string {
  if (!stored.startsWith(ENC_PREFIX)) return stored; // legacy plain base32
  const [iv, tag, data] = stored.slice(ENC_PREFIX.length).split(":");
  const decipher = createDecipheriv("aes-256-gcm", twoFactorKey(), Buffer.from(iv, "base64"));
  decipher.setAuthTag(Buffer.from(tag, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(data, "base64")), decipher.final()]).toString("utf8");
}
