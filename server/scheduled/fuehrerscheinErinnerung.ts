/**
 * ════════════════════════════════════════════════════════════════════════════
 *  FÜHRERSCHEIN-ERINNERUNGS-JOB
 * ════════════════════════════════════════════════════════════════════════════
 *
 * Läuft täglich um 08:00 UTC (= 09:00 / 10:00 MEZ/MESZ).
 * Prüft alle Führerschein-Checks und:
 *   • 30 Tage vor Fälligkeit: Erinnerung an den Mitarbeiter
 *   • 14 Tage vor Fälligkeit: Erinnerung an Mitarbeiter + Admin/Teamleitung
 *   •  7 Tage vor Fälligkeit: Dringende Warnung + Status → "faellig"
 *   •  0 Tage (überfällig):   Status → "ueberfaellig" + Eskalation an Admin
 */

import type { Request, Response } from "express";
import { getDb } from "../db";
import { sql } from "drizzle-orm";
import { createNotification } from "../db";

interface FuehrerscheinRow {
  id: number;
  mitarbeiter_id: number;
  naechstes_pruef_datum: string;
  status: string;
  vorname?: string;
  nachname?: string;
}

export async function fuehrerscheinErinnerungHandler(req: Request, res: Response) {
  try {
    const db = await getDb();
    if (!db) {
      res.status(500).json({ error: "DB nicht verfügbar" });
      return;
    }

    const heute = new Date();
    heute.setHours(0, 0, 0, 0);

    // Alle aktiven Checks mit Mitarbeiter-Namen laden
    const rows = await db.execute(sql`
      SELECT fc.id, fc.mitarbeiter_id, fc.naechstes_pruef_datum, fc.status,
             m.vorname, m.nachname
      FROM fuehrerschein_checks fc
      JOIN mitarbeiter m ON m.id = fc.mitarbeiter_id
      WHERE fc.status != 'ueberfaellig' OR fc.naechstes_pruef_datum >= DATE_SUB(NOW(), INTERVAL 90 DAY)
      ORDER BY fc.naechstes_pruef_datum ASC
    `);

    const checks: FuehrerscheinRow[] = (rows as any).rows ?? (rows as any) ?? [];

    // Admins und Teamleitungen für Eskalationen holen
    const adminRows = await db.execute(sql`
      SELECT id FROM mitarbeiter WHERE rolle IN ('admin', 'teamleitung') AND aktiv = 1
    `);
    const adminIds: number[] = ((adminRows as any).rows ?? adminRows ?? []).map((r: any) => Number(r.id));

    let erinnerungen = 0;
    let eskalationen = 0;
    let statusUpdates = 0;

    for (const check of checks) {
      const faelligAm = new Date(check.naechstes_pruef_datum);
      faelligAm.setHours(0, 0, 0, 0);
      const diffTage = Math.ceil((faelligAm.getTime() - heute.getTime()) / 86400000);
      const maName = `${check.vorname ?? ""} ${check.nachname ?? ""}`.trim();
      const maId = Number(check.mitarbeiter_id);

      if (diffTage < 0 && check.status !== "ueberfaellig") {
        // Überfällig: Status aktualisieren + Eskalation
        await db.execute(sql`UPDATE fuehrerschein_checks SET status = 'ueberfaellig' WHERE id = ${check.id}`);
        statusUpdates++;

        // Mitarbeiter informieren
        await createNotification({
          empfaengerId: maId,
          titel: "🚨 Führerschein-Check überfällig!",
          nachricht: `Dein Führerschein-Check war am ${check.naechstes_pruef_datum} fällig und wurde noch nicht erneuert. Bitte sofort einen neuen Check durchführen!`,
          typ: "fehler",
        });

        // Admins eskalieren
        for (const adminId of adminIds) {
          await createNotification({
            empfaengerId: adminId,
            titel: `🚨 Führerschein-Check überfällig: ${maName}`,
            nachricht: `Der Führerschein-Check von ${maName} war am ${check.naechstes_pruef_datum} fällig und wurde nicht erneuert. Bitte umgehend klären!`,
            typ: "fehler",
          });
        }
        eskalationen++;

      } else if (diffTage === 7 && check.status === "gueltig") {
        // 7 Tage: Status auf "faellig" setzen + dringende Warnung
        await db.execute(sql`UPDATE fuehrerschein_checks SET status = 'faellig' WHERE id = ${check.id}`);
        statusUpdates++;

        await createNotification({
          empfaengerId: maId,
          titel: "⚠️ Führerschein-Check in 7 Tagen fällig",
          nachricht: `Dein Führerschein-Check ist am ${check.naechstes_pruef_datum} fällig – noch 7 Tage. Bitte jetzt einen Termin vereinbaren!`,
          typ: "warnung",
        });

        for (const adminId of adminIds) {
          await createNotification({
            empfaengerId: adminId,
            titel: `⚠️ Führerschein-Check bald fällig: ${maName}`,
            nachricht: `${maName}: Führerschein-Check am ${check.naechstes_pruef_datum} fällig (in 7 Tagen).`,
            typ: "warnung",
          });
        }
        erinnerungen++;

      } else if (diffTage === 14) {
        // 14 Tage: Erinnerung an MA + Admin
        await createNotification({
          empfaengerId: maId,
          titel: "📋 Führerschein-Check in 14 Tagen fällig",
          nachricht: `Dein Führerschein-Check ist am ${check.naechstes_pruef_datum} fällig – noch 14 Tage. Bitte einen Termin einplanen.`,
          typ: "info",
        });

        for (const adminId of adminIds) {
          await createNotification({
            empfaengerId: adminId,
            titel: `📋 Führerschein-Check in 14 Tagen: ${maName}`,
            nachricht: `${maName}: Führerschein-Check am ${check.naechstes_pruef_datum} fällig (in 14 Tagen).`,
            typ: "info",
          });
        }
        erinnerungen++;

      } else if (diffTage === 30) {
        // 30 Tage: Vorab-Erinnerung an MA
        await createNotification({
          empfaengerId: maId,
          titel: "🗓️ Führerschein-Check in 30 Tagen fällig",
          nachricht: `Dein Führerschein-Check ist am ${check.naechstes_pruef_datum} fällig – noch 30 Tage. Bitte rechtzeitig planen.`,
          typ: "info",
        });
        erinnerungen++;
      }
    }

    console.log(`[FührerscheinErinnerung] ${checks.length} Checks geprüft: ${erinnerungen} Erinnerungen, ${eskalationen} Eskalationen, ${statusUpdates} Status-Updates`);
    res.json({ success: true, checks: checks.length, erinnerungen, eskalationen, statusUpdates });
  } catch (err) {
    console.error("[FührerscheinErinnerung] Fehler:", err);
    res.status(500).json({ error: String(err) });
  }
}
