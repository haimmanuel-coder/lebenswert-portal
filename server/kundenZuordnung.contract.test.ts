import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(__dirname, "..");
const db = readFileSync(join(root, "server", "db.ts"), "utf8");
const router = readFileSync(join(root, "server", "routers.ts"), "utf8");
const planung = readFileSync(join(root, "server", "planungRouter.ts"), "utf8");
const zuordnungUi = readFileSync(join(root, "client", "src", "pages", "Kundenzuteilung.tsx"), "utf8");

describe("Einheitliche Kunden-Mitarbeiter-Zuordnung", () => {
  it("liefert nur aktive, zugeordnete Kunden sicher und sortiert", () => {
    expect(db).toContain("innerJoin(kunden, eq(kundenZuordnung.kundenId, kunden.id))");
    expect(db).toContain("eq(kunden.aktiv, 1)");
    expect(db).toContain("innerJoin(mitarbeiter, eq(kundenZuordnung.mitarbeiterId, mitarbeiter.id))");
    expect(db).toContain("orderBy(asc(kunden.nachname), asc(kunden.vorname))");
  });

  it("schreibt beide Zuordnungswege atomar und schützt Mehrfachzuordnungen", () => {
    expect(db).toContain("await db.transaction(async (tx) =>");
    expect(db).toContain("Dieser Kunde hat bereits die maximal drei Betreuungskräfte.");
    expect(db).toContain("Ein Mitarbeiter wurde mehrfach zugeteilt.");
    expect(db).toContain("Ein Kunde darf nur einen Hauptbetreuer haben.");
  });

  it("verwendet auch Export und Terminplanung dieselbe aktuelle Zuordnungstabelle", () => {
    expect(router).toContain("FROM kundenZuordnung kz");
    expect(router).not.toContain("FROM kunden_zuordnung kz");
    expect(planung).toContain("const zugeordneteKunden = await getKundenByMitarbeiter(zielMitarbeiterId)");
    expect(planung).toContain("isMitarbeiterZugeordnet(input.mitarbeiterId, input.kundenId)");
  });

  it("aktualisiert die Kundenliste und den Planungsdialog erst nach erfolgreicher Speicherung", () => {
    expect(zuordnungUi).toContain("utils.kunden.list.invalidate()");
    expect(zuordnungUi).toContain("planung.kundenFuerMitarbeiter.invalidate()");
    expect(zuordnungUi).not.toContain("kundenIds: Array.from(effectiveIds),\n    });\n    setLocalToggled");
  });
});
