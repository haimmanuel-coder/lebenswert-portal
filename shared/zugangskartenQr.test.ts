import { describe, expect, it } from "vitest";
import { erstelleZugangskartenQrZiel } from "./zugangskartenQr";

describe("Zugangskarten-QR-Ziel", () => {
  it("enthält ausschließlich Portaladresse und normalisierte E-Mail", () => {
    const ziel = erstelleZugangskartenQrZiel("  Maria.Muster@Lebenswert.DE ");
    expect(ziel).toBe("https://portal.lebenswert-betreuung.de/?email=maria.muster%40lebenswert.de");
    expect(ziel.toLowerCase()).not.toContain("passwort");
    expect(ziel.toLowerCase()).not.toContain("token");
  });

  it("lehnt eine leere E-Mail ab", () => {
    expect(() => erstelleZugangskartenQrZiel(" ")).toThrow("E-Mail");
  });
});
