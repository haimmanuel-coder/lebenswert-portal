import { describe, expect, it } from "vitest";
import { ermittleMitarbeiterDokumentMimeType, MAX_MITARBEITER_DOKUMENT_BYTES, pruefeMitarbeiterDokumentUpload } from "./mitarbeiterDokumentUpload";

describe("Mitarbeiterdokument-Upload", () => {
  it("akzeptiert ein gültiges PDF innerhalb der zugesagten 10-MB-Grenze", () => {
    const original = Buffer.from("%PDF-1.4\nTestdokument");
    const result = pruefeMitarbeiterDokumentUpload(original.toString("base64"), "application/pdf");

    expect(result.equals(original)).toBe(true);
  });

  it("weist nicht erlaubte Dateitypen, defekte Dateien und Dateien über 10 MB zurück", () => {
    expect(() => pruefeMitarbeiterDokumentUpload("aGVsbG8=", "text/plain")).toThrow(/Erlaubt sind/);
    expect(() => pruefeMitarbeiterDokumentUpload("kein-base64!", "application/pdf")).toThrow(/beschädigt/);
    const zuGrossesPdf = Buffer.concat([Buffer.from("%PDF-1.4\n"), Buffer.alloc(MAX_MITARBEITER_DOKUMENT_BYTES)]);
    expect(() => pruefeMitarbeiterDokumentUpload(zuGrossesPdf.toString("base64"), "application/pdf")).toThrow(/maximal 10 MB/);
  });

  it("blockiert getarnte Dateien sowie widersprüchliche Endungen", () => {
    const keinePdfDatei = Buffer.from("<html>kein Dokument</html>").toString("base64");
    expect(() => pruefeMitarbeiterDokumentUpload(keinePdfDatei, "application/pdf", "nachweis.pdf")).toThrow(/PDF-Format/);
    expect(() => ermittleMitarbeiterDokumentMimeType("nachweis.pdf", "image/png")).toThrow(/passen nicht zusammen/);
  });
});
