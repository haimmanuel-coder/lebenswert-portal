import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import mysql from "mysql2/promise";
import { chromium } from "playwright";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL ist für den Planungsdialog-Browsercheck erforderlich.");

const portalUrl = (process.env.TEST_PORTAL_BASE_URL || "http://127.0.0.1:3000").replace(/\/$/, "");
const kennung = randomUUID().replace(/-/g, "").slice(0, 14);
const passwort = `Qa!${kennung}B7`;
const kundenVorname = "Termin";
const kundenNachname = `Namenspruefung${kennung.slice(0, 4)}`;
const kundenName = `${kundenVorname} ${kundenNachname}`;
const erstesTeammitglied = "Planung Team Alpha";
const zweitesTeammitglied = "Planung Team Beta";
const emails = {
  admin: `qa-kundenname-admin-${kennung}@example.invalid`,
  alpha: `qa-kundenname-${kennung}@example.invalid`,
  beta: `qa-kundenname-team-${kennung}@example.invalid`,
  ohneZuordnung: `qa-kundenname-ohne-${kennung}@example.invalid`,
};

const db = await mysql.createConnection(databaseUrl);
let adminMitarbeiterId;
let mitarbeiterId;
let zweiterMitarbeiterId;
let unzugeordneterMitarbeiterId;
let kundenId;
let nichtZugeordneterKundenId;
let einsatzId;
let browser;

async function erstelleMitarbeiter(vorname, nachname, email, passwortHash, rolle = "mitarbeiter") {
  const [result] = await db.execute(
    `INSERT INTO mitarbeiter
      (vorname, nachname, email, passwortHash, rolle, aktiv, passwortWechselErforderlich, zweiFaktorAktiv, datevEinwilligung)
     VALUES (?, ?, ?, ?, ?, 1, 0, 0, 0)`,
    [vorname, nachname, email, passwortHash, rolle],
  );
  return result.insertId;
}

async function erstelleTestdaten() {
  const passwortHash = await bcrypt.hash(passwort, 10);
  adminMitarbeiterId = await erstelleMitarbeiter("Planung", "Admin", emails.admin, passwortHash, "admin");
  mitarbeiterId = await erstelleMitarbeiter("Planung", "Team Alpha", emails.alpha, passwortHash);
  zweiterMitarbeiterId = await erstelleMitarbeiter("Planung", "Team Beta", emails.beta, passwortHash);
  unzugeordneterMitarbeiterId = await erstelleMitarbeiter("Planung", "Ohne Zuordnung", emails.ohneZuordnung, passwortHash);

  const [dokumente] = await db.execute("SELECT id, version FROM datenschutzDokumente WHERE aktiv = 1");
  for (const dokument of dokumente) {
    for (const id of [adminMitarbeiterId, mitarbeiterId, zweiterMitarbeiterId, unzugeordneterMitarbeiterId]) {
      await db.execute(
        "INSERT INTO datenschutzZustimmungen (mitarbeiterId, dokumentId, dokumentVersion) VALUES (?, ?, ?)",
        [id, dokument.id, dokument.version],
      );
    }
  }

  const [kundenInsert] = await db.execute(
    `INSERT INTO kunden (vorname, nachname, strasse, plz, ort, pflegegrad, paragraph, paragraphen, aktiv)
     VALUES (?, ?, 'Teststraße 1', '90402', 'Nürnberg', 3, '45b', '["45b","39"]', 1)`,
    [kundenVorname, kundenNachname],
  );
  kundenId = kundenInsert.insertId;
  const [nichtZugeordneterKundenInsert] = await db.execute(
    `INSERT INTO kunden (vorname, nachname, strasse, plz, ort, pflegegrad, paragraph, paragraphen, aktiv)
     VALUES ('Sperr', ?, 'Teststraße 2', '90402', 'Nürnberg', 2, '45b', '["45b"]', 1)`,
    [`NichtZugeordnet${kennung.slice(0, 4)}`],
  );
  nichtZugeordneterKundenId = nichtZugeordneterKundenInsert.insertId;
  await db.execute(
    `INSERT INTO kundenZuordnung (mitarbeiterId, kundenId, prioritaet, rolle)
     VALUES (?, ?, 1, 'hauptbetreuer'), (?, ?, 2, 'vertretung')`,
    [mitarbeiterId, kundenId, zweiterMitarbeiterId, kundenId],
  );
  const [einsatzInsert] = await db.execute(
    `INSERT INTO einsaetze (mitarbeiterId, kundenId, datum, startzeit, dauerStunden, paragraph, status)
     VALUES (?, ?, CURDATE(), '09:00:00', 1.50, '45b', 'geplant')`,
    [mitarbeiterId, kundenId],
  );
  einsatzId = einsatzInsert.insertId;
}

async function schliesseHinweise(page) {
  const dialog = page.getByRole("dialog").filter({ hasText: /erstlogin erfolgreich abgeschlossen/i });
  await dialog.waitFor({ state: "visible", timeout: 3_000 }).catch(() => undefined);
  for (let i = 0; i < 50; i += 1) {
    if (!await dialog.isVisible().catch(() => false)) break;
    await dialog.getByRole("button", { name: "Verstanden" }).click();
    await page.waitForTimeout(25);
  }
}

async function anmeldeUndOeffnePlanung(email) {
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
  await schliesseHinweise(page);
  await page.getByRole("button", { name: /einsatzplanung/i }).last().click();
  await page.getByRole("button", { name: /meinen termin planen/i }).click();
  const dialog = page.getByTestId("terminassistent-dialog");
  await dialog.waitFor({ state: "visible", timeout: 10_000 });
  return { context, page, dialog };
}

async function pruefeZugeordnetenMitarbeiter(email, pruefeTerminkarte = false) {
  const test = await anmeldeUndOeffnePlanung(email);
  try {
    const kundenAusloeser = test.dialog.getByRole("button", { name: /kunden auswählen/i }).last();
    await kundenAusloeser.click();
    await test.dialog.getByPlaceholder("Name, Ort, Versicherungsnummer …").fill(kundenName);
    const kundenOption = test.dialog.getByRole("button", { name: new RegExp(kundenName, "i") }).last();
    await kundenOption.waitFor({ state: "visible", timeout: 10_000 });
    const auswahlText = (await kundenOption.textContent() || "").replace(/\s+/g, " ");
    if (!auswahlText.includes(kundenName) || auswahlText.includes(`${kundenNachname}, ${kundenVorname}`)) {
      throw new Error("Die Kundenliste zeigt Vor- und Nachname nicht in der geforderten Reihenfolge.");
    }
    if (!auswahlText.includes(erstesTeammitglied) || !auswahlText.includes(zweitesTeammitglied)) {
      throw new Error("Das Betreuungsteam ist im Kunden-Auswahlfeld nicht vollständig sichtbar.");
    }
    await kundenOption.click();
    const ausgewaehlt = test.dialog.getByRole("button", { name: new RegExp(kundenName, "i") }).last();
    await ausgewaehlt.waitFor({ state: "visible", timeout: 10_000 });
    const ausgewaehltText = (await ausgewaehlt.textContent() || "").replace(/\s+/g, " ");
    if (!ausgewaehltText.includes(erstesTeammitglied) || !ausgewaehltText.includes(zweitesTeammitglied)) {
      throw new Error("Der ausgewählte Kunde zeigt das Betreuungsteam nicht vollständig an.");
    }
    if (pruefeTerminkarte) {
      await test.page.getByTestId(`termin-betreuung-${einsatzId}`)
        .getByText(`Aktuell eingeteilt: ${erstesTeammitglied}`, { exact: true })
        .waitFor({ state: "visible", timeout: 10_000 });
    }
  } finally {
    await test.context.close();
  }
}

async function pruefeUnzugeordnetenMitarbeiter() {
  const test = await anmeldeUndOeffnePlanung(emails.ohneZuordnung);
  try {
    await test.dialog.getByRole("button", { name: /kunden auswählen/i }).last().click();
    await test.dialog.getByText("Keine Einträge vorhanden.", { exact: true }).waitFor({ state: "visible", timeout: 10_000 });
  } finally {
    await test.context.close();
  }
}

async function pruefeAdminFilterung() {
  const test = await anmeldeUndOeffnePlanung(emails.admin);
  try {
    await test.dialog.getByRole("button", { name: /Admin, Planung/i }).click();
    await test.dialog.getByPlaceholder("Name suchen …").fill("Team Alpha");
    await test.dialog.getByRole("button", { name: /Team Alpha, Planung/i }).last().click();
    const kundenAusloeser = test.dialog.getByRole("button", { name: /kunden auswählen/i }).last();
    await kundenAusloeser.click();
    const suche = test.dialog.getByPlaceholder("Name, Ort, Versicherungsnummer …");
    await suche.fill(kundenName);
    await test.dialog.getByRole("button", { name: new RegExp(kundenName, "i") }).last().waitFor({ state: "visible", timeout: 10_000 });
    await suche.fill("Sperr NichtZugeordnet");
    await test.dialog.getByText(/kein treffer/i).waitFor({ state: "visible", timeout: 10_000 });
  } finally {
    await test.context.close();
  }
}

async function pruefeParagraphenaufteilung() {
  const test = await anmeldeUndOeffnePlanung(emails.alpha);
  try {
    const kundenAusloeser = test.dialog.getByRole("button", { name: /kunden auswählen/i }).last();
    await kundenAusloeser.click();
    await test.dialog.getByPlaceholder("Name, Ort, Versicherungsnummer …").fill(kundenName);
    await test.dialog.getByRole("button", { name: new RegExp(kundenName, "i") }).last().click();
    const zeiten = test.dialog.locator('input[type="time"]');
    await zeiten.nth(0).fill("09:00");
    await zeiten.nth(1).fill("11:30");
    await test.dialog.getByLabel("Erster Abrechnungsparagraph").selectOption("39");
    await test.dialog.getByTestId("paragraphenaufteilung-zweiter-paragraph").selectOption("45b");
    const zweiterAnteil = test.dialog.getByTestId("paragraphenaufteilung-zweiter-anteil");
    await zweiterAnteil.fill("0.5");
    const summe = test.dialog.getByTestId("paragraphenaufteilung-summe");
    await summe.waitFor({ state: "visible", timeout: 10_000 });
    const summentext = (await summe.textContent() || "").replace(/\s+/g, " ");
    if (!/§39:\s*2[,.]0{1,2}\s*Std\./.test(summentext) || !/§45b:\s*0[,.]5(?:0)?\s*Std\./.test(summentext) || !/Gesamt:\s*2[,.]5(?:0)?\s*Std\./.test(summentext)) {
      throw new Error("Die sichtbare Paragraphenaufteilung zeigt nicht 2,0 Std. §39 und 0,5 Std. §45b bei 2,5 Std. Gesamtzeit.");
    }
    const dialogBounds = await test.dialog.evaluate((element) => {
      const bounds = element.getBoundingClientRect();
      return { inViewport: bounds.left >= 0 && bounds.right <= window.innerWidth, overflowX: document.documentElement.scrollWidth > window.innerWidth };
    });
    if (!dialogBounds.inViewport || dialogBounds.overflowX) throw new Error("Die mobile Paragraphenaufteilung erzeugt einen horizontalen Überlauf.");
  } finally {
    await test.context.close();
  }
}

try {
  await erstelleTestdaten();
  browser = await chromium.launch({
    headless: true,
    executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });
  await pruefeZugeordnetenMitarbeiter(emails.alpha, true);
  await pruefeZugeordnetenMitarbeiter(emails.beta);
  await pruefeUnzugeordnetenMitarbeiter();
  await pruefeAdminFilterung();
  await pruefeParagraphenaufteilung();

  console.log(JSON.stringify({
    planungsdialogSichtbar: true,
    kundenAuswahllisteVornameNachname: true,
    ausgewaehlterKundeVornameNachname: true,
    beideZugeordneteMitarbeiterSehenKunden: true,
    unzugeordneterMitarbeiterSiehtKundenNicht: true,
    adminSiehtBeiMitarbeiterwahlNurDessenKunden: true,
    aktuellesBetreuungsteamSichtbar: true,
    aktuelleTerminBetreuungSichtbar: true,
    paragraphenaufteilung39und45bSichtbar: true,
    paragraphenaufteilungMobilOhneHorizontalenUeberlauf: true,
    mobilGeprueft: true,
    klartextpasswortAusgegeben: false,
  }, null, 2));
} finally {
  if (browser) await browser.close();
  if (einsatzId) await db.execute("DELETE FROM einsaetze WHERE id = ?", [einsatzId]);
  if (kundenId) await db.execute("DELETE FROM kundenZuordnung WHERE kundenId = ?", [kundenId]);
  if (kundenId) await db.execute("DELETE FROM kunden WHERE id = ?", [kundenId]);
  if (nichtZugeordneterKundenId) await db.execute("DELETE FROM kunden WHERE id = ?", [nichtZugeordneterKundenId]);
  for (const id of [adminMitarbeiterId, unzugeordneterMitarbeiterId, zweiterMitarbeiterId, mitarbeiterId]) {
    if (!id) continue;
    await db.execute("DELETE FROM datenschutzZustimmungen WHERE mitarbeiterId = ?", [id]);
    await db.execute("DELETE FROM auditLogs WHERE mitarbeiterId = ?", [id]);
    await db.execute("DELETE FROM mitarbeiterArbeitsmuster WHERE mitarbeiterId = ?", [id]);
    await db.execute("DELETE FROM mitarbeiter WHERE id = ?", [id]);
  }
  console.log(JSON.stringify({ testdatenBereinigt: true }, null, 2));
  await db.end();
}

process.exit(0);
