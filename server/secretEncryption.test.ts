import { beforeAll, describe, expect, it } from "vitest";
import { entschluesseleSecret, istVerschluesseltesSecret, verschluesseleSecret } from "./secretEncryption";

// Die Secret-Verschlüsselung leitet ihren Schlüssel aus JWT_SECRET ab. Im CI ist keine
// Laufzeitumgebung gesetzt, daher stellt der Test hermetisch einen Testschlüssel bereit,
// falls keiner vorhanden ist (verändert keine Produktionslogik).
beforeAll(() => {
  if (!process.env.JWT_SECRET) {
    process.env.JWT_SECRET = "test-jwt-secret-mindestens-16-zeichen";
  }
});

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
