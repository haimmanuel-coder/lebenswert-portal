import { describe, expect, it } from "vitest";
import { berechneAbrechnungszeitraum } from "./abrechnungsZeitraum";

describe("Abrechnungszeitraum 16.–15.", () => {
  it("ordnet den 15. dem vorherigen Zeitraum und den 16. dem neuen Zeitraum zu", () => {
    expect(berechneAbrechnungszeitraum("2026-09-15")).toMatchObject({
      von: "2026-08-16",
      bis: "2026-09-15",
      label: "16.Aug 2026 – 15.Sep 2026",
    });
    expect(berechneAbrechnungszeitraum("2026-09-16")).toMatchObject({
      von: "2026-09-16",
      bis: "2026-10-15",
      label: "16.Sep 2026 – 15.Okt 2026",
    });
  });

  it("behandelt den Jahreswechsel ohne Kalendermonat-Überlauf", () => {
    expect(berechneAbrechnungszeitraum("2027-01-08")).toMatchObject({
      von: "2026-12-16",
      bis: "2027-01-15",
    });
  });
});
