/**
 * Tests der zentralen Planungs- und Berechnungslogik.
 *
 * Die hier geprüften Regeln bestimmen Budgetabbuchungen und Lohnkosten –
 * Fehler hätten unmittelbare finanzielle Auswirkungen. Die Beispielwerte
 * entsprechen den fachlichen Vorgaben aus der Anforderungsbeschreibung.
 */

import { describe, expect, it } from "vitest";
import {
  ANFAHRT_PAUSCHALE,
  LOHN_PRO_STUNDE,
  MINIJOB_GRENZE,
  addTage,
  berechneAlleBudgetLagen,
  berechneBudgetLage,
  berechneBudgetVorschau,
  berechneEinsatzKosten,
  berechneEndzeit,
  berechneLohnkosten,
  berechneStunden,
  datumsSpanne,
  getFeiertag,
  getMitarbeiterFarbe,
  getStundensatz,
  hatBlockierendeMeldung,
  liegtImZeitraum,
  liegtInArbeitszeit,
  minutenZuZeit,
  monatsSchluessel,
  montagDerWoche,
  pruefeMinijobGrenze,
  runde2,
  validierePlanungsEingabe,
  verteileStunden,
  zeitZuMinuten,
  zeitenUeberschneidenSich,
  zuDatumsString,
  zuDatumsWert,
  zuZahl,
} from "./planungsLogik";

// ── Stundenberechnung ───────────────────────────────────────────────────────

describe("Stundenberechnung aus Start- und Endzeit", () => {
  it("berechnet 09:00–11:30 als 2,5 Stunden", () => {
    expect(berechneStunden("09:00", "11:30")).toBe(2.5);
  });

  it("verarbeitet Sekundenangaben aus der Datenbank", () => {
    expect(berechneStunden("09:00:00", "11:30:00")).toBe(2.5);
  });

  it("rechnet über Mitternacht hinweg", () => {
    expect(berechneStunden("22:00", "01:00")).toBe(3);
  });

  it("liefert null bei fehlenden oder ungültigen Zeiten", () => {
    expect(berechneStunden(null, "11:30")).toBeNull();
    expect(berechneStunden("09:00", null)).toBeNull();
    expect(berechneStunden("25:00", "11:30")).toBeNull();
    expect(berechneStunden("neun uhr", "11:30")).toBeNull();
  });

  it("berechnet die Endzeit aus Start und Dauer", () => {
    expect(berechneEndzeit("09:00", 2.5)).toBe("11:30");
    expect(berechneEndzeit("22:00", 3)).toBe("01:00");
    expect(berechneEndzeit("09:00", 0)).toBeNull();
  });

  it("wandelt Zeiten und Minuten verlustfrei um", () => {
    expect(zeitZuMinuten("09:45")).toBe(585);
    expect(minutenZuZeit(585)).toBe("09:45");
    expect(zeitZuMinuten("24:00")).toBeNull();
  });
});

// ── Budgetberechnung ────────────────────────────────────────────────────────

describe("Budgetberechnung nach Verrechnungssatz", () => {
  it("berechnet 347 € ÷ 36 €/Std. = 9,64 Stunden", () => {
    const lage = berechneBudgetLage({ paragraph: "45b", budget: 347, verbraucht: 0 });
    expect(lage.stundensatz).toBe(36);
    expect(lage.restbudget).toBe(347);
    expect(lage.verfuegbareStunden).toBe(9.64);
  });

  it("zieht den Verbrauch vom Budget ab", () => {
    const lage = berechneBudgetLage({ paragraph: "45b", budget: 500, verbraucht: 153 });
    expect(lage.restbudget).toBe(347);
    expect(lage.verfuegbareStunden).toBe(9.64);
  });

  it("nutzt den Verrechnungssatz, nicht den Stundenlohn", () => {
    // Bei 16 €/Std. wären es 21,69 Std. – das wäre fachlich falsch.
    const lage = berechneBudgetLage({ paragraph: "45b", budget: 347, verbraucht: 0 });
    expect(lage.verfuegbareStunden).not.toBe(21.69);
    expect(lage.stundensatz).not.toBe(LOHN_PRO_STUNDE);
  });

  it("liefert bei aufgebrauchtem Budget keine negativen Stunden", () => {
    const lage = berechneBudgetLage({ paragraph: "39", budget: 100, verbraucht: 150 });
    expect(lage.restbudget).toBe(-50);
    expect(lage.verfuegbareStunden).toBe(0);
  });

  it("markiert Budgets unter 10 % als kritisch", () => {
    expect(berechneBudgetLage({ paragraph: "45b", budget: 1000, verbraucht: 950 }).kritisch).toBe(true);
    expect(berechneBudgetLage({ paragraph: "45b", budget: 1000, verbraucht: 500 }).kritisch).toBe(false);
  });

  it("verarbeitet Decimal-Strings aus der Datenbank", () => {
    const lage = berechneBudgetLage({ paragraph: "45a", budget: "347.00", verbraucht: "0.00" });
    expect(lage.verfuegbareStunden).toBe(9.64);
  });

  it("liest alle drei Paragraphen aus einem Kundendatensatz", () => {
    const lagen = berechneAlleBudgetLagen({
      budget45b: "347.00", verbraucht45b: "0.00",
      budget45a: "318.00", verbraucht45a: "118.00",
      budget39: "295.00", verbraucht39: "0.00",
    });
    expect(lagen["45b"].verfuegbareStunden).toBe(9.64);
    expect(lagen["45a"].restbudget).toBe(200);
    expect(lagen["39"].verfuegbareStunden).toBe(8.19);
  });

  it("berücksichtigt betriebsindividuelle Sätze", () => {
    expect(getStundensatz("45b")).toBe(36);
    expect(getStundensatz("45b", { "45b": 40 })).toBe(40);
    expect(getStundensatz("45b", { "45b": 0 })).toBe(36); // ungültiger Satz ignoriert
  });
});

// ── Einsatzkosten inklusive Fahrtkosten ────────────────────────────────────

describe("Einsatzkosten und Fahrtkosten", () => {
  it("rechnet die Anfahrtspauschale immer mit ein", () => {
    const kosten = berechneEinsatzKosten({ anteile: [{ paragraph: "45b", stunden: 2.5 }] });
    expect(kosten.betreuungsKosten).toBe(90); // 2,5 × 36 €
    expect(kosten.fahrtkosten).toBe(ANFAHRT_PAUSCHALE);
    expect(kosten.gesamtKosten).toBe(96); // 90 € + 6 €
  });

  it("berechnet Lohnkosten mit 16 €/Std.", () => {
    const kosten = berechneEinsatzKosten({ anteile: [{ paragraph: "45b", stunden: 2.5 }] });
    expect(kosten.lohnkosten).toBe(40); // 2,5 × 16 €
    expect(berechneLohnkosten(2.5)).toBe(40);
  });

  it("verteilt die Fahrtkosten anteilig auf zwei Paragraphen", () => {
    const kosten = berechneEinsatzKosten({
      anteile: [
        { paragraph: "45a", stunden: 3 },
        { paragraph: "39", stunden: 1 },
      ],
    });
    expect(kosten.gesamtStunden).toBe(4);
    expect(kosten.anteile[0].fahrtkosten).toBe(4.5); // 6 € × 3/4
    expect(kosten.anteile[1].fahrtkosten).toBe(1.5); // 6 € × 1/4
    // Summe der Anteile entspricht der Gesamtpauschale
    expect(runde2(kosten.anteile[0].fahrtkosten + kosten.anteile[1].fahrtkosten)).toBe(ANFAHRT_PAUSCHALE);
    expect(kosten.gesamtKosten).toBe(150); // 4 × 36 € + 6 €
  });

  it("erlaubt das Abschalten der Anfahrtspauschale", () => {
    const kosten = berechneEinsatzKosten({
      anteile: [{ paragraph: "45b", stunden: 2 }],
      anfahrtPauschale: 0,
    });
    expect(kosten.gesamtKosten).toBe(72);
  });
});

// ── Budgetvorschau ──────────────────────────────────────────────────────────

describe("Budgetvorschau vor und nach dem Einsatz", () => {
  it("zeigt Restbudget und Reststunden nach einem 2,5-Stunden-Einsatz", () => {
    const lage = berechneBudgetLage({ paragraph: "45b", budget: 347, verbraucht: 0 });
    const vorschau = berechneBudgetVorschau({ lage, kosten: 90 });
    expect(vorschau.restbudgetVorher).toBe(347);
    expect(vorschau.stundenVorher).toBe(9.64);
    expect(vorschau.restbudgetNachher).toBe(257);
    expect(vorschau.stundenNachher).toBe(7.14);
    expect(vorschau.reichtNicht).toBe(false);
  });

  it("erkennt fehlende Budgetdeckung und beziffert den Fehlbetrag", () => {
    const lage = berechneBudgetLage({ paragraph: "39", budget: 50, verbraucht: 0 });
    const vorschau = berechneBudgetVorschau({ lage, kosten: 96 });
    expect(vorschau.reichtNicht).toBe(true);
    expect(vorschau.fehlbetrag).toBe(46);
    expect(vorschau.stundenNachher).toBe(0);
  });
});

// ── Minijob-Grenze ──────────────────────────────────────────────────────────

describe("Minijob-Grenze", () => {
  it("warnt bei Überschreitung von 603 €", () => {
    const status = pruefeMinijobGrenze({ bisherigeLohnkosten: 580, geplanteLohnkosten: 40 });
    expect(status.gesamtLohnkosten).toBe(620);
    expect(status.ueberschritten).toBe(true);
    expect(status.meldung).toContain("ACHTUNG");
    expect(status.meldung).toContain("Minijob-Grenze");
  });

  it("warnt nicht, solange die Grenze eingehalten wird", () => {
    const status = pruefeMinijobGrenze({ bisherigeLohnkosten: 100, geplanteLohnkosten: 40 });
    expect(status.ueberschritten).toBe(false);
    expect(status.vorwarnung).toBe(false);
    expect(status.meldung).toBeNull();
    expect(status.verbleibend).toBe(463);
  });

  it("gibt ab 85 % der Grenze eine Vorwarnung aus", () => {
    const status = pruefeMinijobGrenze({ bisherigeLohnkosten: 520, geplanteLohnkosten: 0 });
    expect(status.vorwarnung).toBe(true);
    expect(status.ueberschritten).toBe(false);
    expect(status.auslastungProzent).toBe(86);
  });

  it("gilt nicht für Teilzeit- und Vollzeitkräfte", () => {
    const teilzeit = pruefeMinijobGrenze({
      bisherigeLohnkosten: 2000,
      geplanteLohnkosten: 40,
      beschaeftigungsart: "teilzeit",
    });
    expect(teilzeit.ueberschritten).toBe(false);
    expect(teilzeit.meldung).toBeNull();

    const minijob = pruefeMinijobGrenze({
      bisherigeLohnkosten: 2000,
      geplanteLohnkosten: 40,
      beschaeftigungsart: "minijob",
    });
    expect(minijob.ueberschritten).toBe(true);
  });

  it("verwendet die Grenze aus der zentralen Konstante", () => {
    expect(MINIJOB_GRENZE).toBe(603);
    expect(pruefeMinijobGrenze({ bisherigeLohnkosten: 0 }).grenze).toBe(603);
  });
});

// ── Validierung ─────────────────────────────────────────────────────────────

describe("Validierung der Planungseingabe", () => {
  const gueltig = {
    mitarbeiterId: 1,
    kundenId: 2,
    datum: "2026-08-03",
    startzeit: "09:00",
    endzeit: "11:30",
    paragraph: "45b" as const,
  };

  it("akzeptiert eine vollständige, gültige Eingabe", () => {
    const meldungen = validierePlanungsEingabe(gueltig);
    expect(hatBlockierendeMeldung(meldungen)).toBe(false);
  });

  it("verlangt Mitarbeiter, Kunde, Datum und Paragraph", () => {
    const meldungen = validierePlanungsEingabe({
      mitarbeiterId: null,
      kundenId: null,
      datum: null,
      startzeit: null,
      endzeit: null,
      paragraph: null,
    });
    const codes = meldungen.map((m) => m.code);
    expect(codes).toContain("mitarbeiter_fehlt");
    expect(codes).toContain("kunde_fehlt");
    expect(codes).toContain("datum_fehlt");
    expect(codes).toContain("paragraph_fehlt");
    expect(codes).toContain("startzeit_fehlt");
    expect(codes).toContain("endzeit_fehlt");
    expect(hatBlockierendeMeldung(meldungen)).toBe(true);
  });

  it("warnt bei Unterschreitung der Mindestbetreuungszeit", () => {
    const meldungen = validierePlanungsEingabe({ ...gueltig, endzeit: "10:00" });
    const meldung = meldungen.find((m) => m.code === "mindestdauer_unterschritten");
    expect(meldung).toBeDefined();
    // Eine Unterschreitung blockiert nicht, wird aber gemeldet und eskaliert.
    expect(meldung?.schwere).toBe("warnung");
  });

  it("meldet Einsätze außerhalb der Arbeitszeit", () => {
    const meldungen = validierePlanungsEingabe({ ...gueltig, startzeit: "04:00", endzeit: "06:00" });
    expect(meldungen.some((m) => m.code === "ausserhalb_arbeitszeit")).toBe(true);
  });

  it("blockiert einen identischen zweiten Paragraphen", () => {
    const meldungen = validierePlanungsEingabe({ ...gueltig, paragraph2: "45b", stunden2: 1 });
    expect(meldungen.some((m) => m.code === "paragraph2_doppelt")).toBe(true);
    expect(hatBlockierendeMeldung(meldungen)).toBe(true);
  });

  it("blockiert einen zweiten Paragraphen ohne Stundenangabe", () => {
    const meldungen = validierePlanungsEingabe({ ...gueltig, paragraph2: "39", stunden2: 0 });
    expect(meldungen.some((m) => m.code === "paragraph2_stunden_fehlen")).toBe(true);
  });

  it("blockiert mehr Zweitstunden als Gesamtdauer", () => {
    const meldungen = validierePlanungsEingabe({ ...gueltig, paragraph2: "39", stunden2: 5 });
    expect(meldungen.some((m) => m.code === "paragraph2_stunden_zu_hoch")).toBe(true);
  });
});

// ── Stundenverteilung auf zwei Paragraphen ─────────────────────────────────

describe("Stundenverteilung auf zwei Paragraphen", () => {
  it("legt ohne zweiten Paragraphen alles auf den ersten", () => {
    const anteile = verteileStunden({ gesamtStunden: 2.5, paragraph: "45b" });
    expect(anteile).toEqual([{ paragraph: "45b", stunden: 2.5 }]);
  });

  it("teilt die Stunden auf beide Paragraphen auf", () => {
    const anteile = verteileStunden({
      gesamtStunden: 4,
      paragraph: "45a",
      paragraph2: "39",
      stunden2: 1,
    });
    expect(anteile).toEqual([
      { paragraph: "45a", stunden: 3 },
      { paragraph: "39", stunden: 1 },
    ]);
  });

  it("begrenzt den zweiten Anteil auf die Gesamtdauer", () => {
    const anteile = verteileStunden({
      gesamtStunden: 2,
      paragraph: "45b",
      paragraph2: "39",
      stunden2: 5,
    });
    expect(anteile).toEqual([{ paragraph: "39", stunden: 2 }]);
  });

  it("bildet das Beispiel §45a 300 € + §39 120 € = 420 € Gesamtbudget ab", () => {
    const kosten = berechneEinsatzKosten({
      anteile: verteileStunden({ gesamtStunden: 10, paragraph: "45a", paragraph2: "39", stunden2: 3 }),
      anfahrtPauschale: 0,
    });
    // 7 Std. × 36 € = 252 € über §45a, 3 Std. × 36 € = 108 € über §39
    expect(kosten.anteile[0].betreuungsKosten).toBe(252);
    expect(kosten.anteile[1].betreuungsKosten).toBe(108);
    expect(kosten.gesamtKosten).toBe(360);
  });
});

// ── Überschneidungen ────────────────────────────────────────────────────────

describe("Zeitüberschneidungen (Doppelbuchung)", () => {
  it("erkennt sich überlappende Termine", () => {
    expect(zeitenUeberschneidenSich("09:00", 2, "10:00", 2)).toBe(true);
  });

  it("lässt direkt aufeinanderfolgende Termine zu", () => {
    expect(zeitenUeberschneidenSich("09:00", 2, "11:00", 2)).toBe(false);
  });

  it("erkennt vollständig eingeschlossene Termine", () => {
    expect(zeitenUeberschneidenSich("09:00", 4, "10:00", 1)).toBe(true);
  });

  it("prüft die Lage im Arbeitszeitrahmen", () => {
    expect(liegtInArbeitszeit("09:00", 2)).toBe(true);
    expect(liegtInArbeitszeit("05:00", 2)).toBe(false);
    expect(liegtInArbeitszeit("21:00", 3)).toBe(false);
  });
});

// ── Datums- und Kalenderhilfen ─────────────────────────────────────────────

describe("Datums- und Kalenderhilfen", () => {
  it("normalisiert DATE-Werte zeitzonensicher", () => {
    // MySQL liefert DATE-Spalten als UTC-Mitternacht – das Kalenderdatum
    // darf sich dabei nicht um einen Tag verschieben.
    expect(zuDatumsString(new Date("2026-08-03T00:00:00.000Z"))).toBe("2026-08-03");
    expect(zuDatumsString("2026-08-03")).toBe("2026-08-03");
    expect(zuDatumsString("2026-08-03T14:33:00Z")).toBe("2026-08-03");
    expect(zuDatumsString(null)).toBe("");
  });

  it("wandelt Datumsstrings verlustfrei in Date-Werte und zurück", () => {
    expect(zuDatumsString(zuDatumsWert("2026-08-03"))).toBe("2026-08-03");
    expect(zuDatumsWert("2026-08-03").toISOString().slice(0, 10)).toBe("2026-08-03");
  });

  it("addiert Tage über Monatsgrenzen hinweg", () => {
    expect(addTage("2026-08-30", 3)).toBe("2026-09-02");
    expect(addTage("2026-01-01", -1)).toBe("2025-12-31");
  });

  it("findet den Montag der jeweiligen Woche", () => {
    expect(montagDerWoche("2026-08-05")).toBe("2026-08-03"); // Mittwoch → Montag
    expect(montagDerWoche("2026-08-03")).toBe("2026-08-03"); // Montag bleibt
    expect(montagDerWoche("2026-08-09")).toBe("2026-08-03"); // Sonntag → Montag
  });

  it("erzeugt eine fortlaufende Datumsspanne", () => {
    expect(datumsSpanne("2026-08-03", 3)).toEqual(["2026-08-03", "2026-08-04", "2026-08-05"]);
    expect(datumsSpanne("2026-08-03", 14)).toHaveLength(14);
  });

  it("bestimmt den Monatsschlüssel", () => {
    expect(monatsSchluessel("2026-08-03")).toBe("2026-08");
  });

  it("prüft die Lage in einem Zeitraum inklusive der Grenzen", () => {
    expect(liegtImZeitraum("2026-08-05", "2026-08-03", "2026-08-07")).toBe(true);
    expect(liegtImZeitraum("2026-08-03", "2026-08-03", "2026-08-07")).toBe(true);
    expect(liegtImZeitraum("2026-08-07", "2026-08-03", "2026-08-07")).toBe(true);
    expect(liegtImZeitraum("2026-08-08", "2026-08-03", "2026-08-07")).toBe(false);
    // Ohne Enddatum gilt der Starttag
    expect(liegtImZeitraum("2026-08-03", "2026-08-03", null)).toBe(true);
  });

  it("kennt die bundeseinheitlichen Feiertage", () => {
    expect(getFeiertag("2026-01-01")).toBe("Neujahr");
    expect(getFeiertag("2026-10-03")).toBe("Tag der Deutschen Einheit");
    expect(getFeiertag("2026-04-03")).toBe("Karfreitag"); // Ostern 2026: 5. April
    expect(getFeiertag("2026-04-06")).toBe("Ostermontag");
    expect(getFeiertag("2026-08-04")).toBeNull();
  });
});

// ── Sonstige Hilfsfunktionen ────────────────────────────────────────────────

describe("Hilfsfunktionen", () => {
  it("wandelt Datenbankwerte robust in Zahlen", () => {
    expect(zuZahl("36.00")).toBe(36);
    expect(zuZahl(36)).toBe(36);
    expect(zuZahl(null)).toBe(0);
    expect(zuZahl("")).toBe(0);
    expect(zuZahl("keine Zahl")).toBe(0);
  });

  it("rundet kaufmännisch auf zwei Nachkommastellen", () => {
    expect(runde2(9.6388)).toBe(9.64);
    expect(runde2(0.1 + 0.2)).toBe(0.3);
  });

  it("weist jedem Mitarbeiter eine stabile Farbe zu", () => {
    expect(getMitarbeiterFarbe(3)).toBe(getMitarbeiterFarbe(3));
    expect(getMitarbeiterFarbe(null)).toBe("#9ca3af");
  });
});
