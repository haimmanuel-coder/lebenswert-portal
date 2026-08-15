import { describe, expect, it } from "vitest";
import {
  berechneLeistungsnachweisKontrolle,
  erstellePflegekassenCsv,
  erstelleStundennachweisCsv,
  istLeistungsnachweisAbgeschlossen,
} from "./monatsabschlussService";

const musterZeilen = [
  { id: 1, mitarbeiterId: 7, mitarbeiterName: "Anna Beispiel", kundenName: "Kunde Eins", paragraph: "45b", stunden: 2.5, betrag: 87.5, status: "freigegeben" },
  { id: 2, mitarbeiterId: 7, mitarbeiterName: "Anna Beispiel", kundenName: "Kunde Zwei", paragraph: "39", stunden: 1.5, betrag: 52.5, status: "versendet" },
];

describe("Monatsabschluss-Helfer", () => {
  it("erkennt nur freigegebene oder versendete Leistungsnachweise als abgeschlossen", () => {
    expect(istLeistungsnachweisAbgeschlossen("freigegeben")).toBe(true);
    expect(istLeistungsnachweisAbgeschlossen("versendet")).toBe(true);
    expect(istLeistungsnachweisAbgeschlossen("pruefung")).toBe(false);
  });

  it("blockiert den Abschluss bei offenen Leistungsnachweisen", () => {
    const status = berechneLeistungsnachweisKontrolle("2026-08", [...musterZeilen, { ...musterZeilen[0], id: 3, status: "offen" }]);
    expect(status.kannAbschliessen).toBe(false);
    expect(status.offen).toBe(1);
    expect(status.offeneMitarbeiter[0].mitarbeiterName).toBe("Anna Beispiel");
  });

  it("erstellt getrennte Pflegekassen- und Stundenexporte", () => {
    expect(erstellePflegekassenCsv("2026-08", musterZeilen)).toContain("Kunde Eins");
    const stundenCsv = erstelleStundennachweisCsv("2026-08", musterZeilen);
    expect(stundenCsv).toContain("Anna Beispiel");
    expect(stundenCsv).toContain("4,00");
  });
});
