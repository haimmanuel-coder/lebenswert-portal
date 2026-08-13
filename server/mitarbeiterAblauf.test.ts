import { describe, expect, it } from "vitest";
import { berechneBesuchsdauerMinuten, bereiteEinsatzUebernahmeVor, liegtImPlanungsfenster } from "./mitarbeiterAblauf";

describe("Mitarbeiterablauf", () => {
  it("erlaubt eigene Planungen nur innerhalb der kommenden 14 Kalendertage", () => {
    expect(liegtImPlanungsfenster("2026-08-13", "2026-08-13")).toBe(true);
    expect(liegtImPlanungsfenster("2026-08-26", "2026-08-13")).toBe(true);
    expect(liegtImPlanungsfenster("2026-08-27", "2026-08-13")).toBe(false);
    expect(liegtImPlanungsfenster("2026-08-12", "2026-08-13")).toBe(false);
  });

  it("berechnet die tatsächliche Besuchsdauer und verwendet bei Bedarf die geplante Dauer", () => {
    expect(berechneBesuchsdauerMinuten("2026-08-13T09:15:00.000Z", "2026-08-13T10:45:00.000Z", 2)).toBe(90);
    expect(berechneBesuchsdauerMinuten(undefined, undefined, 1.5)).toBe(90);
    expect(berechneBesuchsdauerMinuten("2026-08-13T11:00:00.000Z", "2026-08-13T10:00:00.000Z", 2)).toBe(120);
  });

  it("bereitet für Besuchsbericht, Fahrtenbuch und Leistungsnachweis ein konsistentes Einsatzdatum vor", () => {
    expect(bereiteEinsatzUebernahmeVor({
      einsatzDatum: new Date("2026-08-13T00:00:00.000Z"),
      tatsaechlicherStart: "2026-08-13T09:00:00.000Z",
      tatsaechlichesEnde: "2026-08-13T10:30:00.000Z",
      geplanteStunden: 2,
    })).toEqual({ datum: "2026-08-13", monat: "2026-08", dauerMinuten: 90 });
  });
});
