import crypto from "node:crypto";

const SCHLUESSEL_MATERIAL = process.env.CREDENTIAL_ENCRYPTION_KEY || process.env.JWT_SECRET || (process.env.NODE_ENV === "test" ? "test-only-field-encryption-key" : "");
if (!SCHLUESSEL_MATERIAL) throw new Error("Ein Schlüssel für die Verschlüsselung sensibler Felder ist erforderlich.");
const SCHLUESSEL = crypto.createHash("sha256").update(SCHLUESSEL_MATERIAL).digest();
const PRAEFIX = "enc:v1:";

export function verschluessleSensiblesFeld(wert: string): string {
  if (!wert || wert.startsWith(PRAEFIX)) return wert;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", SCHLUESSEL, iv);
  const verschluesselt = Buffer.concat([cipher.update(wert, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${PRAEFIX}${iv.toString("base64")}.${tag.toString("base64")}.${verschluesselt.toString("base64")}`;
}

export function entschluessleSensiblesFeld(wert: string | null | undefined): string | null | undefined {
  if (!wert || !wert.startsWith(PRAEFIX)) return wert;
  const [ivRaw, tagRaw, datenRaw] = wert.slice(PRAEFIX.length).split(".");
  if (!ivRaw || !tagRaw || !datenRaw) throw new Error("Ungültiges Format eines verschlüsselten Feldes.");
  const decipher = crypto.createDecipheriv("aes-256-gcm", SCHLUESSEL, Buffer.from(ivRaw, "base64"));
  decipher.setAuthTag(Buffer.from(tagRaw, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(datenRaw, "base64")), decipher.final()]).toString("utf8");
}

const SENSIBLE_MITARBEITERFELDER = ["iban", "steueridentnummer", "sozialversicherungsnummer"] as const;

export function verschluessleMitarbeiterStammdaten<T extends Record<string, unknown>>(daten: T): T {
  const kopie: Record<string, unknown> = { ...daten };
  for (const feld of SENSIBLE_MITARBEITERFELDER) {
    if (typeof kopie[feld] === "string" && kopie[feld]) kopie[feld] = verschluessleSensiblesFeld(kopie[feld] as string);
  }
  return kopie as T;
}

export function entschluessleMitarbeiterStammdaten<T extends Record<string, unknown>>(daten: T): T {
  const kopie: Record<string, unknown> = { ...daten };
  for (const feld of SENSIBLE_MITARBEITERFELDER) {
    if (typeof kopie[feld] === "string" && kopie[feld]) kopie[feld] = entschluessleSensiblesFeld(kopie[feld] as string);
  }
  return kopie as T;
}
