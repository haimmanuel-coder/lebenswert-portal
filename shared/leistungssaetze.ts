/**
 * Zentrale, einzige Preisquelle für Leistungssätze und Anfahrtspauschale.
 *
 * WICHTIG: Diese Konstanten sind die einzige gültige Quelle für Preise im
 * gesamten System (Budgetprüfung bei Einsatz-Erfassung, Leistungsnachweis-
 * Betragsvorschau, PDF-Export). Frühere Versionen des Codes enthielten drei
 * voneinander abweichende, hart codierte Preismodelle (28€/25€ Stundensatz
 * in der Budgetprüfung, 39€/50€ in der Leistungsnachweis-Vorschau, sowie
 * einen fehlerhaften 125€/1612€-Wert in der Restbudget-Berechnung). Diese
 * Datei ersetzt alle drei.
 *
 * Stand: Preisanpassung vom 26.07.2026, sofortige Umstellung ohne
 * Stichtagsregelung (Testlaufphase).
 */

/** Stundensatz je Paragraph, in Euro. Gilt für §45a und §45b identisch. */
export const STUNDENSATZ: Record<"45b" | "45a" | "39", number> = {
  "45b": 36,
  "45a": 36,
  "39": 46,
};

/**
 * Feste Anfahrtspauschale pro dokumentiertem Einzelbesuch, in Euro.
 * Gilt pro Besuch, unabhängig von der Tourenzusammenstellung (nicht pro Tour).
 * Ersetzt die kilometerbasierte Berechnung ausschließlich für die
 * Kundenabrechnung. Die interne Mitarbeiter-Fahrtkostenerstattung bleibt
 * davon unberührt und weiterhin kilometerbasiert (siehe fahrtkosten-Modul).
 */
export const ANFAHRT_PAUSCHALE = 6;

/** Berechnet die Kosten einer Leistung (Stunden × Satz) ohne Anfahrtspauschale. */
export function berechneLeistungskosten(dauerStunden: number, paragraph: "45b" | "45a" | "39"): number {
  return dauerStunden * STUNDENSATZ[paragraph];
}

/** Berechnet die budgetwirksamen Gesamtkosten eines Einsatzes inkl. Anfahrtspauschale. */
export function berechneEinsatzkostenInklPauschale(dauerStunden: number, paragraph: "45b" | "45a" | "39"): number {
  return berechneLeistungskosten(dauerStunden, paragraph) + ANFAHRT_PAUSCHALE;
}
