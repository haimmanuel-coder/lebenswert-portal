import crypto from "node:crypto";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";
import bcrypt from "bcryptjs";
import mysql from "mysql2/promise";
import QRCode from "qrcode";

const outputDir = "/home/ubuntu/zugangskarten_ausgabe";
const outputPdf = path.join(outputDir, "zugangskarten.pdf");
const auditFile = path.join(outputDir, "batch-audit.json");
const portalUrl = "https://portal.lebenswert-betreuung.de/";

function createStartPassword() {
  return `Sb!${crypto.randomBytes(9).toString("base64url")}${crypto.randomInt(10)}`;
}

function quoted(value) {
  return JSON.stringify(String(value));
}

function buildCard(entry) {
  const name = `${entry.vorname} ${entry.nachname}`.trim();
  return `[
  #block(width: 94mm, height: 133mm, inset: 4.5mm, fill: rgb("fafff9"), stroke: 0.8pt + rgb("64748b"), radius: 3mm)[
    #align(right)[#text(size: 6pt, fill: rgb("64748b"))[✂ An der Linie ausschneiden]]
    #v(0.5mm)
    #grid(columns: (1fr, auto), column-gutter: 2.5mm)[
      [#text(size: 12.5pt, weight: "bold", fill: rgb("4a8c3f"))[Seniorenassistenz Bernhardt] \
       #text(size: 7.5pt, fill: rgb("64748b"))[Mitarbeiter-Portal]]
      [#image(${quoted(entry.qrFile)}, width: 20mm)]
    ]
    #v(1.5mm)
    #text(size: 13pt, weight: "bold", fill: rgb("173a1a"))[Ihre Zugangsdaten]
    #v(2mm)
    #text(size: 7pt, weight: "bold", fill: rgb("64748b"))[NAME] #linebreak() #text(size: 9.5pt, weight: "bold")[#raw(${quoted(name)})]
    #v(1.5mm)
    #text(size: 7pt, weight: "bold", fill: rgb("64748b"))[E-MAIL] #linebreak() #text(size: 8pt)[#raw(${quoted(entry.email)})]
    #v(1.5mm)
    #text(size: 7pt, weight: "bold", fill: rgb("64748b"))[EINMALIGES STARTPASSWORT] #linebreak()
    #block(inset: (x: 2.5mm, y: 1.5mm), fill: rgb("eaf5e7"), radius: 2mm)[#text(size: 9pt, weight: "bold", fill: rgb("173a1a"))[#raw(${quoted(entry.password)})]]
    #v(1.5mm)
    #text(size: 7.2pt, fill: rgb("475569"))[QR-Code scannen: Portal öffnen, E-Mail wird vorbefüllt.]
    #v(1.5mm)
    #block(inset: 2.5mm, fill: rgb("fff7ed"), stroke: 0.5pt + rgb("fdba74"), radius: 2mm)[
      #text(size: 7pt, weight: "bold", fill: rgb("9a3412"))[SICHERHEITSHINWEIS] \
      #text(size: 6.8pt, fill: rgb("7c2d12"))[Startpasswort nur einmal verwenden, direkt nach dem ersten Login ändern und niemals weitergeben.]
    ]
  ]
]`;
}

function buildTypst(cards) {
  const pages = [];
  for (let index = 0; index < cards.length; index += 4) {
    const chunk = cards.slice(index, index + 4).map(buildCard).join(",\n");
    pages.push(`#page(width: 210mm, height: 297mm, margin: 10mm, numbering: none, header: none, footer: none)[#grid(columns: (1fr, 1fr), rows: (1fr, 1fr), gutter: 0mm, ${chunk})]`);
  }
  return `#set text(font: "DejaVu Sans", size: 10pt)\n#set par(first-line-indent: 0pt)\n${pages.join("\n\n")}`;
}

function compilePdf(typstSource) {
  return new Promise((resolve, reject) => {
    const child = spawn("typst", ["compile", "-", outputPdf], { stdio: ["pipe", "pipe", "pipe"] });
    let stderr = "";
    child.stderr.on("data", (chunk) => { stderr += chunk.toString(); });
    child.on("error", reject);
    child.on("close", (code) => code === 0 ? resolve() : reject(new Error(stderr || `Typst exited with ${code}`)));
    child.stdin.end(typstSource);
  });
}

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL ist nicht verfügbar.");
const qrTempDir = await mkdtemp(path.join(process.cwd(), "scripts", ".zugangskarten-qr-"));
const connection = await mysql.createConnection(process.env.DATABASE_URL);

try {
  const [alleAktiven] = await connection.execute("SELECT id, email, rolle FROM mitarbeiter WHERE aktiv = 1");
  const [rows] = await connection.execute("SELECT id, vorname, nachname, email FROM mitarbeiter WHERE aktiv = 1 AND rolle <> 'admin' AND email IS NOT NULL AND email <> '' ORDER BY nachname, vorname");
  const aktiveAdmins = alleAktiven.filter((ma) => ma.rolle === "admin").length;
  const aktiveOhneEmail = alleAktiven.filter((ma) => ma.rolle !== "admin" && (!ma.email || !String(ma.email).trim())).length;
  const cards = [];
  for (const ma of rows) {
    const password = createStartPassword();
    const qrFile = path.join(qrTempDir, `zugang-${ma.id}.png`);
    const loginUrl = `${portalUrl}?email=${encodeURIComponent(String(ma.email).trim().toLowerCase())}`;
    await QRCode.toFile(qrFile, loginUrl, { width: 420, margin: 1, errorCorrectionLevel: "M", color: { dark: "#173a1a", light: "#ffffff" } });
    cards.push({ ...ma, password, hash: await bcrypt.hash(password, 10), qrFile: path.relative(process.cwd(), qrFile).replaceAll("\\", "/") });
  }
  await compilePdf(buildTypst(cards));
  await connection.beginTransaction();
  for (const card of cards) {
    await connection.execute("UPDATE mitarbeiter SET passwortHash = ?, passwortWechselErforderlich = 1, startPasswortErstelltAt = UTC_TIMESTAMP() WHERE id = ?", [card.hash, card.id]);
  }
  await connection.commit();
  await writeFile(auditFile, JSON.stringify({
    aktion: "Einmalige Zugangskarten-Ausgabe",
    zeitpunkt: new Date().toISOString(),
    aktive_mitarbeiter_gesamt: alleAktiven.length,
    zugangskarten_erstellt: cards.length,
    aktive_admins_bewusst_ausgeschlossen: aktiveAdmins,
    aktive_mitarbeiter_ohne_email: aktiveOhneEmail,
    klartextpasswoerter_protokolliert: false,
    ausgabeformat: "Geschuetztes PDF mit ausschneidbaren Zugangskarten"
  }, null, 2), { mode: 0o600 });
  console.log(`ACCESS_CARDS_CREATED=${cards.length}`);
} catch (error) {
  await connection.rollback();
  throw error;
} finally {
  await connection.end();
  await rm(qrTempDir, { recursive: true, force: true });
}

// QR- und Datenbankbibliotheken können offene Handles hinterlassen. Nach vollständigem
// Abschluss aller Writes wird der Einmallauf deshalb explizit sauber beendet.
process.exit(0);
