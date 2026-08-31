import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import mysql from "mysql2/promise";
import { chromium } from "playwright";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL ist für den Admin-Browsercheck erforderlich.");

const portalUrl = (process.env.TEST_PORTAL_BASE_URL || "http://127.0.0.1:3000").replace(/\/$/, "");
const kennung = randomUUID().replace(/-/g, "").slice(0, 16);
const email = `qa-adminexport-${kennung}@example.invalid`;
const passwort = `Qa!${kennung}B7`;
const db = await mysql.createConnection(databaseUrl);
let mitarbeiterId;
let browser;

async function erstelleAdminTestkonto() {
  const passwortHash = await bcrypt.hash(passwort, 10);
  const [insertErgebnis] = await db.execute(
    `INSERT INTO mitarbeiter
      (vorname, nachname, email, passwortHash, rolle, aktiv, passwortWechselErforderlich, zweiFaktorAktiv, datevEinwilligung)
     VALUES (?, ?, ?, ?, 'admin', 1, 0, 0, 0)`,
    ["Temporär", "Adminexporttest", email, passwortHash],
  );
  mitarbeiterId = insertErgebnis.insertId;

  const [dokumente] = await db.execute("SELECT id, version FROM datenschutzDokumente WHERE aktiv = 1");
  for (const dokument of dokumente) {
    await db.execute(
      `INSERT INTO datenschutzZustimmungen (mitarbeiterId, dokumentId, dokumentVersion)
       VALUES (?, ?, ?)`,
      [mitarbeiterId, dokument.id, dokument.version],
    );
  }
}

async function schliesseErstloginHinweise(page) {
  const dialog = page.getByRole("dialog", { name: /erstlogin erfolgreich abgeschlossen/i });
  for (let i = 0; i < 50; i += 1) {
    if (!await dialog.isVisible().catch(() => false)) break;
    await page.getByRole("button", { name: "Verstanden" }).click();
    await page.waitForTimeout(25);
  }
  await dialog.waitFor({ state: "hidden", timeout: 10_000 });
}

try {
  await erstelleAdminTestkonto();
  browser = await chromium.launch({
    headless: true,
    executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });
  const context = await browser.newContext({ acceptDownloads: true, viewport: { width: 1280, height: 720 } });
  await context.addInitScript(() => window.localStorage.setItem("lebensnah_onboarding_done_v2", "true"));
  const page = await context.newPage();
  let loginAntwort = null;
  page.on("response", async (response) => {
    if (!response.url().includes("portal.login")) return;
    const raw = await response.text().catch(() => "");
    loginAntwort = {
      status: response.status(),
      contentType: response.headers()["content-type"] || null,
      antwortIstJson: (() => { try { JSON.parse(raw); return true; } catch { return false; } })(),
      tokenEnthalten: raw.includes('"token"'),
    };
  });
  await page.goto(portalUrl, { waitUntil: "networkidle" });

  const cookieButton = page.getByRole("button", { name: /verstanden.*akzeptieren/i });
  if (await cookieButton.isVisible().catch(() => false)) await cookieButton.click();
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(passwort);
  await page.getByRole("button", { name: "Anmelden" }).click();
  try {
    await page.getByTestId("portal-aktuelle-seite").getByText("Admin-Dashboard · Gesamtübersicht", { exact: true }).waitFor({ state: "visible", timeout: 15_000 });
  } catch (error) {
    throw new Error(`Adminstartseite nach Login nicht sichtbar: ${JSON.stringify(loginAntwort)}; ${error instanceof Error ? error.message : String(error)}`);
  }
  await schliesseErstloginHinweise(page);

  await page.getByRole("button", { name: /admin-panel/i }).click();
  await page.getByRole("button", { name: "⚙️ Einstellungen", exact: true }).click();

  const bundesland = page.locator("select").first();
  await bundesland.waitFor({ state: "visible", timeout: 10_000 });
  const bundeslandCode = await bundesland.inputValue();
  if (!bundeslandCode) throw new Error("Die gespeicherte Bundeslandregel ist im Adminbereich nicht sichtbar.");

  await page.getByRole("button", { name: /arbeitsmuster.*urlaubshistorie/i }).click();
  const downloadKarte = page.getByRole("status");
  await downloadKarte.waitFor({ state: "visible", timeout: 10_000 });
  const kartenText = await downloadKarte.textContent() || "";
  const dateiName = kartenText.match(/personalakte_arbeitsmuster_urlaub_[\w-]+\.csv/)?.[0];
  if (!dateiName) throw new Error(`Die Exportkarte zeigt keinen eindeutigen CSV-Dateinamen: ${JSON.stringify(kartenText)}`);

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("link", { name: /csv jetzt herunterladen/i }).click();
  const download = await downloadPromise;
  if (download.suggestedFilename() !== dateiName) {
    throw new Error("Der heruntergeladene Dateiname entspricht nicht der sichtbaren Exportkarte.");
  }
  const stream = await download.createReadStream();
  let csv = "";
  for await (const chunk of stream) csv += chunk.toString();
  if (!csv.includes("Mitarbeiter;")) throw new Error("Der CSV-Export enthält nicht die erwartete Personalakten-Kopfzeile.");

  await page.getByRole("button", { name: "📢 Mitteilungen", exact: true }).click();
  await page.getByText("Informationen an alle Mitarbeiter senden", { exact: true }).waitFor({ state: "visible", timeout: 10_000 });

  console.log(JSON.stringify({
    adminLoginErfolgreich: true,
    bundeslandSichtbar: bundeslandCode,
    mitteilungsStatusSichtbar: true,
    exportKarteSichtbar: true,
    csvDownloadErfolgreich: true,
    dateiName,
    klartextpasswortAusgegeben: false,
  }, null, 2));
  await context.close();
} finally {
  if (browser) await browser.close();
  if (mitarbeiterId) {
    await db.execute("DELETE FROM datenschutzZustimmungen WHERE mitarbeiterId = ?", [mitarbeiterId]);
    await db.execute("DELETE FROM auditLogs WHERE mitarbeiterId = ?", [mitarbeiterId]);
    await db.execute("DELETE FROM mitarbeiterArbeitsmuster WHERE mitarbeiterId = ?", [mitarbeiterId]);
    await db.execute("DELETE FROM mitarbeiter WHERE id = ?", [mitarbeiterId]);
    console.log(JSON.stringify({ testkontoBereinigt: true }, null, 2));
  }
  db.destroy();
}
