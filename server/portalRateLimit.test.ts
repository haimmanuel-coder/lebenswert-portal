import { describe, expect, it, beforeEach } from "vitest";
import { erfassePortalVersuch, leerePortalRateLimitsFuerTest, loeschePortalVersuche, pruefePortalRateLimit } from "./portalRateLimit";

const req = { ip: "192.0.2.20" };
const email = "mitarbeiter@example.invalid";

describe("Portal-Rate-Limit", () => {
  beforeEach(() => leerePortalRateLimitsFuerTest());

  it("blockiert den elften fehlgeschlagenen Login derselben Adresse und Kennung", () => {
    for (let nummer = 0; nummer < 10; nummer++) {
      pruefePortalRateLimit("login", req, email, 1_000);
      erfassePortalVersuch("login", req, email, 1_000);
    }
    expect(() => pruefePortalRateLimit("login", req, email, 1_001)).toThrow(/Zu viele Versuche/);
  });

  it("begrenzt Reset-Anfragen strenger und unabhängig vom Login", () => {
    for (let nummer = 0; nummer < 5; nummer++) erfassePortalVersuch("passwort_reset", req, email, 1_000);
    expect(() => pruefePortalRateLimit("passwort_reset", req, email, 1_001)).toThrow(/Zu viele Versuche/);
    expect(() => pruefePortalRateLimit("login", req, email, 1_001)).not.toThrow();
  });

  it("gibt nach erfolgreichem Login nur den passenden Zähler frei", () => {
    erfassePortalVersuch("login", req, email, 1_000);
    erfassePortalVersuch("passwort_reset", req, email, 1_000);
    loeschePortalVersuche("login", req, email);
    expect(() => pruefePortalRateLimit("login", req, email, 1_001)).not.toThrow();
  });
});
