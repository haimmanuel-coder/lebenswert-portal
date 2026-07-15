/**
 * TOTP Zwei-Faktor-Authentifizierung
 * Verwendet otpauth für TOTP-Generierung und qrcode für QR-Code-Ausgabe
 */
import * as OTPAuth from "otpauth";
import QRCode from "qrcode";
import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";
import { getDb } from "./db";
import { mitarbeiterZweiFaktor, zweiFaktorCodes } from "../drizzle/schema";
import { eq, and } from "drizzle-orm";

const ISSUER = "Lebensnah Betreuung Portal";

/** Neues TOTP-Secret generieren und QR-Code-URL zurückgeben */
export async function generate2FASetup(mitarbeiterId: number, email: string) {
  const secret = new OTPAuth.Secret({ size: 20 });
  const totp = new OTPAuth.TOTP({
    issuer: ISSUER,
    label: email,
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret,
  });
  const otpAuthUrl = totp.toString();
  const qrCodeDataUrl = await QRCode.toDataURL(otpAuthUrl);
  return {
    secret: secret.base32,
    qrCodeDataUrl,
    otpAuthUrl,
  };
}

/** TOTP-Code verifizieren */
export function verifyTOTP(secret: string, token: string): boolean {
  try {
    const totp = new OTPAuth.TOTP({
      issuer: ISSUER,
      algorithm: "SHA1",
      digits: 6,
      period: 30,
      secret: OTPAuth.Secret.fromBase32(secret),
    });
    const delta = totp.validate({ token, window: 1 });
    return delta !== null;
  } catch {
    return false;
  }
}

/** 2FA aktivieren: Secret speichern, Wiederherstellungscodes generieren */
export async function activate2FA(mitarbeiterId: number, secret: string): Promise<string[]> {
  const db = await getDb();
  if (!db) throw new Error("DB nicht verfügbar");
  // Secret speichern
  await db
    .insert(mitarbeiterZweiFaktor)
    .values({
      mitarbeiterId,
      twoFactorEnabled: true,
      twoFactorSecret: secret,
      twoFactorActivatedAt: new Date(),
    })
    .onDuplicateKeyUpdate({
      set: {
        twoFactorEnabled: true,
        twoFactorSecret: secret,
        twoFactorActivatedAt: new Date(),
      },
    });

  // 8 Wiederherstellungscodes generieren
  const codes: string[] = [];
  for (let i = 0; i < 8; i++) {
    const code = nanoid(10).toUpperCase();
    codes.push(code);
    const hash = await bcrypt.hash(code, 10);
    await db.insert(zweiFaktorCodes).values({
      mitarbeiterId,
      codeHash: hash,
      verwendet: false,
    });
  }
  return codes;
}

/** 2FA deaktivieren */
export async function deactivate2FA(mitarbeiterId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db
    .update(mitarbeiterZweiFaktor)
    .set({ twoFactorEnabled: false, twoFactorSecret: null })
    .where(eq(mitarbeiterZweiFaktor.mitarbeiterId, mitarbeiterId));
}

/** 2FA-Status eines Mitarbeiters abrufen */
export async function get2FAStatus(mitarbeiterId: number) {
  const db = await getDb();
  if (!db) return { enabled: false, activatedAt: null };
  const rows = await db
    .select()
    .from(mitarbeiterZweiFaktor)
    .where(eq(mitarbeiterZweiFaktor.mitarbeiterId, mitarbeiterId))
    .limit(1);
  if (rows.length === 0) return { enabled: false, activatedAt: null };
  return {
    enabled: rows[0].twoFactorEnabled,
    activatedAt: rows[0].twoFactorActivatedAt,
  };
}

/** Wiederherstellungscode prüfen und einmalig verbrauchen */
export async function useRecoveryCode(mitarbeiterId: number, code: string): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const rows = await db
    .select()
    .from(zweiFaktorCodes)
    .where(
      and(
        eq(zweiFaktorCodes.mitarbeiterId, mitarbeiterId),
        eq(zweiFaktorCodes.verwendet, false)
      )
    );
  for (const row of rows) {
    const match = await bcrypt.compare(code, row.codeHash);
    if (match) {
      await db
        .update(zweiFaktorCodes)
        .set({ verwendet: true })
        .where(eq(zweiFaktorCodes.id, row.id));
      return true;
    }
  }
  return false;
}

/** Secret für einen Mitarbeiter abrufen (für Login-Verifikation) */
export async function get2FASecret(mitarbeiterId: number): Promise<string | null> {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select({ secret: mitarbeiterZweiFaktor.twoFactorSecret, enabled: mitarbeiterZweiFaktor.twoFactorEnabled })
    .from(mitarbeiterZweiFaktor)
    .where(eq(mitarbeiterZweiFaktor.mitarbeiterId, mitarbeiterId))
    .limit(1);
  if (rows.length === 0 || !rows[0].enabled) return null;
  return rows[0].secret ?? null;
}
