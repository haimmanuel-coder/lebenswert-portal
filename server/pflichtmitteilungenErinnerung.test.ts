import { describe, expect, it } from "vitest";
import { ermittleOffenePflichtmitteilungen } from "./scheduled/pflichtmitteilungenErinnerung";

describe("Pflichtmitteilungs-Erinnerung", () => {
  it("ermittelt nur aktive Mitarbeiter ohne bestehende Lesebestätigung", () => {
    const offen = ermittleOffenePflichtmitteilungen(
      [{ id: 11, titel: "Neue Sicherheitsregel", typ: "wichtig" }],
      [{ id: 1, aktiv: true }, { id: 2, aktiv: false }, { id: 3, aktiv: true }],
      [{ mitteilungId: 11, mitarbeiterId: 1 }],
    );
    expect(offen).toEqual([{ mitteilung: { id: 11, titel: "Neue Sicherheitsregel", typ: "wichtig" }, mitarbeiterId: 3 }]);
  });
});
