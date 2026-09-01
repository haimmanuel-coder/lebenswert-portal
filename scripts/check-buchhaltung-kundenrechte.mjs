import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import mysql from "mysql2/promise";
import { chromium } from "playwright";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL ist für den Buchhaltungs-Rechtetest erforderlich.");

const portalUrl = (process.env.TEST_PORTAL_BASE_URL || "http://127.0.0.1:3000").replace(/\/$/, "");
const kennung = randomUUID().replace(/-/g, "").slice(0, 16);
const email = `qa-buchhaltung-${kennung}@example.invalid`;
const passwort = `Qa!${kennung}B7`;
const kundenNachname = `Buchhaltungs-Test ${kennung.slice(0, 6)}`;
const neuerTelefonwert = "01234567890";
const db = await mysql.createConnection(databaseUrl);
let mitarbeiterId;
let kundenId;
let browser;
let context;

async function erstelleBuchhaltung() {
  const passwortHash = await bcrypt.hash(passwort, 10);
  const [ergebnis] = await db.execute(
    `INSERT INTO mitarbeiter
      (vorname, nachname, email, passwortHash, rolle, aktiv, passwortWechselErforderlich, zweiFaktorAktiv, datevEinwilligung)
     VALUES (?, ?, ?, ?, 'buchhaltung', 1, 0, 0, 0)`,
    ["Temporär", "Buchhaltung", email, passwortHash],
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

try {
  mitarbeiterId = await erstelleBuchhaltung();
  const [kunde] = await db.execute(
    "INSERT INTO kunden (vorname, nachname, telefon, aktiv) VALUES (?, ?, ?, 1)",
    ["Temporär", kundenNachname, "0000000000"],
  );
  kundenId = kunde.insertId;

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
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(passwort);
  await page.getByRole("button", { name: "Anmelden" }).click();
  await page.getByTestId("portal-aktuelle-seite").waitFor({ state: "visible", timeout: 15_000 });

  await page.getByRole("button", { name: /budgetverwaltung/i }).click();
  await page.getByRole("heading", { name: "Budgetverwaltung", exact: true }).waitFor({ state: "visible", timeout: 10_000 });
  await page.getByRole("combobox").first().click();
  await page.getByRole("option", { name: new RegExp(kundenNachname) }).click();
  await page.getByRole("button", { name: /jahresbudget anlegen/i }).click();
  await page.getByPlaceholder("z.B. 3386.00").fill("1234.50");
  await page.getByRole("button", { name: "Anlegen", exact: true }).click();
  await page.getByText("Jahresbudget angelegt", { exact: true }).first().waitFor({ state: "visible", timeout: 15_000 });

  await page.getByRole("button", { name: /kundenliste/i }).click();
  await page.getByPlaceholder("🔍 Name, Adresse oder Versicherungsnr. suchen...").fill(kundenNachname);
  await page.getByText(new RegExp(kundenNachname)).first().click();
  await page.getByRole("button", { name: /bearbeiten/i }).click();
  await page.getByText("Telefon", { exact: true }).locator("..").locator("input").fill(neuerTelefonwert);
  await page.getByRole("button", { name: /änderungen speichern/i }).click();
  await page.waitForTimeout(1_000);
  if (await page.getByRole("button", { name: /deaktivieren/i }).count() !== 0) {
    throw new Error("Die Buchhaltungsrolle darf keinen Kunden-Deaktivierungsbutton erhalten.");
  }

  const [budgetZeilen] = await db.execute("SELECT id FROM jahresbudgets WHERE kundenId = ?", [kundenId]);
  const [kundenZeilen] = await db.execute("SELECT telefon FROM kunden WHERE id = ?", [kundenId]);
  const pruefwerte = {
    budgetAnzahl: budgetZeilen.length,
    kundendatenGespeichert: kundenZeilen[0]?.telefon === neuerTelefonwert,
  };
  if (pruefwerte.budgetAnzahl !== 1 || !pruefwerte.kundendatenGespeichert) {
    throw new Error(`Budgetanlage oder Kundendatenpflege der Buchhaltungsrolle fehlt: ${JSON.stringify(pruefwerte)}`);
  }

  console.log(JSON.stringify({
    budgetAnlageDurchBuchhaltung: true,
    kundendatenpflegeDurchBuchhaltung: true,
    kundenDeaktivierungNichtFreigegeben: true,
    klartextpasswortAusgegeben: false,
  }, null, 2));
} finally {
  if (context) await context.close();
  if (browser) await browser.close();
  if (kundenId) {
    await db.execute("DELETE FROM jahresbudgets WHERE kundenId = ?", [kundenId]);
    await db.execute("DELETE FROM budget_45b WHERE kundenId = ?", [kundenId]);
    await db.execute("DELETE FROM budget_39 WHERE kundenId = ?", [kundenId]);
    await db.execute("DELETE FROM kunden WHERE id = ?", [kundenId]);
  }
  if (mitarbeiterId) {
    await db.execute("DELETE FROM datenschutzZustimmungen WHERE mitarbeiterId = ?", [mitarbeiterId]);
    await db.execute("DELETE FROM auditLogs WHERE mitarbeiterId = ?", [mitarbeiterId]);
    await db.execute("DELETE FROM mitarbeiterArbeitsmuster WHERE mitarbeiterId = ?", [mitarbeiterId]);
    await db.execute("DELETE FROM mitarbeiter WHERE id = ?", [mitarbeiterId]);
  }
  await db.end();
  console.log(JSON.stringify({ testdatenBereinigt: true }, null, 2));
}

process.exit(0);
