/**
 * ════════════════════════════════════════════════════════════════════════════
 *  ZENTRALE PLANUNGS- UND BERECHNUNGSLOGIK
 * ════════════════════════════════════════════════════════════════════════════
 *
 * Diese Datei ist die *einzige* Quelle der Wahrheit für alle Berechnungen rund
 * um Einsatzplanung, Budget, Lohnkosten und Fahrtkosten. Frontend und Backend
 * importieren dieselben Funktionen, damit die Live-Vorschau in der Planungs-
 * oberfläche exakt dasselbe Ergebnis liefert wie die serverseitige Prüfung
 * beim Speichern.
 *
 * ── WICHTIGE UNTERSCHEIDUNG (fachlich zwingend) ────────────────────────────
 *
 *   VERRECHNUNGSSATZ (z. B. 36,00 €/Std.)
 *     → Das ist der Betrag, den der Kostenträger je Betreuungsstunde aus dem
 *       Kundenbudget abrechnet. Ausschließlich dieser Satz bestimmt, wie viele
 *       Betreuungsstunden aus einem Restbudget noch möglich sind.
 *
 *   STUNDENLOHN (16,00 €/Std.)
 *     → Interner Personalkostensatz. Wird NUR für die Lohnkosten- und
 *       Minijob-Berechnung verwendet, NIEMALS für Budgetstunden.
 *
 * Beispiel §45b: Restbudget 347,00 € ÷ 36,00 €/Std. = 9,64 verfügbare Stunden.
 * ════════════════════════════════════════════════════════════════════════════
 */

import { ANFAHRT_PAUSCHALE as ANFAHRT_PAUSCHALE_SATZ, STUNDENSATZ } from "./leistungssaetze";

// ── Typen ───────────────────────────────────────────────────────────────────

/** Abrechnungsparagraphen nach SGB XI, die im Portal geplant werden können. */
export type Paragraph = "45b" | "45a" | "39";

/** Alle planbaren Paragraphen in Anzeigereihenfolge. */
export const PARAGRAPHEN: readonly Paragraph[] = ["45b", "45a", "39"] as const;

// ── Konstanten ──────────────────────────────────────────────────────────────

/**
 * Verrechnungssätze je Abrechnungsparagraph in Euro pro Betreuungsstunde.
 *
 * Die Werte stammen aus `shared/leistungssaetze.ts` – der einzigen gültigen
 * Preisquelle des Systems (§45a/§45b 36 €, §39 46 €). Hier wird bewusst
 * kein eigener Satz definiert, damit nicht erneut zwei voneinander
 * abweichende Preismodelle entstehen.
 *
 * Betriebsindividuell lassen sich die Sätze über die Tabelle
 * `paragraphSaetze` überschreiben (Admin-Einstellung); die Backend-Routen
 * lesen den jeweils gültigen Satz und reichen ihn an die Berechnungs-
 * funktionen weiter.
 */
export const PARAGRAPH_SAETZE: Record<Paragraph, number> = { ...STUNDENSATZ };

/** Interner Stundenlohn der Betreuungskräfte (nur Lohn-/Minijob-Berechnung). */
export const LOHN_PRO_STUNDE = 16.0;

/**
 * Minijob-Verdienstgrenze in Euro pro Monat.
 * Wird das Monatsentgelt eines Mitarbeiters durch eine Planung überschritten,
 * warnt das System live – sowohl beim Mitarbeiter als auch beim Admin.
 */
export const MINIJOB_GRENZE = 603.0;

/** Ab diesem Anteil der Minijob-Grenze wird vorwarnend (gelb) hingewiesen. */
export const MINIJOB_VORWARNUNG_ANTEIL = 0.85;

/**
 * Anfahrtspauschale je Einsatz in Euro (budgetwirksam).
 * Stammt ebenfalls aus der zentralen Preisquelle `leistungssaetze.ts`.
 */
export const ANFAHRT_PAUSCHALE = ANFAHRT_PAUSCHALE_SATZ;

/** Mindestbetreuungszeit je Einsatz in Stunden. */
export const MINDEST_DAUER_STUNDEN = 1.5;

/** Restbudget-Anteil, ab dem ein Kunde als kritisch gilt. */
export const BUDGET_WARNSCHWELLE_ANTEIL = 0.1;

/** Regulärer Arbeitszeitrahmen – Einsätze außerhalb werden bemängelt. */
export const ARBEITSZEIT_VON = "06:00";
export const ARBEITSZEIT_BIS = "22:00";

// ── Hilfsfunktionen: Zeit ───────────────────────────────────────────────────

/**
 * Wandelt eine Uhrzeit ("HH:MM" oder "HH:MM:SS") in Minuten seit Mitternacht.
 * Gibt null zurück, wenn die Eingabe kein gültiger Zeitwert ist.
 */
export function zeitZuMinuten(zeit: string | null | undefined): number | null {
  if (!zeit) return null;
  const treffer = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(zeit.trim());
  if (!treffer) return null;
  const stunden = Number(treffer[1]);
  const minuten = Number(treffer[2]);
  if (stunden < 0 || stunden > 23 || minuten < 0 || minuten > 59) return null;
  return stunden * 60 + minuten;
}

/** Wandelt Minuten seit Mitternacht zurück in "HH:MM". */
export function minutenZuZeit(minuten: number): string {
  const m = ((Math.round(minuten) % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

/**
 * Berechnet die Einsatzdauer in Dezimalstunden aus Start- und Endzeit.
 *
 * Die Stunden werden IMMER berechnet und nie manuell eingegeben.
 * Beispiel: 09:00 – 11:30 ergibt 2,5 Stunden.
 *
 * Endet der Einsatz vor dem Start (z. B. 22:00–01:00), wird über Mitternacht
 * hinweg gerechnet. Gibt null zurück, wenn eine Zeit fehlt oder ungültig ist.
 */
export function berechneStunden(
  startzeit: string | null | undefined,
  endzeit: string | null | undefined,
): number | null {
  const start = zeitZuMinuten(startzeit);
  const ende = zeitZuMinuten(endzeit);
  if (start === null || ende === null) return null;
  let dauer = ende - start;
  if (dauer <= 0) dauer += 24 * 60; // Einsatz über Mitternacht
  return runde2(dauer / 60);
}

/** Berechnet die Endzeit aus Startzeit und Dauer in Stunden. */
export function berechneEndzeit(startzeit: string, dauerStunden: number): string | null {
  const start = zeitZuMinuten(startzeit);
  if (start === null || !Number.isFinite(dauerStunden) || dauerStunden <= 0) return null;
  return minutenZuZeit(start + dauerStunden * 60);
}

/** Prüft, ob sich zwei Zeitfenster desselben Tages überschneiden. */
export function zeitenUeberschneidenSich(
  startA: string,
  dauerA: number,
  startB: string,
  dauerB: number,
): boolean {
  const a1 = zeitZuMinuten(startA);
  const b1 = zeitZuMinuten(startB);
  if (a1 === null || b1 === null) return false;
  const a2 = a1 + dauerA * 60;
  const b2 = b1 + dauerB * 60;
  return a1 < b2 && b1 < a2;
}

/** Prüft, ob ein Einsatz vollständig im regulären Arbeitszeitrahmen liegt. */
export function liegtInArbeitszeit(startzeit: string, dauerStunden: number): boolean {
  const start = zeitZuMinuten(startzeit);
  const von = zeitZuMinuten(ARBEITSZEIT_VON);
  const bis = zeitZuMinuten(ARBEITSZEIT_BIS);
  if (start === null || von === null || bis === null) return true;
  return start >= von && start + dauerStunden * 60 <= bis;
}

// ── Hilfsfunktionen: Zahlen ─────────────────────────────────────────────────

/** Rundet kaufmännisch auf zwei Nachkommastellen. */
export function runde2(wert: number): number {
  return Math.round((wert + Number.EPSILON) * 100) / 100;
}

/** Wandelt Decimal-Strings aus der Datenbank sicher in eine Zahl. */
export function zuZahl(wert: string | number | null | undefined): number {
  if (wert === null || wert === undefined || wert === "") return 0;
  const zahl = typeof wert === "number" ? wert : parseFloat(String(wert));
  return Number.isFinite(zahl) ? zahl : 0;
}

/** Formatiert einen Betrag als deutsche Euro-Angabe, z. B. "347,00 €". */
export function formatEuro(betrag: number): string {
  return `${runde2(betrag).toLocaleString("de-DE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} €`;
}

/** Formatiert Stunden deutsch, z. B. "9,64 Std.". */
export function formatStunden(stunden: number): string {
  return `${stunden.toLocaleString("de-DE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} Std.`;
}

// ── Verrechnungssätze ───────────────────────────────────────────────────────

/**
 * Liefert den gültigen Verrechnungssatz eines Paragraphen in €/Stunde.
 * `ueberschreibungen` erlaubt betriebsindividuelle Sätze aus der Datenbank.
 */
export function getStundensatz(
  paragraph: Paragraph,
  ueberschreibungen?: Partial<Record<Paragraph, number>> | null,
): number {
  const eigener = ueberschreibungen?.[paragraph];
  if (typeof eigener === "number" && Number.isFinite(eigener) && eigener > 0) return eigener;
  return PARAGRAPH_SAETZE[paragraph];
}

// ── Budgetberechnung ────────────────────────────────────────────────────────

/** Budgetlage eines Kunden für genau einen Abrechnungsparagraphen. */
export type BudgetLage = {
  paragraph: Paragraph;
  /** Bewilligtes Gesamtbudget in € */
  budget: number;
  /** Bereits verbrauchtes Budget in € */
  verbraucht: number;
  /** Noch verfügbares Guthaben in € */
  restbudget: number;
  /** Verrechnungssatz in €/Std. */
  stundensatz: number;
  /** Aus dem Restbudget noch finanzierbare Betreuungsstunden */
  verfuegbareStunden: number;
  /** Bereits verplante/verbrauchte Stunden (Verbrauch ÷ Satz) */
  verplanteStunden: number;
  /** true, wenn weniger als 10 % des Budgets übrig sind */
  kritisch: boolean;
};

/**
 * Berechnet die Budgetlage für einen Paragraphen.
 *
 * Kernformel: Verfügbares Budget ÷ Stundensatz des Paragraphen = Reststunden.
 *   347,00 € ÷ 36,00 €/Std. = 9,64 Std.
 */
export function berechneBudgetLage(args: {
  paragraph: Paragraph;
  budget: string | number | null | undefined;
  verbraucht: string | number | null | undefined;
  stundensatz?: number;
}): BudgetLage {
  const budget = zuZahl(args.budget);
  const verbraucht = zuZahl(args.verbraucht);
  const stundensatz = args.stundensatz ?? getStundensatz(args.paragraph);
  const restbudget = runde2(budget - verbraucht);
  const verfuegbareStunden = stundensatz > 0 ? runde2(Math.max(0, restbudget) / stundensatz) : 0;
  const verplanteStunden = stundensatz > 0 ? runde2(verbraucht / stundensatz) : 0;
  return {
    paragraph: args.paragraph,
    budget,
    verbraucht,
    restbudget,
    stundensatz,
    verfuegbareStunden,
    verplanteStunden,
    kritisch: budget > 0 && restbudget < budget * BUDGET_WARNSCHWELLE_ANTEIL,
  };
}

/**
 * Liest die Budgetlage aller drei Paragraphen direkt aus einem Kundendatensatz.
 * Erwartet die Spalten budget45b/verbraucht45b usw. aus der Tabelle `kunden`.
 */
export function berechneAlleBudgetLagen(
  kunde: Record<string, unknown> | null | undefined,
  saetze?: Partial<Record<Paragraph, number>> | null,
): Record<Paragraph, BudgetLage> {
  const lese = (feld: string) => (kunde ? (kunde as Record<string, unknown>)[feld] : 0) as string | number | null;
  return {
    "45b": berechneBudgetLage({
      paragraph: "45b",
      budget: lese("budget45b"),
      verbraucht: lese("verbraucht45b"),
      stundensatz: getStundensatz("45b", saetze),
    }),
    "45a": berechneBudgetLage({
      paragraph: "45a",
      budget: lese("budget45a"),
      verbraucht: lese("verbraucht45a"),
      stundensatz: getStundensatz("45a", saetze),
    }),
    "39": berechneBudgetLage({
      paragraph: "39",
      budget: lese("budget39"),
      verbraucht: lese("verbraucht39"),
      stundensatz: getStundensatz("39", saetze),
    }),
  };
}

// ── Einsatzkosten ───────────────────────────────────────────────────────────

/** Ein Einsatz kann auf bis zu zwei Paragraphen aufgeteilt werden. */
export type ParagraphAnteil = {
  paragraph: Paragraph;
  /** Stundenanteil, der über diesen Paragraphen abgerechnet wird */
  stunden: number;
};

/** Aufschlüsselung der Kosten eines geplanten Einsatzes. */
export type EinsatzKosten = {
  /** Gesamtstunden (Summe aller Paragraphenanteile) */
  gesamtStunden: number;
  /** Kosten je Paragraph inkl. anteiliger Anfahrtspauschale */
  anteile: Array<{
    paragraph: Paragraph;
    stunden: number;
    stundensatz: number;
    /** Reine Betreuungskosten (Stunden × Satz) */
    betreuungsKosten: number;
    /** Anteilige Anfahrtspauschale */
    fahrtkosten: number;
    /** Budgetwirksame Gesamtkosten dieses Anteils */
    gesamtKosten: number;
  }>;
  /** Summe der reinen Betreuungskosten über alle Paragraphen */
  betreuungsKosten: number;
  /** Angesetzte Anfahrtspauschale */
  fahrtkosten: number;
  /** Budgetwirksame Gesamtkosten (Betreuung + Fahrtkosten) */
  gesamtKosten: number;
  /** Interne Personalkosten (Gesamtstunden × 16 €) */
  lohnkosten: number;
};

/**
 * Berechnet die vollständigen Kosten eines Einsatzes.
 *
 * Die Anfahrtspauschale wird immer mit einkalkuliert, damit niemals mehr
 * Budget verplant wird, als tatsächlich verfügbar ist. Bei zwei Paragraphen
 * wird sie im Verhältnis der Stundenanteile aufgeteilt.
 */
export function berechneEinsatzKosten(args: {
  anteile: ParagraphAnteil[];
  /** Anfahrtspauschale; Standard 6 €. 0 übergeben, wenn keine anfällt. */
  anfahrtPauschale?: number;
  /** Betriebsindividuelle Verrechnungssätze */
  saetze?: Partial<Record<Paragraph, number>> | null;
  /** Abweichender Stundenlohn (Standard 16 €) */
  lohnProStunde?: number;
}): EinsatzKosten {
  const anteile = args.anteile.filter((a) => a.stunden > 0);
  const gesamtStunden = runde2(anteile.reduce((s, a) => s + a.stunden, 0));
  const fahrtkosten = runde2(args.anfahrtPauschale ?? ANFAHRT_PAUSCHALE);
  const lohnProStunde = args.lohnProStunde ?? LOHN_PRO_STUNDE;

  const detail = anteile.map((anteil) => {
    const stundensatz = getStundensatz(anteil.paragraph, args.saetze);
    const betreuungsKosten = runde2(anteil.stunden * stundensatz);
    // Fahrtkosten anteilig nach Stundenverhältnis verteilen
    const quote = gesamtStunden > 0 ? anteil.stunden / gesamtStunden : 0;
    const anteiligeFahrtkosten = runde2(fahrtkosten * quote);
    return {
      paragraph: anteil.paragraph,
      stunden: runde2(anteil.stunden),
      stundensatz,
      betreuungsKosten,
      fahrtkosten: anteiligeFahrtkosten,
      gesamtKosten: runde2(betreuungsKosten + anteiligeFahrtkosten),
    };
  });

  const betreuungsKosten = runde2(detail.reduce((s, d) => s + d.betreuungsKosten, 0));
  return {
    gesamtStunden,
    anteile: detail,
    betreuungsKosten,
    fahrtkosten,
    gesamtKosten: runde2(betreuungsKosten + fahrtkosten),
    lohnkosten: runde2(gesamtStunden * lohnProStunde),
  };
}

/**
 * Berechnet die Lohnkosten eines Einsatzes: Gesamtstunden × 16 €.
 * Beispiel: 2,5 Std. × 16 € = 40,00 €.
 */
export function berechneLohnkosten(stunden: number, lohnProStunde = LOHN_PRO_STUNDE): number {
  return runde2(Math.max(0, stunden) * lohnProStunde);
}

// ── Budgetvorschau ──────────────────────────────────────────────────────────

/** Was ein geplanter Einsatz mit dem Budget eines Paragraphen macht. */
export type BudgetVorschau = {
  paragraph: Paragraph;
  stundensatz: number;
  /** Restbudget vor diesem Einsatz */
  restbudgetVorher: number;
  /** Verfügbare Stunden vor diesem Einsatz */
  stundenVorher: number;
  /** Budgetwirksame Kosten dieses Einsatzes (inkl. Fahrtkosten) */
  kosten: number;
  /** Restbudget nach diesem Einsatz */
  restbudgetNachher: number;
  /** Verfügbare Stunden nach diesem Einsatz */
  stundenNachher: number;
  /** true, wenn das Budget für diesen Einsatz nicht ausreicht */
  reichtNicht: boolean;
  /** Fehlbetrag in €, falls das Budget nicht ausreicht */
  fehlbetrag: number;
};

/**
 * Erstellt die Budgetvorschau für einen Paragraphenanteil eines Einsatzes.
 * Zeigt Restbudget und Reststunden jeweils vor und nach dem geplanten Einsatz.
 */
export function berechneBudgetVorschau(args: {
  lage: BudgetLage;
  /** Budgetwirksame Kosten des Anteils inkl. anteiliger Fahrtkosten */
  kosten: number;
}): BudgetVorschau {
  const { lage } = args;
  const kosten = runde2(args.kosten);
  const restbudgetNachher = runde2(lage.restbudget - kosten);
  const stundenNachher =
    lage.stundensatz > 0 ? runde2(Math.max(0, restbudgetNachher) / lage.stundensatz) : 0;
  return {
    paragraph: lage.paragraph,
    stundensatz: lage.stundensatz,
    restbudgetVorher: lage.restbudget,
    stundenVorher: lage.verfuegbareStunden,
    kosten,
    restbudgetNachher,
    stundenNachher,
    reichtNicht: restbudgetNachher < 0,
    fehlbetrag: restbudgetNachher < 0 ? runde2(Math.abs(restbudgetNachher)) : 0,
  };
}

// ── Minijob ─────────────────────────────────────────────────────────────────

export type MinijobStatus = {
  /** Bereits im Monat angefallene Lohnkosten in € */
  bisherigeLohnkosten: number;
  /** Lohnkosten des gerade geplanten Einsatzes in € */
  geplanteLohnkosten: number;
  /** Summe nach der Planung in € */
  gesamtLohnkosten: number;
  /** Monatsgrenze in € */
  grenze: number;
  /** Verbleibender Spielraum bis zur Grenze (negativ = Überschreitung) */
  verbleibend: number;
  /** Ausschöpfung in Prozent */
  auslastungProzent: number;
  /** true, wenn die Grenze mit dieser Planung überschritten wird */
  ueberschritten: boolean;
  /** true, wenn die Grenze nahezu erreicht ist (≥ 85 %), aber noch nicht überschritten */
  vorwarnung: boolean;
  /** Fertige Meldung für die Anzeige beim Mitarbeiter */
  meldung: string | null;
};

/**
 * Prüft die Minijob-Grenze für einen Mitarbeiter in einem Monat.
 *
 * Die Prüfung erfolgt live während der Planung – nicht erst nach dem
 * Speichern –, damit die Teamleitung sofort umdisponieren kann.
 */
export function pruefeMinijobGrenze(args: {
  bisherigeLohnkosten: number;
  geplanteLohnkosten?: number;
  grenze?: number;
  /** Nur Minijobber unterliegen der Grenze; andere Beschäftigungsarten nicht. */
  beschaeftigungsart?: string | null;
}): MinijobStatus {
  const grenze = args.grenze ?? MINIJOB_GRENZE;
  const bisherigeLohnkosten = runde2(Math.max(0, args.bisherigeLohnkosten));
  const geplanteLohnkosten = runde2(Math.max(0, args.geplanteLohnkosten ?? 0));
  const gesamtLohnkosten = runde2(bisherigeLohnkosten + geplanteLohnkosten);
  const verbleibend = runde2(grenze - gesamtLohnkosten);
  const auslastungProzent = grenze > 0 ? Math.round((gesamtLohnkosten / grenze) * 100) : 0;

  // Teilzeit- und Vollzeitkräfte unterliegen der Minijob-Grenze nicht.
  const istMinijobber = !args.beschaeftigungsart || args.beschaeftigungsart === "minijob";
  const ueberschritten = istMinijobber && gesamtLohnkosten > grenze;
  const vorwarnung =
    istMinijobber && !ueberschritten && gesamtLohnkosten >= grenze * MINIJOB_VORWARNUNG_ANTEIL;

  let meldung: string | null = null;
  if (ueberschritten) {
    meldung =
      `ACHTUNG! Mit dieser Planung überschreitest du die Minijob-Grenze von ` +
      `${formatEuro(grenze)}. Geplant: ${formatEuro(gesamtLohnkosten)} ` +
      `(${formatEuro(runde2(gesamtLohnkosten - grenze))} über der Grenze).`;
  } else if (vorwarnung) {
    meldung =
      `Hinweis: Du hast ${auslastungProzent} % der Minijob-Grenze erreicht. ` +
      `Noch ${formatEuro(verbleibend)} bis ${formatEuro(grenze)} verfügbar.`;
  }

  return {
    bisherigeLohnkosten,
    geplanteLohnkosten,
    gesamtLohnkosten,
    grenze,
    verbleibend,
    auslastungProzent,
    ueberschritten,
    vorwarnung,
    meldung,
  };
}

// ── Validierung ─────────────────────────────────────────────────────────────

/** Schweregrad einer Planungsmeldung. */
export type WarnSchwere = "blockierend" | "warnung" | "hinweis";

/** Eine einzelne Meldung aus der Planungsvalidierung. */
export type PlanungsMeldung = {
  /** Maschinenlesbarer Code, z. B. "budget_ueberschritten" */
  code: string;
  schwere: WarnSchwere;
  /** Für den Nutzer formulierter Text */
  text: string;
  /** Betroffenes Formularfeld, falls zuordenbar */
  feld?: string;
};

/** Eingabedaten für die Validierung eines geplanten Einsatzes. */
export type PlanungsEingabe = {
  mitarbeiterId: number | null;
  kundenId: number | null;
  datum: string | null;
  startzeit: string | null;
  endzeit: string | null;
  paragraph: Paragraph | null;
  /** Optionaler zweiter Paragraph, wenn ein Budget allein nicht reicht */
  paragraph2?: Paragraph | null;
  /** Stundenanteil des zweiten Paragraphen */
  stunden2?: number | null;
};

/**
 * Prüft die reinen Formal- und Zeitregeln eines geplanten Einsatzes.
 *
 * Budget-, Urlaubs- und Doppelbelegungsprüfungen benötigen Datenbankzugriff
 * und werden serverseitig ergänzt (siehe server/planungRouter.ts). Diese
 * Funktion läuft in Frontend und Backend identisch und liefert sofortiges
 * Feedback während der Eingabe.
 */
export function validierePlanungsEingabe(eingabe: PlanungsEingabe): PlanungsMeldung[] {
  const meldungen: PlanungsMeldung[] = [];

  if (!eingabe.mitarbeiterId) {
    meldungen.push({
      code: "mitarbeiter_fehlt",
      schwere: "blockierend",
      text: "Bitte einen Mitarbeiter auswählen.",
      feld: "mitarbeiterId",
    });
  }
  if (!eingabe.kundenId) {
    meldungen.push({
      code: "kunde_fehlt",
      schwere: "blockierend",
      text: "Bitte einen Kunden auswählen.",
      feld: "kundenId",
    });
  }
  if (!eingabe.datum || !/^\d{4}-\d{2}-\d{2}$/.test(eingabe.datum)) {
    meldungen.push({
      code: "datum_fehlt",
      schwere: "blockierend",
      text: "Bitte ein gültiges Datum angeben.",
      feld: "datum",
    });
  }
  if (!eingabe.paragraph) {
    meldungen.push({
      code: "paragraph_fehlt",
      schwere: "blockierend",
      text: "Bitte einen Abrechnungsparagraphen auswählen.",
      feld: "paragraph",
    });
  }

  const start = zeitZuMinuten(eingabe.startzeit);
  const ende = zeitZuMinuten(eingabe.endzeit);
  if (start === null) {
    meldungen.push({
      code: "startzeit_fehlt",
      schwere: "blockierend",
      text: "Bitte eine gültige Startzeit angeben.",
      feld: "startzeit",
    });
  }
  if (ende === null) {
    meldungen.push({
      code: "endzeit_fehlt",
      schwere: "blockierend",
      text: "Bitte eine gültige Endzeit angeben.",
      feld: "endzeit",
    });
  }

  const stunden = berechneStunden(eingabe.startzeit, eingabe.endzeit);
  if (stunden !== null) {
    if (stunden <= 0) {
      meldungen.push({
        code: "dauer_ungueltig",
        schwere: "blockierend",
        text: "Die Endzeit muss nach der Startzeit liegen.",
        feld: "endzeit",
      });
    } else if (stunden < MINDEST_DAUER_STUNDEN) {
      meldungen.push({
        code: "mindestdauer_unterschritten",
        schwere: "warnung",
        text:
          `Mindestbetreuungszeit unterschritten: ${formatStunden(stunden)} statt ` +
          `${formatStunden(MINDEST_DAUER_STUNDEN)}. Wiederholte Unterschreitungen werden dem Admin gemeldet.`,
        feld: "endzeit",
      });
    }
    if (stunden > 12) {
      meldungen.push({
        code: "dauer_zu_lang",
        schwere: "warnung",
        text: `Der Einsatz dauert ${formatStunden(stunden)}. Bitte prüfen, ob die Zeiten korrekt sind.`,
        feld: "endzeit",
      });
    }
    if (eingabe.startzeit && !liegtInArbeitszeit(eingabe.startzeit, stunden)) {
      meldungen.push({
        code: "ausserhalb_arbeitszeit",
        schwere: "warnung",
        text: `Der Einsatz liegt außerhalb der regulären Arbeitszeit (${ARBEITSZEIT_VON}–${ARBEITSZEIT_BIS} Uhr).`,
        feld: "startzeit",
      });
    }
  }

  // Zweiter Paragraph
  if (eingabe.paragraph2) {
    if (eingabe.paragraph2 === eingabe.paragraph) {
      meldungen.push({
        code: "paragraph2_doppelt",
        schwere: "blockierend",
        text: "Der zweite Abrechnungsparagraph muss sich vom ersten unterscheiden.",
        feld: "paragraph2",
      });
    }
    const stunden2 = eingabe.stunden2 ?? 0;
    if (stunden2 <= 0) {
      meldungen.push({
        code: "paragraph2_stunden_fehlen",
        schwere: "blockierend",
        text: "Bitte angeben, wie viele Stunden über den zweiten Paragraphen abgerechnet werden.",
        feld: "stunden2",
      });
    } else if (stunden !== null && stunden2 > stunden) {
      meldungen.push({
        code: "paragraph2_stunden_zu_hoch",
        schwere: "blockierend",
        text:
          `Der zweite Paragraph kann höchstens ${formatStunden(stunden)} abdecken – ` +
          `so lange dauert der Einsatz insgesamt.`,
        feld: "stunden2",
      });
    }
  }

  return meldungen;
}

/** Teilt die Gesamtstunden auf einen oder zwei Paragraphen auf. */
export function verteileStunden(args: {
  gesamtStunden: number;
  paragraph: Paragraph;
  paragraph2?: Paragraph | null;
  stunden2?: number | null;
}): ParagraphAnteil[] {
  const gesamt = runde2(Math.max(0, args.gesamtStunden));
  if (!args.paragraph2 || !args.stunden2 || args.stunden2 <= 0) {
    return [{ paragraph: args.paragraph, stunden: gesamt }];
  }
  const zweit = runde2(Math.min(args.stunden2, gesamt));
  const erst = runde2(gesamt - zweit);
  const anteile: ParagraphAnteil[] = [];
  if (erst > 0) anteile.push({ paragraph: args.paragraph, stunden: erst });
  if (zweit > 0) anteile.push({ paragraph: args.paragraph2, stunden: zweit });
  return anteile;
}

/** Gibt true zurück, wenn mindestens eine Meldung das Speichern verhindert. */
export function hatBlockierendeMeldung(meldungen: PlanungsMeldung[]): boolean {
  return meldungen.some((m) => m.schwere === "blockierend");
}

// ── Datumshilfen für die Planungsansichten ─────────────────────────────────

/**
 * Normalisiert Date/String auf "YYYY-MM-DD".
 *
 * Zeitzonensicher: DATE-Spalten liefert der MySQL-Treiber als Date-Objekt auf
 * UTC-Mitternacht. Würde man solche Werte über die lokale Zeitzone auslesen,
 * verschiebt sich das Kalenderdatum in westlichen Zeitzonen um einen Tag.
 * Deshalb wird ein reiner Mitternachtszeitpunkt in UTC gelesen, ein echter
 * Zeitstempel (z. B. `new Date()`) dagegen lokal.
 */
export function zuDatumsString(wert: string | Date | null | undefined): string {
  if (!wert) return "";
  if (typeof wert === "string") return wert.slice(0, 10);
  const istUtcMitternacht =
    wert.getUTCHours() === 0 &&
    wert.getUTCMinutes() === 0 &&
    wert.getUTCSeconds() === 0 &&
    wert.getUTCMilliseconds() === 0;
  if (istUtcMitternacht) return wert.toISOString().slice(0, 10);
  const jahr = wert.getFullYear();
  const monat = String(wert.getMonth() + 1).padStart(2, "0");
  const tag = String(wert.getDate()).padStart(2, "0");
  return `${jahr}-${monat}-${tag}`;
}

/**
 * Wandelt ein "YYYY-MM-DD"-Datum in ein Date-Objekt auf UTC-Mitternacht.
 *
 * Wird für Drizzle-DATE-Spalten benötigt: Der Treiber serialisiert über
 * `toISOString()`, sodass nur UTC-Mitternacht das Kalenderdatum unverändert
 * in der Datenbank ablegt.
 */
export function zuDatumsWert(datum: string): Date {
  return new Date(`${datum.slice(0, 10)}T00:00:00.000Z`);
}

/** Addiert Tage zu einem "YYYY-MM-DD"-Datum. */
export function addTage(datum: string, tage: number): string {
  const d = new Date(`${datum}T12:00:00`);
  d.setDate(d.getDate() + tage);
  return zuDatumsString(d);
}

/** Liefert das Datum des Montags der Woche, in der `datum` liegt. */
export function montagDerWoche(datum: string): string {
  const d = new Date(`${datum}T12:00:00`);
  const wochentag = (d.getDay() + 6) % 7; // Montag = 0
  d.setDate(d.getDate() - wochentag);
  return zuDatumsString(d);
}

/** Erzeugt eine fortlaufende Liste von Datumsstrings. */
export function datumsSpanne(startDatum: string, anzahlTage: number): string[] {
  return Array.from({ length: Math.max(0, anzahlTage) }, (_, i) => addTage(startDatum, i));
}

/** Gibt den Monatsschlüssel "YYYY-MM" eines Datums zurück. */
export function monatsSchluessel(datum: string | Date | null | undefined): string {
  return zuDatumsString(datum).slice(0, 7);
}

/** Prüft, ob ein Datum innerhalb eines Zeitraums liegt (inklusive Grenzen). */
export function liegtImZeitraum(
  datum: string | Date | null | undefined,
  von: string | Date | null | undefined,
  bis: string | Date | null | undefined,
): boolean {
  const d = zuDatumsString(datum);
  const v = zuDatumsString(von);
  const b = zuDatumsString(bis) || v;
  if (!d || !v) return false;
  return d >= v && d <= b;
}

// ── Feiertage (bundeseinheitlich) ───────────────────────────────────────────

/** Berechnet den Ostersonntag eines Jahres (Gaußsche Osterformel). */
function ostersonntag(jahr: number): Date {
  const a = jahr % 19;
  const b = Math.floor(jahr / 100);
  const c = jahr % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const monat = Math.floor((h + l - 7 * m + 114) / 31);
  const tag = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(jahr, monat - 1, tag, 12);
}

/**
 * Liefert die bundeseinheitlichen gesetzlichen Feiertage eines Jahres
 * als Zuordnung "YYYY-MM-DD" → Bezeichnung.
 */
export function getFeiertage(jahr: number): Record<string, string> {
  const ostern = ostersonntag(jahr);
  const relativ = (tage: number) => {
    const d = new Date(ostern);
    d.setDate(d.getDate() + tage);
    return zuDatumsString(d);
  };
  return {
    [`${jahr}-01-01`]: "Neujahr",
    [relativ(-2)]: "Karfreitag",
    [relativ(1)]: "Ostermontag",
    [`${jahr}-05-01`]: "Tag der Arbeit",
    [relativ(39)]: "Christi Himmelfahrt",
    [relativ(50)]: "Pfingstmontag",
    [`${jahr}-10-03`]: "Tag der Deutschen Einheit",
    [`${jahr}-12-25`]: "1. Weihnachtstag",
    [`${jahr}-12-26`]: "2. Weihnachtstag",
  };
}

/** Gibt den Feiertagsnamen zurück, falls das Datum ein Feiertag ist. */
export function getFeiertag(datum: string): string | null {
  const jahr = Number(datum.slice(0, 4));
  if (!Number.isFinite(jahr)) return null;
  return getFeiertage(jahr)[datum] ?? null;
}

// ── Farbzuordnung für Mitarbeiter (Kalender/Tourenplanung) ─────────────────

/**
 * Feste Farbpalette für die farbliche Kennzeichnung von Mitarbeitern in
 * Kalender und Tourenplanung. Die Zuordnung erfolgt deterministisch über die
 * Mitarbeiter-ID, damit ein Mitarbeiter immer dieselbe Farbe behält.
 */
export const MITARBEITER_FARBEN = [
  "#4a8c3f", // Lebenswert-Grün
  "#0ea5e9", // Blau
  "#8b5cf6", // Violett
  "#f59e0b", // Bernstein
  "#ec4899", // Pink
  "#14b8a6", // Türkis
  "#ef4444", // Rot
  "#6366f1", // Indigo
  "#84cc16", // Limette
  "#f97316", // Orange
] as const;

/** Liefert die feste Farbe eines Mitarbeiters. */
export function getMitarbeiterFarbe(mitarbeiterId: number | null | undefined): string {
  if (!mitarbeiterId || mitarbeiterId < 0) return "#9ca3af";
  return MITARBEITER_FARBEN[mitarbeiterId % MITARBEITER_FARBEN.length];
}
