import { describe, expect, it } from "vitest";
import { generiereEinmaligesStartpasswort, waehleDruckbareMitarbeiter } from "./accessCredentials";

describe("Einmalige Zugangsdaten", () => {
  it("erzeugt ein ausreichend langes, druckbares Startpasswort", () => {
    const passwort = generiereEinmaligesStartpasswort();
    expect(passwort).toMatch(/^Lb![A-Za-z0-9_-]{16}$/);
    expect(passwort.length).toBeGreaterThanOrEqual(19);
  });

  it("erzeugt bei mehreren Zugangskarten unterschiedliche Startpasswörter", () => {
    const passwoerter = Array.from({ length: 12 }, generiereEinmaligesStartpasswort);
    expect(new Set(passwoerter).size).toBe(passwoerter.length);
  });

  it("wählt nur aktive Nicht-Admin-Mitarbeiter für den Kartendruck aus", () => {
    const auswahl = waehleDruckbareMitarbeiter([
      { id: 1, aktiv: 1, rolle: "mitarbeiter" },
      { id: 2, aktiv: 0, rolle: "mitarbeiter" },
      { id: 3, aktiv: 1, rolle: "admin" },
      { id: 4, aktiv: true, rolle: "teamleitung" },
    ]);
    expect(auswahl.map((ma) => ma.id)).toEqual([1, 4]);
  });

  it("schließt bei einer gefilterten Auswahl inaktive Datensätze weiterhin aus", () => {
    const auswahl = waehleDruckbareMitarbeiter([
      { id: 1, aktiv: 1, rolle: "mitarbeiter" },
      { id: 2, aktiv: 0, rolle: "mitarbeiter" },
    ], [1, 2]);
    expect(auswahl.map((ma) => ma.id)).toEqual([1]);
  });
});
