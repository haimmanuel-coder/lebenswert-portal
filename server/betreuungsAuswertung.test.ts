import { describe, expect, it } from "vitest";
import {
  berechneKundenParagraphenAuswertung,
  berechneMitarbeiterBetreuungskennzahlen,
} from "./betreuungsAuswertung";

describe("Betreuungs- und Budgetauswertung", () => {
  it("weist gesplittete Einsatzstunden je Paragraph korrekt aus und ignoriert abgesagte Einsätze", () => {
    const auswertung = berechneKundenParagraphenAuswertung(
      [
        { id: 1, mitarbeiterId: 7, kundenId: 20, status: "abgeschlossen", paragraph: "39", paragraph2: "45b", dauerStunden: "2.5", stunden1: "2", stunden2: "0.5" },
        { id: 2, mitarbeiterId: 7, kundenId: 20, status: "geplant", paragraph: "45b", dauerStunden: "1.5", stunden1: "1.5" },
        { id: 3, mitarbeiterId: 7, kundenId: 20, status: "abgesagt", paragraph: "39", dauerStunden: "4", stunden1: "4" },
      ],
      [
        { kundenId: 20, leistungsbereich: "39", jahresbudgetCent: 100000, verbrauchtCent: 25000, stundensatzCent: 5000 },
        { kundenId: 20, leistungsbereich: "45b", jahresbudgetCent: 13100, verbrauchtCent: 3100, stundensatzCent: 3500 },
      ],
    );

    expect(auswertung.find((eintrag) => eintrag.paragraph === "39")).toMatchObject({
      einsaetze: 1,
      stundenGeplant: 2,
      stundenAbgeschlossen: 2,
      budgetnutzungProzent: 25,
      restbudgetEuro: 750,
    });
    expect(auswertung.find((eintrag) => eintrag.paragraph === "45b")).toMatchObject({
      einsaetze: 2,
      stundenGeplant: 2,
      stundenAbgeschlossen: 0.5,
      budgetnutzungProzent: 24,
      restbudgetEuro: 100,
    });
  });

  it("ordnet den Einsatzwert dem Budget des tatsächlich betreuten Kunden zu", () => {
    const kennzahlen = berechneMitarbeiterBetreuungskennzahlen({
      mitarbeiter: [{ id: 7, vorname: "Test", nachname: "Mitarbeiter" }],
      einsaetze: [
        { id: 1, mitarbeiterId: 7, kundenId: 20, status: "abgeschlossen", paragraph: "39", dauerStunden: "2", stunden1: "2" },
        { id: 2, mitarbeiterId: 7, kundenId: 21, status: "geplant", paragraph: "45b", dauerStunden: "1", stunden1: "1" },
      ],
      budgets: [
        { kundenId: 20, leistungsbereich: "39", jahresbudgetCent: 100000, verbrauchtCent: 25000, stundensatzCent: 5000 },
        { kundenId: 21, leistungsbereich: "45b", jahresbudgetCent: 20000, verbrauchtCent: 2000, stundensatzCent: 3500 },
      ],
    });

    expect(kennzahlen).toEqual([
      expect.objectContaining({
        kundenAnzahl: 2,
        einsaetzeGeplant: 2,
        einsaetzeAbgeschlossen: 1,
        abschlussquoteProzent: 50,
        betreuungsstunden: 3,
        budgetwirkungEuro: 135,
        budgetnutzungDerBetreutenKundenProzent: 23,
        budgetRestEuro: 930,
      }),
    ]);
  });
});
