import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("Personalaktenexport-Vertrag", () => {
  it("ist admin-geschützt, führt das Audit-Protokoll und wird im UI als Query ausgelöst", () => {
    const router = readFileSync(resolve(process.cwd(), "server/routers.ts"), "utf8");
    const ui = readFileSync(resolve(process.cwd(), "client/src/pages/EinstellungenTab.tsx"), "utf8");
    expect(router).toContain("personalaktenHistorie: adminProcedure");
    expect(router).toContain('ressource: "personalakte_arbeitsmuster_urlaub"');
    expect(ui).toContain("export.personalaktenHistorie.useQuery");
    expect(ui).toContain("exportPersonalakte.refetch()");
    expect(ui).toContain("CSV jetzt herunterladen");
    expect(ui).toContain("Datei bereit:");
    expect(ui).toContain("document.body.appendChild(link)");
  });
});
