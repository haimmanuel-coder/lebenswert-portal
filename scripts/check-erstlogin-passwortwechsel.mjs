import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import mysql from "mysql2/promise";
import { chromium } from "playwright";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL ist für den Passwortwechseltest erforderlich.");
const portalUrl = (process.env.TEST_PORTAL_BASE_URL || "http://127.0.0.1:3000").replace(/\/$/, "");
const kennung = randomUUID().replace(/-/g, "").slice(0, 18);
const email = `qa-erstlogin-${kennung}@example.invalid`;
let startpasswort = `Start!${kennung}A`;
const neuesPasswort = `Neu!${kennung}Aa7`;
const db = await mysql.createConnection(databaseUrl);
let mitarbeiterId;
let browser;

try {
  const passwortHash = await bcrypt.hash(startpasswort, 10);
  const [ergebnis] = await db.execute(
    "INSERT INTO mitarbeiter (vorname, nachname, email, passwortHash, rolle, aktiv, passwortWechselErforderlich, zweiFaktorAktiv, datevEinwilligung) VALUES (?, ?, ?, ?, 'mitarbeiter', 1, 1, 0, 0)",
    ["Temporär", "Passwortwechsel", email, passwortHash],
  );
  mitarbeiterId = ergebnis.insertId;
  const [dokumente] = await db.execute("SELECT id, version FROM datenschutzDokumente WHERE aktiv = 1");
  for (const dokument of dokumente) {
    await db.execute("INSERT INTO datenschutzZustimmungen (mitarbeiterId, dokumentId, dokumentVersion) VALUES (?, ?, ?)", [mitarbeiterId, dokument.id, dokument.version]);
  }

  browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium", args: ["--no-sandbox", "--disable-dev-shm-usage"] });
  for (const viewport of [{ name: "mobil", width: 390, height: 844 }, { name: "desktop", width: 1280, height: 720 }]) {
    const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height } });
    const page = await context.newPage();
    await page.goto(portalUrl, { waitUntil: "networkidle" });
    const cookieButton = page.getByRole("button", { name: /verstanden.*akzeptieren/i });
    if (await cookieButton.isVisible().catch(() => false)) await cookieButton.click();
    await page.locator('input[type="email"]').fill(email);
    await page.locator('input[type="password"]').fill(startpasswort);
    await page.getByRole("button", { name: "Anmelden" }).click();
    await page.getByRole("dialog", { name: "Persönliches Passwort festlegen" }).waitFor({ state: "visible", timeout: 15_000 });
    await page.getByTestId("passwortwechsel-startpasswort").fill(startpasswort);
    await page.getByTestId("passwortwechsel-neues-passwort").fill(neuesPasswort);
    await page.getByTestId("passwortwechsel-wiederholung").fill(neuesPasswort);
    await page.getByRole("button", { name: "Passwort speichern und fortfahren" }).click();
    await page.getByRole("dialog", { name: "Persönliches Passwort festlegen" }).waitFor({ state: "hidden", timeout: 15_000 });
    if (viewport.name === "mobil") {
      await page.screenshot({ path: "/home/ubuntu/screenshots/erstlogin-passwortwechsel-mobil.png", fullPage: true });
    }
    await context.close();
    // Der Desktopcheck nutzt anschließend das bereits veränderte Passwort und testet den Dialog deshalb anhand eines neuen Testkontos.
    if (viewport.name === "mobil") {
      const naechstesStartpasswort = `Start2!${kennung}B`;
      await db.execute("UPDATE mitarbeiter SET passwortHash = ?, passwortWechselErforderlich = 1 WHERE id = ?", [await bcrypt.hash(naechstesStartpasswort, 10), mitarbeiterId]);
      startpasswort = naechstesStartpasswort;
    }
  }
  const [status] = await db.execute("SELECT passwortWechselErforderlich FROM mitarbeiter WHERE id = ?", [mitarbeiterId]);
  if (Number(status[0]?.passwortWechselErforderlich) !== 0) throw new Error("Der verpflichtende Passwortwechsel wurde nicht dauerhaft gespeichert.");
  console.log(JSON.stringify({ mobilEingabeUndSpeichern: true, desktopEingabeUndSpeichern: true, klartextpasswortAusgegeben: false }, null, 2));
} finally {
  if (browser) await browser.close();
  if (mitarbeiterId) {
    await db.execute("DELETE FROM datenschutzZustimmungen WHERE mitarbeiterId = ?", [mitarbeiterId]);
    await db.execute("DELETE FROM auditLogs WHERE mitarbeiterId = ?", [mitarbeiterId]);
    await db.execute("DELETE FROM mitarbeiter WHERE id = ?", [mitarbeiterId]);
  }
  await db.end();
}
