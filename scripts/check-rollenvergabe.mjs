import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import mysql from "mysql2/promise";
import { chromium } from "playwright";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL ist für den Rollenvergabetest erforderlich.");

const portalUrl = (process.env.TEST_PORTAL_BASE_URL || "http://127.0.0.1:3000").replace(/\/$/, "");
const kennung = randomUUID().replace(/-/g, "").slice(0, 16);
const adminEmail = `qa-rolle-admin-${kennung}@example.invalid`;
const mitarbeiterEmail = `qa-rolle-ma-${kennung}@example.invalid`;
const passwort = `Qa!${kennung}B7`;
const testNachname = `Rollentest ${kennung.slice(0, 6)}`;
const db = await mysql.createConnection(databaseUrl);
let adminId;
let mitarbeiterId;
let browser;
let context;

async function erstelleKonto(vorname, nachname, email, rolle) {
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

async function schliesseErstloginHinweise(page) {
  const dialog = page.getByRole("dialog", { name: /erstlogin erfolgreich abgeschlossen/i });
  for (let i = 0; i < 25; i += 1) {
    if (!await dialog.isVisible().catch(() => false)) break;
    await page.getByRole("button", { name: "Verstanden" }).click();
    await page.waitForTimeout(25);
  }
}

async function oeffneRollenregister(page) {
  await page.getByRole("button", { name: /admin-panel/i }).click();
  await page.getByRole("button", { name: "👥 Mitarbeiter", exact: true }).click();
  await page.getByPlaceholder("🔍 Name oder E-Mail suchen...").fill(testNachname);
  await page.getByRole("button", { name: "Details", exact: true }).click();
  await page.getByRole("button", { name: "Rechte", exact: true }).click();
}

try {
  adminId = await erstelleKonto("Temporär", "Rollenadmin", adminEmail, "admin");
  mitarbeiterId = await erstelleKonto("Temporär", testNachname, mitarbeiterEmail, "mitarbeiter");
  browser = await chromium.launch({
    headless: true,
    executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });
  context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  await context.addInitScript(() => window.localStorage.setItem("lebensnah_onboarding_done_v2", "true"));
  const page = await context.newPage();
  await page.goto(portalUrl, { waitUntil: "networkidle" });
  const cookieButton = page.getByRole("button", { name: /verstanden.*akzeptieren/i });
  if (await cookieButton.isVisible().catch(() => false)) await cookieButton.click();
  await page.locator('input[type="email"]').fill(adminEmail);
  await page.locator('input[type="password"]').fill(passwort);
  await page.getByRole("button", { name: "Anmelden" }).click();
  await page.getByTestId("portal-aktuelle-seite").getByText("Admin-Dashboard · Gesamtübersicht", { exact: true }).waitFor({ state: "visible", timeout: 15_000 });
  await schliesseErstloginHinweise(page);

  await oeffneRollenregister(page);
  await page.getByRole("button", { name: /teamleitung/i }).click();
  await page.getByRole("button", { name: /rolle.*rechte speichern/i }).click();
  await page.getByText(/Rolle „teamleitung“.+gespeichert/i).first().waitFor({ state: "visible", timeout: 15_000 });

  const [rollenZeilen] = await db.execute("SELECT rolle FROM mitarbeiter WHERE id = ?", [mitarbeiterId]);
  if (rollenZeilen[0]?.rolle !== "teamleitung") {
    throw new Error("Die gewählte Systemrolle wurde nicht dauerhaft in der Mitarbeiterakte gespeichert.");
  }

  await page.reload({ waitUntil: "networkidle" });
  await page.getByTestId("portal-aktuelle-seite").getByText("Admin-Dashboard · Gesamtübersicht", { exact: true }).waitFor({ state: "visible", timeout: 15_000 });
  await oeffneRollenregister(page);
  await page.getByText("Ausgewählte Systemrolle:", { exact: false }).getByText("teamleitung", { exact: true }).waitFor({ state: "visible", timeout: 10_000 });

  console.log(JSON.stringify({
    rolleGespeichert: true,
    rolleNachNeuladenSichtbar: true,
    klartextpasswortAusgegeben: false,
  }, null, 2));
} finally {
  if (context) await context.close();
  if (browser) await browser.close();
  if (adminId || mitarbeiterId) {
    await db.execute("DELETE FROM mitarbeiterBerechtigungen WHERE mitarbeiterId IN (?, ?)", [adminId ?? -1, mitarbeiterId ?? -1]);
    await db.execute("DELETE FROM datenschutzZustimmungen WHERE mitarbeiterId IN (?, ?)", [adminId ?? -1, mitarbeiterId ?? -1]);
    await db.execute("DELETE FROM auditLogs WHERE mitarbeiterId IN (?, ?)", [adminId ?? -1, mitarbeiterId ?? -1]);
    await db.execute("DELETE FROM mitarbeiterArbeitsmuster WHERE mitarbeiterId IN (?, ?)", [adminId ?? -1, mitarbeiterId ?? -1]);
    await db.execute("DELETE FROM mitarbeiter WHERE id IN (?, ?)", [adminId ?? -1, mitarbeiterId ?? -1]);
    console.log(JSON.stringify({ testdatenBereinigt: true }, null, 2));
  }
  await db.end();
}

process.exit(0);
