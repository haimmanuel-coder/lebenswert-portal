import { and, eq } from "drizzle-orm";
import { budgetTransaktionen, besuchsberichte, einsaetze, fahrten, kunden, leistungen, mitarbeiter } from "../drizzle/schema";
import { ANFAHRT_PAUSCHALE, STUNDENSATZ } from "../shared/leistungssaetze";
import { bereiteEinsatzUebernahmeVor } from "./mitarbeiterAblauf";
import { getDb } from "./db";

type Paragraph = "45b" | "45a" | "39";
type Transaktion = any;

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

export type EinsatzabschlussUpdate = Record<string, unknown>;

function runde2(wert: number): number {
  return Math.round((wert + Number.EPSILON) * 100) / 100;
}

function zahl(wert: unknown): number {
  const nummer = Number.parseFloat(String(wert ?? 0));
  return Number.isFinite(nummer) ? nummer : 0;
}

function budgetfeld(paragraph: Paragraph): "verbraucht45b" | "verbraucht45a" | "verbraucht39" {
  return paragraph === "45b" ? "verbraucht45b" : paragraph === "45a" ? "verbraucht45a" : "verbraucht39";
}

/**
 * Der Einsatz und alle Folgeobjekte werden als unteilbarer Ablauf gespeichert.
 * Schlägt eine Folgeoperation fehl, wird die gesamte Transaktion zurückgesetzt:
 * Der Einsatz bleibt geplant und kann anschließend sicher erneut abgeschlossen
 * werden.
 */
export async function schliesseEinsatzMitFolgenAtomar(input: {
  einsatzId: number;
  mitarbeiterId: number;
  einsatzUpdate: EinsatzabschlussUpdate;
  folgen: Omit<EinsatzabschlussFolgenInput, "einsatzId">;
}) {
  const db = await getDb();
  if (!db) throw new Error("Datenbank nicht verfügbar.");

  return db.transaction(async (tx: Transaktion) => {
    const vorAbschluss = await tx.select().from(einsaetze).where(eq(einsaetze.id, input.einsatzId)).limit(1);
    const einsatz = vorAbschluss[0];
    if (!einsatz) throw new Error("Einsatz nicht gefunden.");
    if (einsatz.mitarbeiterId !== input.mitarbeiterId) throw new Error("Einsatz gehört nicht zum angemeldeten Mitarbeiter.");
    if (einsatz.status === "abgeschlossen") throw new Error("Einsatz ist bereits abgeschlossen.");

    await tx.update(einsaetze).set({
      ...input.einsatzUpdate,
      status: "abgeschlossen",
      budgetGebucht: true,
    } as any).where(and(eq(einsaetze.id, input.einsatzId), eq(einsaetze.mitarbeiterId, input.mitarbeiterId)));

    return fuehreFolgenInTransaktionAus(tx, {
      einsatzId: input.einsatzId,
      ...input.folgen,
    }, Boolean(einsatz.budgetGebucht));
  });
}

async function fuehreFolgenInTransaktionAus(
  db: Transaktion,
  input: EinsatzabschlussFolgenInput,
  budgetWarBereitsGebucht: boolean,
) {
  const einsatzRows = await db.select().from(einsaetze).where(eq(einsaetze.id, input.einsatzId)).limit(1);
  const einsatz = einsatzRows[0];
  if (!einsatz || einsatz.status !== "abgeschlossen") throw new Error("Folgen dürfen nur für abgeschlossene Einsätze erstellt werden.");

  const uebernahme = bereiteEinsatzUebernahmeVor({
    einsatzDatum: einsatz.datum,
    tatsaechlicherStart: input.tatsaechlicherStart,
    tatsaechlichesEnde: input.tatsaechlichesEnde,
    geplanteStunden: zahl(einsatz.dauerStunden),
  });
  const kundenRows = await db.select().from(kunden).where(eq(kunden.id, einsatz.kundenId)).limit(1);
  const kunde = kundenRows[0];
  if (!kunde) throw new Error("Kunde nicht gefunden.");

  const berichtDaten = {
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
    pflegegradSnapshot: String((kunde as any).pflegegrad ?? "nicht hinterlegt"),
    fahrtKilometer: input.fahrtKilometer === undefined ? null : String(input.fahrtKilometer),
    fahrtVonOrt: input.fahrtKilometer === undefined ? null : (input.fahrtVonOrt?.trim() || "Startpunkt nicht dokumentiert"),
    fahrtNachOrt: input.fahrtKilometer === undefined ? null : (input.fahrtNachOrt?.trim() || `Kunde: ${kunde.vorname ?? ""} ${kunde.nachname ?? ""}`.trim()),
  };
  const vorhandenerBericht = await db.select({ id: besuchsberichte.id }).from(besuchsberichte).where(eq(besuchsberichte.einsatzId, einsatz.id)).limit(1);
  let berichtId: number;
  if (vorhandenerBericht.length > 0) {
    berichtId = vorhandenerBericht[0].id;
    await db.update(besuchsberichte).set(berichtDaten).where(eq(besuchsberichte.id, berichtId));
  } else {
    const result = await db.insert(besuchsberichte).values(berichtDaten);
    berichtId = Number((result as any).insertId ?? (result as any)[0]?.insertId);
  }

  if (input.fahrtKilometer !== undefined) {
    const vorhandeneFahrt = await db.select({ id: fahrten.id }).from(fahrten).where(eq(fahrten.einsatzId, einsatz.id)).limit(1);
    const maRows = await db.select({ hatDienstwagen: mitarbeiter.hatDienstwagen }).from(mitarbeiter).where(eq(mitarbeiter.id, einsatz.mitarbeiterId)).limit(1);
    const verguetung = maRows[0]?.hatDienstwagen ? "0.00" : runde2(input.fahrtKilometer * 0.3).toFixed(2);
    const fahrtDaten = {
      kundenId: einsatz.kundenId,
      datum: new Date(`${uebernahme.datum}T12:00:00`),
      vonOrt: berichtDaten.fahrtVonOrt!,
      nachOrt: berichtDaten.fahrtNachOrt!,
      kilometer: String(input.fahrtKilometer),
      typ: "normal" as const,
      zweck: `Automatisch aus Besuchsbericht: ${kunde.vorname ?? ""} ${kunde.nachname ?? ""}`.trim(),
      verguetung,
      abrechnungsStatus: "offen" as const,
      monat: uebernahme.monat,
      einsatzId: einsatz.id,
    };
    if (vorhandeneFahrt.length > 0) await db.update(fahrten).set(fahrtDaten).where(eq(fahrten.id, vorhandeneFahrt[0].id));
    else await db.insert(fahrten).values({ ...fahrtDaten, mitarbeiterId: einsatz.mitarbeiterId });
  }

  const paragraphen: Array<{ paragraph: Paragraph; stunden: number }> = [];
  const stunden2 = zahl(einsatz.stunden2);
  const stunden1 = zahl(einsatz.stunden1 ?? Math.max(0, zahl(einsatz.dauerStunden) - stunden2));
  if (["45b", "45a", "39"].includes(einsatz.paragraph) && stunden1 > 0) paragraphen.push({ paragraph: einsatz.paragraph as Paragraph, stunden: stunden1 });
  if (einsatz.paragraph2 && ["45b", "45a", "39"].includes(einsatz.paragraph2) && stunden2 > 0) paragraphen.push({ paragraph: einsatz.paragraph2 as Paragraph, stunden: stunden2 });

  const budgetStand: Record<ReturnType<typeof budgetfeld>, number> = {
    verbraucht45b: zahl((kunde as any).verbraucht45b),
    verbraucht45a: zahl((kunde as any).verbraucht45a),
    verbraucht39: zahl((kunde as any).verbraucht39),
  };
  for (const anteil of paragraphen) {
    const existing = await db.select({ id: leistungen.id, stunden: leistungen.stunden, anzahlEinsaetze: leistungen.anzahlEinsaetze, betrag: leistungen.betrag })
      .from(leistungen)
      .where(and(eq(leistungen.mitarbeiterId, einsatz.mitarbeiterId), eq(leistungen.kundenId, einsatz.kundenId), eq(leistungen.monat, uebernahme.monat), eq(leistungen.paragraph, anteil.paragraph)))
      .limit(1);
    const alterBetrag = zahl(existing[0]?.betrag);
    const stundenGesamt = runde2(zahl(existing[0]?.stunden) + anteil.stunden);
    const neuerBetrag = runde2(stundenGesamt * STUNDENSATZ[anteil.paragraph] + (anteil.paragraph === einsatz.paragraph ? ANFAHRT_PAUSCHALE : 0));
    let leistungId: number;
    if (existing.length > 0) {
      leistungId = existing[0].id;
      await db.update(leistungen).set({ stunden: String(stundenGesamt), anzahlEinsaetze: (existing[0].anzahlEinsaetze ?? 1) + 1, betrag: String(neuerBetrag) }).where(eq(leistungen.id, leistungId));
    } else {
      const result = await db.insert(leistungen).values({ mitarbeiterId: einsatz.mitarbeiterId, kundenId: einsatz.kundenId, monat: uebernahme.monat, paragraph: anteil.paragraph, stunden: String(anteil.stunden), anzahlEinsaetze: 1, betrag: String(neuerBetrag), status: "offen" });
      leistungId = Number((result as any).insertId ?? (result as any)[0]?.insertId);
    }

    const delta = runde2(neuerBetrag - alterBetrag);
    if (!budgetWarBereitsGebucht && delta > 0) {
      const feld = budgetfeld(anteil.paragraph);
      budgetStand[feld] = runde2(Math.max(0, budgetStand[feld] + delta));
      await db.update(kunden).set({ [feld]: String(budgetStand[feld]) } as any).where(eq(kunden.id, einsatz.kundenId));
      await db.insert(budgetTransaktionen).values({
        kundenId: einsatz.kundenId,
        leistungId,
        mitarbeiterId: einsatz.mitarbeiterId,
        typ: "abbuchung",
        paragraph: anteil.paragraph,
        betrag: String(delta),
        stunden: String(anteil.stunden),
        monat: uebernahme.monat,
        beschreibung: `Einsatzabschluss ${uebernahme.datum} – ${anteil.stunden}h §${anteil.paragraph}`,
      });
    }
  }
  return { berichtId, einsatzId: einsatz.id };
}
