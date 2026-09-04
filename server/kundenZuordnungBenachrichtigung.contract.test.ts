import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const db = readFileSync(resolve(process.cwd(), "server/db.ts"), "utf8");
const router = readFileSync(resolve(process.cwd(), "server/routers.ts"), "utf8");
const dashboard = readFileSync(resolve(process.cwd(), "client/src/pages/Dashboard.tsx"), "utf8");

describe("Kundenzuweisung mit In-App-Benachrichtigung", () => {
  it("ermittelt neu zugeordnete Mitarbeitende vor dem atomaren Ersetzen", () => {
    expect(db).toContain("const neuHinzugefuegt = mitarbeiterIds.filter");
    expect(db).toContain("return { neueMitarbeiterIds }");
    expect(db).toContain("return { neueKundenIds }");
  });

  it("sendet eine Zuweisungsmeldung nur an neu hinzugekommene Mitarbeitende", () => {
    expect(router).toContain("zuordnungsErgebnis.neueMitarbeiterIds");
    expect(router).toContain('titel: "Neue Kundenzuordnung"');
    expect(router).toContain("empfaengerId: mitarbeiterId");
    expect(router).toContain("zuordnungsErgebnis.neueKundenIds");
    expect(router).toContain("empfaengerId: input.mitarbeiterId");
  });

  it("zeigt eine durchsuchbare, kundenbezogene Dashboardkarte und aktualisiert Meldungen", () => {
    expect(dashboard).toContain("Meine Kunden");
    expect(dashboard).toContain("meine-kunden-suche");
    expect(dashboard).toContain("paragraphFilter");
    expect(dashboard).toContain("refetchInterval: 15_000");
    expect(dashboard).toContain("!n.gelesen");
  });
});
