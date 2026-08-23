import { describe, it, expect } from "vitest";
import { resolveEndpunkt } from "./_core/externeDienste";

describe("resolveEndpunkt – Auswahl externer KI-Dienste", () => {
  it("bevorzugt den eigenen Anbieter, wenn URL und Key gesetzt sind", () => {
    expect(resolveEndpunkt({
      eigenUrl: "https://api.openai.com/",
      eigenKey: "sk-eigen",
      forgeUrl: "https://forge",
      forgeKey: "fk",
    })).toEqual({ basis: "https://api.openai.com", key: "sk-eigen" });
  });

  it("fällt auf Forge zurück, wenn der eigene Anbieter unvollständig ist", () => {
    expect(resolveEndpunkt({
      eigenUrl: "https://api.openai.com",
      eigenKey: "",
      forgeUrl: "https://forge.example/",
      forgeKey: "fk",
    })).toEqual({ basis: "https://forge.example", key: "fk" });
  });

  it("nutzt die Forge-Standardbasis, wenn forgeUrl leer ist (nur LLM)", () => {
    expect(resolveEndpunkt({
      forgeKey: "fk",
      forgeFallbackBasis: "https://forge.manus.im",
    })).toEqual({ basis: "https://forge.manus.im", key: "fk" });
  });

  it("liefert null ohne Forge-Standardbasis und ohne forgeUrl (STT)", () => {
    expect(resolveEndpunkt({ forgeKey: "fk" })).toBeNull();
  });

  it("liefert null, wenn nichts konfiguriert ist", () => {
    expect(resolveEndpunkt({})).toBeNull();
  });
});
