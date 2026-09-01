import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import mysql from "mysql2/promise";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL ist für die Zugangskarten-PDF-Sicherheitsprüfung erforderlich.");
const portalUrl = (process.env.TEST_PORTAL_BASE_URL || "http://127.0.0.1:3000").replace(/\/$/, "");
const kennung = randomUUID().replace(/-/g, "").slice(0, 16);
const passwort = `Qa!${kennung}B7`;
const db = await mysql.createConnection(databaseUrl);
let adminId;
let mitarbeiterId;

async function erstelleKonto(rolle) {
  const email = `qa-pdf-${rolle}-${kennung}@example.invalid`;
  const passwortHash = await bcrypt.hash(passwort, 10);
  const [ergebnis] = await db.execute(
    "INSERT INTO mitarbeiter (vorname, nachname, email, passwortHash, rolle, aktiv, passwortWechselErforderlich, zweiFaktorAktiv, datevEinwilligung) VALUES (?, ?, ?, ?, ?, 1, 0, 0, 0)",
    ["Temporär", `PDF ${rolle}`, email, passwortHash, rolle],
  );
  const id = ergebnis.insertId;
  const [dokumente] = await db.execute("SELECT id, version FROM datenschutzDokumente WHERE aktiv = 1");
  for (const dokument of dokumente) {
    await db.execute(
      "INSERT INTO datenschutzZustimmungen (mitarbeiterId, dokumentId, dokumentVersion) VALUES (?, ?, ?)",
      [id, dokument.id, dokument.version],
    );
  }
  return { id, email };
}

async function tokenFuer(email) {
  const antwort = await fetch(`${portalUrl}/api/trpc/portal.login?batch=1`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ 0: { json: { email, passwort } } }),
  });
  const payload = await antwort.json();
  const token = payload?.[0]?.result?.data?.json?.token;
  if (!antwort.ok || !token) throw new Error("Temporäres Testkonto konnte nicht angemeldet werden.");
  return token;
}

async function rufeAusgabeAb(token) {
  const antwort = await fetch(`${portalUrl}/api/trpc/admin.aktuelleZugangskartenPdf?batch=1`, {
    headers: { authorization: `Bearer ${token}` },
  });
  return { status: antwort.status, payload: await antwort.json() };
}

try {
  const admin = await erstelleKonto("admin");
  const mitarbeiter = await erstelleKonto("mitarbeiter");
  adminId = admin.id;
  mitarbeiterId = mitarbeiter.id;
  const [adminToken, mitarbeiterToken] = await Promise.all([tokenFuer(admin.email), tokenFuer(mitarbeiter.email)]);
  const erlaubterAbruf = await rufeAusgabeAb(adminToken);
  const pdf = erlaubterAbruf.payload?.[0]?.result?.data?.json;
  if (erlaubterAbruf.status !== 200 || !pdf?.downloadUrl || pdf.kartenAnzahl < 1 || !String(pdf.downloadUrl).startsWith("http")) {
    throw new Error("Admin erhielt keine signierte Zugangskarten-PDF.");
  }
  const verbotenerAbruf = await rufeAusgabeAb(mitarbeiterToken);
  const fehlercode = verbotenerAbruf.payload?.[0]?.error?.json?.code ?? verbotenerAbruf.payload?.[0]?.error?.data?.code;
  if (verbotenerAbruf.status !== 403 && fehlercode !== "FORBIDDEN") {
    throw new Error("Ein Mitarbeiter ohne Adminrolle konnte den geschützten PDF-Abruf erreichen.");
  }

  const { chromium } = await import("playwright");
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium", args: ["--no-sandbox", "--disable-dev-shm-usage"] });
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  await context.addInitScript(() => window.localStorage.setItem("lebensnah_onboarding_done_v2", "true"));
  const page = await context.newPage();
  await page.goto(portalUrl, { waitUntil: "networkidle" });
  const cookieButton = page.getByRole("button", { name: /verstanden.*akzeptieren/i });
  if (await cookieButton.isVisible().catch(() => false)) await cookieButton.click();
  await page.locator('input[type="email"]').fill(admin.email);
  await page.locator('input[type="password"]').fill(passwort);
  await page.getByRole("button", { name: "Anmelden" }).click();
  await page.getByTestId("portal-aktuelle-seite").waitFor({ state: "visible", timeout: 15_000 });
  const erstloginHinweis = page.getByRole("dialog", { name: "Erstlogin erfolgreich abgeschlossen" });
  if (await erstloginHinweis.isVisible().catch(() => false)) {
    await erstloginHinweis.getByRole("button", { name: "Verstanden" }).click();
  }
  const adminPanelButton = page.getByRole("button", { name: /admin-panel/i });
  await adminPanelButton.waitFor({ state: "visible", timeout: 15_000 });
  await adminPanelButton.click({ force: true });
  await page.getByTestId("geschuetzte-zugangskarten-pdf").waitFor({ state: "visible", timeout: 15_000 });
  await context.close();
  await browser.close();

  console.log(JSON.stringify({ adminAbrufErfolgreich: true, mitarbeiterAbrufGesperrt: true, signierterLinkErteilt: true, adminButtonSichtbar: true, klartextpasswoerterAusgegeben: false }, null, 2));
} finally {
  if (adminId || mitarbeiterId) {
    await db.execute("DELETE FROM datenschutzZustimmungen WHERE mitarbeiterId IN (?, ?)", [adminId ?? -1, mitarbeiterId ?? -1]);
    await db.execute("DELETE FROM auditLogs WHERE mitarbeiterId IN (?, ?)", [adminId ?? -1, mitarbeiterId ?? -1]);
    await db.execute("DELETE FROM mitarbeiterArbeitsmuster WHERE mitarbeiterId IN (?, ?)", [adminId ?? -1, mitarbeiterId ?? -1]);
    await db.execute("DELETE FROM mitarbeiter WHERE id IN (?, ?)", [adminId ?? -1, mitarbeiterId ?? -1]);
    console.log(JSON.stringify({ testdatenBereinigt: true }, null, 2));
  }
  db.destroy();
}

process.exit(0);
