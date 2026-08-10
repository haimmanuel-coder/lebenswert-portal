import crypto from "node:crypto";
import { jwtVerify, SignJWT } from "jose";
import { TRPCError } from "@trpc/server";
import { publicProcedure } from "./_core/trpc";
import { getMitarbeiterById } from "./db";

export const PORTAL_COOKIE = "lb_portal_token";

/**
 * JWT-Signaturschlüssel (K-4).
 *
 * Früher gab es einen hartcodierten Fallback ("lebenswert-secret-key"). In
 * einem öffentlichen Repository ließen sich damit bei fehlender Umgebungs-
 * variable gültige Token für beliebige Konten – auch Admin – signieren.
 *
 * Regeln jetzt:
 *   • JWT_SECRET gesetzt  → dieser Wert wird verwendet.
 *   • fehlt in Produktion → der Prozess startet nicht (fail fast).
 *   • fehlt in Entwicklung/Test → ein zufälliges, nur für diese Prozess-
 *     laufzeit gültiges Secret. Nie eine allgemein bekannte Konstante.
 */
function ermittleJwtSecret(): string {
  const ausUmgebung = process.env.JWT_SECRET;
  if (ausUmgebung && ausUmgebung.length >= 16) return ausUmgebung;

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "JWT_SECRET ist nicht gesetzt (oder kürzer als 16 Zeichen). " +
        "Der Server verweigert aus Sicherheitsgründen den Start. " +
        "Bitte JWT_SECRET als Umgebungsvariable hinterlegen.",
    );
  }

  if (ausUmgebung) {
    console.warn("[Auth] JWT_SECRET ist kürzer als 16 Zeichen – bitte verlängern.");
    return ausUmgebung;
  }

  // Entwicklung/Test: zufälliges Ephemer-Secret statt bekannter Konstante.
  console.warn(
    "[Auth] JWT_SECRET nicht gesetzt – nutze ein zufälliges Secret für diese " +
      "Prozesslaufzeit. Token überstehen keinen Neustart. Nur für Entwicklung/Tests.",
  );
  return crypto.randomBytes(32).toString("hex");
}

const JWT_SECRET_TEXT = ermittleJwtSecret();
const JWT_SECRET = new TextEncoder().encode(JWT_SECRET_TEXT);

export type PortalRolle = "mitarbeiter" | "teamleitung" | "buchhaltung" | "admin";
export type PortalRecht =
  | "kunden:lesen"
  | "kunden:schreiben"
  | "kunden:loeschen"
  | "berichte:lesen"
  | "berichte:freigeben"
  | "planung:verwalten"
  | "finanzen:lesen"
  | "finanzen:exportieren"
  | "mitarbeiter:verwalten"
  | "integrationen:verwalten"
  | "datenschutz:verwalten";

const STANDARD_RECHTE: Record<PortalRolle, PortalRecht[]> = {
  mitarbeiter: ["kunden:lesen", "berichte:lesen"],
  teamleitung: [
    "kunden:lesen", "kunden:schreiben", "berichte:lesen", "berichte:freigeben",
    "planung:verwalten", "mitarbeiter:verwalten",
  ],
  buchhaltung: ["kunden:lesen", "finanzen:lesen", "finanzen:exportieren"],
  admin: [
    "kunden:lesen", "kunden:schreiben", "kunden:loeschen", "berichte:lesen",
    "berichte:freigeben", "planung:verwalten", "finanzen:lesen",
    "finanzen:exportieren", "mitarbeiter:verwalten", "integrationen:verwalten",
    "datenschutz:verwalten",
  ],
};

export async function signPortalToken(mitarbeiterId: number, options?: { mfa?: boolean; expiresIn?: string }) {
  return new SignJWT({ mitarbeiterId, mfa: options?.mfa ?? true })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(options?.expiresIn ?? "30d")
    .sign(JWT_SECRET);
}

export async function verifyPortalToken(token: string): Promise<{ mitarbeiterId: number; mfa: boolean } | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return {
      mitarbeiterId: Number(payload.mitarbeiterId),
      mfa: payload.mfa !== false,
    };
  } catch {
    return null;
  }
}

function tokenFromRequest(req: any): string | undefined {
  let token = req.cookies?.[PORTAL_COOKIE] as string | undefined;
  if (!token) {
    const authHeader = req.headers?.authorization as string | undefined;
    if (authHeader?.startsWith("Bearer ")) token = authHeader.slice(7);
  }
  return token;
}

export const portalProcedure = publicProcedure.use(async ({ ctx, next }) => {
  const token = tokenFromRequest(ctx.req);
  const session = token ? await verifyPortalToken(token) : null;
  return next({
    ctx: {
      ...ctx,
      mitarbeiterId: session?.mitarbeiterId ?? null,
      portalMfa: session?.mfa ?? false,
    },
  });
});

export const portalProtected = portalProcedure.use(async ({ ctx, next }) => {
  if (!ctx.mitarbeiterId || !ctx.portalMfa) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Nicht angemeldet" });
  }
  const ma = await getMitarbeiterById(ctx.mitarbeiterId);
  if (!ma || !ma.aktiv) throw new TRPCError({ code: "UNAUTHORIZED", message: "Zugang ist nicht aktiv" });
  return next({ ctx: { ...ctx, mitarbeiterId: ctx.mitarbeiterId as number, portalMitarbeiter: ma } });
});

export const adminProcedure = portalProtected.use(async ({ ctx, next }) => {
  if (ctx.portalMitarbeiter.rolle !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Keine Admin-Berechtigung" });
  }
  return next({ ctx: { ...ctx, adminId: ctx.mitarbeiterId } });
});

export function roleProcedure(rollen: PortalRolle[]) {
  return portalProtected.use(async ({ ctx, next }) => {
    if (!rollen.includes(ctx.portalMitarbeiter.rolle as PortalRolle)) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Für diese Funktion fehlt die Berechtigung" });
    }
    return next({ ctx });
  });
}

export function hasRecht(rolle: string, recht: PortalRecht, extra?: string | null) {
  const basis = STANDARD_RECHTE[(rolle as PortalRolle)] ?? [];
  let zusaetzlich: string[] = [];
  try { zusaetzlich = extra ? JSON.parse(extra) : []; } catch { zusaetzlich = []; }
  return basis.includes(recht) || zusaetzlich.includes(recht);
}

export function requireRecht(recht: PortalRecht) {
  return portalProtected.use(async ({ ctx, next }) => {
    if (!hasRecht(ctx.portalMitarbeiter.rolle, recht, ctx.portalMitarbeiter.berechtigungen)) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Für diese Funktion fehlt die Berechtigung" });
    }
    return next({ ctx });
  });
}

function encryptionKey() {
  // Fällt auf JWT_SECRET_TEXT zurück, falls kein eigener Schlüssel gesetzt ist.
  // Seit K-4 ist das kein öffentlich bekannter Wert mehr, sondern in Produktion
  // ein echtes Secret bzw. in Entwicklung ein Prozess-Zufallswert. Für getrennte
  // Schlüsselverwaltung empfiehlt sich dennoch ein eigenes CREDENTIAL_ENCRYPTION_KEY.
  return crypto.createHash("sha256").update(process.env.CREDENTIAL_ENCRYPTION_KEY || JWT_SECRET_TEXT).digest();
}

export function encryptSecret(value: string) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("base64")}.${tag.toString("base64")}.${encrypted.toString("base64")}`;
}

export function decryptSecret(value: string) {
  const [ivRaw, tagRaw, dataRaw] = value.split(".");
  if (!ivRaw || !tagRaw || !dataRaw) throw new Error("Ungültige verschlüsselte Zugangsdaten");
  const decipher = crypto.createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(ivRaw, "base64"));
  decipher.setAuthTag(Buffer.from(tagRaw, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(dataRaw, "base64")), decipher.final()]).toString("utf8");
}

export function sichereAnzeige(secret?: string | null) {
  if (!secret) return null;
  return `••••${secret.slice(-4)}`;
}
