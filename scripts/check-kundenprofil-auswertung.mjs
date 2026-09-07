import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import mysql from "mysql2/promise";
import { chromium } from "playwright";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL ist für den Auswertungs-Browsercheck erforderlich.");

const portalUrl = (process.env.TEST_PORTAL_BASE_URL || "http://127.0.0.1:3000").replace(/\/$/, "");
const kennung = randomUUID().replace(/-/g, "").slice(0, 12);
const email = `qa-auswertung-${kennung}@example.invalid`;
const mitarbeiterEmail = `qa-auswertung-ma-${kennung}@example.invalid`;
const passwort = `Qa!${kennung}B7`;
const kundenNachname = `Auswertung${kennung.slice(0, 5)}`;
const aktuellesDatum = new Date().toISOString().slice(0, 10);
const aktuellesJahr = new Date().getFullYear();
const db = await mysql.createConnection(databaseUrl);
let adminId;
let mitarbeiterId;
let kundenId;
let browser;

function cookiesAusAntwort(response) {
  const setCookies = typeof response.headers.getSetCookie === "function"
    ? response.headers.getSetCookie()
    : [response.headers.get("set-cookie")].filter(Boolean);
  return setCookies.map((wert) => wert.split(";")[0]).join("; ");
}

async function meldeAn(kennungEmail) {
  const response = await fetch(`${portalUrl}/api/trpc/portal.login?batch=1`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ 0: { json: { email: kennungEmail, passwort } } }),
  });
  const cookie = cookiesAusAntwort(response);
  if (!response.ok || !cookie) throw new Error("Temporäre Sitzung für die Rollenprüfung konnte nicht erstellt werden.");
  return cookie;
}

async function erstelleTestdaten() {
  const passwortHash = await bcrypt.hash(passwort, 10);
  const [admin] = await db.execute(
    "INSERT INTO mitarbeiter (vorname, nachname, email, passwortHash, rolle, aktiv, passwortWechselErforderlich, zweiFaktorAktiv, datevEinwilligung) VALUES ('Temporär', 'Auswertung', ?, ?, 'admin', 1, 0, 0, 0)",
    [email, passwortHash],
  );
  adminId = admin.insertId;
  const [mitarbeiter] = await db.execute(
    "INSERT INTO mitarbeiter (vorname, nachname, email, passwortHash, rolle, aktiv, passwortWechselErforderlich, zweiFaktorAktiv, datevEinwilligung) VALUES ('Temporär', 'Ohne Analyse-Recht', ?, ?, 'mitarbeiter', 1, 0, 0, 0)",
    [mitarbeiterEmail, passwortHash],
  );
  mitarbeiterId = mitarbeiter.insertId;
  const [dokumente] = await db.execute("SELECT id, version FROM datenschutzDokumente WHERE aktiv = 1");
  for (const dokument of dokumente) {
    for (const id of [adminId, mitarbeiterId]) {
      await db.execute("INSERT INTO datenschutzZustimmungen (mitarbeiterId, dokumentId, dokumentVersion) VALUES (?, ?, ?)", [id, dokument.id, dokument.version]);
    }
  }
  const [kunde] = await db.execute(
    "INSERT INTO kunden (vorname, nachname, strasse, plz, ort, pflegegrad, paragraph, paragraphen, aktiv) VALUES ('Test', ?, 'Prüfstraße 1', '42103', 'Wuppertal', 3, '45b', '[\"45b\",\"39\"]', 1)",
    [kundenNachname],
  );
  kundenId = kunde.insertId;
  await db.execute(
    "INSERT INTO jahresbudgets (kundenId, leistungsbereich, jahresbudgetCent, verbrauchtCent, gueltigAb, gueltigBis, stundensatzCent) VALUES (?, '39', 100000, 25000, ?, ?, 5000), (?, '45b', 13100, 3100, ?, ?, 3500)",
    [kundenId, `${aktuellesJahr}-01-01`, `${aktuellesJahr}-12-31`, kundenId, `${aktuellesJahr}-01-01`, `${aktuellesJahr}-12-31`],
  );
  await db.execute(
    "INSERT INTO einsaetze (mitarbeiterId, kundenId, datum, startzeit, endzeit, dauerStunden, paragraph, paragraph2, stunden1, stunden2, kosten1, kosten2, status) VALUES (?, ?, ?, '09:00:00', '11:30:00', 2.50, '39', '45b', 2.00, 0.50, 100.00, 20.50, 'abgeschlossen')",
    [adminId, kundenId, aktuellesDatum],
  );
}

async function pruefeMobileKundenAuswertung() {
  browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium", args: ["--no-sandbox", "--disable-dev-shm-usage"] });
  const context = await browser.newContext({ viewport: { width: 375, height: 812 } });
  await context.addInitScript(() => window.localStorage.setItem("lebensnah_onboarding_done_v2", "true"));
  const page = await context.newPage();
  await page.goto(portalUrl, { waitUntil: "networkidle" });
  const cookieButton = page.getByRole("button", { name: /verstanden.*akzeptieren/i });
  if (await cookieButton.isVisible().catch(() => false)) await cookieButton.click();
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(passwort);
  await page.getByRole("button", { name: "Anmelden" }).click();
  await page.getByTestId("portal-aktuelle-seite").waitFor({ state: "visible", timeout: 15_000 });
  await page.getByRole("button", { name: "Weiteres Menü öffnen" }).click();
  await page.getByPlaceholder("Suchen…").fill("Kundenliste");
  await page.getByRole("button", { name: "👥 Kundenliste", exact: true }).click();
  await page.getByTestId("portal-aktuelle-seite").getByText("Kundenliste", { exact: true }).waitFor({ state: "visible", timeout: 10_000 });
  const suche = page.getByPlaceholder("🔍 Name, Adresse oder Versicherungsnr. suchen...");
  await suche.fill(kundenNachname);
  await page.getByText(`Test ${kundenNachname}`, { exact: true }).click();
  await page.getByRole("button", { name: "📊 Auswertung", exact: true }).click();
  const auswertung = page.getByTestId("kunden-paragraphen-auswertung");
  await auswertung.waitFor({ state: "visible", timeout: 10_000 });
  const text = await auswertung.textContent() || "";
  if (!text.includes("§39 SGB XI") || !text.includes("2,00 Std.") || !text.includes("§45b SGB XI") || !text.includes("0,50 Std.")) {
    throw new Error("Die gesplitteten Paragraphstunden sind im Kundenprofil nicht vollständig sichtbar.");
  }
  const ueberlauf = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  if (ueberlauf) throw new Error("Die Kundenprofil-Auswertung erzeugt im mobilen Viewport einen horizontalen Überlauf.");
  await context.close();
}

async function pruefeRollenSperre() {
  const cookie = await meldeAn(mitarbeiterEmail);
  const input = encodeURIComponent(JSON.stringify({ 0: { json: { monat: new Date().toISOString().slice(0, 7) } } }));
  const response = await fetch(`${portalUrl}/api/trpc/analysen.mitarbeiterBetreuungskennzahlen?batch=1&input=${input}`, { headers: { cookie } });
  const payload = await response.text();
  if (response.status !== 403 || !payload.includes("FORBIDDEN")) {
    throw new Error("Ein Mitarbeiter ohne Führungsrolle kann die geschützte Personal-Auswertung aufrufen.");
  }
}

try {
  await erstelleTestdaten();
  await pruefeMobileKundenAuswertung();
  await pruefeRollenSperre();
  console.log(JSON.stringify({ kundenprofilAuswertungSichtbar: true, splitStundenSichtbar: true, mobilOhneHorizontalenUeberlauf: true, mitarbeiterKennzahlenGeschuetzt: true, klartextZugangsdatenAusgegeben: false }, null, 2));
} finally {
  if (browser) await browser.close();
  if (kundenId) {
    await db.execute("DELETE FROM einsaetze WHERE kundenId = ?", [kundenId]);
    await db.execute("DELETE FROM jahresbudgets WHERE kundenId = ?", [kundenId]);
    await db.execute("DELETE FROM kunden WHERE id = ?", [kundenId]);
  }
  for (const id of [adminId, mitarbeiterId]) {
    if (!id) continue;
    await db.execute("DELETE FROM datenschutzZustimmungen WHERE mitarbeiterId = ?", [id]);
    await db.execute("DELETE FROM auditLogs WHERE mitarbeiterId = ?", [id]);
    await db.execute("DELETE FROM mitarbeiterArbeitsmuster WHERE mitarbeiterId = ?", [id]);
    await db.execute("DELETE FROM mitarbeiter WHERE id = ?", [id]);
  }
  await db.end();
}
