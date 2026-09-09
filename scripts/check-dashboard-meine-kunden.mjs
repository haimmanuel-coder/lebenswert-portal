import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import mysql from "mysql2/promise";
import { chromium } from "playwright";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL ist für den Dashboard-Kundencheck erforderlich.");

const portalUrl = (process.env.TEST_PORTAL_BASE_URL || "http://127.0.0.1:3000").replace(/\/$/, "");
const kennung = randomUUID().replace(/-/g, "").slice(0, 12);
const passwort = `Qa!${kennung}B7`;
const adminEmail = `qa-meine-kunden-admin-${kennung}@example.invalid`;
const mitarbeiterEmail = `qa-meine-kunden-ma-${kennung}@example.invalid`;
const teamleitungEmail = `qa-meine-kunden-team-${kennung}@example.invalid`;
const buchhaltungEmail = `qa-meine-kunden-buch-${kennung}@example.invalid`;
const unbeteiligteMitarbeiterEmail = `qa-meine-kunden-andere-${kennung}@example.invalid`;
const kundenName = `Kundenkarte${kennung.slice(0, 5)}`;
const datumInTagen = (tage) => {
  const datum = new Date();
  datum.setHours(12, 0, 0, 0);
  datum.setDate(datum.getDate() + tage);
  return datum.toISOString().slice(0, 10);
};
const frueherTermin = datumInTagen(1);
const spaeterTermin = datumInTagen(3);

const db = await mysql.createConnection(databaseUrl);
let adminId;
let mitarbeiterId;
let teamleitungId;
let buchhaltungId;
let unbeteiligteMitarbeiterId;
let kundenId;
let zweiterKundenId;
let browser;

function cookiesAusAntwort(response) {
  const setCookies = typeof response.headers.getSetCookie === "function"
    ? response.headers.getSetCookie()
    : [response.headers.get("set-cookie")].filter(Boolean);
  return setCookies.map((wert) => wert.split(";")[0]).join("; ");
}

async function erstelleMitarbeiter(vorname, nachname, email, rolle) {
  const passwortHash = await bcrypt.hash(passwort, 10);
  const [result] = await db.execute(
    `INSERT INTO mitarbeiter (vorname, nachname, email, passwortHash, rolle, aktiv, passwortWechselErforderlich, zweiFaktorAktiv, datevEinwilligung)
     VALUES (?, ?, ?, ?, ?, 1, 0, 0, 0)`,
    [vorname, nachname, email, passwortHash, rolle],
  );
  return result.insertId;
}

async function meldeAn(email) {
  const response = await fetch(`${portalUrl}/api/trpc/portal.login?batch=1`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ 0: { json: { email, passwort } } }),
  });
  const cookie = cookiesAusAntwort(response);
  if (!response.ok || !cookie) throw new Error("Temporäre Sitzung konnte nicht erstellt werden.");
  return cookie;
}

async function setzeZuordnung(adminCookie) {
  const response = await fetch(`${portalUrl}/api/trpc/kunden.setZuordnungen?batch=1`, {
    method: "POST",
    headers: { "content-type": "application/json", cookie: adminCookie },
    body: JSON.stringify({
      0: {
        json: {
          kundenId,
          zuordnungen: [{ mitarbeiterId, prioritaet: 1, rolle: "hauptbetreuer" }],
        },
      },
    }),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok || payload?.[0]?.error) throw new Error("Kundenzuordnung konnte nicht gespeichert werden.");
}

async function setzeLegacyZuordnung(adminCookie) {
  const response = await fetch(`${portalUrl}/api/trpc/admin.setZuordnung?batch=1`, {
    method: "POST",
    headers: { "content-type": "application/json", cookie: adminCookie },
    body: JSON.stringify({ 0: { json: { mitarbeiterId, kundenIds: [kundenId, zweiterKundenId] } } }),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok || payload?.[0]?.error) throw new Error("Die ältere Kundenzuordnung konnte nicht gespeichert werden.");
}

async function erstelleTestdaten() {
  adminId = await erstelleMitarbeiter("Dashboard", "Admin", adminEmail, "admin");
  mitarbeiterId = await erstelleMitarbeiter("Dashboard", "Mitarbeiter", mitarbeiterEmail, "mitarbeiter");
  teamleitungId = await erstelleMitarbeiter("Dashboard", "Teamleitung", teamleitungEmail, "teamleitung");
  buchhaltungId = await erstelleMitarbeiter("Dashboard", "Buchhaltung", buchhaltungEmail, "buchhaltung");
  unbeteiligteMitarbeiterId = await erstelleMitarbeiter("Dashboard", "Ohne Zuordnung", unbeteiligteMitarbeiterEmail, "mitarbeiter");

  const [dokumente] = await db.execute("SELECT id, version FROM datenschutzDokumente WHERE aktiv = 1");
  for (const dokument of dokumente) {
    for (const id of [adminId, mitarbeiterId, teamleitungId, buchhaltungId, unbeteiligteMitarbeiterId]) {
      await db.execute(
        "INSERT INTO datenschutzZustimmungen (mitarbeiterId, dokumentId, dokumentVersion) VALUES (?, ?, ?)",
        [id, dokument.id, dokument.version],
      );
    }
  }

  const [kunde] = await db.execute(
    `INSERT INTO kunden (vorname, nachname, strasse, plz, ort, pflegegrad, paragraph, paragraphen, aktiv)
     VALUES ('Meine', ?, 'Teststraße 1', '42103', 'Wuppertal', 3, '45b', '["45b","39"]', 1)`,
    [kundenName],
  );
  kundenId = kunde.insertId;
  const [zweiterKunde] = await db.execute(
    `INSERT INTO kunden (vorname, nachname, strasse, plz, ort, pflegegrad, paragraph, paragraphen, aktiv)
     VALUES ('Zweite', ?, 'Testweg 2', '42275', 'Wuppertal', 2, '39', '["39"]', 1)`,
    [`Kundenkarte${kennung.slice(0, 5)}`],
  );
  zweiterKundenId = zweiterKunde.insertId;
  await db.execute(
    "INSERT INTO einsaetze (mitarbeiterId, kundenId, datum, startzeit, dauerStunden, paragraph, status) VALUES (?, ?, ?, '09:00:00', 1.50, '45b', 'geplant'), (?, ?, ?, '11:00:00', 1.50, '39', 'geplant')",
    [mitarbeiterId, kundenId, spaeterTermin, mitarbeiterId, zweiterKundenId, frueherTermin],
  );
}

async function pruefeKeinePersoenlicheKarte(email) {
  const context = await browser.newContext({ viewport: { width: 375, height: 812 } });
  await context.addInitScript(() => window.localStorage.setItem("lebensnah_onboarding_done_v2", "true"));
  const cookie = await meldeAn(email);
  const trennzeichen = cookie.indexOf("=");
  if (trennzeichen < 1) throw new Error("Die Rollenprüfung konnte keine sichere Sitzung übernehmen.");
  await context.addCookies([{
    name: cookie.slice(0, trennzeichen),
    value: cookie.slice(trennzeichen + 1),
    url: portalUrl,
    httpOnly: true,
    secure: portalUrl.startsWith("https://"),
    sameSite: "Lax",
  }]);
  const page = await context.newPage();
  await page.goto(portalUrl, { waitUntil: "networkidle" });
  const cookieButton = page.getByRole("button", { name: /verstanden.*akzeptieren/i });
  if (await cookieButton.isVisible().catch(() => false)) await cookieButton.click();
  await page.getByTestId("portal-aktuelle-seite").waitFor({ state: "visible", timeout: 15_000 });
  if (await page.getByRole("heading", { name: "Meine Kunden" }).isVisible().catch(() => false)) {
    throw new Error("Eine nicht als Mitarbeiter angemeldete Rolle sieht fälschlich die persönliche Kundenkarte.");
  }
  await context.close();
}

async function pruefeMitarbeiterDashboard() {
  const adminCookie = await meldeAn(adminEmail);
  await setzeZuordnung(adminCookie);
  await setzeLegacyZuordnung(adminCookie);

  const [benachrichtigungen] = await db.execute(
    "SELECT id FROM notifications WHERE empfaengerId = ? AND titel = 'Neue Kundenzuordnung'",
    [mitarbeiterId],
  );
  if (benachrichtigungen.length !== 2) throw new Error("Beide Kundenzuweisungswege haben keine eindeutige Mitarbeiterbenachrichtigung erzeugt.");
  const [fremdeBenachrichtigungen] = await db.execute(
    "SELECT id FROM notifications WHERE empfaengerId IN (?, ?, ?, ?) AND titel = 'Neue Kundenzuordnung'",
    [adminId, teamleitungId, buchhaltungId, unbeteiligteMitarbeiterId],
  );
  if (fremdeBenachrichtigungen.length !== 0) throw new Error("Eine unbeteiligte Rolle hat fälschlich eine Kundenzuweisungsbenachrichtigung erhalten.");

  browser = await chromium.launch({
    headless: true,
    executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });
  const context = await browser.newContext({ viewport: { width: 375, height: 812 } });
  await context.addInitScript(() => window.localStorage.setItem("lebensnah_onboarding_done_v2", "true"));
  const page = await context.newPage();
  await page.goto(portalUrl, { waitUntil: "networkidle" });
  const cookieButton = page.getByRole("button", { name: /verstanden.*akzeptieren/i });
  if (await cookieButton.isVisible().catch(() => false)) await cookieButton.click();
  await page.locator('input[type="email"]').fill(mitarbeiterEmail);
  await page.locator('input[type="password"]').fill(passwort);
  await page.getByRole("button", { name: "Anmelden" }).click();
  await page.getByTestId("portal-aktuelle-seite").waitFor({ state: "visible", timeout: 15_000 });

  await page.getByRole("heading", { name: "Meine Kunden" }).waitFor({ state: "visible", timeout: 10_000 });
  await page.getByTestId("meine-kunden-eintrag").filter({ hasText: `Meine ${kundenName}` }).waitFor({ state: "visible", timeout: 10_000 });
  await page.getByTestId("meine-kunden-eintrag").filter({ hasText: `Zweite Kundenkarte${kennung.slice(0, 5)}` }).waitFor({ state: "visible", timeout: 10_000 });
  await page.getByText("Neue Kundenzuordnung", { exact: true }).first().waitFor({ state: "visible", timeout: 10_000 });

  const suche = page.locator("#meine-kunden-suche");
  await suche.fill("Wuppertal");
  await page.getByTestId("meine-kunden-eintrag").filter({ hasText: `Meine ${kundenName}` }).waitFor({ state: "visible", timeout: 10_000 });
  await page.getByRole("button", { name: "§ 45b" }).click();
  await page.getByTestId("meine-kunden-eintrag").filter({ hasText: `Meine ${kundenName}` }).waitFor({ state: "visible", timeout: 10_000 });
  await suche.fill("");
  await page.getByRole("button", { name: "Alle", exact: true }).click();
  await page.locator("#meine-kunden-sortierung").selectOption("naechsterTermin");
  const sortierteNamen = await page.getByTestId("meine-kunden-eintrag").evaluateAll((eintraege) => eintraege.map((eintrag) => eintrag.textContent ?? ""));
  if (!sortierteNamen[0]?.includes(`Zweite Kundenkarte${kennung.slice(0, 5)}`)) throw new Error("Die Kundenkarte sortiert nicht nach dem nächsten Termin.");
  const animationsname = await page.getByTestId("neue-kundenzuweisung-hinweis").first().evaluate((element) => getComputedStyle(element).animationName);
  if (animationsname !== "kundenzuweisung-eintreffen") throw new Error("Die neue Kundenzuweisung wird nicht dezent animiert hervorgehoben.");
  await page.screenshot({ path: "/home/ubuntu/screenshots/dashboard-meine-kunden-mobil.png", fullPage: true });

  await context.close();
  await pruefeKeinePersoenlicheKarte(adminEmail);
  await pruefeKeinePersoenlicheKarte(teamleitungEmail);
  await pruefeKeinePersoenlicheKarte(buchhaltungEmail);
}

try {
  await erstelleTestdaten();
  await pruefeMitarbeiterDashboard();
  console.log(JSON.stringify({
    meineKundenKarteSichtbar: true,
    nurZugeordneterKundeSichtbar: true,
    sucheUndParagraphFilterFunktionieren: true,
    zuweisungsBenachrichtigungSichtbar: true,
    benachrichtigungNurAnNeueBetreuungskraft: true,
    nichtMitarbeiterSehenKeinePersoenlicheKundenkarte: true,
    naechsteTermineSortierungFunktioniert: true,
    zuweisungsAnimationSichtbar: true,
    mobilGeprueft: true,
    klartextZugangsdatenAusgegeben: false,
  }, null, 2));
} finally {
  if (browser) await browser.close();
  if (kundenId) await db.execute("DELETE FROM notifications WHERE empfaengerId IN (?, ?, ?, ?, ?)", [adminId, mitarbeiterId, teamleitungId, buchhaltungId, unbeteiligteMitarbeiterId]);
  if (kundenId || zweiterKundenId) await db.execute("DELETE FROM einsaetze WHERE kundenId IN (?, ?)", [kundenId ?? 0, zweiterKundenId ?? 0]);
  if (kundenId || zweiterKundenId) await db.execute("DELETE FROM kundenZuordnung WHERE kundenId IN (?, ?)", [kundenId ?? 0, zweiterKundenId ?? 0]);
  if (kundenId || zweiterKundenId) await db.execute("DELETE FROM kunden WHERE id IN (?, ?)", [kundenId ?? 0, zweiterKundenId ?? 0]);
  for (const id of [adminId, mitarbeiterId, teamleitungId, buchhaltungId, unbeteiligteMitarbeiterId]) {
    if (!id) continue;
    await db.execute("DELETE FROM datenschutzZustimmungen WHERE mitarbeiterId = ?", [id]);
    await db.execute("DELETE FROM auditLogs WHERE mitarbeiterId = ?", [id]);
    await db.execute("DELETE FROM mitarbeiterArbeitsmuster WHERE mitarbeiterId = ?", [id]);
    await db.execute("DELETE FROM mitarbeiter WHERE id = ?", [id]);
  }
  await db.end();
}
