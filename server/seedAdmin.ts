/**
 * ════════════════════════════════════════════════════════════════════════════
 *  START-ADMIN (einmaliges Bootstrapping bei leerer Installation)
 * ════════════════════════════════════════════════════════════════════════════
 *
 * Legt genau EINMAL ein Administrator-Konto an, damit man sich auf einer frisch
 * aufgesetzten Instanz überhaupt anmelden kann. Wird beim Serverstart nach
 * ensureTables() aufgerufen.
 *
 * Sicherheit:
 *   - Passiert NUR, wenn SEED_ADMIN_EMAIL und SEED_ADMIN_PASSWORT gesetzt sind.
 *   - Passiert NUR, wenn noch KEIN (nicht gelöschter) Admin existiert – auf einem
 *     bereits befüllten System bewusst wirkungslos (kein Rechte-Eskalationsweg).
 *   - Nach dem ersten Login sollte SEED_ADMIN_PASSWORT wieder entfernt werden.
 */

import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { getDb } from "./db";
import { mitarbeiter } from "../drizzle/schema";

/** Zerlegt einen Anzeigenamen in Vor- und Nachname (rein, testbar). */
export function zerlegeName(name: string | undefined | null): { vorname: string; nachname: string } {
  const teile = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (teile.length === 0) return { vorname: "Admin", nachname: "Portal" };
  if (teile.length === 1) return { vorname: teile[0], nachname: "" };
  return { vorname: teile[0], nachname: teile.slice(1).join(" ") };
}

export async function seedAdminFallsNoetig(): Promise<void> {
  const email = (process.env.SEED_ADMIN_EMAIL ?? "").trim().toLowerCase();
  const passwort = process.env.SEED_ADMIN_PASSWORT ?? "";
  if (!email || !passwort) return; // Feature nicht aktiviert

  const db = await getDb();
  if (!db) return;

  try {
    // Existiert bereits ein Admin? Dann nichts tun.
    const vorhandeneAdmins = await db
      .select({ id: mitarbeiter.id })
      .from(mitarbeiter)
      .where(eq(mitarbeiter.rolle, "admin"))
      .limit(1);
    if (vorhandeneAdmins.length > 0) return;

    // E-Mail schon vergeben (z. B. als Nicht-Admin)? Dann nicht anlegen.
    const vorhandeneEmail = await db
      .select({ id: mitarbeiter.id })
      .from(mitarbeiter)
      .where(eq(mitarbeiter.email, email))
      .limit(1);
    if (vorhandeneEmail.length > 0) {
      console.warn("[SeedAdmin] E-Mail existiert bereits – kein Start-Admin angelegt.");
      return;
    }

    if (passwort.length < 8) {
      console.warn("[SeedAdmin] SEED_ADMIN_PASSWORT zu kurz (mindestens 8 Zeichen) – übersprungen.");
      return;
    }

    const { vorname, nachname } = zerlegeName(process.env.SEED_ADMIN_NAME);
    const passwortHash = await bcrypt.hash(passwort, 10);
    await db.insert(mitarbeiter).values({
      vorname,
      nachname,
      email,
      passwortHash,
      rolle: "admin",
      aktiv: 1,
      passwortWechselErforderlich: 0,
    } as any);
    console.log(
      `[SeedAdmin] Start-Admin '${email}' angelegt. Bitte SEED_ADMIN_PASSWORT nach dem ersten Login entfernen und das Passwort im Portal ändern.`,
    );
  } catch (e) {
    console.warn("[SeedAdmin] Anlegen fehlgeschlagen:", e);
  }
}
