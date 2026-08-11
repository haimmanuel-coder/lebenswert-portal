import { describe, expect, it } from "vitest";
import { ermittleErsteHilfeStatus } from "./complianceUtils";

const heute = new Date("2026-08-11T12:00:00.000Z");

describe("ermittleErsteHilfeStatus", () => {
  it("wertet einen länger gültigen bestandenen Kurs grün", () => {
    const ergebnis = ermittleErsteHilfeStatus([
      { status: "bestanden", kursDatum: "2026-01-10", ablaufDatum: "2027-01-10" },
    ], heute);
    expect(ergebnis.ampel).toBe("gruen");
  });

  it("wertet einen innerhalb von 60 Tagen ablaufenden Kurs gelb", () => {
    const ergebnis = ermittleErsteHilfeStatus([
      { status: "bestanden", kursDatum: "2025-10-10", ablaufDatum: "2026-09-01" },
    ], heute);
    expect(ergebnis.ampel).toBe("gelb");
  });

  it("ignoriert abgelaufene Nachweise und zeigt eine Anmeldung gelb", () => {
    const ergebnis = ermittleErsteHilfeStatus([
      { status: "bestanden", kursDatum: "2023-01-10", ablaufDatum: "2025-01-10" },
      { status: "angemeldet", kursDatum: "2026-09-15" },
    ], heute);
    expect(ergebnis.ampel).toBe("gelb");
  });

  it("meldet ohne gültigen Nachweis oder Anmeldung rot", () => {
    const ergebnis = ermittleErsteHilfeStatus([], heute);
    expect(ergebnis.ampel).toBe("rot");
  });
});
