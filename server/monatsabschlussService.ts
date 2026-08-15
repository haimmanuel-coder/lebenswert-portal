import { sql } from "drizzle-orm";
import { getDb } from "./db";

export const ABGESCHLOSSENE_LEISTUNGSSTATUS = ["freigegeben", "versendet"] as const;

export type LeistungsnachweisZeile = {
  id: number;
  mitarbeiterId: number;
  mitarbeiterName: string;
  kundenName: string;
  paragraph: string;
  stunden: number;
  betrag: number;
  status: string;
};

function rowsAus(result: unknown): any[] {
  return ((result as any)?.[0] ?? result ?? []) as any[];
}

export function istLeistungsnachweisAbgeschlossen(status: string | null | undefined): boolean {
  return ABGESCHLOSSENE_LEISTUNGSSTATUS.includes(status as (typeof ABGESCHLOSSENE_LEISTUNGSSTATUS)[number]);
}

export function berechneLeistungsnachweisKontrolle(monat: string, zeilen: LeistungsnachweisZeile[]) {
  const offeneZeilen = zeilen.filter((zeile) => !istLeistungsnachweisAbgeschlossen(zeile.status));
  const gesamtStunden = zeilen.reduce((summe, zeile) => summe + Number(zeile.stunden || 0), 0);
  const gesamtBetrag = zeilen.reduce((summe, zeile) => summe + Number(zeile.betrag || 0), 0);
  const offeneMitarbeiter = Array.from(
    offeneZeilen.reduce((map, zeile) => {
      const vorhanden = map.get(zeile.mitarbeiterId) ?? {
        mitarbeiterId: zeile.mitarbeiterId,
        mitarbeiterName: zeile.mitarbeiterName,
        anzahl: 0,
        stunden: 0,
      };
      vorhanden.anzahl += 1;
      vorhanden.stunden += Number(zeile.stunden || 0);
      map.set(zeile.mitarbeiterId, vorhanden);
      return map;
    }, new Map<number, { mitarbeiterId: number; mitarbeiterName: string; anzahl: number; stunden: number }>()).values(),
  );

  return {
    monat,
    gesamt: zeilen.length,
    abgeschlossen: zeilen.length - offeneZeilen.length,
    offen: offeneZeilen.length,
    gesamtStunden,
    gesamtBetrag,
    kannAbschliessen: zeilen.length > 0 && offeneZeilen.length === 0,
    offeneZeilen,
    offeneMitarbeiter,
  };
}

export async function pruefeLeistungsnachweisAbschluss(monat: string) {
  const db = await getDb();
  if (!db) throw new Error("Datenbankverbindung nicht verfügbar");
  const result = await db.execute(sql`
    SELECT
      l.id,
      l.mitarbeiterId,
      CONCAT(m.vorname, ' ', m.nachname) AS mitarbeiterName,
      CONCAT(k.vorname, ' ', k.nachname) AS kundenName,
      l.paragraph,
      l.stunden,
      l.betrag,
      l.status
    FROM leistungen l
    LEFT JOIN mitarbeiter m ON m.id = l.mitarbeiterId
    LEFT JOIN kunden k ON k.id = l.kundenId
    WHERE l.monat = ${monat} AND l.geloeschtAt IS NULL
    ORDER BY m.nachname ASC, m.vorname ASC, k.nachname ASC
  `);
  const zeilen: LeistungsnachweisZeile[] = rowsAus(result).map((zeile: any) => ({
    id: Number(zeile.id),
    mitarbeiterId: Number(zeile.mitarbeiterId),
    mitarbeiterName: zeile.mitarbeiterName ?? "Unbekannter Mitarbeiter",
    kundenName: zeile.kundenName ?? "Unbekannter Kunde",
    paragraph: zeile.paragraph ?? "",
    stunden: Number(zeile.stunden ?? 0),
    betrag: Number(zeile.betrag ?? 0),
    status: zeile.status ?? "offen",
  }));
  return berechneLeistungsnachweisKontrolle(monat, zeilen);
}

function csvWert(wert: unknown): string {
  return `"${String(wert ?? "").replaceAll('"', '""')}"`;
}

/** Abrechnungsdatei für Pflegekassen – nur nach vollständiger Freigabe. */
export function erstellePflegekassenCsv(monat: string, zeilen: LeistungsnachweisZeile[]): string {
  const header = ["Monat", "Kunde", "Mitarbeiter", "Paragraph", "Stunden", "Betrag", "Status"];
  const daten = zeilen.map((zeile) => [
    monat,
    zeile.kundenName,
    zeile.mitarbeiterName,
    `§ ${zeile.paragraph}`,
    zeile.stunden.toFixed(2).replace(".", ","),
    zeile.betrag.toFixed(2).replace(".", ","),
    zeile.status,
  ].map(csvWert).join(";"));
  return "\uFEFF" + [header.map(csvWert).join(";"), ...daten].join("\n");
}

/** Stundenübersicht je Mitarbeiter als Grundlage für die Auszahlungsberechnung. */
export function erstelleStundennachweisCsv(monat: string, zeilen: LeistungsnachweisZeile[]): string {
  const proMitarbeiter = new Map<number, { name: string; stunden: number; anzahl: number }>();
  for (const zeile of zeilen) {
    const vorhanden = proMitarbeiter.get(zeile.mitarbeiterId) ?? { name: zeile.mitarbeiterName, stunden: 0, anzahl: 0 };
    vorhanden.stunden += zeile.stunden;
    vorhanden.anzahl += 1;
    proMitarbeiter.set(zeile.mitarbeiterId, vorhanden);
  }
  const header = ["Monat", "Mitarbeiter", "Abgeschlossene Leistungsnachweise", "Gesamtstunden"];
  const daten = Array.from(proMitarbeiter.values())
    .sort((a, b) => a.name.localeCompare(b.name, "de"))
    .map((eintrag) => [
      monat,
      eintrag.name,
      eintrag.anzahl,
      eintrag.stunden.toFixed(2).replace(".", ","),
    ].map(csvWert).join(";"));
  return "\uFEFF" + [header.map(csvWert).join(";"), ...daten].join("\n");
}

export function letzterTagImMonat(jahr: number, monatIndex: number): number {
  return new Date(jahr, monatIndex + 1, 0).getDate();
}
