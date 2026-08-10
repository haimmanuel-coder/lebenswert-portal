/**
 * Tests des Auth-Rate-Limiters (S-1).
 *
 * Prüft, dass nach der zulässigen Zahl von Versuchen gesperrt wird, dass ein
 * erfolgreiches Zurücksetzen den Zähler leert und dass die Sperre nach Ablauf
 * der Zeit wieder aufgehoben ist.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TRPCError } from "@trpc/server";
import { pruefeRateLimit, ratelimitZuruecksetzen, clientIp } from "./rateLimit";

const LIMIT = { maxVersuche: 3, fensterMs: 60_000, sperreMs: 300_000 };

describe("Rate-Limiter", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-28T10:00:00Z"));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("lässt Versuche bis zur Grenze zu", () => {
    const key = `test-a-${Math.random()}`;
    // maxVersuche = 3 → drei Aufrufe sind erlaubt
    expect(() => pruefeRateLimit(key, LIMIT)).not.toThrow();
    expect(() => pruefeRateLimit(key, LIMIT)).not.toThrow();
    expect(() => pruefeRateLimit(key, LIMIT)).not.toThrow();
  });

  it("sperrt ab dem überzähligen Versuch", () => {
    const key = `test-b-${Math.random()}`;
    pruefeRateLimit(key, LIMIT);
    pruefeRateLimit(key, LIMIT);
    pruefeRateLimit(key, LIMIT);
    // Der vierte Versuch löst die Sperre aus
    expect(() => pruefeRateLimit(key, LIMIT)).toThrowError(TRPCError);
  });

  it("wirft TOO_MANY_REQUESTS mit sprechender Meldung", () => {
    const key = `test-c-${Math.random()}`;
    for (let i = 0; i < 3; i++) pruefeRateLimit(key, LIMIT);
    try {
      pruefeRateLimit(key, LIMIT);
      throw new Error("hätte werfen müssen");
    } catch (fehler) {
      expect(fehler).toBeInstanceOf(TRPCError);
      expect((fehler as TRPCError).code).toBe("TOO_MANY_REQUESTS");
      expect((fehler as TRPCError).message).toMatch(/gesperrt|Minuten/i);
    }
  });

  it("bleibt während der Sperrzeit gesperrt", () => {
    const key = `test-d-${Math.random()}`;
    for (let i = 0; i < 4; i++) {
      try { pruefeRateLimit(key, LIMIT); } catch { /* Sperre erwartet */ }
    }
    // 4 Minuten später (< 5 Min. Sperre) weiterhin gesperrt
    vi.advanceTimersByTime(4 * 60_000);
    expect(() => pruefeRateLimit(key, LIMIT)).toThrowError(TRPCError);
  });

  it("hebt die Sperre nach Ablauf der Sperrzeit auf", () => {
    const key = `test-e-${Math.random()}`;
    for (let i = 0; i < 4; i++) {
      try { pruefeRateLimit(key, LIMIT); } catch { /* Sperre erwartet */ }
    }
    // Nach mehr als 5 Minuten ist die Sperre abgelaufen
    vi.advanceTimersByTime(6 * 60_000);
    expect(() => pruefeRateLimit(key, LIMIT)).not.toThrow();
  });

  it("leert den Zähler bei erfolgreichem Zurücksetzen", () => {
    const key = `test-f-${Math.random()}`;
    pruefeRateLimit(key, LIMIT);
    pruefeRateLimit(key, LIMIT);
    // Erfolgreicher Login → zurücksetzen
    ratelimitZuruecksetzen(key);
    // Danach stehen wieder volle drei Versuche zur Verfügung
    expect(() => pruefeRateLimit(key, LIMIT)).not.toThrow();
    expect(() => pruefeRateLimit(key, LIMIT)).not.toThrow();
    expect(() => pruefeRateLimit(key, LIMIT)).not.toThrow();
  });

  it("verwirft Versuche außerhalb des Zeitfensters", () => {
    const key = `test-g-${Math.random()}`;
    pruefeRateLimit(key, LIMIT);
    pruefeRateLimit(key, LIMIT);
    // Zwei Minuten später ist das 1-Minuten-Fenster geleert
    vi.advanceTimersByTime(2 * 60_000);
    expect(() => pruefeRateLimit(key, LIMIT)).not.toThrow();
    expect(() => pruefeRateLimit(key, LIMIT)).not.toThrow();
    expect(() => pruefeRateLimit(key, LIMIT)).not.toThrow();
  });

  it("trennt verschiedene Schlüssel (IP+E-Mail)", () => {
    const a = `test-h-a-${Math.random()}`;
    const b = `test-h-b-${Math.random()}`;
    for (let i = 0; i < 4; i++) {
      try { pruefeRateLimit(a, LIMIT); } catch { /* a gesperrt */ }
    }
    // b ist davon unberührt
    expect(() => pruefeRateLimit(b, LIMIT)).not.toThrow();
  });
});

describe("clientIp", () => {
  it("bevorzugt req.ip", () => {
    expect(clientIp({ ip: "203.0.113.5" })).toBe("203.0.113.5");
  });
  it("fällt auf die Socket-Adresse zurück", () => {
    expect(clientIp({ socket: { remoteAddress: "198.51.100.9" } })).toBe("198.51.100.9");
  });
  it("liefert 'unbekannt' ohne Angaben", () => {
    expect(clientIp({})).toBe("unbekannt");
  });
});
