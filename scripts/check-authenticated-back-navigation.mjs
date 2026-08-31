import "dotenv/config";
import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import mysql from "mysql2/promise";
import { chromium } from "playwright";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL ist für den Browser-Login-Test erforderlich.");

const portalUrl = (process.env.TEST_PORTAL_BASE_URL || "http://127.0.0.1:3000").replace(/\/$/, "");
const kennung = randomUUID().replace(/-/g, "").slice(0, 16);
const email = `qa-navigation-${kennung}@example.invalid`;
const passwort = `Qa!${kennung}B7`;
const db = await mysql.createConnection(databaseUrl);
let mitarbeiterId;
let browser;

async function erstelleTestkonto() {
  const passwortHash = await bcrypt.hash(passwort, 10);
  const [insertErgebnis] = await db.execute(
    `INSERT INTO mitarbeiter
      (vorname, nachname, email, passwortHash, rolle, aktiv, passwortWechselErforderlich, zweiFaktorAktiv, datevEinwilligung)
     VALUES (?, ?, ?, ?, 'mitarbeiter', 1, 0, 0, 0)`,
    ["Temporär", "Navigationstest", email, passwortHash],
  );
  mitarbeiterId = insertErgebnis.insertId;

  // Der Test prüft die Navigation nach erfolgreichem Login. Aktive
  // Datenschutzvorlagen werden ausschließlich für dieses kurzlebige Konto
  // vorab bestätigt und im finally-Block restlos entfernt.
  const [dokumente] = await db.execute("SELECT id, version FROM datenschutzDokumente WHERE aktiv = 1");
  for (const dokument of dokumente) {
    await db.execute(
      `INSERT INTO datenschutzZustimmungen (mitarbeiterId, dokumentId, dokumentVersion)
       VALUES (?, ?, ?)`,
      [mitarbeiterId, dokument.id, dokument.version],
    );
  }
}

async function pruefeAnsicht(viewport, erwarteteStartseite) {
  const context = await browser.newContext({ viewport });
  try {
    await context.addInitScript(() => {
      window.localStorage.setItem("lebensnah_onboarding_done_v2", "true");
    });
    const page = await context.newPage();
    let loginAntwort = null;
    page.on("response", async (response) => {
      if (!response.url().includes("portal.login")) return;
      const raw = await response.text().catch(() => "");
      loginAntwort = {
        status: response.status(),
        contentType: response.headers()["content-type"] || null,
        antwortIstJson: (() => { try { JSON.parse(raw); return true; } catch { return false; } })(),
        superjsonMetaVorhanden: raw.includes('"meta"'),
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
      await page.getByTestId("portal-aktuelle-seite").waitFor({ state: "visible", timeout: 15_000 });
    } catch (error) {
      throw new Error(`Portalansicht nach Login nicht sichtbar: ${JSON.stringify(loginAntwort)}; ${error instanceof Error ? error.message : String(error)}`);
    }
    await page.getByTestId("portal-aktuelle-seite").getByText(erwarteteStartseite, { exact: true }).waitFor({ state: "visible", timeout: 10_000 });

    const erstloginHinweis = page.getByRole("button", { name: "Verstanden" });
    if (erwarteteStartseite.startsWith("Admin-")) {
      const erstloginDialog = page.getByRole("dialog", { name: /erstlogin erfolgreich abgeschlossen/i });
      for (let i = 0; i < 50; i += 1) {
        if (!await erstloginDialog.isVisible().catch(() => false)) break;
        await erstloginHinweis.click();
        await page.waitForTimeout(25);
      }
      await erstloginDialog.waitFor({ state: "hidden", timeout: 10_000 });
    }

    const planungsButton = viewport.width < 768
      ? page.locator('nav[aria-label="Kurz-Navigation"] button').filter({ hasText: "Planung" })
      : page.getByRole("button", { name: "📅 Einsatzplanung", exact: true });
    await planungsButton.click();

    const rueckpfeil = page.getByRole("button", { name: /vorherigen ansicht zurück/i });
    await rueckpfeil.waitFor({ state: "visible", timeout: 10_000 });
    const urlVorRueckkehr = page.url();
    await rueckpfeil.click();
    await rueckpfeil.waitFor({ state: "detached", timeout: 10_000 });

    if (page.url() !== urlVorRueckkehr) {
      throw new Error("Der Rückpfeil hat eine Browsernavigation ausgelöst statt intern zurückzuführen.");
    }
    await page.getByTestId("portal-aktuelle-seite").getByText(erwarteteStartseite, { exact: true }).waitFor({ state: "visible", timeout: 10_000 });
  } finally {
    await context.close();
  }
}

try {
  await erstelleTestkonto();
  browser = await chromium.launch({
    headless: true,
    executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });

  await pruefeAnsicht({ width: 1280, height: 720 }, "Übersicht");
  await pruefeAnsicht({ width: 375, height: 812 }, "Übersicht");
  await db.execute("UPDATE mitarbeiter SET rolle = 'admin' WHERE id = ?", [mitarbeiterId]);
  await pruefeAnsicht({ width: 1280, height: 720 }, "Admin-Dashboard · Gesamtübersicht");
  await pruefeAnsicht({ width: 375, height: 812 }, "Admin-Dashboard · Gesamtübersicht");

  console.log(JSON.stringify({
    testkonto: email.replace(/^(.{4}).*(@.*)$/, "$1…$2"),
    loginErfolgreich: true,
    rueckpfeilDesktop: true,
    rueckpfeilMobil: true,
    rueckpfeilAdminDesktop: true,
    rueckpfeilAdminMobil: true,
    zielseitenNachRueckkehrBestaetigt: true,
    browserExitVermieden: true,
    klartextpasswortAusgegeben: false,
  }, null, 2));
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
