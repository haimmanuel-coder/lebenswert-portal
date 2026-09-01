import { randomBytes } from "node:crypto";
import { existsSync, renameSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import bcrypt from "bcryptjs";
import mysql from "mysql2/promise";
import { chromium } from "playwright";
import QRCode from "qrcode";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL ist für die geschützte Zugangskarten-Ausgabe erforderlich.");

const ausgabeOrdner = resolve("/home/ubuntu/zugangskarten-pdf");
const ausgabeDatei = resolve(ausgabeOrdner, "Zugangskarten_Seniorenassistenz_Bernhardt.pdf");
const temporaereDatei = `${ausgabeDatei}.tmp`;
const portalBasisUrl = "https://portal.lebenswert-betreuung.de/";
const db = await mysql.createConnection(databaseUrl);
let browser;
let transaktionGestartet = false;

const esc = (wert) => String(wert ?? "")
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;")
  .replace(/'/g, "&#39;");

function neuesStartpasswort() {
  return `Lb!${randomBytes(12).toString("base64url")}`;
}

function rolleLesbar(rolle) {
  return ({ mitarbeiter: "Mitarbeiter", teamleitung: "Teamleitung", buchhaltung: "Buchhaltung" })[rolle] ?? "Mitarbeiter";
}

async function erstelleKarte(karte) {
  const qrZiel = `${portalBasisUrl}?email=${encodeURIComponent(karte.email.trim().toLowerCase())}`;
  const qrCode = await QRCode.toDataURL(qrZiel, {
    errorCorrectionLevel: "M",
    margin: 0,
    width: 150,
    color: { dark: "#173a1a", light: "#ffffff" },
  });
  return `<article class="karte">
    <div class="schnitt">✂ An der gestrichelten Linie ausschneiden</div>
    <div class="kopf"><div class="marke">Seniorenassistenz<br><span>Bernhardt</span></div><div class="badge">${esc(rolleLesbar(karte.rolle))}</div></div>
    <h1>Ihre Zugangsdaten</h1>
    <div class="daten"><span>Name</span><strong>${esc(`${karte.vorname} ${karte.nachname}`)}</strong></div>
    <div class="daten"><span>E-Mail</span><strong>${esc(karte.email)}</strong></div>
    <div class="passwort"><span>Einmaliges Startpasswort</span><code>${esc(karte.startpasswort)}</code></div>
    <div class="qr"><img src="${qrCode}" alt="QR-Code zum Mitarbeiter-Portal"><p>Mit dem Smartphone scannen.<br>Die E-Mail wird vorbefüllt.</p></div>
    <ol><li>QR-Code scannen oder <b>portal.lebenswert-betreuung.de</b> öffnen.</li><li>Mit E-Mail und Startpasswort anmelden.</li><li>Sofort ein persönliches Passwort festlegen.</li></ol>
    <div class="sicherheit"><b>🔒 Sicherheitshinweis</b><br>Dieses Startpasswort gilt nur für den ersten Login und verfällt in 7 Tagen. Bitte niemals weitergeben.</div>
  </article>`;
}

try {
  const [mitarbeitende] = await db.execute(
    "SELECT id, vorname, nachname, email, rolle FROM mitarbeiter WHERE aktiv = 1 AND rolle <> 'admin' ORDER BY nachname ASC, vorname ASC",
  );
  if (mitarbeitende.length === 0) throw new Error("Es gibt keine aktiven Nicht-Admin-Mitarbeitenden für Zugangskarten.");
  const ohneEmail = mitarbeitende.filter((ma) => !String(ma.email ?? "").trim());
  if (ohneEmail.length > 0) {
    throw new Error(`${ohneEmail.length} aktive Mitarbeitende haben keine E-Mail-Adresse; daher wurden keine Passwörter geändert und kein PDF erzeugt.`);
  }

  const karten = await Promise.all(mitarbeitende.map(async (ma) => ({
    ...ma,
    startpasswort: neuesStartpasswort(),
  })));
  const kartenseiten = [];
  for (let index = 0; index < karten.length; index += 4) {
    kartenseiten.push(`<section class="seite">${(await Promise.all(karten.slice(index, index + 4).map(erstelleKarte))).join("")}</section>`);
  }
  const html = `<!doctype html><html lang="de"><head><meta charset="utf-8"><title>Vertrauliche Zugangskarten</title><style>
    @page{size:A4;margin:10mm}*{box-sizing:border-box}body{margin:0;font-family:Arial,Helvetica,sans-serif;color:#173a1a;background:#fff}.seite{width:190mm;height:277mm;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));grid-template-rows:repeat(2,minmax(0,1fr));break-after:page}.seite:last-child{break-after:auto}.karte{min-width:0;min-height:0;border:1.5px dashed #64748b;padding:7mm;overflow:hidden}.schnitt{font-size:7.2pt;color:#64748b;text-align:right;margin-bottom:2mm}.kopf{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:1px solid #d1d5db;padding-bottom:2mm}.marke{font-weight:800;font-size:12pt;line-height:.9;color:#173a1a;letter-spacing:-.3px}.marke span{font-size:8.5pt;font-style:italic;color:#c28518}.badge{font-size:7pt;font-weight:700;padding:1.2mm 2mm;border-radius:10px;background:#e8f5e4;color:#2f6d28}h1{font-size:15pt;margin:3mm 0;color:#173a1a}.daten{font-size:8.5pt;margin:0 0 2mm}.daten span,.passwort span{display:block;font-size:7pt;text-transform:uppercase;letter-spacing:.35px;color:#64748b;font-weight:700;margin-bottom:.7mm}.daten strong{font-size:9.2pt;overflow-wrap:anywhere}.passwort{background:#eff6eb;border:1px solid #bfdcaf;border-radius:5px;padding:2mm 2.5mm;margin:2.5mm 0}.passwort code{font-family:"Courier New",monospace;font-size:8.6pt;font-weight:700;letter-spacing:.1px;overflow-wrap:anywhere}.qr{display:flex;align-items:center;gap:2.5mm;margin:2mm 0;padding:2mm;background:#f8fafc;border:1px solid #dbe4ee;border-radius:5px}.qr img{width:22mm;height:22mm;image-rendering:pixelated}.qr p{font-size:7pt;line-height:1.3;margin:0;color:#475569}ol{font-size:7pt;line-height:1.3;margin:2mm 0 0 3mm;padding-left:3.5mm}.sicherheit{margin-top:2mm;padding:2mm 2.5mm;background:#fff7ed;border:1px solid #fdba74;border-radius:5px;font-size:6.7pt;line-height:1.25;color:#7c2d12}@media print{.seite,.karte{break-inside:avoid}}</style></head><body>${kartenseiten.join("")}</body></html>`;

  browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium", args: ["--no-sandbox", "--disable-dev-shm-usage"] });
  const page = await browser.newPage({ viewport: { width: 1240, height: 1754 } });
  await page.setContent(html, { waitUntil: "networkidle" });
  await page.pdf({ path: temporaereDatei, format: "A4", printBackground: true, margin: { top: "10mm", right: "10mm", bottom: "10mm", left: "10mm" }, preferCSSPageSize: true });
  await browser.close();
  browser = undefined;

  await db.beginTransaction();
  transaktionGestartet = true;
  for (const karte of karten) {
    const passwortHash = await bcrypt.hash(karte.startpasswort, 10);
    const [result] = await db.execute(
      "UPDATE mitarbeiter SET passwortHash = ?, passwortWechselErforderlich = 1, startPasswortErstelltAt = NOW() WHERE id = ? AND aktiv = 1 AND rolle <> 'admin'",
      [passwortHash, karte.id],
    );
    if (result.affectedRows !== 1) throw new Error("Eine Mitarbeiterkarte konnte wegen einer zwischenzeitlichen Statusänderung nicht sicher ausgestellt werden.");
  }
  await db.execute(
    "INSERT INTO auditLogs (mitarbeiterId, action, ressource, details, status) VALUES (?, 'ADMIN', 'mitarbeiter', ?, 'success')",
    [null, `startpasswort-batch anzahl=${karten.length}`],
  );
  await db.commit();
  transaktionGestartet = false;
  renameSync(temporaereDatei, ausgabeDatei);
  console.log(JSON.stringify({ kartenErstellt: karten.length, startpasswoerterZurueckgesetzt: karten.length, ausgabe: ausgabeDatei, klartextpasswoerterAusgegeben: false }, null, 2));
} catch (error) {
  if (transaktionGestartet) await db.rollback();
  if (existsSync(temporaereDatei)) rmSync(temporaereDatei, { force: true });
  throw error;
} finally {
  if (browser) await browser.close();
  await db.end();
}

process.exit(0);
