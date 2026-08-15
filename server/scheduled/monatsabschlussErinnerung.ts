/**
 * ════════════════════════════════════════════════════════════════════════════
 *  MONATSABSCHLUSS-ERINNERUNG
 *  Heartbeat-Callback: POST /api/scheduled/monatsabschluss-erinnerung
 *  Cron: "0 0 7 28 * *" → am 28. jeden Monats um 07:00 UTC (09:00 MEZ)
 *
 *  Prüft, ob alle Leistungsnachweise des aktuellen Monats abgeschlossen sind.
 *  Falls nicht: Benachrichtigung an betroffene Mitarbeiter + Admin-Warnung.
 * ════════════════════════════════════════════════════════════════════════════
 */

import { getDb } from "../db";
import { sql } from "drizzle-orm";
import { createNotification } from "../db";
import { pruefeLeistungsnachweisAbschluss } from "../monatsabschlussService";

/**
 * Prüft am 16. ob Fahrtenabrechnungen noch auf Freigabe warten.
 * Wird vom gleichen Handler aufgerufen, aber nur am 16. aktiv.
 */
async function pruefeOffeneFreigaben(): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const rows = await db.execute(sql`
    SELECT id, label FROM fahrtenAbrechnungen WHERE status = 'offen'
  `);
  const offene: any[] = (rows as any)[0] ?? rows;
  if (offene.length === 0) return 0;

  // Admins benachrichtigen
  const adminRows = await db.execute(sql`
    SELECT id FROM mitarbeiter WHERE rolle = 'admin' AND aktiv = 1
  `);
  const admins: any[] = (adminRows as any)[0] ?? adminRows;
  for (const admin of admins) {
    try {
      await createNotification({
        empfaengerId: admin.id,
        titel: `📋 ${offene.length} Fahrtenabrechnung(en) warten auf Freigabe`,
        nachricht: `Bitte vor dem 18. freigeben, damit der automatische Versand an die Steuerberaterin erfolgen kann: ${offene.map((o: any) => o.label).join(", ")}`,
        typ: "warnung",
      });
    } catch { /* nicht kritisch */ }
  }
  return offene.length;
}

export async function handleMonatsabschlussErinnerung(): Promise<{
  geprueft: boolean;
  offene: number;
  benachrichtigt: number;
  offeneFreigaben: number;
}> {
  const db = await getDb();
  if (!db) {
    console.error("[MonatsabschlussErinnerung] DB nicht verfügbar");
    return { geprueft: false, offene: 0, benachrichtigt: 0, offeneFreigaben: 0 };
  }

  // Am 16. zusätzlich offene Freigaben prüfen
  const tag = new Date().getDate();
  let offeneFreigaben = 0;
  if (tag >= 15 && tag <= 17) {
    offeneFreigaben = await pruefeOffeneFreigaben();
  }

  // Aktuellen Monat bestimmen (YYYY-MM)
  const jetzt = new Date();
  const monat = `${jetzt.getFullYear()}-${String(jetzt.getMonth() + 1).padStart(2, "0")}`;

  console.log(`[MonatsabschlussErinnerung] Prüfe Monat ${monat}`);

  const kontrolle = await pruefeLeistungsnachweisAbschluss(monat);

  if (kontrolle.kannAbschliessen) {
    console.log(`[MonatsabschlussErinnerung] Alle ${kontrolle.gesamt} LNW abgeschlossen – keine Erinnerung nötig`);
    return { geprueft: true, offene: 0, benachrichtigt: 0, offeneFreigaben };
  }

  let benachrichtigt = 0;

  // Betroffene Mitarbeiter benachrichtigen
  for (const ma of kontrolle.offeneMitarbeiter) {
    try {
      await createNotification({
        empfaengerId: ma.mitarbeiterId,
        titel: `⚠️ Leistungsnachweise ${monat} noch offen`,
        nachricht: `Du hast noch ${ma.anzahl} offene Leistungsnachweise für ${monat}. Bitte bis zum Monatsende abschließen, damit die Abrechnung pünktlich erfolgen kann.`,
        typ: "warnung",
      });
      benachrichtigt++;
    } catch (err) {
      console.error(`[MonatsabschlussErinnerung] Fehler bei MA ${ma.mitarbeiterId}:`, err);
    }
  }

  // Admins informieren
  const adminRows = await db.execute(sql`
    SELECT id FROM mitarbeiter WHERE rolle = 'admin' AND aktiv = 1
  `);
  const admins: any[] = (adminRows as any)[0] ?? adminRows;
  for (const admin of admins) {
    try {
      await createNotification({
        empfaengerId: admin.id,
        titel: `📊 Monatsabschluss ${monat}: ${kontrolle.offen} LNW offen`,
        nachricht: `Noch ${kontrolle.offen} von ${kontrolle.gesamt} Leistungsnachweisen sind nicht abgeschlossen. Betroffene Mitarbeiter wurden erinnert. Bitte bis zum Monatsende sicherstellen, dass alle freigegeben sind.`,
        typ: "warnung",
      });
    } catch { /* nicht kritisch */ }
  }

  console.log(`[MonatsabschlussErinnerung] ${kontrolle.offen} offen, ${benachrichtigt} MA benachrichtigt`);
  return { geprueft: true, offene: kontrolle.offen, benachrichtigt, offeneFreigaben };
}
