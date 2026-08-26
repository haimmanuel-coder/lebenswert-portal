import { describe, expect, it } from "vitest";
import { berechneGesetzlichenJahresurlaub, berechneUrlaubsverbrauch, berechneZeitanteiligenJahresurlaub, normalisiereArbeitstage } from "./urlaubsLogik";

describe("Urlaubslogik nach planmäßigen Arbeitstagen", () => {
  it("berechnet den gesetzlichen Richtwert anhand der Arbeitstage, nicht anhand der Stunden", () => {
    expect(berechneGesetzlichenJahresurlaub(["Mo", "Mi", "Fr"])).toBe(12);
    expect(berechneGesetzlichenJahresurlaub(["Mo", "Di", "Mi", "Do", "Fr"])).toBe(20);
  });

  it("verbraucht in einer Drei-Tage-Woche nur die tatsächlich vereinbarten Arbeitstage", () => {
    const verbrauch = berechneUrlaubsverbrauch({
      von: "2026-06-01",
      bis: "2026-06-07",
      arbeitstageWoche: ["Mo", "Mi", "Fr"],
    });
    expect(verbrauch.tage).toBe(3);
    expect(verbrauch.arbeitstage).toEqual(["2026-06-01", "2026-06-03", "2026-06-05"]);
  });

  it("nimmt gesetzliche Feiertage im festgelegten Portalmodell aus dem Verbrauch heraus", () => {
    const verbrauch = berechneUrlaubsverbrauch({
      von: "2026-05-01",
      bis: "2026-05-01",
      arbeitstageWoche: ["Fr"],
    });
    expect(verbrauch.tage).toBe(0);
    expect(verbrauch.ausgenommeneFeiertage[0]).toMatchObject({ datum: "2026-05-01", name: "Tag der Arbeit" });
  });

  it("akzeptiert auch Wochenend-Arbeitstage für Schicht- und Ausnahmeplanung", () => {
    const verbrauch = berechneUrlaubsverbrauch({
      von: "2026-06-06",
      bis: "2026-06-07",
      arbeitstageWoche: ["Sa", "So"],
    });
    expect(verbrauch.tage).toBe(2);
  });

  it("nimmt auch nur im gewählten Bundesland geltende Feiertage aus dem Verbrauch heraus", () => {
    const verbrauch = berechneUrlaubsverbrauch({
      von: "2026-03-06",
      bis: "2026-03-10",
      arbeitstageWoche: ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"],
      bundesland: "BE",
    });
    expect(verbrauch.ausgenommeneFeiertage).toEqual([{ datum: "2026-03-08", name: "Internationaler Frauentag" }]);
    expect(verbrauch.tage).toBe(4);
  });

  it("berücksichtigt bei einem unterjährigen Vertragswechsel das jeweils gültige Wochenmuster", () => {
    const verbrauch = berechneUrlaubsverbrauch({
      von: "2026-06-01",
      bis: "2026-06-07",
      arbeitstageWoche: ["Di", "Do"],
      arbeitsmusterHistorie: [
        { arbeitstageWoche: ["Mo", "Mi", "Fr"], gueltigAb: "2026-01-01", gueltigBis: "2026-06-03" },
        { arbeitstageWoche: ["Di", "Do"], gueltigAb: "2026-06-04" },
      ],
    });
    expect(verbrauch.arbeitstage).toEqual(["2026-06-01", "2026-06-03", "2026-06-04"]);
    expect(verbrauch.tage).toBe(3);
  });

  it("ermittelt den gesetzlichen Mindestanspruch bei Eintritt im laufenden Jahr zeitanteilig", () => {
    const anspruch = berechneZeitanteiligenJahresurlaub({
      jahr: 2026,
      eintrittsdatum: "2026-07-01",
      arbeitstageWoche: ["Mo", "Di", "Mi", "Do", "Fr"],
    });
    expect(anspruch).toBe(10);
  });

  it("fällt bei fehlenden Altdaten sicher auf eine Fünf-Tage-Woche zurück", () => {
    expect(normalisiereArbeitstage(null)).toEqual(["Mo", "Di", "Mi", "Do", "Fr"]);
  });
});
