/**
 * ════════════════════════════════════════════════════════════════════════════
 *  KUNDEN-ABGLEICH FÜR DEN IDEMPOTENTEN IMPORT (Phase 2)
 * ════════════════════════════════════════════════════════════════════════════
 *
 * Reine, testbare Logik für die „Synchronisation" beim Kundenimport: Sie
 * entscheidet, ob eine Importzeile einen bestehenden Kunden AKTUALISIERT oder
 * einen NEUEN anlegt, und bildet die Rohzeile auf die tatsächlichen
 * Datenbankspalten ab. Keine Datenbank-, Netzwerk- oder tRPC-Abhängigkeiten –
 * die Ausführung liegt in server/routers.ts (kunden.upsertImport).
 *
 * Abgleichschlüssel (in dieser Reihenfolge):
 *   1. Versicherungsnummer (eindeutig, bevorzugt)
 *   2. Vor- + Nachname (schwächerer Fallback, wenn keine Versicherungsnummer)
 */

export const PARAGRAPH_WERTE = ["45b", "45a", "39", "privat"] as const;
export type Paragraph = (typeof PARAGRAPH_WERTE)[number];

/** Bestandskunde, reduziert auf die für den Abgleich nötigen Felder. */
export interface AbgleichKunde {
  id: number;
  vorname: string | null;
  nachname: string | null;
  versicherungsnummer: string | null;
}

/** Rohzeile aus der Import-Maske (Werte sind Strings bzw. optional). */
export interface ImportKundeRoh {
  vorname: string;
  nachname: string;
  strasse?: string;
  plz?: string;
  ort?: string;
  telefon?: string;
  pflegegrad?: string | number;
  paragraph?: string;
  kostentraeger?: string;
  versicherungsnummer?: string;
  notizen?: string;
}

/** Auf DB-Spalten abgebildeter Datensatz (nur befüllte Felder). */
export interface KundenDatensatz {
  vorname?: string;
  nachname?: string;
  strasse?: string;
  plz?: string;
  ort?: string;
  telefon?: string;
  kostentraeger?: string;
  versicherungsnummer?: string;
  notizen?: string;
  pflegegrad?: number;
  paragraph?: Paragraph;
}

export interface AbgleichIndex {
  byVersicherung: Map<string, number>;
  byName: Map<string, number>;
}

export type Abgleichtyp = "neu" | "aktualisierung";

/** Normalisiert einen Schlüsselwert (getrimmt, kleingeschrieben). */
export function normSchluessel(v: string | null | undefined): string {
  return (v ?? "").toString().trim().toLowerCase();
}

/** Zusammengesetzter Namensschlüssel „vorname|nachname". */
export function nameSchluessel(vorname: string | null | undefined, nachname: string | null | undefined): string {
  return `${normSchluessel(vorname)}|${normSchluessel(nachname)}`;
}

/**
 * Baut die Nachschlage-Indizes über den Bestand auf. Der erste Treffer je
 * Schlüssel gewinnt (stabile, deterministische Zuordnung).
 */
export function baueAbgleichIndex(bestand: AbgleichKunde[]): AbgleichIndex {
  const byVersicherung = new Map<string, number>();
  const byName = new Map<string, number>();
  for (const k of bestand) {
    const vs = normSchluessel(k.versicherungsnummer);
    if (vs && !byVersicherung.has(vs)) byVersicherung.set(vs, k.id);
    const nm = nameSchluessel(k.vorname, k.nachname);
    if (nm !== "|" && !byName.has(nm)) byName.set(nm, k.id);
  }
  return { byVersicherung, byName };
}

/** Findet die ID eines passenden Bestandskunden oder null. */
export function findeTreffer(row: ImportKundeRoh, index: AbgleichIndex): number | null {
  const vs = normSchluessel(row.versicherungsnummer);
  if (vs && index.byVersicherung.has(vs)) return index.byVersicherung.get(vs)!;
  const nm = nameSchluessel(row.vorname, row.nachname);
  if (nm !== "|" && index.byName.has(nm)) return index.byName.get(nm)!;
  return null;
}

/** Klassifiziert eine Zeile als Neuanlage oder Aktualisierung. */
export function klassifiziereKunde(
  row: ImportKundeRoh,
  index: AbgleichIndex,
): { typ: Abgleichtyp; matchId: number | null } {
  const matchId = findeTreffer(row, index);
  return matchId == null ? { typ: "neu", matchId: null } : { typ: "aktualisierung", matchId };
}

/**
 * Trägt einen neu angelegten Kunden in die Indizes nach, damit eine später im
 * selben Import auftauchende Dublette aktualisiert statt erneut angelegt wird.
 */
export function ergaenzeIndex(index: AbgleichIndex, row: ImportKundeRoh, id: number): void {
  const vs = normSchluessel(row.versicherungsnummer);
  if (vs && !index.byVersicherung.has(vs)) index.byVersicherung.set(vs, id);
  const nm = nameSchluessel(row.vorname, row.nachname);
  if (nm !== "|" && !index.byName.has(nm)) index.byName.set(nm, id);
}

/**
 * Bildet eine Rohzeile auf DB-Spalten ab. Nur nicht-leere Werte werden
 * übernommen, damit eine Aktualisierung bestehende Felder nicht mit Leerwerten
 * überschreibt. Ungültige Pflegegrade/Paragraphen werden ausgelassen.
 */
export function baueKundenDatensatz(row: ImportKundeRoh): KundenDatensatz {
  const d: KundenDatensatz = {};
  const setStr = (key: keyof KundenDatensatz, wert: unknown) => {
    const t = (wert ?? "").toString().trim();
    if (t) (d as Record<string, unknown>)[key] = t;
  };
  setStr("vorname", row.vorname);
  setStr("nachname", row.nachname);
  setStr("strasse", row.strasse);
  setStr("plz", row.plz);
  setStr("ort", row.ort);
  setStr("telefon", row.telefon);
  setStr("kostentraeger", row.kostentraeger);
  setStr("versicherungsnummer", row.versicherungsnummer);
  setStr("notizen", row.notizen);
  const pg = Number(row.pflegegrad);
  if (!Number.isNaN(pg) && pg >= 1 && pg <= 5) d.pflegegrad = pg;
  const p = (row.paragraph ?? "").toString().trim();
  if ((PARAGRAPH_WERTE as readonly string[]).includes(p)) d.paragraph = p as Paragraph;
  return d;
}
