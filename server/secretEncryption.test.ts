import { describe, expect, it } from "vitest";
import { entschluesseleSecret, istVerschluesseltesSecret, verschluesseleSecret } from "./secretEncryption";

describe("SMTP-Secret-Verschlüsselung", () => {
  it("verschlüsselt und entschlüsselt ein SMTP-Passwort", () => {
    const encrypted = verschluesseleSecret("Sicheres-App-Passwort-42!");
    expect(istVerschluesseltesSecret(encrypted)).toBe(true);
    expect(encrypted).not.toContain("Sicheres-App-Passwort-42!");
    expect(entschluesseleSecret(encrypted)).toBe("Sicheres-App-Passwort-42!");
  });

  it("akzeptiert bestehende Klartextwerte für die automatische Umstellung", () => {
    expect(entschluesseleSecret("alter-wert")).toBe("alter-wert");
  });
});
