import { describe, expect, it } from "vitest";
import { istZulaessigerEmailEmpfaenger, istZulaessigerEmailBetreff } from "./emailService";

describe("E-Mail-Sicherheitsvalidierung", () => {
  it("akzeptiert eine reguläre Empfängeradresse", () => {
    expect(istZulaessigerEmailEmpfaenger("buchhaltung@example.de")).toBe(true);
  });

  it("lehnt Steuerzeichen und ungültige Empfängeradressen ab", () => {
    expect(istZulaessigerEmailEmpfaenger("buchhaltung@example.de\r\nBcc: fremd@example.de")).toBe(false);
    expect(istZulaessigerEmailEmpfaenger("keine-adresse")).toBe(false);
  });

  it("lehnt mehrzeilige Betreffzeilen ab", () => {
    expect(istZulaessigerEmailBetreff("Monatsabschluss August")).toBe(true);
    expect(istZulaessigerEmailBetreff("Betreff\nBcc: fremd@example.de")).toBe(false);
  });
});
