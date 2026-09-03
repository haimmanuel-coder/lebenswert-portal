import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(__dirname, "..");
const schema = readFileSync(join(root, "drizzle", "schema.ts"), "utf8");
const migration = readFileSync(join(root, "drizzle", "migrations", "0009_historische_einsaetze_integritaet.sql"), "utf8");

describe("Historische Einsätze und Datenintegrität", () => {
  it("übernimmt verwaiste Altdaten vollständig in eine getrennte Archivkopie", () => {
    expect(migration).toContain("CREATE TABLE `historischeEinsaetze` LIKE `einsaetze`");
    expect(migration).toContain("INSERT INTO `historischeEinsaetze`");
    expect(migration).toContain("SELECT e.*, NOW()");
    expect(migration).toContain("Historischer Einsatz: fehlende Stammdatenreferenz archiviert");
    expect(migration).toContain("DELETE e FROM `einsaetze` e");
  });

  it("schützt Kernbeziehungen für neue Datensätze vor verwaisten Referenzen", () => {
    expect(schema).toContain('references(() => mitarbeiter.id, { onDelete: "restrict", onUpdate: "restrict" })');
    expect(schema).toContain('references(() => kunden.id, { onDelete: "restrict", onUpdate: "restrict" })');
    expect(migration).toContain("fk_einsaetze_mitarbeiter");
    expect(migration).toContain("fk_fahrten_einsatz");
    expect(migration).toContain("fk_kunden_zuordnung_kunde");
  });
});
