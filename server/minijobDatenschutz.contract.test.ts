import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const planungDb = readFileSync(resolve(process.cwd(), "server/planungDb.ts"), "utf8");
const planungRouter = readFileSync(resolve(process.cwd(), "server/planungRouter.ts"), "utf8");
const profil = readFileSync(resolve(process.cwd(), "client/src/pages/MeinProfil.tsx"), "utf8");

describe("Minijobzeitraum und Datenschutzvertrag", () => {
  it("verwendet für Einzel- und Sammelwerte die gemeinsame Zeitraumberechnung", () => {
    expect(planungDb).toContain("berechneAbrechnungszeitraum(args.referenzDatum)");
    expect(planungDb).toContain("berechneAbrechnungszeitraum(referenzDatum)");
    expect(planungRouter).toContain("referenzDatum: eingabe.datum");
    expect(planungRouter).toContain("abrechnungszeitraum");
  });

  it("liefert einer einfachen Mitarbeitendenrolle keinen Sammelwert", () => {
    expect(planungRouter).toContain("if (!darfAllesSehen(ctx.portalMitarbeiter.rolle)) return []");
    expect(planungRouter).toContain("? (input.mitarbeiterId ?? ctx.mitarbeiterId)\n        : ctx.mitarbeiterId");
    expect(planungRouter).toContain("const filterMitarbeiterId = alleSehen ? (input.mitarbeiterId ?? null) : ctx.mitarbeiterId");
    expect(planungRouter).toContain("alleSehen ? getMonatsLohnkostenAlle(heute) : Promise.resolve([])");
  });

  it("sperrt sämtliche inventarisierten Teamkennzahlen für einfache Mitarbeitende", () => {
    const analysen = readFileSync(resolve(process.cwd(), "server/routers/integrationenRouter.ts"), "utf8");
    expect(analysen).toContain('mitarbeiterAuslastung: roleProcedure(["admin", "teamleitung"])');
    expect(analysen).toContain('mitarbeiterBetreuungskennzahlen: roleProcedure(["admin", "teamleitung"])');
  });

  it("zeigt im eigenen Profil nur persönliche Minijobdaten samt Zeitraum", () => {
    expect(profil).toContain("trpc.planung");
    expect(profil).toContain("Meine Minijob-Abrechnung");
    expect(profil).toContain("minijobStatus.abrechnungszeitraum?.label");
  });
});
