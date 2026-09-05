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
  browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium", args: ["--no-sandbox", "--disable-dev-shm-usage"] });
  for (const viewport of [{ name: "mobil", width: 390, height: 844 }, { name: "desktop", width: 1280, height: 720 }]) {
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
      isMobile: viewport.name === "mobil",
      hasTouch: viewport.name === "mobil",
    });
    const page = await context.newPage();
    await page.goto(portalUrl, { waitUntil: "networkidle" });
    const cookieButton = page.getByRole("button", { name: /verstanden.*akzeptieren/i });
    if (await cookieButton.isVisible().catch(() => false)) await cookieButton.click();
    await page.locator('input[type="email"]').fill(email);
    await page.locator('input[type="password"]').fill(startpasswort);
    await page.getByRole("button", { name: "Anmelden" }).click();
    await page.getByRole("dialog", { name: "Persönliches Passwort festlegen" }).waitFor({ state: "visible", timeout: 15_000 });
    if (await page.getByRole("dialog").count() !== 1) {
      throw new Error("Während des Pflicht-Passwortwechsels ist ein konkurrierender Dialog geöffnet.");
    }
    const startpasswortFeld = page.getByTestId("passwortwechsel-startpasswort");
    if (viewport.name === "mobil") {
      await startpasswortFeld.tap();
      const hatTouchFokus = await startpasswortFeld.evaluate((element) => document.activeElement === element);
      if (!hatTouchFokus) throw new Error("Das Startpasswortfeld übernimmt nach dem Antippen nicht den Fokus.");
      await startpasswortFeld.fill(startpasswort);
      await page.getByTestId("passwortwechsel-neues-passwort").tap();
      await page.getByTestId("passwortwechsel-neues-passwort").fill(neuesPasswort);
      await page.getByTestId("passwortwechsel-wiederholung").tap();
      await page.getByTestId("passwortwechsel-wiederholung").fill(neuesPasswort);
    } else {
      const autoFokusAktiv = await startpasswortFeld.evaluate((element) => document.activeElement === element);
      if (!autoFokusAktiv) throw new Error("Das Startpasswortfeld erhält beim Öffnen nicht den Tastaturfokus.");
      await page.keyboard.type(startpasswort);
      await page.keyboard.press("Tab");
      await page.keyboard.press("Tab");
      if (await page.evaluate(() => document.activeElement?.id) !== "neues-passwort") throw new Error("Die Tastatur-Tabfolge erreicht das neue Passwortfeld nicht.");
      await page.keyboard.type(neuesPasswort);
      await page.keyboard.press("Tab");
      await page.keyboard.press("Tab");
      if (await page.evaluate(() => document.activeElement?.id) !== "neues-passwort-wiederholen") throw new Error("Die Tastatur-Tabfolge erreicht die Passwortwiederholung nicht.");
      await page.keyboard.type(neuesPasswort);
    }
    if (viewport.name === "mobil") {
      await page.screenshot({ path: "/home/ubuntu/screenshots/erstlogin-passwortwechsel-mobil.png", fullPage: true });
    }
    // Der Test startet bewusst ohne Zustimmungen, damit ein konkurrierender DSGVO-Dialog
    // den Fokusfehler reproduzieren würde. Erst nach erfolgreicher Eingabe werden die
    // notwendigen Testzustimmungen gesetzt, damit der Ablauf bis zum Dashboard prüfbar ist.
    for (const dokument of dokumente) {
      await db.execute("INSERT INTO datenschutzZustimmungen (mitarbeiterId, dokumentId, dokumentVersion) VALUES (?, ?, ?)", [mitarbeiterId, dokument.id, dokument.version]);
    }
    if (viewport.name === "mobil") {
      await page.getByRole("button", { name: "Passwort speichern und fortfahren" }).tap();
    } else {
      await page.keyboard.press("Tab");
      await page.keyboard.press("Tab");
      await page.keyboard.press("Enter");
    }
    await page.getByRole("dialog", { name: "Persönliches Passwort festlegen" }).waitFor({ state: "hidden", timeout: 15_000 });
    const tourUeberspringen = page.getByRole("button", { name: "Tour überspringen", exact: true });
    if (await tourUeberspringen.waitFor({ state: "visible", timeout: 3000 }).then(() => true).catch(() => false)) await tourUeberspringen.click();
    await page.getByTestId("portal-aktuelle-seite").getByText("Übersicht", { exact: true }).waitFor({ state: "visible", timeout: 15_000 });
    await page.getByRole("heading", { name: "Meine Kunden", exact: true }).waitFor({ state: "visible", timeout: 15_000 });
    if (await page.getByRole("dialog").count() !== 0) throw new Error("Nach Abschluss bleibt ein Pflichtdialog vor dem Dashboard geöffnet.");
    await context.close();
    // Der Desktopcheck nutzt anschließend das bereits veränderte Passwort und testet den Dialog deshalb anhand eines neuen Testkontos.
    if (viewport.name === "mobil") {
      const naechstesStartpasswort = `Start2!${kennung}B`;
      await db.execute("UPDATE mitarbeiter SET passwortHash = ?, passwortWechselErforderlich = 1 WHERE id = ?", [await bcrypt.hash(naechstesStartpasswort, 10), mitarbeiterId]);
      await db.execute("DELETE FROM datenschutzZustimmungen WHERE mitarbeiterId = ?", [mitarbeiterId]);
      startpasswort = naechstesStartpasswort;
    }
  }
  const [status] = await db.execute("SELECT passwortWechselErforderlich FROM mitarbeiter WHERE id = ?", [mitarbeiterId]);
  if (Number(status[0]?.passwortWechselErforderlich) !== 0) throw new Error("Der verpflichtende Passwortwechsel wurde nicht dauerhaft gespeichert.");
  console.log(JSON.stringify({ mobilTouchEingabeUndSpeichern: true, desktopTastaturEingabeUndSpeichern: true, dashboardFreigeschaltet: true, konkurrierendeDialogeAusgeschlossen: true, klartextpasswortAusgegeben: false }, null, 2));
} finally {
  if (browser) await browser.close();
  if (mitarbeiterId) {
    await db.execute("DELETE FROM datenschutzZustimmungen WHERE mitarbeiterId = ?", [mitarbeiterId]);
    await db.execute("DELETE FROM auditLogs WHERE mitarbeiterId = ?", [mitarbeiterId]);
    await db.execute("DELETE FROM mitarbeiter WHERE id = ?", [mitarbeiterId]);
  }
  await db.end();
}
