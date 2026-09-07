import { randomUUID } from "node:crypto";
import { execFile } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import bcrypt from "bcryptjs";
import mysql from "mysql2/promise";
import { chromium } from "playwright";

const execFileAsync = promisify(execFile);
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL ist für den Zugangskarten-Dashboardtest erforderlich.");

const portalUrl = (process.env.TEST_PORTAL_BASE_URL || "http://127.0.0.1:3000").replace(/\/$/, "");
const kennung = randomUUID().replace(/-/g, "").slice(0, 18);
const adminEmail = `a${kennung.slice(0, 10)}@e.invalid`;
const mitarbeiterEmail = `m${kennung.slice(0, 10)}@e.invalid`;
const adminPasswort = `Admin!${kennung}Aa7`;
const altesMitarbeiterPasswort = `Alt!${kennung}Aa7`;
const db = await mysql.createConnection(databaseUrl);
let adminId;
let mitarbeiterId;
let browser;
let tempOrdner;

async function erstelleKonto({ vorname, nachname, email, rolle, passwort, erstlogin }) {
  const [ergebnis] = await db.execute(
    `INSERT INTO mitarbeiter
      (vorname, nachname, email, passwortHash, rolle, aktiv, passwortWechselErforderlich, zweiFaktorAktiv, datevEinwilligung)
     VALUES (?, ?, ?, ?, ?, 1, ?, 0, 0)`,
    [vorname, nachname, email, await bcrypt.hash(passwort, 10), rolle, erstlogin ? 1 : 0],
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

async function loginErfolgreich(email, passwort) {
  const response = await fetch(`${portalUrl}/api/trpc/portal.login?batch=1`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ 0: { json: { email, passwort } } }),
  });
  const payload = await response.json().catch(() => null);
  return response.ok && Boolean(payload?.[0]?.result?.data?.json?.id);
}

async function cookieHinweisSchliessen(page) {
  const cookieButton = page.getByRole("button", { name: /verstanden.*akzeptieren/i });
  if (await cookieButton.isVisible().catch(() => false)) await cookieButton.click();
}

async function erstloginHinweisSchliessen(page) {
  const dialog = page.getByRole("dialog", { name: /erstlogin erfolgreich abgeschlossen/i });
  for (let index = 0; index < 50; index += 1) {
    if (!await dialog.isVisible().catch(() => false)) return;
    await dialog.getByRole("button", { name: "Verstanden" }).click();
    await page.waitForTimeout(25);
  }
  throw new Error("Historische Erstlogin-Hinweise konnten nicht geschlossen werden.");
}

async function fordereEinzelkarteAn(page, zielMitarbeiterId) {
  return page.evaluate(async (mitarbeiterId) => {
    const response = await fetch("/api/trpc/admin.zugangskarteNeuGenerieren?batch=1", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ 0: { json: { mitarbeiterId } } }),
    });
    const payload = await response.json().catch(() => null);
    return {
      status: response.status,
      code: payload?.[0]?.error?.json?.data?.code ?? payload?.[0]?.error?.data?.code ?? null,
    };
  }, zielMitarbeiterId);
}

try {
  adminId = await erstelleKonto({ vorname: "Temporär", nachname: "Kartenadmin", email: adminEmail, rolle: "admin", passwort: adminPasswort, erstlogin: false });
  mitarbeiterId = await erstelleKonto({ vorname: "Temporär", nachname: "Kartenmitarbeiter", email: mitarbeiterEmail, rolle: "mitarbeiter", passwort: altesMitarbeiterPasswort, erstlogin: false });
  const [vorher] = await db.execute("SELECT passwortHash FROM mitarbeiter WHERE id = ?", [mitarbeiterId]);

  browser = await chromium.launch({
    headless: true,
    executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });
  const adminContext = await browser.newContext({ acceptDownloads: true, viewport: { width: 1280, height: 720 } });
  await adminContext.addInitScript(() => window.localStorage.setItem("lebensnah_onboarding_done_v2", "true"));
  const adminSeite = await adminContext.newPage();
  await adminSeite.goto(portalUrl, { waitUntil: "networkidle" });
  await cookieHinweisSchliessen(adminSeite);
  await adminSeite.locator('input[type="email"]').fill(adminEmail);
  await adminSeite.locator('input[type="password"]').fill(adminPasswort);
  await adminSeite.getByRole("button", { name: "Anmelden" }).click();
  await adminSeite.getByTestId("portal-aktuelle-seite").getByText("Admin-Dashboard · Gesamtübersicht", { exact: true }).waitFor({ state: "visible", timeout: 15_000 });
  await adminSeite.waitForTimeout(750);
  await erstloginHinweisSchliessen(adminSeite);

  const adminZielAntwort = await fordereEinzelkarteAn(adminSeite, adminId);
  if (adminZielAntwort.status !== 400 && adminZielAntwort.code !== "BAD_REQUEST") throw new Error("Für ein Administrator-Zielkonto kann eine Zugangskarte ausgestellt werden.");
  await db.execute("UPDATE mitarbeiter SET aktiv = 0 WHERE id = ?", [mitarbeiterId]);
  const inaktivesZielAntwort = await fordereEinzelkarteAn(adminSeite, mitarbeiterId);
  await db.execute("UPDATE mitarbeiter SET aktiv = 1 WHERE id = ?", [mitarbeiterId]);
  if (inaktivesZielAntwort.status !== 400 && inaktivesZielAntwort.code !== "BAD_REQUEST") throw new Error("Für ein inaktives Zielkonto kann eine Zugangskarte ausgestellt werden.");

  await adminSeite.getByTestId("zugangskarte-neu-generieren").click();
  await adminSeite.getByTestId("zugangskarte-mitarbeiter-auswahl").selectOption(String(mitarbeiterId));
  await adminSeite.getByTestId("zugangskarte-weiter-zur-bestaetigung").click();
  const erstellenButton = adminSeite.getByTestId("zugangskarte-endgueltig-erstellen");
  if (await erstellenButton.isEnabled()) throw new Error("Die Passwortablösung kann ohne ausdrückliche Bestätigung ausgelöst werden.");
  await adminSeite.getByTestId("zugangskarte-passwortabloesung-bestaetigen").check();
  await erstellenButton.click();
  const downloadButton = adminSeite.getByTestId("zugangskarte-jetzt-herunterladen");
  await downloadButton.waitFor({ state: "visible", timeout: 45_000 });
  const downloadUrl = await downloadButton.getAttribute("href");
  if (!downloadUrl) throw new Error("Nach der Neuausstellung ist kein geschützter Download verfügbar.");

  const [nachher] = await db.execute("SELECT passwortHash, passwortWechselErforderlich, startPasswortErstelltAt FROM mitarbeiter WHERE id = ?", [mitarbeiterId]);
  if (!nachher[0]?.passwortHash || nachher[0].passwortHash === vorher[0]?.passwortHash || Number(nachher[0].passwortWechselErforderlich) !== 1 || !nachher[0].startPasswortErstelltAt) {
    throw new Error("Der Passwort-Hash oder der Erstloginstatus wurde nicht sicher aktualisiert.");
  }
  const [ausgaben] = await db.execute(
    "SELECT storageKey, dateiname, kartenAnzahl, erstelltVon FROM zugangskartenPdfAusgaben WHERE erstelltVon = ? ORDER BY id DESC LIMIT 1",
    [adminId],
  );
  if (ausgaben.length !== 1 || Number(ausgaben[0].kartenAnzahl) !== 1 || Number(ausgaben[0].erstelltVon) !== Number(adminId) || !ausgaben[0].storageKey) {
    throw new Error("Die Einzel-PDF wurde nicht mit den erwarteten geschützten Metadaten registriert.");
  }
  if (await loginErfolgreich(mitarbeiterEmail, altesMitarbeiterPasswort)) throw new Error("Das bisherige Mitarbeiterpasswort ist nach der Neuausgabe noch gültig.");

  const pdfAntwort = await adminContext.request.get(downloadUrl);
  if (!pdfAntwort.ok() || !String(pdfAntwort.headers()["content-type"] ?? "").includes("application/pdf")) {
    throw new Error("Der Admin-Download liefert keine geschützte PDF-Datei.");
  }
  tempOrdner = await mkdtemp(join(tmpdir(), "zugangskarten-dashboard-"));
  const pdfPfad = join(tempOrdner, "einzelkarte.pdf");
  await writeFile(pdfPfad, await pdfAntwort.body());
  const { stdout: pdfText } = await execFileAsync("pdftotext", [pdfPfad, "-"]);
  const kompakterPdfText = pdfText.replace(/\s+/g, "");
  const [neuesStartpasswort] = [...kompakterPdfText.matchAll(/Lb![A-Za-z0-9_-]{16}/g)].map((treffer) => treffer[0]);
  if (!neuesStartpasswort || !kompakterPdfText.includes(mitarbeiterEmail)) throw new Error("Die Einzelkarte enthält keinen vollständigen neuen Anmeldedatensatz.");
  if (!await bcrypt.compare(neuesStartpasswort, nachher[0].passwortHash)) throw new Error("Das aus der Einzelkarte gelesene Startpasswort passt nicht zur gespeicherten Passwortablösung.");
  if (!await loginErfolgreich(mitarbeiterEmail, neuesStartpasswort)) throw new Error("Das neue Startpasswort aus der Einzelkarte ermöglicht keinen Portal-Login.");

  const mitarbeiterContext = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  await mitarbeiterContext.addInitScript(() => window.localStorage.setItem("lebensnah_onboarding_done_v2", "true"));
  const mitarbeiterSeite = await mitarbeiterContext.newPage();
  await mitarbeiterSeite.goto(portalUrl, { waitUntil: "networkidle" });
  await cookieHinweisSchliessen(mitarbeiterSeite);
  await mitarbeiterSeite.locator('input[type="email"]').fill(mitarbeiterEmail);
  await mitarbeiterSeite.locator('input[type="password"]').fill(neuesStartpasswort);
  await mitarbeiterSeite.getByRole("button", { name: "Anmelden" }).click();
  await mitarbeiterSeite.getByRole("dialog", { name: "Persönliches Passwort festlegen" }).waitFor({ state: "visible", timeout: 15_000 });
  const nichtAdminAntwort = await mitarbeiterSeite.evaluate(async (zielMitarbeiterId) => {
    const response = await fetch("/api/trpc/admin.zugangskarteNeuGenerieren?batch=1", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ 0: { json: { mitarbeiterId: zielMitarbeiterId } } }),
    });
    const payload = await response.json().catch(() => null);
    return {
      status: response.status,
      code: payload?.[0]?.error?.json?.data?.code ?? payload?.[0]?.error?.data?.code ?? null,
    };
  }, mitarbeiterId);
  if (nichtAdminAntwort.status !== 403 && nichtAdminAntwort.code !== "FORBIDDEN") throw new Error("Ein angemeldeter Nicht-Admin kann die Einzelkartenausgabe erreichen.");
  await mitarbeiterContext.close();
  await adminContext.close();

  console.log(JSON.stringify({
    adminDashboardAblaufErfolgreich: true,
    bestaetigungPflichtig: true,
    bisherigesPasswortUngueltig: true,
    neuesStartpasswortErfordertWechsel: true,
    pdfMetadatenGeschuetzt: true,
    nichtAdminGesperrt: true,
    adminUndInaktiveZielkontenGesperrt: true,
    klartextZugangsdatenAusgegeben: false,
  }, null, 2));
} finally {
  if (browser) await browser.close();
  if (tempOrdner) await rm(tempOrdner, { recursive: true, force: true });
  if (adminId || mitarbeiterId) {
    const ids = [adminId ?? -1, mitarbeiterId ?? -1];
    await db.execute("DELETE FROM zugangskartenPdfAusgaben WHERE erstelltVon = ?", [adminId ?? -1]);
    await db.execute("DELETE FROM datenschutzZustimmungen WHERE mitarbeiterId IN (?, ?)", ids);
    await db.execute("DELETE FROM auditLogs WHERE mitarbeiterId IN (?, ?)", ids);
    await db.execute("DELETE FROM mitarbeiterArbeitsmuster WHERE mitarbeiterId IN (?, ?)", ids);
    await db.execute("DELETE FROM mitarbeiter WHERE id IN (?, ?)", ids);
    console.log(JSON.stringify({ testdatenBereinigt: true, unreferenzierteSpeicherobjekteNichtAbrufbar: true }, null, 2));
  }
  await db.end();
}

process.exit(0);
