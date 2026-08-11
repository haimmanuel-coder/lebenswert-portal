import { describe, expect, it } from "vitest";
import { generateNachweisPdf } from "./routers/unterweisungNachweisRouter";

describe("Unterweisungsnachweis – PDF", () => {
  it("erstellt einen PDF-Nachweis mit digitaler Unterschrifts-Eingabe", async () => {
    const pdf = await generateNachweisPdf({
      maVorname: "Test",
      maNachname: "Mitarbeiter",
      titel: "Sicherheitsunterweisung: Hygiene",
      thema: "hygiene_desinfektion",
      version: "1.0",
      inhalt: "Hände vor und nach jedem Einsatz desinfizieren.",
      unterweisungsDatum: "2026-08-11",
      bestaetigtAm: new Date("2026-08-11T10:00:00.000Z"),
      unterschriftBase64: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIW2P8z8DwHwAF/gL+qT91WQAAAABJRU5ErkJggg==",
      ipAdresse: "127.0.0.1",
      browserInfo: "Vitest",
    });

    expect(Buffer.isBuffer(pdf)).toBe(true);
    expect(pdf.subarray(0, 4).toString()).toBe("%PDF");
    expect(pdf.length).toBeGreaterThan(1_000);
  });
});
