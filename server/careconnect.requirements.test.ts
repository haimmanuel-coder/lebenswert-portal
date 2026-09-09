import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const lese = (pfad: string) => readFileSync(new URL(pfad, import.meta.url), "utf8");

describe("CareConnect-Anforderungen", () => {
  it("sichert zugewiesene Kunden auch gegen einen manipulierten Planungsaufruf ab", () => {
    const router = lese("./planungRouter.ts");
    expect(router).toContain("Termine dürfen nur für Kunden geplant werden, die dem Mitarbeiter zugeordnet sind.");
    expect(router).toContain("isMitarbeiterZugeordnet(input.mitarbeiterId, input.kundenId)");
  });

  it("verwendet in beiden Mitteilungsoberflächen den tatsächlichen Serververtrag", () => {
    const widget = lese("../client/src/components/MitteilungenWidget.tsx");
    const admin = lese("../client/src/pages/MitteilungenAdminTab.tsx");
    expect(widget).toContain("m.pflichtBestaetigung");
    expect(widget).toContain("m.typ");
    expect(admin).toContain("mitteilungen.adminListe");
    expect(admin).toContain("mitteilungen.loeschen");
  });
});
