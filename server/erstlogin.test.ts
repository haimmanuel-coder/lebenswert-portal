import { describe, expect, it } from "vitest";
import { istAbgeschlossenerStartzugang } from "../shared/erstlogin";

describe("Erstlogin-Erkennung", () => {
  it("erkennt den verpflichtenden ersten Passwortwechsel eines ausgegebenen Startzugangs", () => {
    expect(istAbgeschlossenerStartzugang(true, new Date("2026-08-15T08:00:00Z"))).toBe(true);
  });

  it("meldet keinen Erstlogin ohne Wechselpflicht oder ohne Startzugang", () => {
    expect(istAbgeschlossenerStartzugang(false, new Date())).toBe(false);
    expect(istAbgeschlossenerStartzugang(true, null)).toBe(false);
  });
});
