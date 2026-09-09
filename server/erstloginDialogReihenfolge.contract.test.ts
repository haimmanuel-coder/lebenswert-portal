import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("Erstlogin – Pflichtdialog-Reihenfolge", () => {
  const portalApp = readFileSync("client/src/pages/PortalApp.tsx", "utf8");

  it("unterdrückt DSGVO- und Onboarding-Fokusfallen bis zum Passwortwechsel", () => {
    expect(portalApp).toContain("const passwortwechselOffen = Boolean(mitarbeiter?.passwortWechselErforderlich)");
    expect(portalApp).toContain("enabled: !!mitarbeiter && !passwortwechselOffen");
    expect(portalApp).toContain("!!mitarbeiter && !passwortwechselOffen && !!dsgvoCheck");
    expect(portalApp).toContain("forceShow={showTour && !passwortwechselOffen && !showDsgvoDialog && !showPflichtModal}");
  });
});
