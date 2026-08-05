/**
 * Heartbeat-Handler: Unterweisungs-Fälligkeit (täglich 07:00 Uhr)
 * Prüft alle Arbeitssicherheits-Unterweisungen auf ablaufende Fristen (≤30 Tage)
 * und benachrichtigt den Admin.
 */
import type { Request, Response } from "express";
import { getDb } from "../db";
import { notifyOwner } from "../_core/notification";
import { sql } from "drizzle-orm";

export async function unterweisungenFaelligkeitHandler(_req: Request, _res: Response) {
  const res = _res;
  try {
    const db = await getDb();
    if (!db) return res.status(500).json({ ok: false, error: "DB nicht verfügbar" });

    const heute = new Date();
    const in30Tagen = new Date(heute);
    in30Tagen.setDate(in30Tagen.getDate() + 30);

    // Unterweisungen mit naechsteFaelligkeit in ≤30 Tagen (nicht bestätigt oder Wiederholung fällig)
    const rows = await db.execute(sql`
      SELECT
        u.id,
        u.thema,
        u.naechsteFaelligkeit,
        u.bestaetigt,
        m.vorname,
        m.nachname
      FROM arbeitssicherheit_unterweisungen u
      JOIN mitarbeiter m ON m.id = u.mitarbeiterId
      WHERE u.naechsteFaelligkeit IS NOT NULL
        AND u.naechsteFaelligkeit <= ${in30Tagen.toISOString().split("T")[0]}
        AND m.aktiv = 1
      ORDER BY u.naechsteFaelligkeit ASC
      LIMIT 50
    `);

    const faellige = (rows as any[])[0] as any[];
    if (!faellige || faellige.length === 0) {
      return res.json({ ok: true, faellige: 0 });
    }

    // Überfällig (Datum in der Vergangenheit) vs. bald fällig
    const ueberfaellig = faellige.filter((r: any) => new Date(r.naechsteFaelligkeit) < heute);
    const baldFaellig = faellige.filter((r: any) => new Date(r.naechsteFaelligkeit) >= heute);

    const formatZeile = (r: any) =>
      `• ${r.vorname} ${r.nachname}: "${r.thema}" – fällig am ${new Date(r.naechsteFaelligkeit).toLocaleDateString("de-DE")}`;

    let inhalt = "";
    if (ueberfaellig.length > 0) {
      inhalt += `🔴 ÜBERFÄLLIG (${ueberfaellig.length}):\n${ueberfaellig.map(formatZeile).join("\n")}\n\n`;
    }
    if (baldFaellig.length > 0) {
      inhalt += `🟡 BALD FÄLLIG – ≤30 Tage (${baldFaellig.length}):\n${baldFaellig.map(formatZeile).join("\n")}`;
    }

    await notifyOwner({
      title: `⛑️ Unterweisungen: ${faellige.length} Fälligkeiten (${ueberfaellig.length} überfällig)`,
      content: inhalt.trim(),
    });

    console.log(`[Unterweisungen-Fälligkeit] ${faellige.length} fällige Unterweisungen gemeldet`);
    return res.json({ ok: true, faellige: faellige.length, ueberfaellig: ueberfaellig.length });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[Scheduled/UnterweisungenFaelligkeit]", err);
    return res.status(500).json({ ok: false, error: msg });
  }
}
