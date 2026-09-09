import { and, eq } from "drizzle-orm";
import { einsaetze, besuchsberichte, fahrten, leistungen } from "../drizzle/schema";
import { ANFAHRT_PAUSCHALE, STUNDENSATZ } from "../shared/leistungssaetze";
import { bereiteEinsatzUebernahmeVor } from "./mitarbeiterAblauf";
import { adjustKundeVerbraucht, createFahrt, getDb, getKundeById, getMitarbeiterById } from "./db";

type Paragraph = "45b" | "45a" | "39";

export type EinsatzabschlussFolgenInput = {
  einsatzId: number;
  taetigkeiten?: string;
  beobachtungen?: string | null;
  besonderheiten?: string | null;
  naechsteSchritte?: string | null;
  tatsaechlicherStart?: string;
  tatsaechlichesEnde?: string;
  fahrtKilometer?: number;
  fahrtVonOrt?: string;
  fahrtNachOrt?: string;
};

function runde2(wert: number): number {
  return Math.round((wert + Number.EPSILON) * 100) / 100;
}

/**
 * Übernimmt den Abschluss eines Einsatzes genau einmal in Besuchsbericht,
 * Fahrtenbuch und Leistungsnachweis.
 *
 * Der frühere Defekt: Diese Folgen lagen nur inline im tRPC-Router. Ein über
 * Besuchsberichte.create erfasster Besuch konnte daher keinen Einsatzabschluss
 * und damit weder Leistungsnachweis noch Fahrt auslösen.
 */
export async function fuehreEinsatzabschlussFolgenAus(input: EinsatzabschlussFolgenInput) {
  const db = await getDb();
  if (!db) throw new Error("Datenbank nicht verfügbar.");

  const einsatzRows = await db.select().from(einsaetze).where(eq(einsaetze.id, input.einsatzId)).limit(1);
  const einsatz = einsatzRows[0];
  if (!einsatz) throw new Error("Einsatz nicht gefunden.");
  if (einsatz.status !== "abgeschlossen") throw new Error("Folgen dürfen nur für abgeschlossene Einsätze erstellt werden.");

  const uebernahme = bereiteEinsatzUebernahmeVor({
    einsatzDatum: einsatz.datum,
    tatsaechlicherStart: input.tatsaechlicherStart,
    tatsaechlichesEnde: input.tatsaechlichesEnde,
    geplanteStunden: parseFloat(String(einsatz.dauerStunden ?? 0)),
  });
  const kunde = await getKundeById(einsatz.kundenId);
  const besuchsberichtDaten = {
    einsatzId: einsatz.id,
    kundenId: einsatz.kundenId,
    mitarbeiterId: einsatz.mitarbeiterId,
    datum: new Date(`${uebernahme.datum}T12:00:00`),
    dauerMinuten: uebernahme.dauerMinuten,
    taetigkeiten: input.taetigkeiten?.trim() || "Besuch dokumentiert",
    beobachtungen: input.beobachtungen?.trim() || null,
    besonderheiten: input.besonderheiten?.trim() || null,
    naechsteSchritte: input.naechsteSchritte?.trim() || null,
    status: "eingereicht" as const,
    pflegegradSnapshot: String((kunde as any)?.pflegegrad ?? "nicht hinterlegt"),
    fahrtKilometer: input.fahrtKilometer === undefined ? null : String(input.fahrtKilometer),
    fahrtVonOrt: input.fahrtKilometer === undefined ? null : (input.fahrtVonOrt?.trim() || "Startpunkt nicht dokumentiert"),
    fahrtNachOrt: input.fahrtKilometer === undefined ? null : (input.fahrtNachOrt?.trim() || `Kunde: ${kunde?.vorname ?? ""} ${kunde?.nachname ?? ""}`.trim()),
  };

  const vorhandenerBericht = await db
    .select({ id: besuchsberichte.id })
    .from(besuchsberichte)
    .where(eq(besuchsberichte.einsatzId, einsatz.id))
    .limit(1);
  let berichtId: number;
  if (vorhandenerBericht.length > 0) {
    await db.update(besuchsberichte).set(besuchsberichtDaten).where(eq(besuchsberichte.id, vorhandenerBericht[0].id));
    berichtId = vorhandenerBericht[0].id;
  } else {
    const result = await db.insert(besuchsberichte).values(besuchsberichtDaten);
    berichtId = Number((result as any).insertId ?? (result as any)[0]?.insertId);
  }

  // Eine Fahrt wird ausschließlich bei erfassten Kilometern angelegt. Über die
  // einsatzId wird sie bei erneutem Speichern aktualisiert statt dupliziert.
  if (input.fahrtKilometer !== undefined) {
    const vorhandeneFahrt = await db
      .select({ id: fahrten.id })
      .from(fahrten)
      .where(eq(fahrten.einsatzId, einsatz.id))
      .limit(1);
    const fahrtDaten = {
      kundenId: einsatz.kundenId,
      datum: new Date(`${uebernahme.datum}T12:00:00`),
      vonOrt: besuchsberichtDaten.fahrtVonOrt!,
      nachOrt: besuchsberichtDaten.fahrtNachOrt!,
      kilometer: String(input.fahrtKilometer),
      typ: "normal" as const,
      zweck: `Automatisch aus Besuchsbericht: ${kunde?.vorname ?? ""} ${kunde?.nachname ?? ""}`.trim(),
      monat: uebernahme.monat,
      einsatzId: einsatz.id,
    };
    if (vorhandeneFahrt.length > 0) {
      await db.update(fahrten).set(fahrtDaten).where(eq(fahrten.id, vorhandeneFahrt[0].id));
    } else {
      const mitarbeiter = await getMitarbeiterById(einsatz.mitarbeiterId);
      await createFahrt({ ...fahrtDaten, mitarbeiterId: einsatz.mitarbeiterId, hatDienstwagen: Boolean((mitarbeiter as any)?.hatDienstwagen) } as any);
    }
  }

  const paragraphen: Array<{ paragraph: Paragraph; stunden: number }> = [];
  const stunden2 = parseFloat(String(einsatz.stunden2 ?? 0));
  const stunden1 = parseFloat(String(einsatz.stunden1 ?? Math.max(0, parseFloat(String(einsatz.dauerStunden ?? 0)) - stunden2)));
  if (["45b", "45a", "39"].includes(einsatz.paragraph) && stunden1 > 0) {
    paragraphen.push({ paragraph: einsatz.paragraph as Paragraph, stunden: stunden1 });
  }
  if (einsatz.paragraph2 && ["45b", "45a", "39"].includes(einsatz.paragraph2) && stunden2 > 0) {
    paragraphen.push({ paragraph: einsatz.paragraph2 as Paragraph, stunden: stunden2 });
  }

  const budgetDeltas: Array<{ paragraph: Paragraph; betrag: number; stunden: number }> = [];
  for (const anteil of paragraphen) {
    const existing = await db
      .select({ id: leistungen.id, stunden: leistungen.stunden, anzahlEinsaetze: leistungen.anzahlEinsaetze, betrag: leistungen.betrag })
      .from(leistungen)
      .where(and(
        eq(leistungen.mitarbeiterId, einsatz.mitarbeiterId),
        eq(leistungen.kundenId, einsatz.kundenId),
        eq(leistungen.monat, uebernahme.monat),
        eq(leistungen.paragraph, anteil.paragraph),
      ))
      .limit(1);
    if (existing.length > 0) {
      const stundenGesamt = runde2(parseFloat(String(existing[0].stunden ?? 0)) + anteil.stunden);
      const alterBetrag = parseFloat(String(existing[0].betrag ?? 0));
      const neuerBetrag = runde2(stundenGesamt * STUNDENSATZ[anteil.paragraph] + (anteil.paragraph === einsatz.paragraph ? ANFAHRT_PAUSCHALE : 0));
      // Der frühere Defekt: Beim Zusammenfassen blieb der Betrag des ersten
      // Einsatzes stehen. Er wird stets aus allen Gesamtstunden neu berechnet.
      await db.update(leistungen).set({
        stunden: String(stundenGesamt),
        anzahlEinsaetze: (existing[0].anzahlEinsaetze ?? 1) + 1,
        betrag: String(neuerBetrag),
      }).where(eq(leistungen.id, existing[0].id));
      budgetDeltas.push({ paragraph: anteil.paragraph, stunden: anteil.stunden, betrag: runde2(neuerBetrag - alterBetrag) });
    } else {
      const betrag = runde2(anteil.stunden * STUNDENSATZ[anteil.paragraph] + (anteil.paragraph === einsatz.paragraph ? ANFAHRT_PAUSCHALE : 0));
      await db.insert(leistungen).values({
        mitarbeiterId: einsatz.mitarbeiterId,
        kundenId: einsatz.kundenId,
        monat: uebernahme.monat,
        paragraph: anteil.paragraph,
        stunden: String(anteil.stunden),
        anzahlEinsaetze: 1,
        betrag: String(betrag),
        status: "offen",
      });
      budgetDeltas.push({ paragraph: anteil.paragraph, stunden: anteil.stunden, betrag });
    }
  }

  // Budget und Leistungsnachweis verwenden dieselbe Delta-Berechnung. Die
  // 6-€-Anfahrt wird auf der primären Paragraphenposition einmal je Nachweis
  // berücksichtigt und beim späteren Zusammenfassen nicht doppelt abgezogen.
  for (const delta of budgetDeltas) {
    if (delta.betrag > 0) {
      await adjustKundeVerbraucht(einsatz.kundenId, delta.paragraph, delta.betrag, {
        mitarbeiterId: einsatz.mitarbeiterId,
        stunden: delta.stunden,
        monat: uebernahme.monat,
        beschreibung: `Einsatzabschluss ${uebernahme.datum} – ${delta.stunden}h §${delta.paragraph}`,
      });
    }
  }

  return { berichtId, einsatzId: einsatz.id };
}
