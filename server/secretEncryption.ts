import crypto from "node:crypto";

const PREFIX = "enc:v1:";

function getKey() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET fehlt für die Verschlüsselung von Zugangsdaten.");
  return crypto.createHash("sha256").update(secret).digest();
}

export function istVerschluesseltesSecret(value: string) {
  return value.startsWith(PREFIX);
}

export function verschluesseleSecret(klartext: string) {
  if (!klartext || istVerschluesseltesSecret(klartext)) return klartext;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(klartext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${PREFIX}${iv.toString("base64url")}:${tag.toString("base64url")}:${encrypted.toString("base64url")}`;
}

export function entschluesseleSecret(value: string) {
  if (!istVerschluesseltesSecret(value)) return value;
  const [, , ivPart, tagPart, encryptedPart] = value.split(":");
  if (!ivPart || !tagPart || !encryptedPart) throw new Error("Ungültiges verschlüsseltes Secret.");
  const decipher = crypto.createDecipheriv("aes-256-gcm", getKey(), Buffer.from(ivPart, "base64url"));
  decipher.setAuthTag(Buffer.from(tagPart, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(encryptedPart, "base64url")), decipher.final()]).toString("utf8");
}
