/**
 * ════════════════════════════════════════════════════════════════════════════
 *  DATENZUGRIFF FÜR DIE EINSATZPLANUNG
 * ════════════════════════════════════════════════════════════════════════════
 *
 * Kapselt alle Datenbankzugriffe der Einsatzplanung. Die fachlichen
 * Berechnungen liegen ausschließlich in shared/planungsLogik.ts, damit
 * Frontend-Vorschau und Server-Prüfung garantiert dasselbe Ergebnis liefern.
 *
 * Grundsätze:
 *   • Gelöschte Datensätze (geloeschtAt IS NOT NULL) werden nie geliefert.
 *   • Budgetbuchungen laufen über Transaktionen, damit Budget und
 *     Buchungshistorie nicht auseinanderlaufen können.
 *   • Alle Schreibvorgänge sind idempotent gegenüber fehlender Datenbank
 *     (getDb() === null → definierter Fehler statt Absturz).
 */

import { and, eq, gte, isNull, lte, sql, desc, inArray } from "drizzle-orm";
import { getDb } from "./db";
import {
  einsaetze,
  kunden,
  mitarbeiter,
  urlaubsantraege,
  krankmeldungen,
  touren,
  tourEinsaetze,
  paragraphSaetze,
  planungsWarnungen,
  budgetTransaktionen,
  leistungen,
  fahrten,
  mitarbeiterDokumente,
} from "../drizzle/schema";
import type { Paragraph } from "@shared/planungsLogik";
import {
  ANFAHRT_PAUSCHALE,
  LOHN_PRO_STUNDE,
  PARAGRAPH_SAETZE,
  berechneStunden,
  monatsSchluessel,
  runde2,
  zuDatumsString,
  zuDatumsWert,
  zuZahl,
} from "@shared/planungsLogik";

/** Wirft einen sprechenden Fehler, wenn keine Datenbank erreichbar ist. */
async function db() {
  const verbindung = await getDb();
  if (!verbindung) throw new Error("Datenbank ist derzeit nicht erreichbar.");
  return verbindung;
}

// ── Verrechnungssätze ───────────────────────────────────────────────────────

export type SatzKonfiguration = {
  saetze: Record<Paragraph, number>;
  lohnProStunde: number;
  anfahrtPauschale: number;
};

/**
 * Lädt die aktuell gültigen Verrechnungssätze.
 * Fällt auf die Standardwerte aus shared/planungsLogik.ts zurück, solange
 * keine betriebsindividuellen Sätze gepflegt sind.
 */
export async function getSatzKonfiguration(): Promise<SatzKonfiguration> {
  const standard: SatzKonfiguration = {
    saetze: { ...PARAGRAPH_SAETZE },
    lohnProStunde: LOHN_PRO_STUNDE,
    anfahrtPauschale: ANFAHRT_PAUSCHALE,
  };
  const verbindung = await getDb();
  if (!verbindung) return standard;
  try {
    const heute = zuDatumsString(new Date());
    const zeilen = await verbindung
      .select()
      .from(paragraphSaetze)
      .where(and(eq(paragraphSaetze.aktiv, true), sql`${paragraphSaetze.gueltigAb} <= ${heute}`))
      .orderBy(desc(paragraphSaetze.gueltigAb));

    // Pro Paragraph gilt der jüngste Eintrag – die Sortierung liefert ihn zuerst.
    const gesehen = new Set<string>();
    for (const zeile of zeilen) {
      if (gesehen.has(zeile.paragraph)) continue;
      gesehen.add(zeile.paragraph);
      const satz = zuZahl(zeile.satzProStunde);
      if (satz > 0) standard.saetze[zeile.paragraph as Paragraph] = satz;
      const lohn = zuZahl(zeile.lohnProStunde);
      if (lohn > 0) standard.lohnProStunde = lohn;
      const fahrt = zuZahl(zeile.anfahrtPauschale);
      if (fahrt >= 0) standard.anfahrtPauschale = fahrt;
    }
    return standard;
  } catch (fehler) {
    // Fehlt die Tabelle (Migration noch nicht eingespielt), gelten die Standardwerte.
    console.warn("[Planung] Verrechnungssätze nicht lesbar, nutze Standardwerte:", fehler);
    return standard;
  }
}

/** Speichert einen neuen Verrechnungssatz (Admin). */
export async function setzeParagraphSatz(args: {
  paragraph: Paragraph;
  satzProStunde: number;
  lohnProStunde: number;
  anfahrtPauschale: number;
  geaendertVon: number;
}) {
  const verbindung = await db();
  // Bisherige Sätze dieses Paragraphen deaktivieren, damit immer genau ein
  // gültiger Satz existiert.
  await verbindung
    .update(paragraphSaetze)
    .set({ aktiv: false })
    .where(eq(paragraphSaetze.paragraph, args.paragraph));
  await verbindung.insert(paragraphSaetze).values({
    paragraph: args.paragraph,
    satzProStunde: String(runde2(args.satzProStunde)),
    lohnProStunde: String(runde2(args.lohnProStunde)),
    anfahrtPauschale: String(runde2(args.anfahrtPauschale)),
    gueltigAb: new Date(),
    aktiv: true,
    geaendertVon: args.geaendertVon,
  });
}

// ── Einsätze laden ──────────────────────────────────────────────────────────

export type PlanungsEinsatz = {
  id: number;
  mitarbeiterId: number;
  mitarbeiterName: string;
  kundenId: number;
  kundenName: string;
  kundenAdresse: string | null;
  kundenTelefon: string | null;
  kundenHinweise: string | null;
  datum: string;
  startzeit: string | null;
  endzeit: string | null;
  stunden: number;
  paragraph: Paragraph;
  paragraph2: Paragraph | null;
  stunden1: number;
  stunden2: number;
  kosten1: number;
  kosten2: number;
  kostenGesamt: number;
  lohnkosten: number;
  anfahrtPauschale: number;
  status: string;
  notizen: string | null;
  bemerkung: string | null;
};

/** Wandelt eine Datenbankzeile in einen Planungseintrag. */
function zuPlanungsEinsatz(zeile: Record<string, any>): PlanungsEinsatz {
  const stunden1 = zuZahl(zeile.stunden1 ?? zeile.dauerStunden);
  const stunden2 = zuZahl(zeile.stunden2);
  const kosten1 = zuZahl(zeile.kosten1);
  const kosten2 = zuZahl(zeile.kosten2);
  const adresseTeile = [zeile.kundeStrasse, [zeile.kundePlz, zeile.kundeOrt].filter(Boolean).join(" ")]
    .filter((t) => t && String(t).trim().length > 0)
    .join(", ");
  return {
    id: Number(zeile.id),
    mitarbeiterId: Number(zeile.mitarbeiterId),
    mitarbeiterName: `${zeile.mitarbeiterVorname ?? ""} ${zeile.mitarbeiterNachname ?? ""}`.trim(),
    kundenId: Number(zeile.kundenId),
    kundenName: `${zeile.kundeVorname ?? ""} ${zeile.kundeNachname ?? ""}`.trim(),
    kundenAdresse: adresseTeile || null,
    kundenTelefon: zeile.kundeTelefon ?? zeile.kundeMobil ?? null,
    kundenHinweise: zeile.bemerkung ?? null,
    datum: zuDatumsString(zeile.datum),
    startzeit: zeile.startzeit ? String(zeile.startzeit).slice(0, 5) : null,
    endzeit: zeile.endzeit ? String(zeile.endzeit).slice(0, 5) : null,
    stunden: runde2(stunden1 + stunden2),
    paragraph: (zeile.paragraph ?? "45b") as Paragraph,
    paragraph2: (zeile.paragraph2 ?? null) as Paragraph | null,
    stunden1,
    stunden2,
    kosten1,
    kosten2,
    kostenGesamt: runde2(kosten1 + kosten2),
    lohnkosten: zuZahl(zeile.lohnkosten),
    anfahrtPauschale: zuZahl(zeile.anfahrtPauschale),
    status: String(zeile.status ?? "geplant"),
    notizen: zeile.notizen ?? null,
    bemerkung: zeile.bemerkung ?? null,
  };
}

/**
 * Lädt alle Einsätze eines Zeitraums inklusive Mitarbeiter- und Kundendaten.
 * `nurMitarbeiterId` schränkt auf einen Mitarbeiter ein (Rolle "mitarbeiter").
 */
export async function getEinsaetzeImZeitraum(args: {
  von: string;
  bis: string;
  nurMitarbeiterId?: number | null;
}): Promise<PlanungsEinsatz[]> {
  const verbindung = await getDb();
  if (!verbindung) return [];
  const bedingungen = [
    gte(einsaetze.datum, zuDatumsWert(args.von)),
    lte(einsaetze.datum, zuDatumsWert(args.bis)),
    isNull(einsaetze.geloeschtAt),
  ];
  if (args.nurMitarbeiterId) {
    bedingungen.push(eq(einsaetze.mitarbeiterId, args.nurMitarbeiterId));
  }

  const zeilen = await verbindung
    .select({
      id: einsaetze.id,
      mitarbeiterId: einsaetze.mitarbeiterId,
      kundenId: einsaetze.kundenId,
      datum: einsaetze.datum,
      startzeit: einsaetze.startzeit,
      endzeit: einsaetze.endzeit,
      dauerStunden: einsaetze.dauerStunden,
      stunden1: einsaetze.stunden1,
      stunden2: einsaetze.stunden2,
      kosten1: einsaetze.kosten1,
      kosten2: einsaetze.kosten2,
      lohnkosten: einsaetze.lohnkosten,
      anfahrtPauschale: einsaetze.anfahrtPauschale,
      paragraph: einsaetze.paragraph,
      paragraph2: einsaetze.paragraph2,
      status: einsaetze.status,
      notizen: einsaetze.notizen,
      bemerkung: einsaetze.bemerkung,
      mitarbeiterVorname: mitarbeiter.vorname,
      mitarbeiterNachname: mitarbeiter.nachname,
      kundeVorname: kunden.vorname,
      kundeNachname: kunden.nachname,
      kundeStrasse: kunden.strasse,
      kundePlz: kunden.plz,
      kundeOrt: kunden.ort,
      kundeTelefon: kunden.telefon,
      kundeMobil: kunden.mobil,
    })
    .from(einsaetze)
    .leftJoin(mitarbeiter, eq(einsaetze.mitarbeiterId, mitarbeiter.id))
    .leftJoin(kunden, eq(einsaetze.kundenId, kunden.id))
    .where(and(...bedingungen))
    .orderBy(einsaetze.datum, einsaetze.startzeit);

  return zeilen.map(zuPlanungsEinsatz);
}

/** Lädt einen einzelnen Einsatz (ohne gelöschte). */
export async function getEinsatzById(id: number) {
  const verbindung = await getDb();
  if (!verbindung) return null;
  const zeilen = await verbindung
    .select()
    .from(einsaetze)
    .where(and(eq(einsaetze.id, id), isNull(einsaetze.geloeschtAt)))
    .limit(1);
  return zeilen[0] ?? null;
}

// ── Abwesenheiten ───────────────────────────────────────────────────────────

export type Abwesenheit = {
  typ: "urlaub" | "krank";
  mitarbeiterId: number;
  mitarbeiterName: string;
  von: string;
  bis: string;
  status: string;
  notizen: string | null;
};

/**
 * Lädt genehmigte Urlaube und Krankmeldungen im Zeitraum.
 * Nur genehmigte Urlaube blockieren die Planung – beantragte nicht.
 */
export async function getAbwesenheitenImZeitraum(args: {
  von: string;
  bis: string;
  nurMitarbeiterId?: number | null;
}): Promise<Abwesenheit[]> {
  const verbindung = await getDb();
  if (!verbindung) return [];
  const ergebnis: Abwesenheit[] = [];

  const urlaubBedingungen = [
    eq(urlaubsantraege.status, "genehmigt" as const),
    isNull(urlaubsantraege.geloeschtAt),
    lte(urlaubsantraege.von, zuDatumsWert(args.bis)),
    gte(urlaubsantraege.bis, zuDatumsWert(args.von)),
  ];
  if (args.nurMitarbeiterId) {
    urlaubBedingungen.push(eq(urlaubsantraege.mitarbeiterId, args.nurMitarbeiterId));
  }
  const urlaube = await verbindung
    .select({
      mitarbeiterId: urlaubsantraege.mitarbeiterId,
      von: urlaubsantraege.von,
      bis: urlaubsantraege.bis,
      status: urlaubsantraege.status,
      notizen: urlaubsantraege.notizen,
      vorname: mitarbeiter.vorname,
      nachname: mitarbeiter.nachname,
    })
    .from(urlaubsantraege)
    .leftJoin(mitarbeiter, eq(urlaubsantraege.mitarbeiterId, mitarbeiter.id))
    .where(and(...urlaubBedingungen));

  for (const u of urlaube) {
    ergebnis.push({
      typ: "urlaub",
      mitarbeiterId: u.mitarbeiterId,
      mitarbeiterName: `${u.vorname ?? ""} ${u.nachname ?? ""}`.trim(),
      von: zuDatumsString(u.von),
      bis: zuDatumsString(u.bis),
      status: u.status,
      notizen: u.notizen,
    });
  }

  const krankBedingungen = [
    isNull(krankmeldungen.geloeschtAt),
    lte(krankmeldungen.von, zuDatumsWert(args.bis)),
  ];
  if (args.nurMitarbeiterId) {
    krankBedingungen.push(eq(krankmeldungen.mitarbeiterId, args.nurMitarbeiterId));
  }
  const kranke = await verbindung
    .select({
      mitarbeiterId: krankmeldungen.mitarbeiterId,
      von: krankmeldungen.von,
      bis: krankmeldungen.bis,
      notizen: krankmeldungen.notizen,
      vorname: mitarbeiter.vorname,
      nachname: mitarbeiter.nachname,
    })
    .from(krankmeldungen)
    .leftJoin(mitarbeiter, eq(krankmeldungen.mitarbeiterId, mitarbeiter.id))
    .where(and(...krankBedingungen));

  for (const k of kranke) {
    const bis = zuDatumsString(k.bis) || zuDatumsString(k.von);
    // Krankmeldungen ohne Enddatum laufen offen weiter – im Zeitraum prüfen.
    if (bis < args.von) continue;
    ergebnis.push({
      typ: "krank",
      mitarbeiterId: k.mitarbeiterId,
      mitarbeiterName: `${k.vorname ?? ""} ${k.nachname ?? ""}`.trim(),
      von: zuDatumsString(k.von),
      bis,
      status: "krank",
      notizen: k.notizen,
    });
  }

  return ergebnis;
}

/**
 * Prüft, ob ein Mitarbeiter an einem Datum abwesend ist.
 * Liefert die Abwesenheit zurück oder null.
 */
export async function getAbwesenheitAmTag(
  mitarbeiterId: number,
  datum: string,
): Promise<Abwesenheit | null> {
  const alle = await getAbwesenheitenImZeitraum({ von: datum, bis: datum, nurMitarbeiterId: mitarbeiterId });
  return alle.find((a) => a.von <= datum && a.bis >= datum) ?? null;
}

// ── Lohnkosten / Minijob ────────────────────────────────────────────────────

/**
 * Summiert die Lohnkosten eines Mitarbeiters in einem Monat ("YYYY-MM").
 *
 * Berücksichtigt alle nicht abgesagten und nicht gelöschten Einsätze.
 * `ohneEinsatzId` blendet einen Einsatz aus – nötig beim Bearbeiten, damit
 * der eigene Beitrag nicht doppelt gezählt wird.
 */
export async function getMonatsLohnkosten(args: {
  mitarbeiterId: number;
  monat: string;
  ohneEinsatzId?: number | null;
}): Promise<number> {
  const verbindung = await getDb();
  if (!verbindung) return 0;
  const von = `${args.monat}-01`;
  const bis = `${args.monat}-31`;
  const zeilen = await verbindung
    .select({
      id: einsaetze.id,
      lohnkosten: einsaetze.lohnkosten,
      dauerStunden: einsaetze.dauerStunden,
      stunden1: einsaetze.stunden1,
      stunden2: einsaetze.stunden2,
    })
    .from(einsaetze)
    .where(
      and(
        eq(einsaetze.mitarbeiterId, args.mitarbeiterId),
        gte(einsaetze.datum, zuDatumsWert(von)),
        lte(einsaetze.datum, zuDatumsWert(bis)),
        isNull(einsaetze.geloeschtAt),
        sql`${einsaetze.status} <> 'abgesagt'`,
      ),
    );

  const konfiguration = await getSatzKonfiguration();
  let summe = 0;
  for (const zeile of zeilen) {
    if (args.ohneEinsatzId && zeile.id === args.ohneEinsatzId) continue;
    const gespeichert = zuZahl(zeile.lohnkosten);
    if (gespeichert > 0) {
      summe += gespeichert;
      continue;
    }
    // Altdatensätze ohne gespeicherte Lohnkosten: aus den Stunden herleiten.
    const stunden = zuZahl(zeile.stunden1) + zuZahl(zeile.stunden2) || zuZahl(zeile.dauerStunden);
    summe += stunden * konfiguration.lohnProStunde;
  }
  return runde2(summe);
}

/** Lohnkosten aller Mitarbeiter eines Monats – für Dashboard und Warnliste. */
export async function getMonatsLohnkostenAlle(monat: string): Promise<
  Array<{ mitarbeiterId: number; name: string; beschaeftigungsart: string | null; lohnkosten: number; stunden: number }>
> {
  const verbindung = await getDb();
  if (!verbindung) return [];
  const von = `${monat}-01`;
  const bis = `${monat}-31`;
  const konfiguration = await getSatzKonfiguration();

  const alleMitarbeiter = await verbindung
    .select({
      id: mitarbeiter.id,
      vorname: mitarbeiter.vorname,
      nachname: mitarbeiter.nachname,
      beschaeftigungsart: mitarbeiter.beschaeftigungsart,
      aktiv: mitarbeiter.aktiv,
    })
    .from(mitarbeiter);

  const zeilen = await verbindung
    .select({
      mitarbeiterId: einsaetze.mitarbeiterId,
      lohnkosten: einsaetze.lohnkosten,
      dauerStunden: einsaetze.dauerStunden,
      stunden1: einsaetze.stunden1,
      stunden2: einsaetze.stunden2,
    })
    .from(einsaetze)
    .where(
      and(
        gte(einsaetze.datum, zuDatumsWert(von)),
        lte(einsaetze.datum, zuDatumsWert(bis)),
        isNull(einsaetze.geloeschtAt),
        sql`${einsaetze.status} <> 'abgesagt'`,
      ),
    );

  const summen = new Map<number, { lohn: number; stunden: number }>();
  for (const zeile of zeilen) {
    const stunden = zuZahl(zeile.stunden1) + zuZahl(zeile.stunden2) || zuZahl(zeile.dauerStunden);
    const lohn = zuZahl(zeile.lohnkosten) || stunden * konfiguration.lohnProStunde;
    const bisher = summen.get(zeile.mitarbeiterId) ?? { lohn: 0, stunden: 0 };
    summen.set(zeile.mitarbeiterId, { lohn: bisher.lohn + lohn, stunden: bisher.stunden + stunden });
  }

  return alleMitarbeiter
    .filter((m) => m.aktiv === 1)
    .map((m) => {
      const eintrag = summen.get(m.id) ?? { lohn: 0, stunden: 0 };
      return {
        mitarbeiterId: m.id,
        name: `${m.vorname} ${m.nachname}`,
        beschaeftigungsart: m.beschaeftigungsart ?? null,
        lohnkosten: runde2(eintrag.lohn),
        stunden: runde2(eintrag.stunden),
      };
    });
}

// ── Einsatz anlegen / ändern / löschen ─────────────────────────────────────

export type EinsatzSchreibDaten = {
  mitarbeiterId: number;
  kundenId: number;
  datum: string;
  startzeit: string;
  endzeit: string;
  paragraph: Paragraph;
  paragraph2?: Paragraph | null;
  /** Stundenanteil des zweiten Paragraphen */
  stunden2?: number | null;
  notizen?: string | null;
  anfahrtPauschale: number;
  /** Bereits berechnete Werte aus shared/planungsLogik.ts */
  stundenGesamt: number;
  stunden1: number;
  kosten1: number;
  kosten2: number;
  lohnkosten: number;
};

/** Legt einen geplanten Einsatz an und gibt die neue ID zurück. */
export async function erstellePlanungsEinsatz(
  daten: EinsatzSchreibDaten,
  geplantVon: number,
): Promise<number> {
  const verbindung = await db();
  const ergebnis = await verbindung.insert(einsaetze).values({
    mitarbeiterId: daten.mitarbeiterId,
    kundenId: daten.kundenId,
    datum: zuDatumsWert(daten.datum),
    startzeit: daten.startzeit,
    endzeit: daten.endzeit,
    dauerStunden: String(daten.stundenGesamt),
    stunden1: String(daten.stunden1),
    stunden2: daten.stunden2 ? String(daten.stunden2) : null,
    paragraph: daten.paragraph,
    paragraph2: daten.paragraph2 ?? null,
    kosten1: String(daten.kosten1),
    kosten2: daten.kosten2 ? String(daten.kosten2) : null,
    lohnkosten: String(daten.lohnkosten),
    anfahrtPauschale: String(daten.anfahrtPauschale),
    notizen: daten.notizen ?? null,
    geplantVon,
    status: "geplant",
    // Die Planung reserviert das Budget sofort; der spätere Abschluss darf
    // deshalb kein zweites Mal abbuchen.
    budgetGebucht: true,
  });
  return Number((ergebnis as any)[0].insertId);
}

/** Aktualisiert einen geplanten Einsatz. */
export async function aktualisierePlanungsEinsatz(
  id: number,
  daten: EinsatzSchreibDaten,
): Promise<void> {
  const verbindung = await db();
  await verbindung
    .update(einsaetze)
    .set({
      mitarbeiterId: daten.mitarbeiterId,
      kundenId: daten.kundenId,
      datum: zuDatumsWert(daten.datum),
      startzeit: daten.startzeit,
      endzeit: daten.endzeit,
      dauerStunden: String(daten.stundenGesamt),
      stunden1: String(daten.stunden1),
      stunden2: daten.stunden2 ? String(daten.stunden2) : null,
      paragraph: daten.paragraph,
      paragraph2: daten.paragraph2 ?? null,
      kosten1: String(daten.kosten1),
      kosten2: daten.kosten2 ? String(daten.kosten2) : null,
      lohnkosten: String(daten.lohnkosten),
      anfahrtPauschale: String(daten.anfahrtPauschale),
      notizen: daten.notizen ?? null,
      // Budget wird beim Aktualisieren storniert und neu gebucht.
      budgetGebucht: true,
    })
    .where(and(eq(einsaetze.id, id), isNull(einsaetze.geloeschtAt)));
}

/** Ändert nur den Status eines geplanten Einsatzes. */
export async function setzeEinsatzStatus(id: number, status: string): Promise<void> {
  const verbindung = await db();
  await verbindung
    .update(einsaetze)
    .set({ status: status as any })
    .where(and(eq(einsaetze.id, id), isNull(einsaetze.geloeschtAt)));
}

/** Löscht einen Einsatz per Soft-Delete (bleibt für Audit erhalten). */
export async function loeschePlanungsEinsatz(args: {
  id: number;
  geloeschtVon: number;
  loeschgrund?: string | null;
}): Promise<void> {
  const verbindung = await db();
  await verbindung
    .update(einsaetze)
    .set({
      geloeschtAt: new Date(),
      geloeschtVon: args.geloeschtVon,
      loeschgrund: args.loeschgrund ?? null,
    })
    .where(eq(einsaetze.id, args.id));
  // Zugehörige Tourenpunkte mit entfernen, damit keine Leereinträge bleiben.
  await verbindung.delete(tourEinsaetze).where(eq(tourEinsaetze.einsatzId, args.id));
}

// ── Budgetbuchung ───────────────────────────────────────────────────────────

const VERBRAUCHT_SPALTE: Record<Paragraph, "verbraucht45b" | "verbraucht45a" | "verbraucht39"> = {
  "45b": "verbraucht45b",
  "45a": "verbraucht45a",
  "39": "verbraucht39",
};

/**
 * Bucht einen Betrag auf das Kundenbudget eines Paragraphen und schreibt die
 * Bewegung in die Budgethistorie.
 *
 * `betrag` > 0 bucht ab (Verbrauch steigt), `betrag` < 0 erstattet zurück.
 * Beides läuft in einer Transaktion, damit Budget und Historie konsistent
 * bleiben.
 */
export async function bucheBudget(args: {
  kundenId: number;
  paragraph: Paragraph;
  betrag: number;
  stunden: number;
  mitarbeiterId: number | null;
  einsatzId?: number | null;
  beschreibung: string;
}): Promise<void> {
  if (Math.abs(args.betrag) < 0.005) return;
  const verbindung = await db();
  const spalte = VERBRAUCHT_SPALTE[args.paragraph];

  await verbindung.transaction(async (tx) => {
    const zeilen = await tx.select().from(kunden).where(eq(kunden.id, args.kundenId)).limit(1);
    const kunde = zeilen[0];
    if (!kunde) throw new Error(`Kunde ${args.kundenId} nicht gefunden.`);

    const bisher = zuZahl((kunde as Record<string, unknown>)[spalte] as string);
    // Verbrauch darf nie unter null fallen (z. B. bei Mehrfach-Stornos).
    const neu = runde2(Math.max(0, bisher + args.betrag));
    await tx
      .update(kunden)
      .set({ [spalte]: String(neu) } as Record<string, string>)
      .where(eq(kunden.id, args.kundenId));

    await tx.insert(budgetTransaktionen).values({
      kundenId: args.kundenId,
      mitarbeiterId: args.mitarbeiterId ?? null,
      typ: args.betrag >= 0 ? "abbuchung" : "rueckerstattung",
      paragraph: args.paragraph,
      betrag: String(runde2(Math.abs(args.betrag))),
      stunden: String(runde2(Math.abs(args.stunden))),
      monat: monatsSchluessel(new Date()),
      beschreibung: args.beschreibung.slice(0, 500),
    });
  });
}

/** Bucht alle Budgetanteile eines Einsatzes zurück (bei Löschung/Absage). */
export async function storniereEinsatzBudget(einsatzId: number, mitarbeiterId: number | null): Promise<void> {
  const einsatz = await getEinsatzById(einsatzId);
  if (!einsatz) return;
  // Nur zurückbuchen, was tatsächlich gebucht wurde.
  if (!einsatz.budgetGebucht) return;
  const kosten1 = zuZahl(einsatz.kosten1);
  const kosten2 = zuZahl(einsatz.kosten2);
  if (kosten1 > 0) {
    await bucheBudget({
      kundenId: einsatz.kundenId,
      paragraph: einsatz.paragraph as Paragraph,
      betrag: -kosten1,
      stunden: zuZahl(einsatz.stunden1),
      mitarbeiterId,
      einsatzId,
      beschreibung: `Stornierung Einsatz #${einsatzId}`,
    });
  }
  if (kosten2 > 0 && einsatz.paragraph2) {
    await bucheBudget({
      kundenId: einsatz.kundenId,
      paragraph: einsatz.paragraph2 as Paragraph,
      betrag: -kosten2,
      stunden: zuZahl(einsatz.stunden2),
      mitarbeiterId,
      einsatzId,
      beschreibung: `Stornierung Einsatz #${einsatzId} (2. Paragraph)`,
    });
  }
  // Buchungsvermerk aufheben, damit eine spätere Buchung wieder möglich ist.
  const verbindung = await db();
  await verbindung.update(einsaetze).set({ budgetGebucht: false }).where(eq(einsaetze.id, einsatzId));
}

// ── Planungswarnungen ───────────────────────────────────────────────────────

/**
 * Legt eine Planungswarnung an – aber nur, wenn dieselbe Warnung nicht
 * bereits offen ist. So entstehen keine redundanten Datensätze.
 */
export async function meldeWarnung(args: {
  code: string;
  schwere: "blockierend" | "warnung" | "hinweis";
  titel: string;
  nachricht: string;
  mitarbeiterId?: number | null;
  kundenId?: number | null;
  einsatzId?: number | null;
  monat?: string | null;
}): Promise<void> {
  const verbindung = await getDb();
  if (!verbindung) return;
  try {
    const bedingungen = [
      eq(planungsWarnungen.code, args.code),
      isNull(planungsWarnungen.geloeschtAt),
      isNull(planungsWarnungen.bestaetigtAt),
    ];
    if (args.mitarbeiterId) bedingungen.push(eq(planungsWarnungen.mitarbeiterId, args.mitarbeiterId));
    if (args.monat) bedingungen.push(eq(planungsWarnungen.monat, args.monat));
    if (args.kundenId) bedingungen.push(eq(planungsWarnungen.kundenId, args.kundenId));

    const vorhanden = await verbindung
      .select({ id: planungsWarnungen.id })
      .from(planungsWarnungen)
      .where(and(...bedingungen))
      .limit(1);
    if (vorhanden.length > 0) {
      // Nachricht auffrischen, damit stets der aktuelle Betrag angezeigt wird.
      await verbindung
        .update(planungsWarnungen)
        .set({ nachricht: args.nachricht, einsatzId: args.einsatzId ?? null })
        .where(eq(planungsWarnungen.id, vorhanden[0].id));
      return;
    }

    await verbindung.insert(planungsWarnungen).values({
      code: args.code,
      schwere: args.schwere,
      titel: args.titel.slice(0, 200),
      nachricht: args.nachricht,
      mitarbeiterId: args.mitarbeiterId ?? null,
      kundenId: args.kundenId ?? null,
      einsatzId: args.einsatzId ?? null,
      monat: args.monat ?? null,
    });
  } catch (fehler) {
    console.warn("[Planung] Warnung konnte nicht gespeichert werden:", fehler);
  }
}

/** Lädt Planungswarnungen (standardmäßig nur offene, nicht gelöschte). */
export async function getWarnungen(args?: {
  nurOffene?: boolean;
  mitarbeiterId?: number | null;
  limit?: number;
}) {
  const verbindung = await getDb();
  if (!verbindung) return [];
  try {
    const bedingungen = [isNull(planungsWarnungen.geloeschtAt)];
    if (args?.nurOffene) bedingungen.push(isNull(planungsWarnungen.bestaetigtAt));
    if (args?.mitarbeiterId) bedingungen.push(eq(planungsWarnungen.mitarbeiterId, args.mitarbeiterId));

    const zeilen = await verbindung
      .select({
        id: planungsWarnungen.id,
        code: planungsWarnungen.code,
        schwere: planungsWarnungen.schwere,
        titel: planungsWarnungen.titel,
        nachricht: planungsWarnungen.nachricht,
        mitarbeiterId: planungsWarnungen.mitarbeiterId,
        kundenId: planungsWarnungen.kundenId,
        einsatzId: planungsWarnungen.einsatzId,
        monat: planungsWarnungen.monat,
        bestaetigtAt: planungsWarnungen.bestaetigtAt,
        bestaetigtVon: planungsWarnungen.bestaetigtVon,
        createdAt: planungsWarnungen.createdAt,
        mitarbeiterVorname: mitarbeiter.vorname,
        mitarbeiterNachname: mitarbeiter.nachname,
      })
      .from(planungsWarnungen)
      .leftJoin(mitarbeiter, eq(planungsWarnungen.mitarbeiterId, mitarbeiter.id))
      .where(and(...bedingungen))
      .orderBy(desc(planungsWarnungen.createdAt))
      .limit(args?.limit ?? 100);
    return zeilen;
  } catch (fehler) {
    console.warn("[Planung] Warnungen nicht lesbar:", fehler);
    return [];
  }
}

/** Bestätigt eine Warnung (Teamleitung/Admin). */
export async function bestaetigeWarnung(id: number, bestaetigtVon: number): Promise<void> {
  const verbindung = await db();
  await verbindung
    .update(planungsWarnungen)
    .set({ bestaetigtAt: new Date(), bestaetigtVon })
    .where(eq(planungsWarnungen.id, id));
}

/** Löscht eine Warnung endgültig aus dem Arbeitsbereich (Soft-Delete). */
export async function loescheWarnung(id: number, geloeschtVon: number): Promise<void> {
  const verbindung = await db();
  await verbindung
    .update(planungsWarnungen)
    .set({ geloeschtAt: new Date(), geloeschtVon })
    .where(eq(planungsWarnungen.id, id));
}

/** Löscht alle bereits bestätigten Warnungen auf einmal. */
export async function loescheBestaetigteWarnungen(geloeschtVon: number): Promise<number> {
  const verbindung = await db();
  const offene = await verbindung
    .select({ id: planungsWarnungen.id })
    .from(planungsWarnungen)
    .where(and(isNull(planungsWarnungen.geloeschtAt), sql`${planungsWarnungen.bestaetigtAt} IS NOT NULL`));
  if (offene.length === 0) return 0;
  await verbindung
    .update(planungsWarnungen)
    .set({ geloeschtAt: new Date(), geloeschtVon })
    .where(
      inArray(
        planungsWarnungen.id,
        offene.map((o) => o.id),
      ),
    );
  return offene.length;
}

// ── Touren ──────────────────────────────────────────────────────────────────

/** Lädt Touren eines Zeitraums inklusive der zugeordneten Einsätze. */
export async function getTourenImZeitraum(args: {
  von: string;
  bis: string;
  nurMitarbeiterId?: number | null;
}) {
  const verbindung = await getDb();
  if (!verbindung) return [];
  const bedingungen = [
    gte(touren.datum, zuDatumsWert(args.von)),
    lte(touren.datum, zuDatumsWert(args.bis)),
    isNull(touren.geloeschtAt),
  ];
  if (args.nurMitarbeiterId) bedingungen.push(eq(touren.mitarbeiterId, args.nurMitarbeiterId));

  const tourZeilen = await verbindung
    .select({
      id: touren.id,
      mitarbeiterId: touren.mitarbeiterId,
      datum: touren.datum,
      status: touren.status,
      titel: touren.titel,
      startzeit: touren.startzeit,
      endzeit: touren.endzeit,
      notizen: touren.notizen,
      vorname: mitarbeiter.vorname,
      nachname: mitarbeiter.nachname,
    })
    .from(touren)
    .leftJoin(mitarbeiter, eq(touren.mitarbeiterId, mitarbeiter.id))
    .where(and(...bedingungen))
    .orderBy(touren.datum);

  if (tourZeilen.length === 0) return [];

  const punkte = await verbindung
    .select({
      id: tourEinsaetze.id,
      tourId: tourEinsaetze.tourId,
      einsatzId: tourEinsaetze.einsatzId,
      reihenfolge: tourEinsaetze.reihenfolge,
    })
    .from(tourEinsaetze)
    .where(
      inArray(
        tourEinsaetze.tourId,
        tourZeilen.map((t) => t.id),
      ),
    )
    .orderBy(tourEinsaetze.reihenfolge);

  return tourZeilen.map((tour) => ({
    ...tour,
    datum: zuDatumsString(tour.datum),
    mitarbeiterName: `${tour.vorname ?? ""} ${tour.nachname ?? ""}`.trim(),
    punkte: punkte.filter((p) => p.tourId === tour.id),
  }));
}

/**
 * Speichert die vom Mitarbeiter festgelegte Reihenfolge einer Tour.
 * Die Reihenfolge wird protokolliert (wer, wann) – Audit-Anforderung.
 */
export async function speichereTourReihenfolge(args: {
  tourId: number;
  einsatzIds: number[];
  geaendertVon: number;
}): Promise<void> {
  const verbindung = await db();
  await verbindung.transaction(async (tx) => {
    await tx.delete(tourEinsaetze).where(eq(tourEinsaetze.tourId, args.tourId));
    if (args.einsatzIds.length > 0) {
      await tx.insert(tourEinsaetze).values(
        args.einsatzIds.map((einsatzId, index) => ({
          tourId: args.tourId,
          einsatzId,
          reihenfolge: index + 1,
        })),
      );
    }
    await tx
      .update(touren)
      .set({ reihenfolgeGeaendertVon: args.geaendertVon, reihenfolgeGeaendertAt: new Date() })
      .where(eq(touren.id, args.tourId));
  });
}

/** Löscht eine Tour per Soft-Delete inklusive ihrer Tourenpunkte. */
export async function loescheTour(id: number, geloeschtVon: number): Promise<void> {
  const verbindung = await db();
  await verbindung
    .update(touren)
    .set({ geloeschtAt: new Date(), geloeschtVon })
    .where(eq(touren.id, id));
  await verbindung.delete(tourEinsaetze).where(eq(tourEinsaetze.tourId, id));
}

// ── Generisches Soft-Delete ─────────────────────────────────────────────────

/** Tabellen, die über die generische Löschfunktion entfernt werden dürfen. */
export const LOESCHBARE_BEREICHE = {
  einsatz: einsaetze,
  leistung: leistungen,
  fahrt: fahrten,
  urlaub: urlaubsantraege,
  krankmeldung: krankmeldungen,
  tour: touren,
  warnung: planungsWarnungen,
} as const;

export type LoeschBereich = keyof typeof LOESCHBARE_BEREICHE;

/**
 * Setzt den Löschstatus eines Datensatzes (Soft-Delete).
 * Der Datensatz bleibt für Audit und Abrechnung erhalten, verschwindet aber
 * aus allen Listen und Auswertungen.
 */
export async function softDelete(args: {
  bereich: LoeschBereich;
  id: number;
  geloeschtVon: number;
}): Promise<void> {
  const tabelle = LOESCHBARE_BEREICHE[args.bereich];
  if (!tabelle) throw new Error(`Unbekannter Löschbereich: ${args.bereich}`);
  const verbindung = await db();
  await verbindung
    .update(tabelle as any)
    .set({ geloeschtAt: new Date(), geloeschtVon: args.geloeschtVon })
    .where(eq((tabelle as any).id, args.id));
}

/** Löscht einen Datensatz aus einer per Raw-SQL geführten Tabelle. */
export async function softDeleteRaw(args: {
  tabelle: "kassenanfragen" | "neukundenaufnahmen" | "fuehrerschein_checks";
  id: number;
  geloeschtVon: number;
}): Promise<void> {
  const verbindung = await db();
  const tabellenName = args.tabelle;
  // Tabellenname stammt aus einem festen Literal-Union-Typ, nicht aus Nutzereingaben.
  await verbindung.execute(
    sql`UPDATE ${sql.identifier(tabellenName)} SET geloeschtAt = NOW(), geloeschtVon = ${args.geloeschtVon} WHERE id = ${args.id}`,
  );
}

// ── Ablaufende Dokumente ────────────────────────────────────────────────────

/**
 * Liefert Mitarbeiterdokumente (Zertifikate, Führerschein, Verträge), deren
 * Ablaufdatum innerhalb des angegebenen Zeitraums liegt oder bereits
 * überschritten ist – Grundlage für die Dashboard-Kachel "offene Dokumente".
 */
export async function getAblaufendeDokumente(bisDatum: string) {
  const verbindung = await getDb();
  if (!verbindung) return [];
  try {
    const zeilen = await verbindung
      .select({
        id: mitarbeiterDokumente.id,
        mitarbeiterId: mitarbeiterDokumente.mitarbeiterId,
        typ: mitarbeiterDokumente.typ,
        bezeichnung: mitarbeiterDokumente.bezeichnung,
        ablaufdatum: mitarbeiterDokumente.ablaufdatum,
        vorname: mitarbeiter.vorname,
        nachname: mitarbeiter.nachname,
      })
      .from(mitarbeiterDokumente)
      .leftJoin(mitarbeiter, eq(mitarbeiterDokumente.mitarbeiterId, mitarbeiter.id))
      .where(lte(mitarbeiterDokumente.ablaufdatum, zuDatumsWert(bisDatum)))
      .orderBy(mitarbeiterDokumente.ablaufdatum)
      .limit(50);

    return zeilen.map((zeile) => ({
      mitarbeiterId: zeile.mitarbeiterId,
      bezeichnung: `${zeile.vorname ?? ""} ${zeile.nachname ?? ""}: ${zeile.bezeichnung}`.trim(),
      typ: zeile.typ,
      ablaufdatum: zuDatumsString(zeile.ablaufdatum),
    }));
  } catch (fehler) {
    console.warn("[Planung] Dokumentprüfung nicht möglich:", fehler);
    return [];
  }
}

// ── Hilfsfunktion für Altdatensätze ────────────────────────────────────────

/**
 * Ermittelt die Stunden eines Einsatzes.
 * Bevorzugt die berechnete Spanne aus Start-/Endzeit; fällt auf dauerStunden
 * zurück, solange Altdatensätze noch keine Endzeit besitzen.
 */
export function ermittleStunden(einsatz: {
  startzeit?: string | null;
  endzeit?: string | null;
  dauerStunden?: string | number | null;
}): number {
  const berechnet = berechneStunden(
    einsatz.startzeit ? String(einsatz.startzeit).slice(0, 5) : null,
    einsatz.endzeit ? String(einsatz.endzeit).slice(0, 5) : null,
  );
  if (berechnet !== null && berechnet > 0) return berechnet;
  return zuZahl(einsatz.dauerStunden);
}
