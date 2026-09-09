import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { MODUL_RECHTE, ROLLEN_STANDARD } from "../shared/modulRechte";

const portalApp = readFileSync(resolve(process.cwd(), "client/src/pages/PortalApp.tsx"), "utf8");
const sonderfahrtRouter = readFileSync(resolve(process.cwd(), "server/routers/privatrechnungRouter.ts"), "utf8");

describe("Sonderfahrten-Modulrechte", () => {
  it("verwendet die echte, in der Portalnavigation gerenderte Seitenkennung", () => {
    expect(MODUL_RECHTE).toContainEqual({ key: "privatrechnung", label: "Sonderfahrten" });
    expect(portalApp).toContain('{ id: "privatrechnung" as PageId, icon: "🚗", label: "Sonderfahrten" }');
    expect(portalApp).toContain('case "privatrechnung"');
  });

  it("erteilt Mitarbeitenden das Sonderfahrtenmodul standardmäßig", () => {
    expect(ROLLEN_STANDARD.mitarbeiter).toContain("privatrechnung");
  });

  it("begrenzt Mitarbeitende auf eigene Sonderfahrten und zugeordnete Kunden", () => {
    expect(sonderfahrtRouter).toContain('const maId = darfFremdeEintraegeSehen ? input.mitarbeiterId : ctx.mitarbeiterId');
    expect(sonderfahrtRouter).toContain('isMitarbeiterZugeordnet(ctx.mitarbeiterId, input.kundenId)');
    expect(sonderfahrtRouter).toContain('eintrag.mitarbeiterId === ctx.mitarbeiterId');
  });
});
