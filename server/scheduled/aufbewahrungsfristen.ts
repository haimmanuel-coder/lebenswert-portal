/**
 * Heartbeat-Handler: Aufbewahrungsfristen-Prüfung (SGB XI – monatlich am 1.)
 * Prüft ob Einsätze, Leistungsnachweise oder Kundendaten älter als 10 Jahre sind
 * und benachrichtigt den Admin zur manuellen Löschentscheidung.
 */
import { getDb } from "../db";
import { notifyOwner } from "../_core/notification";
import { sql } from "drizzle-orm";

const AUFBEWAHRUNGSFRIST_JAHRE = 10;

export async function aufbewahrungsfristenHandler(_req: any, res: any) {
  try {
    const db = await getDb();
    if (!db) return res.status(500).json({ ok: false, error: "DB nicht verfügbar" });

    const grenzDatum = new Date();
    grenzDatum.setFullYear(grenzDatum.getFullYear() - AUFBEWAHRUNGSFRIST_JAHRE);
    const grenzStr = grenzDatum.toISOString().split("T")[0]; // YYYY-MM-DD

    // Einsätze älter als 10 Jahre zählen
    const einsaetzeResult = await db.execute(
      sql`SELECT COUNT(*) as anzahl FROM einsaetze WHERE datum < ${grenzStr} AND geloeschtAt IS NULL`
    );
    const einsaetzeAnzahl = Number((einsaetzeResult as any).rows?.[0]?.anzahl ?? 0);

    // Leistungsnachweise älter als 10 Jahre zählen
    const lnwResult = await db.execute(
      sql`SELECT COUNT(*) as anzahl FROM leistungsnachweise WHERE createdAt < ${grenzDatum.toISOString()}`
    );
    const lnwAnzahl = Number((lnwResult as any).rows?.[0]?.anzahl ?? 0);

    // Ehemalige Kunden (inaktiv) älter als 10 Jahre
    const kundenResult = await db.execute(
      sql`SELECT COUNT(*) as anzahl FROM kunden WHERE aktiv = 0 AND createdAt < ${grenzDatum.toISOString()}`
    );
    const kundenAnzahl = Number((kundenResult as any).rows?.[0]?.anzahl ?? 0);

    const gesamt = einsaetzeAnzahl + lnwAnzahl + kundenAnzahl;

    if (gesamt > 0) {
      await notifyOwner({
        title: `⚠️ Aufbewahrungsfristen-Prüfung: ${gesamt} Datensätze prüfen`,
        content: `Monatliche Prüfung nach SGB XI (10-Jahres-Frist, Stichtag: ${grenzStr}):\n\n` +
          `• Einsätze älter als 10 Jahre: **${einsaetzeAnzahl}**\n` +
          `• Leistungsnachweise älter als 10 Jahre: **${lnwAnzahl}**\n` +
          `• Inaktive Kunden älter als 10 Jahre: **${kundenAnzahl}**\n\n` +
          `Bitte prüfen Sie diese Datensätze und entscheiden Sie über eine Löschung ` +
          `gemäß Art. 17 DSGVO und § 630f BGB. Dokumentieren Sie die Entscheidung im Audit-Log.`,
      });
    }

    return res.json({
      ok: true,
      geprueft: gesamt,
      details: { einsaetze: einsaetzeAnzahl, leistungsnachweise: lnwAnzahl, kunden: kundenAnzahl },
      stichtag: grenzStr,
      nachricht: gesamt > 0
        ? `${gesamt} Datensätze überschreiten die 10-Jahres-Aufbewahrungsfrist – Admin benachrichtigt`
        : `Keine Datensätze überschreiten die 10-Jahres-Aufbewahrungsfrist`,
    });
  } catch (err: any) {
    console.error("[aufbewahrungsfristen] Fehler:", err);
    return res.status(500).json({ ok: false, error: String(err.message ?? err) });
  }
}
