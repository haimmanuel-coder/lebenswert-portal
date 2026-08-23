import { describe, it, expect } from "vitest";
import { waehleBackend } from "./_core/storageBackend";

describe("waehleBackend – Auswahl des Datei-Speichers", () => {
  it("wählt S3, wenn Bucket und Zugangsdaten gesetzt sind", () => {
    expect(waehleBackend({
      s3Bucket: "lebenswert",
      s3AccessKeyId: "AKIA",
      s3SecretAccessKey: "geheim",
      forgeApiUrl: "https://forge",
      forgeApiKey: "fk",
    })).toBe("s3");
  });

  it("bevorzugt S3 gegenüber Forge, wenn beides gesetzt ist", () => {
    expect(waehleBackend({
      s3Bucket: "b", s3AccessKeyId: "a", s3SecretAccessKey: "s",
      forgeApiUrl: "https://forge", forgeApiKey: "fk",
    })).toBe("s3");
  });

  it("fällt auf Forge zurück, wenn S3 unvollständig ist", () => {
    expect(waehleBackend({
      s3Bucket: "b", s3AccessKeyId: "", s3SecretAccessKey: "",
      forgeApiUrl: "https://forge", forgeApiKey: "fk",
    })).toBe("forge");
  });

  it("liefert 'none', wenn nichts konfiguriert ist", () => {
    expect(waehleBackend({})).toBe("none");
  });

  it("liefert 'none', wenn nur ein Teil der S3-Daten vorliegt und kein Forge", () => {
    expect(waehleBackend({ s3Bucket: "b" })).toBe("none");
  });
});
