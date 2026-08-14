import { describe, expect, it } from "vitest";
import { pruefeSicheresPasswort } from "./passwordPolicy";

describe("Passwortregeln", () => {
  it("akzeptiert ein ausreichend langes Passwort mit allen Zeichenarten", () => {
    expect(pruefeSicheresPasswort("Sicher!2026Test").gueltig).toBe(true);
  });

  it("lehnt fehlende Zeichenarten und zu kurze Passwörter ab", () => {
    expect(pruefeSicheresPasswort("kurz!12").gueltig).toBe(false);
    expect(pruefeSicheresPasswort("nursohnezeichen12").gueltig).toBe(false);
    expect(pruefeSicheresPasswort("NURMITGROSS!123").gueltig).toBe(false);
  });
});
