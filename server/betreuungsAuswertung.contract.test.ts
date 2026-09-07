import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const routerQuelle = readFileSync(new URL("./routers/integrationenRouter.ts", import.meta.url), "utf8");
const kundenQuelle = readFileSync(new URL("../client/src/pages/Kundenliste.tsx", import.meta.url), "utf8");
const analyseQuelle = readFileSync(new URL("../client/src/pages/AnalyseDashboard.tsx", import.meta.url), "utf8");

describe("Auswertungsoberflächen und Zugriffsschutz", () => {
  it("beschränkt die Mitarbeiterkennzahlen auf Admin und Teamleitung", () => {
    const start = routerQuelle.indexOf("mitarbeiterBetreuungskennzahlen:");
    const abschnitt = routerQuelle.slice(start, start + 2600);
    expect(start).toBeGreaterThan(-1);
    expect(abschnitt).toContain('roleProcedure(["admin", "teamleitung"])');
    expect(abschnitt).toContain("DATE_FORMAT");
    expect(abschnitt).toContain("berechneMitarbeiterBetreuungskennzahlen");
  });

  it("stellt Paragraphstunden im sichtbaren Kundenprofil und die Monatsauswertung im Personal-Tab bereit", () => {
    expect(kundenQuelle).toContain('data-testid="kunden-paragraphen-auswertung"');
    expect(kundenQuelle).toContain("Stunden &amp; Budget je Paragraph");
    expect(kundenQuelle).toContain("stundenAbgeschlossen");
    expect(analyseQuelle).toContain('data-testid="mitarbeiter-betreuungskennzahlen"');
    expect(analyseQuelle).toContain("Auswertungsmonat");
    expect(analyseQuelle).toContain("Diese Zahlen sind keine automatische Leistungsbewertung");
  });
});
