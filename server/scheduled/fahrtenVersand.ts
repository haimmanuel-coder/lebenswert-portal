/**
 * ════════════════════════════════════════════════════════════════════════════
 *  FAHRTENNACHWEISE – AUTOMATISCHER VERSAND AM 18. JEDEN MONATS
 *  Heartbeat-Callback: POST /api/scheduled/fahrtennachweise-versand
 *  Cron: "0 0 6 18 * *" → jeden 18. um 06:00 UTC (08:00 MEZ)
 * ════════════════════════════════════════════════════════════════════════════
 */

import { getDb } from "../db";
import { sql } from "drizzle-orm";
import { sendEmail } from "../emailService";
import { erstelleSicheresExportpaket, protokolliereSicherenExportversand, sichereExportEmail } from "../secureExportService";

/**
 * Wird vom Heartbeat-Cron am 18. jeden Monats aufgerufen.
 * Sendet alle freigegebenen Fahrtenabrechnungen, die noch nicht versendet wurden.
 */
export async function handleFahrtenVersandCron(): Promise<{
  versendet: number;
  fehler: number;
  details: string[];
}> {
  const db = await getDb();
  if (!db) {
    console.error("[FahrtenVersand] Datenbankverbindung nicht verfügbar");
    return { versendet: 0, fehler: 1, details: ["Datenbankverbindung nicht verfügbar"] };
  }

  const details: string[] = [];
  let versendet = 0;
  let fehler = 0;

  try {
    // Steuerbüro-E-Mail aus Einstellungen laden
    const einstellRows = await db.execute(sql`
      SELECT schluessel, wert FROM systemEinstellungen
      WHERE schluessel IN ('steuerbuero_email', 'steuerbuero_name', 'fahrtnachweis_auto_versand')
    `);
    const einstellArr: any[] = (einstellRows as any[])[0] ?? einstellRows;
    const einstellungen: Record<string, string> = {};
    for (const row of einstellArr) {
      einstellungen[row.schluessel] = row.wert;
    }

    // Auto-Versand deaktiviert?
    if (einstellungen.fahrtnachweis_auto_versand === "false") {
      console.log("[FahrtenVersand] Automatischer Versand ist deaktiviert");
      return { versendet: 0, fehler: 0, details: ["Automatischer Versand ist deaktiviert"] };
    }

    const empfaengerEmail = einstellungen.steuerbuero_email;
    if (!empfaengerEmail) {
      console.error("[FahrtenVersand] Keine Steuerbüro-E-Mail hinterlegt");
      return { versendet: 0, fehler: 1, details: ["Keine Steuerbüro-E-Mail hinterlegt"] };
    }

    const empfaengerName = einstellungen.steuerbuero_name ?? "Steuerbüro";

    // Alle freigegebenen Abrechnungen laden
    const offeneRows = await db.execute(sql`
      SELECT * FROM fahrtenAbrechnungen WHERE status = 'freigegeben'
    `);
    const offene: any[] = (offeneRows as any[])[0] ?? offeneRows;

    console.log(`[FahrtenVersand] ${offene.length} freigegebene Abrechnungen gefunden`);

    for (const abr of offene) {
      try {
        if (!abr.pdfKey) throw new Error("Freigegebenes Fahrtennachweis-PDF fehlt.");
        const paket = await erstelleSicheresExportpaket({
          db,
          typ: "fahrtennachweis",
          referenz: `fahrtenAbrechnung:${abr.id}`,
          dateiname: `Fahrtennachweise_${abr.zeitraumVon}_${abr.zeitraumBis}.pdf`,
          bestehenderDateiKey: abr.pdfKey,
          empfaengerEmail,
          erstelltVon: abr.freigegebenVon ?? null,
        });

        // E-Mail senden
        const mailResult = await sendEmail({
          to: empfaengerEmail,
          subject: `Fahrtennachweise ${abr.label} – Seniorenassistenz Bernhardt`,
          html: sichereExportEmail({ titel: "Fahrtennachweise", zeitraum: abr.label, abrufUrl: paket.abrufUrl }),
        });
        if (!mailResult.success) throw new Error(mailResult.error ?? "Sicherer Link konnte nicht versendet werden.");
        await protokolliereSicherenExportversand(db, paket.id);

        // Status aktualisieren
        await db.execute(sql`
          UPDATE fahrtenAbrechnungen
          SET status = 'versendet',
              versendetAt = NOW(),
              empfaengerEmail = ${empfaengerEmail}
          WHERE id = ${abr.id}
        `);

        versendet++;
        details.push(`✅ ${abr.label} (ID ${abr.id}) an ${empfaengerEmail} versendet`);
        console.log(`[FahrtenVersand] Abrechnung ${abr.id} (${abr.label}) versendet`);
      } catch (err) {
        fehler++;
        const msg = err instanceof Error ? err.message : String(err);
        details.push(`❌ ${abr.label} (ID ${abr.id}): ${msg}`);
        console.error(`[FahrtenVersand] Fehler bei Abrechnung ${abr.id}:`, err);
      }
    }
  } catch (err) {
    fehler++;
    const msg = err instanceof Error ? err.message : String(err);
    details.push(`❌ Kritischer Fehler: ${msg}`);
    console.error("[FahrtenVersand] Kritischer Fehler:", err);
  }

  console.log(`[FahrtenVersand] Abgeschlossen: ${versendet} versendet, ${fehler} Fehler`);
  return { versendet, fehler, details };
}
