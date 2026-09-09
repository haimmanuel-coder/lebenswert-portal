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
const SENSIBLE_MITARBEITER_GESUNDHEITSFELDER = ["krankenversicherungsart", "krankenkasse"] as const;
const SENSIBLE_KUNDENGESUNDHEITSFELDER = ["pflegegrad", "pflegegradSeit"] as const;

export function verschluessleMitarbeiterStammdaten<T extends Record<string, unknown>>(daten: T): T {
  const kopie: Record<string, unknown> = { ...daten };
  for (const feld of SENSIBLE_MITARBEITERFELDER) {
    if (typeof kopie[feld] === "string" && kopie[feld]) kopie[feld] = verschluessleSensiblesFeld(kopie[feld] as string);
  }
  for (const feld of SENSIBLE_MITARBEITER_GESUNDHEITSFELDER) {
    const wert = kopie[feld];
    if (wert === null || wert === "") kopie[`${feld}Verschluesselt`] = null;
    else if (wert !== undefined) {
      kopie[`${feld}Verschluesselt`] = verschluessleSensiblesFeld(String(wert));
      kopie[feld] = null;
    }
  }
  return kopie as T;
}

export function entschluessleMitarbeiterStammdaten<T extends Record<string, unknown>>(daten: T): T {
  const kopie: Record<string, unknown> = { ...daten };
  for (const feld of SENSIBLE_MITARBEITERFELDER) {
    if (typeof kopie[feld] === "string" && kopie[feld]) kopie[feld] = entschluessleSensiblesFeld(kopie[feld] as string);
  }
  for (const feld of SENSIBLE_MITARBEITER_GESUNDHEITSFELDER) {
    const verschluesselt = kopie[`${feld}Verschluesselt`];
    const wert = entschluessleSensiblesFeld(typeof verschluesselt === "string" ? verschluesselt : undefined);
    if (wert !== undefined && wert !== null) kopie[feld] = wert;
    delete kopie[`${feld}Verschluesselt`];
  }
  return kopie as T;
}

/**
 * Pflegegrad und Beginn sind Gesundheitsdaten. Für neue und geänderte Werte
 * werden sie daher ausschließlich in verschlüsselten Zusatzfeldern gehalten.
 * Die bisherigen Spalten bleiben nur als rückwärtskompatible Lesefallbacks.
 */
export function verschluessleKundenGesundheitsdaten<T extends Record<string, unknown>>(daten: T): T {
  const kopie: Record<string, unknown> = { ...daten };
  const pflegegrad = kopie.pflegegrad;
  if (pflegegrad === null || pflegegrad === "") {
    kopie.pflegegradVerschluesselt = null;
  } else if (pflegegrad !== undefined) {
    kopie.pflegegradVerschluesselt = verschluessleSensiblesFeld(String(pflegegrad));
    kopie.pflegegrad = null;
  }
  const pflegegradSeit = kopie.pflegegradSeit;
  if (pflegegradSeit === null || pflegegradSeit === "") {
    kopie.pflegegradSeitVerschluesselt = null;
  } else if (pflegegradSeit !== undefined) {
    const normalisiert = pflegegradSeit instanceof Date
      ? pflegegradSeit.toISOString().slice(0, 10)
      : String(pflegegradSeit);
    kopie.pflegegradSeitVerschluesselt = verschluessleSensiblesFeld(normalisiert);
    kopie.pflegegradSeit = null;
  }
  return kopie as T;
}

export function entschluessleKundenGesundheitsdaten<T extends Record<string, unknown>>(daten: T): T {
  const kopie: Record<string, unknown> = { ...daten };
  const pflegegrad = entschluessleSensiblesFeld(
    typeof kopie.pflegegradVerschluesselt === "string" ? kopie.pflegegradVerschluesselt : undefined,
  );
  if (pflegegrad !== undefined && pflegegrad !== null) {
    const nummer = Number(pflegegrad);
    kopie.pflegegrad = Number.isInteger(nummer) ? nummer : null;
  }
  const pflegegradSeit = entschluessleSensiblesFeld(
    typeof kopie.pflegegradSeitVerschluesselt === "string" ? kopie.pflegegradSeitVerschluesselt : undefined,
  );
  if (pflegegradSeit !== undefined && pflegegradSeit !== null) kopie.pflegegradSeit = pflegegradSeit;
  delete kopie.pflegegradVerschluesselt;
  delete kopie.pflegegradSeitVerschluesselt;
  return kopie as T;
}

export const sensibleKundenGesundheitsfelder = SENSIBLE_KUNDENGESUNDHEITSFELDER;
