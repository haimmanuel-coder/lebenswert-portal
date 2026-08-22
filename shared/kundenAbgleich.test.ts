import { describe, it, expect } from "vitest";
import {
  baueAbgleichIndex,
  baueKundenDatensatz,
  ergaenzeIndex,
  findeTreffer,
  klassifiziereKunde,
  nameSchluessel,
  normSchluessel,
  type AbgleichKunde,
} from "./kundenAbgleich";

const bestand: AbgleichKunde[] = [
  { id: 1, vorname: "Maria", nachname: "Mustermann", versicherungsnummer: "A123456789" },
  { id: 2, vorname: "Hans", nachname: "Beispiel", versicherungsnummer: null },
];

describe("normSchluessel / nameSchluessel", () => {
  it("trimmt und schreibt klein", () => {
    expect(normSchluessel("  A123  ")).toBe("a123");
    expect(normSchluessel(null)).toBe("");
  });
  it("baut zusammengesetzten Namensschlüssel", () => {
    expect(nameSchluessel("Maria", "Mustermann")).toBe("maria|mustermann");
  });
});

describe("findeTreffer", () => {
  const index = baueAbgleichIndex(bestand);

  it("matcht bevorzugt über die Versicherungsnummer (auch bei abweichendem Namen)", () => {
    expect(findeTreffer({ vorname: "Marija", nachname: "Musterman", versicherungsnummer: "a123456789" }, index)).toBe(1);
  });

  it("matcht über den Namen, wenn keine Versicherungsnummer vorliegt", () => {
    expect(findeTreffer({ vorname: "hans", nachname: "beispiel" }, index)).toBe(2);
  });

  it("liefert null bei unbekanntem Kunden", () => {
    expect(findeTreffer({ vorname: "Neu", nachname: "Kunde", versicherungsnummer: "Z999" }, index)).toBeNull();
  });

  it("matcht nicht über einen leeren Namensschlüssel", () => {
    const idx = baueAbgleichIndex([{ id: 9, vorname: "", nachname: "", versicherungsnummer: null }]);
    expect(findeTreffer({ vorname: "", nachname: "" }, idx)).toBeNull();
  });
});

describe("klassifiziereKunde", () => {
  const index = baueAbgleichIndex(bestand);

  it("bekannter Kunde -> aktualisierung", () => {
    expect(klassifiziereKunde({ vorname: "Maria", nachname: "Mustermann", versicherungsnummer: "A123456789" }, index))
      .toEqual({ typ: "aktualisierung", matchId: 1 });
  });

  it("unbekannter Kunde -> neu", () => {
    expect(klassifiziereKunde({ vorname: "Neu", nachname: "Kunde" }, index))
      .toEqual({ typ: "neu", matchId: null });
  });
});

describe("ergaenzeIndex", () => {
  it("verhindert doppelte Neuanlage derselben Zeile innerhalb eines Imports", () => {
    const index = baueAbgleichIndex([]);
    const zeile = { vorname: "Neu", nachname: "Kunde", versicherungsnummer: "N1" };
    expect(klassifiziereKunde(zeile, index).typ).toBe("neu");
    ergaenzeIndex(index, zeile, 42);
    // Dieselbe Zeile ein zweites Mal -> jetzt Aktualisierung auf die eben angelegte ID
    expect(klassifiziereKunde(zeile, index)).toEqual({ typ: "aktualisierung", matchId: 42 });
  });
});

describe("baueKundenDatensatz", () => {
  it("übernimmt nur nicht-leere Felder und mappt auf DB-Spalten", () => {
    const d = baueKundenDatensatz({
      vorname: "Maria", nachname: "Mustermann", strasse: "Weg 1", plz: "80331", ort: "München",
      telefon: " 089 1 ", pflegegrad: "3", paragraph: "39", kostentraeger: "AOK", versicherungsnummer: "A1", notizen: "",
    });
    expect(d).toEqual({
      vorname: "Maria", nachname: "Mustermann", strasse: "Weg 1", plz: "80331", ort: "München",
      telefon: "089 1", pflegegrad: 3, paragraph: "39", kostentraeger: "AOK", versicherungsnummer: "A1",
    });
    expect(d).not.toHaveProperty("notizen");
  });

  it("lässt ungültige Pflegegrade und Paragraphen aus", () => {
    const d = baueKundenDatensatz({ vorname: "A", nachname: "B", pflegegrad: "9", paragraph: "99z" });
    expect(d).not.toHaveProperty("pflegegrad");
    expect(d).not.toHaveProperty("paragraph");
  });

  it("überschreibt bestehende Werte nicht mit Leerwerten (Update-Sicherheit)", () => {
    const d = baueKundenDatensatz({ vorname: "A", nachname: "B", telefon: "", ort: "   " });
    expect(d).not.toHaveProperty("telefon");
    expect(d).not.toHaveProperty("ort");
  });
});
