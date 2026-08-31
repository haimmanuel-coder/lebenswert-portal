import { describe, expect, it } from "vitest";
import { naechsterVerlauf, vorherigeSeite } from "./portalNavigationHistory";

describe("Portal-Rücknavigation", () => {
  it("merkt sich die vorherige interne Seite, ohne identische Seiten doppelt abzulegen", () => {
    expect(naechsterVerlauf(["home"], "planung", "kalender")).toEqual(["home", "planung"]);
    expect(naechsterVerlauf(["home", "planung"], "planung", "planung")).toEqual(["home", "planung"]);
  });

  it("liefert beim Zurückgehen die letzte interne Seite und behält den Restverlauf", () => {
    expect(vorherigeSeite(["home", "planung"])).toEqual({ seite: "planung", verbleibenderVerlauf: ["home"] });
    expect(vorherigeSeite<string>([])).toEqual({ seite: null, verbleibenderVerlauf: [] });
  });

  it("meldet ohne Verlauf eindeutig, dass die aufrufende Oberfläche ihre interne Übersichtsseite verwenden soll", () => {
    const rueckweg = vorherigeSeite<string>([]);
    expect(rueckweg.seite).toBeNull();
    expect(rueckweg.verbleibenderVerlauf).toEqual([]);
  });
});
