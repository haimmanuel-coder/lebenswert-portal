/**
 * Heartbeat-Handler: Datenschutz-Erinnerung (jeden Montag 08:00 Uhr)
 * Sendet eine Erinnerung an alle Mitarbeiter, die noch nicht allen
 * aktiven Pflicht-Datenschutzdokumenten zugestimmt haben.
 */
import { getDb } from "../db";
import { notifyOwner } from "../_core/notification";
import { datenschutzDokumente, datenschutzZustimmungen, mitarbeiter } from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";

export async function datenschutzErinnerungHandler(_req: any, res: any) {
  try {
    const db = await getDb();
    if (!db) return res.status(500).json({ ok: false, error: "DB nicht verfügbar" });
    // Alle aktiven Dokumente laden (kein pflicht-Feld in datenschutzDokumente)
    const pflichtDokumente = await db
      .select({ id: datenschutzDokumente.id, titel: datenschutzDokumente.titel })
      .from(datenschutzDokumente)
      .where(eq(datenschutzDokumente.aktiv, true));

    if (pflichtDokumente.length === 0) {
      return res.json({ ok: true, gesendet: 0, nachricht: "Keine aktiven Dokumente" });
    }

    // Alle aktiven Mitarbeiter laden
    const alleMitarbeiter = await db
      .select({ id: mitarbeiter.id, vorname: mitarbeiter.vorname, nachname: mitarbeiter.nachname })
      .from(mitarbeiter)
      .where(eq(mitarbeiter.aktiv, 1));

    // Für jedes Pflicht-Dokument: Mitarbeiter ohne Zustimmung finden
    const mitarbeiterOhneZustimmung = new Set<number>();

    for (const dok of pflichtDokumente) {
      // Zustimmung existiert = zugestimmtAt ist gesetzt (kein boolean-Feld)
      const zustimmungen = await db
        .select({ mitarbeiterId: datenschutzZustimmungen.mitarbeiterId })
        .from(datenschutzZustimmungen)
        .where(eq(datenschutzZustimmungen.dokumentId, dok.id));

      const zugestimmtIds = new Set(zustimmungen.map((z: { mitarbeiterId: number }) => z.mitarbeiterId));
      for (const ma of alleMitarbeiter as Array<{ id: number; vorname: string; nachname: string }>) {
        if (!zugestimmtIds.has(ma.id)) {
          mitarbeiterOhneZustimmung.add(ma.id);
        }
      }
    }

    const anzahl = mitarbeiterOhneZustimmung.size;

    if (anzahl > 0) {
      const namen = alleMitarbeiter
        .filter((ma: { id: number; vorname: string; nachname: string }) => mitarbeiterOhneZustimmung.has(ma.id))
        .map((ma: { id: number; vorname: string; nachname: string }) => `${ma.vorname} ${ma.nachname}`)
        .join(", ");

      await notifyOwner({
        title: `⚠️ Datenschutz: ${anzahl} Mitarbeiter ohne Zustimmung`,
        content: `Folgende Mitarbeiter haben noch nicht allen Pflicht-Datenschutzdokumenten zugestimmt:\n\n${namen}\n\nBitte erinnern Sie diese Mitarbeiter, sich im Portal einzuloggen und die Dokumente zu bestätigen.`,
      });
    }

    console.log(`[Datenschutz-Erinnerung] ${anzahl} Mitarbeiter ohne Pflicht-Zustimmung benachrichtigt`);
    return res.json({ ok: true, gesendet: anzahl });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[Scheduled/DatenschutzErinnerung]", err);
    return res.status(500).json({ ok: false, error: msg });
  }
}
