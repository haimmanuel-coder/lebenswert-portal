import { describe, expect, it } from "vitest";
import { bewertePasswortStaerke, pruefeSicheresPasswort, startPasswortGueltigBis, startPasswortLaeuftAb } from "./passwordPolicy";

describe("Passwortregeln", () => {
  it("akzeptiert ein ausreichend langes Passwort mit allen Zeichenarten", () => {
    expect(pruefeSicheresPasswort("Sicher!2026Test").gueltig).toBe(true);
  });

  it("lehnt fehlende Zeichenarten und zu kurze Passwörter ab", () => {
    expect(pruefeSicheresPasswort("kurz!12").gueltig).toBe(false);
    expect(pruefeSicheresPasswort("nursohnezeichen12").gueltig).toBe(false);
    expect(pruefeSicheresPasswort("NURMITGROSS!123").gueltig).toBe(false);
  });

  it("bewertet die Passwortstärke nachvollziehbar", () => {
    expect(bewertePasswortStaerke("abc").label).toBe("Sehr schwach");
    expect(bewertePasswortStaerke("Sicher!2026Test").label).toBe("Sehr stark");
  });

  it("lässt Startpasswörter nach sieben Tagen ablaufen", () => {
    const erstelltAm = new Date("2026-08-01T09:00:00.000Z");
    expect(startPasswortLaeuftAb(erstelltAm, new Date("2026-08-08T08:59:59.000Z"))).toBe(false);
    expect(startPasswortLaeuftAb(erstelltAm, new Date("2026-08-08T09:00:00.000Z"))).toBe(true);
    expect(startPasswortGueltigBis(erstelltAm)?.toISOString()).toBe("2026-08-08T09:00:00.000Z");
  });
});
