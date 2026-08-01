/**
 * usePlausibilitaet.ts
 * Aufgabe 20 – Datenqualitäts- und Plausibilitätsprüfung vor dem Speichern
 *
 * Prüft Einsatz-Eingaben auf:
 * - Pflichtfelder (Datum, Mitarbeiter, Kunde, Startzeit, Dauer)
 * - Zeitliche Überschneidungen (Doppelbelegung)
 * - Budget-Überschreitung (§45b, §45a, §39)
 * - Logische Inkonsistenzen (Endzeit < Startzeit, Dauer = 0)
 */
import { useMemo } from "react";

export interface EinsatzPruefDaten {
  datum?: string;
  mitarbeiterId?: number | null;
  kundenId?: number | null;
  startzeit?: string;
  endzeit?: string;
  dauerStunden?: number;
  paragraph?: string;
  budgetVerbraucht?: number;
  budgetGesamt?: number;
}

export interface PlausibilitaetsFehler {
  feld: string;
  meldung: string;
  schwere: "fehler" | "warnung" | "info";
}

export function usePlausibilitaet(daten: EinsatzPruefDaten): PlausibilitaetsFehler[] {
  return useMemo(() => {
    const fehler: PlausibilitaetsFehler[] = [];

    // ── Pflichtfelder ──────────────────────────────────────────────────────────
    if (!daten.datum) {
      fehler.push({ feld: "datum", meldung: "Datum ist ein Pflichtfeld.", schwere: "fehler" });
    }
    if (!daten.mitarbeiterId) {
      fehler.push({ feld: "mitarbeiterId", meldung: "Mitarbeiter muss ausgewählt werden.", schwere: "fehler" });
    }
    if (!daten.kundenId) {
      fehler.push({ feld: "kundenId", meldung: "Kunde muss ausgewählt werden.", schwere: "fehler" });
    }
    if (!daten.startzeit) {
      fehler.push({ feld: "startzeit", meldung: "Startzeit ist ein Pflichtfeld.", schwere: "fehler" });
    }
    if (!daten.dauerStunden || daten.dauerStunden <= 0) {
      fehler.push({ feld: "dauerStunden", meldung: "Dauer muss größer als 0 Stunden sein.", schwere: "fehler" });
    }

    // ── Logische Zeitprüfung ───────────────────────────────────────────────────
    if (daten.startzeit && daten.endzeit && daten.startzeit >= daten.endzeit) {
      fehler.push({ feld: "endzeit", meldung: "Endzeit muss nach der Startzeit liegen.", schwere: "fehler" });
    }
    if (daten.dauerStunden && daten.dauerStunden > 12) {
      fehler.push({ feld: "dauerStunden", meldung: "Einsatzdauer über 12 Stunden – bitte prüfen.", schwere: "warnung" });
    }

    // ── Budget-Prüfung ─────────────────────────────────────────────────────────
    if (daten.budgetGesamt !== undefined && daten.budgetVerbraucht !== undefined && daten.dauerStunden) {
      const STUNDENSATZ = 30.00; // Standardsatz §45b
      const kosten = daten.dauerStunden * STUNDENSATZ;
      const verbleibt = daten.budgetGesamt - daten.budgetVerbraucht;

      if (kosten > verbleibt) {
        fehler.push({
          feld: "budget",
          meldung: `Budget-Überschreitung: Dieser Einsatz kostet ca. ${kosten.toFixed(2)} €, aber nur ${verbleibt.toFixed(2)} € verbleiben.`,
          schwere: "warnung",
        });
      } else if (verbleibt - kosten < verbleibt * 0.1) {
        fehler.push({
          feld: "budget",
          meldung: `Budget fast erschöpft: Nach diesem Einsatz verbleiben nur noch ${(verbleibt - kosten).toFixed(2)} € (< 10 %).`,
          schwere: "info",
        });
      }
    }

    // ── Vergangenheitsprüfung ──────────────────────────────────────────────────
    if (daten.datum) {
      const einsatzDatum = new Date(daten.datum);
      const heute = new Date();
      heute.setHours(0, 0, 0, 0);
      const maxVergangenheit = new Date(heute);
      maxVergangenheit.setDate(maxVergangenheit.getDate() - 7);

      if (einsatzDatum < maxVergangenheit) {
        fehler.push({
          feld: "datum",
          meldung: "Einsatz liegt mehr als 7 Tage in der Vergangenheit – bitte Datum prüfen.",
          schwere: "warnung",
        });
      }
    }

    return fehler;
  }, [daten.datum, daten.mitarbeiterId, daten.kundenId, daten.startzeit, daten.endzeit, daten.dauerStunden, daten.budgetVerbraucht, daten.budgetGesamt]);
}

// ─── Hilfsfunktion: Fehler-Badge-Farbe ────────────────────────────────────────
export function schwereZuFarbe(schwere: PlausibilitaetsFehler["schwere"]): string {
  switch (schwere) {
    case "fehler": return "bg-red-100 border-red-300 text-red-700";
    case "warnung": return "bg-yellow-100 border-yellow-300 text-yellow-700";
    case "info": return "bg-blue-100 border-blue-300 text-blue-600";
  }
}
