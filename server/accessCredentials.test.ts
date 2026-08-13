import { describe, expect, it } from "vitest";
import { generiereEinmaligesStartpasswort } from "./accessCredentials";

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
});
