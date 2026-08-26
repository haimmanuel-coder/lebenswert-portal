import { describe, expect, it } from "vitest";
import { erstellePersonalaktenHistorienCsv } from "./personalaktenExport";

describe("Personalakten-Historienexport", () => {
  it("erzeugt eine Excel-kompatible CSV mit Stammdaten, Arbeitsmuster und Urlaub", () => {
    const exportDaten = erstellePersonalaktenHistorienCsv({
      stichtag: "2026-08-26",
      mitarbeiter: [{ id: 7, vorname: "Anna", nachname: "Beispiel", email: "anna@example.de", aktiv: true, beschaeftigungsart: "teilzeit", eintrittsdatum: "2026-01-01", urlaubstageJahr: 18, urlaubstageVerbraucht: 3, arbeitstageWoche: '["Mo","Mi","Fr"]' }],
      arbeitsmuster: [{ mitarbeiterId: 7, arbeitstageWoche: '["Mo","Mi","Fr"]', gueltigAb: "2026-01-01", createdAt: "2026-01-01" }],
      urlaube: [{ mitarbeiterId: 7, von: "2026-07-06", bis: "2026-07-10", tage: 3, status: "genehmigt", notizen: 'Text mit "Anführungszeichen"', adminNotiz: "Freigabe", createdAt: "2026-06-01", updatedAt: "2026-06-02" }],
    });
    expect(exportDaten.dateiName).toBe("personalakte_arbeitsmuster_urlaub_2026-08-26.csv");
    expect(exportDaten.zeilen).toBe(3);
    expect(exportDaten.csv).toContain("Datensatztyp;Mitarbeiter-ID");
    expect(exportDaten.csv).toContain('"Arbeitsmuster"');
    expect(exportDaten.csv).toContain('"Urlaub"');
    expect(exportDaten.csv).toContain('"Text mit ""Anführungszeichen"""');
  });
});
