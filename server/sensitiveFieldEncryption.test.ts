import { describe, expect, it } from "vitest";
import { entschluessleMitarbeiterStammdaten, entschluessleSensiblesFeld, verschluessleMitarbeiterStammdaten, verschluessleSensiblesFeld } from "./sensitiveFieldEncryption";

describe("Verschlüsselung sensibler Mitarbeiterstammdaten", () => {
  it("verschlüsselt und entschlüsselt einzelne Werte verlustfrei", () => {
    const klartext = "DE89370400440532013000";
    const verschluesselt = verschluessleSensiblesFeld(klartext);
    expect(verschluesselt).toMatch(/^enc:v1:/);
    expect(verschluesselt).not.toContain(klartext);
    expect(entschluessleSensiblesFeld(verschluesselt)).toBe(klartext);
  });

  it("hält alte Klartextwerte lesbar und verschlüsselt nur die vorgesehenen Felder", () => {
    const daten = { iban: "DE44500105175407324931", steueridentnummer: "12345678901", sozialversicherungsnummer: "12 123456 A 123", name: "Unverändert" };
    const verschluesselt = verschluessleMitarbeiterStammdaten(daten);
    expect(verschluesselt.iban).toMatch(/^enc:v1:/);
    expect(verschluesselt.name).toBe("Unverändert");
    expect(entschluessleMitarbeiterStammdaten(verschluesselt)).toEqual(daten);
  });
});
