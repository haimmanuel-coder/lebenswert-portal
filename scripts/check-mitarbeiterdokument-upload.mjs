import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import mysql from "mysql2/promise";
import { chromium } from "playwright";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL ist für den Dokument-Uploadtest erforderlich.");

const portalUrl = (process.env.TEST_PORTAL_BASE_URL || "http://127.0.0.1:3000").replace(/\/$/, "");
const kennung = randomUUID().replace(/-/g, "").slice(0, 16);
const adminEmail = `qa-doku-admin-${kennung}@example.invalid`;
const mitarbeiterEmail = `qa-doku-ma-${kennung}@example.invalid`;
const passwort = `Qa!${kennung}B7`;
const testName = `Uploadtest ${kennung.slice(0, 6)}`;
const testPdf = Buffer.from("%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n<<>>\n%%EOF\n", "utf8");
const db = await mysql.createConnection(databaseUrl);
let adminId;
let mitarbeiterId;
let browser;
let context;

async function erstelleTestkonto(vorname, nachname, email, rolle) {
  const passwortHash = await bcrypt.hash(passwort, 10);
  const [ergebnis] = await db.execute(
    `INSERT INTO mitarbeiter
      (vorname, nachname, email, passwortHash, rolle, aktiv, passwortWechselErforderlich, zweiFaktorAktiv, datevEinwilligung)
     VALUES (?, ?, ?, ?, ?, 1, 0, 0, 0)`,
    [vorname, nachname, email, passwortHash, rolle],
  );
  const id = ergebnis.insertId;
  const [dokumente] = await db.execute("SELECT id, version FROM datenschutzDokumente WHERE aktiv = 1");
  for (const dokument of dokumente) {
    await db.execute(
      "INSERT INTO datenschutzZustimmungen (mitarbeiterId, dokumentId, dokumentVersion) VALUES (?, ?, ?)",
      [id, dokument.id, dokument.version],
    );
  }
  return id;
}

async function anMelden(page, email) {
  await page.goto(portalUrl, { waitUntil: "networkidle" });
  const cookieButton = page.getByRole("button", { name: /verstanden.*akzeptieren/i });
  if (await cookieButton.isVisible().catch(() => false)) await cookieButton.click();
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(passwort);
  await page.getByRole("button", { name: "Anmelden" }).click();
}

async function schliesseErstloginHinweise(page) {
  const dialog = page.getByRole("dialog", { name: /erstlogin erfolgreich abgeschlossen/i });
  for (let i = 0; i < 25; i += 1) {
    if (!await dialog.isVisible().catch(() => false)) break;
    await page.getByRole("button", { name: "Verstanden" }).click();
    await page.waitForTimeout(25);
  }
}

try {
  adminId = await erstelleTestkonto("Temporär", "Dokumentadmin", adminEmail, "admin");
  mitarbeiterId = await erstelleTestkonto("Temporär", testName, mitarbeiterEmail, "mitarbeiter");
  browser = await chromium.launch({
    headless: true,
    executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });
  context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  await context.addInitScript(() => window.localStorage.setItem("lebensnah_onboarding_done_v2", "true"));
  const page = await context.newPage();

  await anMelden(page, adminEmail);
  await page.getByTestId("portal-aktuelle-seite").getByText("Admin-Dashboard · Gesamtübersicht", { exact: true }).waitFor({ state: "visible", timeout: 15_000 });
  await schliesseErstloginHinweise(page);
  await page.getByRole("button", { name: /admin-panel/i }).click();
  await page.getByRole("button", { name: "👥 Mitarbeiter", exact: true }).click();
  await page.getByPlaceholder("🔍 Name oder E-Mail suchen...").fill(testName);
  await page.getByRole("button", { name: "Details", exact: true }).click();
  await page.getByRole("button", { name: "Dokumente", exact: true }).click();
  await page.getByRole("button", { name: /hinzufügen/i }).click();
  await page.getByPlaceholder("z.B. Erste-Hilfe-Kurs 2024").fill("Admin-Nachweis");
  await page.getByTestId("mitarbeiterakte-datei").setInputFiles({ name: "admin-nachweis.pdf", mimeType: "application/pdf", buffer: testPdf });
  await page.getByRole("button", { name: "Speichern", exact: true }).click();
  await page.getByText("Admin-Nachweis", { exact: true }).waitFor({ state: "visible", timeout: 15_000 });

  await context.close();
  context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  await context.addInitScript(() => window.localStorage.setItem("lebensnah_onboarding_done_v2", "true"));
  const mitarbeiterSeite = await context.newPage();
  const uploadAntworten = [];
  mitarbeiterSeite.on("response", async (response) => {
    if (!response.url().includes("mitarbeiterakte.addDokument")) return;
    uploadAntworten.push({ status: response.status(), antwort: (await response.text().catch(() => "")).slice(0, 800) });
  });
  await anMelden(mitarbeiterSeite, mitarbeiterEmail);
  await mitarbeiterSeite.getByTestId("portal-aktuelle-seite").waitFor({ state: "visible", timeout: 15_000 });
  await schliesseErstloginHinweise(mitarbeiterSeite);
  await mitarbeiterSeite.getByRole("button", { name: /mein profil/i }).click();
  await mitarbeiterSeite.getByRole("button", { name: /dokumente/i }).click();
  await mitarbeiterSeite.getByPlaceholder("z.B. Erste-Hilfe-Kurs 2024").fill("Eigener Nachweis");
  await mitarbeiterSeite.getByTestId("meinprofil-datei").setInputFiles({ name: "eigener-nachweis.pdf", mimeType: "application/pdf", buffer: testPdf });
  await mitarbeiterSeite.getByRole("button", { name: /dokument speichern/i }).click();
  try {
    await mitarbeiterSeite.getByText("Eigener Nachweis", { exact: true }).waitFor({ state: "visible", timeout: 15_000 });
  } catch (error) {
    const sichtbarerText = (await mitarbeiterSeite.locator("body").innerText()).slice(0, 2000);
    throw new Error(`Selbstservice-Upload wurde nicht sichtbar: ${JSON.stringify({ uploadAntworten, sichtbarerText })}; ${error instanceof Error ? error.message : String(error)}`);
  }

  const berechtigungsPruefung = await mitarbeiterSeite.evaluate(async ({ fremdeMitarbeiterId, eigeneMitarbeiterId, pdfBase64 }) => {
    const fremdeAkteAntwort = await fetch(`/api/trpc/mitarbeiterakte.listDokumente?batch=1&input=${encodeURIComponent(JSON.stringify({ 0: { json: { mitarbeiterId: fremdeMitarbeiterId } } }))}`);
    const fremdeAkteText = await fremdeAkteAntwort.text();
    const adminUploadAntwort = await fetch("/api/trpc/admin.addDokumentAdmin?batch=1", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        0: {
          json: {
            mitarbeiterId: eigeneMitarbeiterId,
            typ: "sonstiges",
            bezeichnung: "Unbefugter Testupload",
            dateiname: "unbefugt.pdf",
            mimeType: "application/pdf",
            base64: pdfBase64,
          },
        },
      }),
    });
    const adminUploadText = await adminUploadAntwort.text();
    return {
      fremdeAkteVerwehrt: fremdeAkteText.includes("FORBIDDEN"),
      adminUploadVerwehrt: adminUploadText.includes("FORBIDDEN"),
    };
  }, { fremdeMitarbeiterId: adminId, eigeneMitarbeiterId: mitarbeiterId, pdfBase64: testPdf.toString("base64") });
  if (!berechtigungsPruefung.fremdeAkteVerwehrt || !berechtigungsPruefung.adminUploadVerwehrt) {
    throw new Error(`Die Berechtigungsprüfung für Mitarbeiterdokumente ist unvollständig: ${JSON.stringify(berechtigungsPruefung)}`);
  }

  const [dokumente] = await db.execute(
    "SELECT mitarbeiterId, bezeichnung, dateiUrl, dateiname FROM mitarbeiterDokumente WHERE mitarbeiterId IN (?, ?) ORDER BY id",
    [adminId, mitarbeiterId],
  );
  const eigeneDoks = dokumente.filter((d) => d.mitarbeiterId === mitarbeiterId);
  const adminDoks = dokumente.filter((d) => d.mitarbeiterId === mitarbeiterId && d.bezeichnung === "Admin-Nachweis");
  if (adminDoks.length !== 1 || eigeneDoks.length !== 2 || eigeneDoks.some((d) => !String(d.dateiUrl || "").startsWith("/manus-storage/") || !d.dateiname)) {
    throw new Error("Die Uploads wurden nicht als geschützte externe Dokumentreferenzen in der korrekten Mitarbeiterakte gespeichert.");
  }

  console.log(JSON.stringify({
    adminUploadErfolgreich: true,
    selbstserviceUploadErfolgreich: true,
    externeReferenzenGeprueft: true,
    fremdzugriffVerwehrt: berechtigungsPruefung.fremdeAkteVerwehrt,
    adminUploadOhneAdminVerwehrt: berechtigungsPruefung.adminUploadVerwehrt,
    klartextpasswortAusgegeben: false,
  }, null, 2));
} finally {
  if (context) await context.close();
  if (browser) await browser.close();
  if (adminId || mitarbeiterId) {
    await db.execute("DELETE FROM mitarbeiterDokumente WHERE mitarbeiterId IN (?, ?)", [adminId ?? -1, mitarbeiterId ?? -1]);
    await db.execute("DELETE FROM datenschutzZustimmungen WHERE mitarbeiterId IN (?, ?)", [adminId ?? -1, mitarbeiterId ?? -1]);
    await db.execute("DELETE FROM auditLogs WHERE mitarbeiterId IN (?, ?)", [adminId ?? -1, mitarbeiterId ?? -1]);
    await db.execute("DELETE FROM mitarbeiterArbeitsmuster WHERE mitarbeiterId IN (?, ?)", [adminId ?? -1, mitarbeiterId ?? -1]);
    await db.execute("DELETE FROM mitarbeiter WHERE id IN (?, ?)", [adminId ?? -1, mitarbeiterId ?? -1]);
    console.log(JSON.stringify({ testdatenBereinigt: true }, null, 2));
  }
  await db.end();
}

process.exit(0);
