import bcrypt from "bcryptjs";
import { and, eq, ne } from "drizzle-orm";
import { chromium } from "playwright";
import QRCode from "qrcode";
import { auditLogs, mitarbeiter, zugangskartenPdfAusgaben } from "../drizzle/schema";
import { erstelleZugangskartenQrZiel } from "../shared/zugangskartenQr";
import { generiereEinmaligesStartpasswort, waehleDruckbareMitarbeiter } from "./accessCredentials";
import { getDb } from "./db";
import { storageGetSignedUrl, storagePut } from "./storage";

export class ZugangskarteValidierungsfehler extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ZugangskarteValidierungsfehler";
  }
}

type EinzelkarteMitarbeiter = {
  id: number;
  vorname: string;
  nachname: string;
  email: string;
  rolle: string;
  aktiv: number | boolean;
};

function esc(wert: unknown): string {
  return String(wert ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function rolleLesbar(rolle: string): string {
  return ({ mitarbeiter: "Mitarbeiter", teamleitung: "Teamleitung", buchhaltung: "Buchhaltung" } as Record<string, string>)[rolle] ?? "Mitarbeiter";
}

async function erstelleEinzelkartenPdf(mitarbeiterDatensatz: EinzelkarteMitarbeiter, startpasswort: string): Promise<Buffer> {
  const qrZiel = erstelleZugangskartenQrZiel(mitarbeiterDatensatz.email);
  const qrCode = await QRCode.toDataURL(qrZiel, {
    errorCorrectionLevel: "M",
    margin: 0,
    width: 150,
    color: { dark: "#173a1a", light: "#ffffff" },
  });
  const html = `<!doctype html><html lang="de"><head><meta charset="utf-8"><title>Vertrauliche Zugangskarte</title><style>
    @page{size:A4;margin:10mm}*{box-sizing:border-box}body{margin:0;font-family:Arial,Helvetica,sans-serif;color:#173a1a;background:#fff}.seite{width:190mm;height:277mm;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));grid-template-rows:repeat(2,minmax(0,1fr)}.karte{min-width:0;min-height:0;border:1.5px dashed #64748b;padding:7mm;overflow:hidden}.schnitt{font-size:7.2pt;color:#64748b;text-align:right;margin-bottom:2mm}.kopf{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:1px solid #d1d5db;padding-bottom:2mm}.marke{font-weight:800;font-size:12pt;line-height:.9;color:#173a1a;letter-spacing:-.3px}.marke span{font-size:8.5pt;font-style:italic;color:#c28518}.badge{font-size:7pt;font-weight:700;padding:1.2mm 2mm;border-radius:10px;background:#e8f5e4;color:#2f6d28}h1{font-size:15pt;margin:3mm 0;color:#173a1a}.daten{font-size:8.5pt;margin:0 0 2mm}.daten span,.passwort span{display:block;font-size:7pt;text-transform:uppercase;letter-spacing:.35px;color:#64748b;font-weight:700;margin-bottom:.7mm}.daten strong{font-size:9.2pt;overflow-wrap:anywhere}.passwort{background:#eff6eb;border:1px solid #bfdcaf;border-radius:5px;padding:2mm 2.5mm;margin:2.5mm 0}.passwort code{font-family:"Courier New",monospace;font-size:8.6pt;font-weight:700;letter-spacing:.1px;overflow-wrap:anywhere}.qr{display:flex;align-items:center;gap:2.5mm;margin:2mm 0;padding:2mm;background:#f8fafc;border:1px solid #dbe4ee;border-radius:5px}.qr img{width:22mm;height:22mm;image-rendering:pixelated}.qr p{font-size:7pt;line-height:1.3;margin:0;color:#475569}ol{font-size:7pt;line-height:1.3;margin:2mm 0 0 3mm;padding-left:3.5mm}.sicherheit{margin-top:2mm;padding:2mm 2.5mm;background:#fff7ed;border:1px solid #fdba74;border-radius:5px;font-size:6.7pt;line-height:1.25;color:#7c2d12}</style></head><body><section class="seite"><article class="karte"><div class="schnitt">✂ An der gestrichelten Linie ausschneiden</div><div class="kopf"><div class="marke">Seniorenassistenz<br><span>Bernhardt</span></div><div class="badge">${esc(rolleLesbar(mitarbeiterDatensatz.rolle))}</div></div><h1>Ihre Zugangsdaten</h1><div class="daten"><span>Name</span><strong>${esc(`${mitarbeiterDatensatz.vorname} ${mitarbeiterDatensatz.nachname}`)}</strong></div><div class="daten"><span>E-Mail</span><strong>${esc(mitarbeiterDatensatz.email)}</strong></div><div class="passwort"><span>Einmaliges Startpasswort</span><code>${esc(startpasswort)}</code></div><div class="qr"><img src="${qrCode}" alt="QR-Code zum Mitarbeiter-Portal"><p>Mit dem Smartphone scannen.<br>Die E-Mail wird vorbefüllt.</p></div><ol><li>QR-Code scannen oder <b>portal.lebenswert-betreuung.de</b> öffnen.</li><li>Mit E-Mail und Startpasswort anmelden.</li><li>Sofort ein persönliches Passwort festlegen.</li></ol><div class="sicherheit"><b>Sicherheitshinweis</b><br>Dieses Startpasswort gilt nur für den ersten Login und verfällt in 7 Tagen. Bitte niemals weitergeben.</div></article></section></body></html>`;

  const browser = await chromium.launch({
    headless: true,
    executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });
  try {
    const page = await browser.newPage({ viewport: { width: 1240, height: 1754 } });
    await page.setContent(html, { waitUntil: "networkidle" });
    return Buffer.from(await page.pdf({ format: "A4", printBackground: true, preferCSSPageSize: true }));
  } finally {
    await browser.close();
  }
}

/**
 * Stellt eine Ersatzkarte aus. Zuerst werden PDF und zeitlich begrenzter Abruf sicher vorbereitet.
 * Erst danach ersetzt eine Datenbanktransaktion den Passwort-Hash und schreibt Metadaten sowie Audit.
 */
export async function erstelleEinzelneZugangskarte({ mitarbeiterId, erstelltVon }: { mitarbeiterId: number; erstelltVon: number }) {
  const db = await getDb();
  if (!db) throw new Error("Datenbank nicht verfügbar.");

  const [zielkonto] = await db.select({
    id: mitarbeiter.id,
    vorname: mitarbeiter.vorname,
    nachname: mitarbeiter.nachname,
    email: mitarbeiter.email,
    rolle: mitarbeiter.rolle,
    aktiv: mitarbeiter.aktiv,
  }).from(mitarbeiter).where(eq(mitarbeiter.id, mitarbeiterId)).limit(1);

  if (!zielkonto) throw new ZugangskarteValidierungsfehler("Mitarbeiter nicht gefunden.");
  const [ausgabeberechtigt] = waehleDruckbareMitarbeiter([zielkonto] as EinzelkarteMitarbeiter[], [mitarbeiterId]);
  if (!ausgabeberechtigt) throw new ZugangskarteValidierungsfehler("Nur aktive Mitarbeiter ohne Administratorrolle können eine neue Zugangskarte erhalten.");
  if (!ausgabeberechtigt.email.trim()) throw new ZugangskarteValidierungsfehler("Für diesen Mitarbeiter ist keine E-Mail-Adresse hinterlegt. Es wurden keine Zugangsdaten geändert.");

  const startpasswort = generiereEinmaligesStartpasswort();
  const pdfBytes = await erstelleEinzelkartenPdf(ausgabeberechtigt, startpasswort);
  const erstelltAm = new Date();
  const dateiname = `Zugangskarte_${erstelltAm.toISOString().slice(0, 10)}_${mitarbeiterId}.pdf`;
  const { key: storageKey } = await storagePut(`zugangskarten-pdf/${erstelltAm.toISOString().replace(/[:.]/g, "-")}-mitarbeiter-${mitarbeiterId}.pdf`, pdfBytes, "application/pdf");
  const downloadUrl = await storageGetSignedUrl(storageKey);
  const passwortHash = await bcrypt.hash(startpasswort, 10);

  await db.transaction(async (tx) => {
    const updateErgebnis = await tx.update(mitarbeiter).set({
      passwortHash,
      passwortWechselErforderlich: true,
      startPasswortErstelltAt: erstelltAm,
    }).where(and(eq(mitarbeiter.id, mitarbeiterId), eq(mitarbeiter.aktiv, 1), ne(mitarbeiter.rolle, "admin")));
    const betroffen = Number((updateErgebnis as any)[0]?.affectedRows ?? (updateErgebnis as any).affectedRows ?? 0);
    if (betroffen !== 1) throw new ZugangskarteValidierungsfehler("Das Konto wurde zwischenzeitlich geändert. Es wurden keine neuen Zugangsdaten aktiviert.");

    await tx.insert(zugangskartenPdfAusgaben).values({
      storageKey,
      dateiname,
      kartenAnzahl: 1,
      erstelltVon,
      createdAt: erstelltAm,
    });
    await tx.insert(auditLogs).values({
      mitarbeiterId: erstelltVon,
      action: "ADMIN",
      ressource: "zugangskarten-pdf",
      details: `ersatzkarte mitarbeiter=${mitarbeiterId} karten=1`,
      status: "success",
    });
  });

  return { dateiname, kartenAnzahl: 1 as const, erstelltAm, downloadUrl, gueltigMinuten: 60 as const };
}
