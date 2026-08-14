import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

const portalApp = readFileSync(resolve(process.cwd(), "client/src/pages/PortalApp.tsx"), "utf8");
const navigationContext = readFileSync(resolve(process.cwd(), "client/src/contexts/NavigationContext.tsx"), "utf8");

function liesClientQuellen(ordner: string): string[] {
  return readdirSync(ordner).flatMap((eintrag) => {
    const pfad = join(ordner, eintrag);
    if (statSync(pfad).isDirectory()) return liesClientQuellen(pfad);
    return /\.(ts|tsx)$/.test(pfad) ? [readFileSync(pfad, "utf8")] : [];
  });
}

describe("Navigationsvertrag", () => {
  const sichtbareZiele = [...portalApp.matchAll(/\{\s*id:\s*"([a-z]+)"/g)].map((treffer) => treffer[1]);
  const renderZiele = [...portalApp.matchAll(/case\s+"([a-z]+)"/g)].map((treffer) => treffer[1]);
  const seitenIdBlock = navigationContext.match(/export type SeitenId =([\s\S]*?);/)?.[1] ?? "";
  const definierteSeitenIds = [...seitenIdBlock.matchAll(/"([a-z]+)"/g)].map((treffer) => treffer[1]);
  const rollenabhaengigeAlternativen = new Set(["datenschutz", "export"]);

  it("führt jedes sichtbare Menüziel zu einer gerenderten Seite", () => {
    const doppelteZiele = sichtbareZiele.filter((ziel, index) => sichtbareZiele.indexOf(ziel) !== index);
    expect(doppelteZiele.filter((ziel) => !rollenabhaengigeAlternativen.has(ziel))).toEqual([]);
    sichtbareZiele.forEach((ziel) => expect(renderZiele).toContain(ziel));
  });

  it("enthält keine entfernten Controlling- oder ungerenderten Seitenkennungen", () => {
    expect(portalApp).not.toContain("controllingpage");
    expect(portalApp).not.toContain('case "controlling"');
    expect(portalApp).not.toContain("mobilitaetpage");
    expect(portalApp).not.toContain("rbacverwaltung");
  });

  it("führt alle statischen Schnellzugriffe zu einem gültigen Renderziel", () => {
    const clientQuellen = liesClientQuellen(resolve(process.cwd(), "client/src"));
    const aufrufe = clientQuellen.flatMap((quelle) =>
      [...quelle.matchAll(/(?:navigiere|navTo|setActivePage)\("([a-z]+)"\)/g)].map((treffer) => treffer[1])
    );
    aufrufe.forEach((ziel) => expect(renderZiele).toContain(ziel));
  });

  it("deklariert ausschließlich Seitenkennungen mit einem Renderziel", () => {
    expect([...definierteSeitenIds].sort()).toEqual([...renderZiele].sort());
  });

  it("verwendet für alle aktiven Admin-Dashboards dasselbe Namensschema", () => {
    const dashboards = [
      "client/src/pages/AdminDashboard.tsx",
      "client/src/pages/ManagementDashboard.tsx",
      "client/src/pages/AnalyseDashboard.tsx",
      "client/src/pages/ComplianceAmpelTab.tsx",
      "client/src/pages/ArbeitssicherheitDashboard.tsx",
    ].map((pfad) => readFileSync(resolve(process.cwd(), pfad), "utf8"));
    dashboards.forEach((quelle) => expect(quelle).toContain("Admin-Dashboard ·"));
  });
});
