import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = join(__dirname, "..");
const service = readFileSync(join(root, "server", "accessCardPdfService.ts"), "utf8");
const router = readFileSync(join(root, "server", "routers.ts"), "utf8");
const dashboard = readFileSync(join(root, "client", "src", "pages", "AdminDashboard.tsx"), "utf8");
const server = readFileSync(join(root, "server", "_core", "index.ts"), "utf8");

describe("Einzelne Zugangskarten: Sicherheitsvertrag", () => {
  it("bereitet Ablage und Signaturlink vor, bevor die Zugangsdaten atomar abgelöst werden", () => {
    const storagePutIndex = service.indexOf("await storagePut(");
    const signedUrlIndex = service.indexOf("await storageGetSignedUrl(storageKey)");
    const transactionIndex = service.indexOf("await db.transaction(async (tx)");
    expect(storagePutIndex).toBeGreaterThan(-1);
    expect(signedUrlIndex).toBeGreaterThan(storagePutIndex);
    expect(transactionIndex).toBeGreaterThan(signedUrlIndex);
    expect(service).toContain('passwortWechselErforderlich: true');
    expect(service).toContain("startPasswortErstelltAt: erstelltAm");
    expect(service).toContain('ne(mitarbeiter.rolle, "admin")');
    expect(service).toContain("eq(mitarbeiter.aktiv, 1)");
  });

  it("protokolliert nur Metadaten und gibt kein Klartextpasswort an den Browser zurück", () => {
    const returnBlock = service.slice(service.lastIndexOf("return { dateiname"));
    expect(returnBlock).not.toContain("startpasswort");
    expect(service).toContain("kartenAnzahl: 1");
    expect(service).toContain("erstelltVon,");
    expect(service).toContain("ressource: \"zugangskarten-pdf\"");
    expect(service).toContain("erstelleZugangskartenQrZiel");
    expect(service).not.toContain("passwort: startpasswort");
  });

  it("beschränkt Erzeugung und geschützten Abruf auf Admins und drosselt den Direktpfad", () => {
    const einzelkartenBlock = router.slice(router.indexOf("zugangskarteNeuGenerieren:"), router.indexOf("aktuelleZugangskartenPdf:"));
    expect(einzelkartenBlock).toContain("adminProcedure");
    expect(einzelkartenBlock).toContain("erstelleEinzelneZugangskarte");
    expect(einzelkartenBlock).not.toContain("startpasswort");
    expect(router).toContain("aktuelleZugangskartenPdf: adminProcedure");
    expect(server).toContain('"/api/trpc/admin.zugangskarteNeuGenerieren"');
  });

  it("verlangt im Dashboard eine sichtbare Bestätigung vor der endgültigen Passwortablösung", () => {
    expect(dashboard).toContain('data-testid="zugangskarte-neu-generieren"');
    expect(dashboard).toContain('data-testid="zugangskarte-passwortabloesung-bestaetigen"');
    expect(dashboard).toContain('disabled={!passwortabloesungBestaetigt || zugangskarteNeuGenerieren.isPending}');
    expect(dashboard).toContain('data-testid="zugangskarte-jetzt-herunterladen"');
    expect(dashboard).toContain("Die bisherigen Zugangsdaten gelten nicht mehr.");
  });
});
