import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const router = readFileSync(resolve(process.cwd(), "server/routers/besuchsberichteRouter.ts"), "utf8");
const service = readFileSync(resolve(process.cwd(), "server/einsatzAbschlussService.ts"), "utf8");
const formular = readFileSync(resolve(process.cwd(), "client/src/pages/Besuchsberichte.tsx"), "utf8");

describe("Besuchsbericht mit Einsatzfolge", () => {
  it("erzwingt Kunde, Datum, Zeiten und Paragraph sowie die Mindestdauer von 1,5 Stunden", () => {
    expect(router).toContain('paragraph: z.enum(["45b", "45a", "39"])');
    expect(router).toContain("berechneStunden(input.startzeit, input.endzeit)");
    expect(router).toContain("dauerStunden < 1.5");
    expect(formular).toContain("Abrechnungsparagraph *");
    expect(formular).toContain("mindestens 1,5 Stunden erforderlich");
  });

  it("nutzt bei der Berichtanlage die vorhandenen Kunden-, Doppelbelegungs- und Budgetgrenzen", () => {
    expect(router).toContain("isMitarbeiterZugeordnet(ctx.mitarbeiterId, input.kundenId)");
    expect(router).toContain("checkDoppelbelegung({");
    expect(router).toContain("berechneEinsatzkostenInklPauschale");
    expect(router).toContain("ANFAHRT_PAUSCHALE.toFixed(2)");
  });

  it("begrenzt Berichtlisten und Einzelaufrufe für Mitarbeitende auf eigene Daten", () => {
    expect(router).toContain("const zielMitarbeiterId = darfFremdeBerichteSehen ? (input.mitarbeiterId ?? ctx.mitarbeiterId) : ctx.mitarbeiterId");
    expect(router).toContain('message: "Dieser Besuchsbericht gehört nicht zu Ihrem Konto."');
  });

  it("führt Besuchsbericht, Fahrtenbuch, Leistungsnachweis und Budget über dieselbe Abschlussfunktion aus", () => {
    expect(router).toContain("schliesseEinsatzMitFolgenAtomar({");
    expect(service).toContain("return db.transaction");
    expect(service).toContain("where(eq(fahrten.einsatzId, einsatz.id))");
    expect(service).toContain("where(eq(besuchsberichte.einsatzId, einsatz.id))");
    expect(service).toContain("anteil.paragraph === einsatz.paragraph ? ANFAHRT_PAUSCHALE : 0");
    expect(service).toContain("budgetWarBereitsGebucht");
    expect(service).toContain("await db.insert(budgetTransaktionen)");
  });
});
