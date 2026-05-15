import * as crypto from "node:crypto";

const PREFIX = "enc:v1";

function getMasterKey(): Buffer {
  const raw = process.env.SECRET_ENCRYPTION_KEY || process.env.MASTER_KEY || "";
  if (!raw) {
    throw new Error("SECRET_ENCRYPTION_KEY is required to encrypt/decrypt stored API keys");
  }

  // Accept strong raw/base64/hex keys but normalize everything to 32 bytes.
  if (/^[a-f0-9]{64}$/i.test(raw)) return Buffer.from(raw, "hex");

  try {
    const b64 = Buffer.from(raw, "base64");
    if (b64.length === 32) return b64;
  } catch { /* fall through */ }

  return crypto.createHash("sha256").update(raw).digest();
}

export function isEncryptedSecret(value: string | null | undefined): boolean {
  return typeof value === "string" && value.startsWith(`${PREFIX}:`);
}

export function encryptSecret(value: string): string {
  if (!value) return value;
  if (isEncryptedSecret(value)) return value;

  const key = getMasterKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return [PREFIX, iv.toString("base64"), tag.toString("base64"), encrypted.toString("base64")].join(":");
}

export function encryptNullableSecret(value: string | null | undefined): string | null {
  if (!value) return null;
  return encryptSecret(value);
}

export function decryptSecret(value: string | null | undefined): string | null {
  if (!value) return null;

  // Backward compatibility: existing DB values that were stored plaintext still work.
  // They will be encrypted the next time the owning config is saved.
  if (!isEncryptedSecret(value)) return value;

  const [, version, ivB64, tagB64, dataB64] = value.split(":");
  if (version !== "v1" || !ivB64 || !tagB64 || !dataB64) {
    throw new Error("Invalid encrypted secret format");
  }

  const key = getMasterKey();
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(dataB64, "base64")),
    decipher.final(),
  ]).toString("utf8");
}

export function maskSecret(value: string | null | undefined): string | null {
  const plain = decryptSecret(value);
  if (!plain) return null;
  if (plain.length <= 8) return `${plain.slice(0, 2)}${"*".repeat(Math.max(4, plain.length - 2))}`;
  return `${plain.slice(0, 4)}${"*".repeat(8)}${plain.slice(-4)}`;
}
