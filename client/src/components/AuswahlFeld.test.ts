import { describe, expect, it } from "vitest";
import { kundenZuOptionen } from "./AuswahlFeld";

describe("kundenZuOptionen", () => {
  it("zeigt Kunden in der Terminplanung als Vorname Nachname und behält Suchbegriffe bei", () => {
    const [option] = kundenZuOptionen([
      {
        id: 42,
        vorname: "Erika",
        nachname: "Muster",
        strasse: "Hauptstraße 12",
        plz: "90402",
        ort: "Nürnberg",
        pflegegrad: 3,
        paragraphen: ["45b", "39"],
        betreuungsteam: [{ name: "Anna Beispiel" }, { name: "Ben Muster" }],
      },
    ]);

    expect(option.label).toBe("Erika Muster");
    expect(option.hinweis).toContain("Hauptstraße 12");
    expect(option.hinweis).toContain("Pflegegrad 3");
    expect(option.hinweis).toContain("§45b");
    expect(option.betreuungsteam).toBe("Anna Beispiel, Ben Muster");
    expect(option.suchbegriffe).toContain("Erika");
    expect(option.suchbegriffe).toContain("Muster");
  });

  it("formatiert auch unvollständige Namen ohne Leerzeichenartefakte", () => {
    const [option] = kundenZuOptionen([{ id: 7, vorname: "Erika" }]);
    expect(option.label).toBe("Erika");
  });
});
