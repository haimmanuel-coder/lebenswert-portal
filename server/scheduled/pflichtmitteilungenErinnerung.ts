/**
 * Heartbeat-Handler: tägliche Erinnerung für aktive Pflichtmitteilungen.
 * Die Protokolltabelle besitzt einen eindeutigen Schlüssel je Mitteilung,
 * Mitarbeiter und Tag. Damit bleibt der Ablauf auch bei Plattform-Retries
 * idempotent und erzeugt keine doppelten Erinnerungen.
 */
import { sql } from "drizzle-orm";
import { getAllMitarbeiter, createNotification, getDb } from "../db";
import { notifyOwner } from "../_core/notification";

type Pflichtmitteilung = { id: number; titel: string; typ: "normal" | "wichtig" | "dringend" };
type Lesebestaetigung = { mitteilungId: number; mitarbeiterId: number };
type AktiverMitarbeiter = { id: number; aktiv?: boolean | number | null };

export function ermittleOffenePflichtmitteilungen(
  mitteilungen: Pflichtmitteilung[],
  mitarbeiter: AktiverMitarbeiter[],
  bestaetigungen: Lesebestaetigung[],
) {
  const bestaetigt = new Set(bestaetigungen.map((eintrag) => `${eintrag.mitteilungId}:${eintrag.mitarbeiterId}`));
  return mitteilungen.flatMap((mitteilung) =>
    mitarbeiter
      .filter((ma) => ma.aktiv !== false && ma.aktiv !== 0)
      .filter((ma) => !bestaetigt.has(`${mitteilung.id}:${ma.id}`))
      .map((ma) => ({ mitteilung, mitarbeiterId: ma.id })),
  );
}

export async function pflichtmitteilungenErinnerungHandler(_req: any, res: any) {
  try {
    const db = await getDb();
    if (!db) return res.status(500).json({ ok: false, error: "DB nicht verfügbar" });

    const [mitteilungenRows, bestaetigungsRows] = await Promise.all([
      db.execute(sql`SELECT id, titel, prioritaet AS typ FROM mitteilungen WHERE aktiv = 1 AND lesebestaetigung_pflicht = 1 AND (gueltigBis IS NULL OR DATE(gueltigBis) >= CURDATE())`),
      db.execute(sql`SELECT mitteilungId, mitarbeiterId FROM mitteilungen_lesebestaetigung`),
    ]);
    const pflichtmitteilungen = ((mitteilungenRows as any)[0] ?? []) as Pflichtmitteilung[];
    const bestaetigungen = ((bestaetigungsRows as any)[0] ?? []) as Lesebestaetigung[];
    if (pflichtmitteilungen.length === 0) return res.json({ ok: true, erinnert: 0, ausstehend: 0, nachricht: "Keine aktiven Pflichtmitteilungen" });

    const aktiveMitarbeiter = await getAllMitarbeiter() as any[];
    const offene = ermittleOffenePflichtmitteilungen(pflichtmitteilungen, aktiveMitarbeiter, bestaetigungen);
    const heute = new Date().toISOString().slice(0, 10);
    const ausstehend = offene.length;
    let erinnert = 0;

    for (const { mitteilung, mitarbeiterId } of offene) {
        const insertResult = await db.execute(sql`
          INSERT IGNORE INTO pflichtmitteilung_erinnerungen (mitteilungId, mitarbeiterId, erinnerungsDatum)
          VALUES (${mitteilung.id}, ${mitarbeiterId}, ${heute})
        `);
        const neuErinnert = Number((insertResult as any)[0]?.affectedRows ?? 0) === 1;
        if (!neuErinnert) continue;

        await createNotification({
          empfaengerId: mitarbeiterId,
          typ: mitteilung.typ === "dringend" ? "fehler" : "warnung",
          titel: `Lesebestätigung offen: ${mitteilung.titel}`,
          nachricht: "Bitte öffne die Mitteilungen und bestätige diese verbindliche Information.",
          linkUrl: "/benachrichtigungen",
        });
        erinnert++;
    }

    if (erinnert > 0) {
      await notifyOwner({
        title: `Pflichtmitteilungen: ${erinnert} Erinnerung(en) versendet`,
        content: `${ausstehend} Lesebestätigung(en) sind derzeit noch offen. Heute wurden ${erinnert} noch nicht doppelt versendete Portal-Erinnerungen erstellt.`,
      });
    }
    return res.json({ ok: true, erinnert, ausstehend, aktivePflichtmitteilungen: pflichtmitteilungen.length });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[Scheduled/PflichtmitteilungenErinnerung]", error);
    return res.status(500).json({ ok: false, error: message, timestamp: new Date().toISOString() });
  }
}
