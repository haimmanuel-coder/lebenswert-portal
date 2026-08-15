import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";
import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import mysql from "mysql2/promise";
import QRCode from "qrcode";

const portalUrl = "https://portal.lebenswert-betreuung.de/";
const outputDir = "/home/ubuntu/zugangskarten_ausgabe";
const defaultEmails = [
  "anica.schmitz@lebenswert-betreuung.de",
  "yvonne.wagner@lebenswert-betreuung.de",
];
const targetEmails = (process.env.TARGET_EMAILS?.split(",") ?? defaultEmails)
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);
const outputName = process.env.OUTPUT_BASENAME?.trim() || "ersatz_zugangskarten_anica_yvonne";
const outputPdf = path.join(outputDir, `${outputName}.pdf`);
const auditFile = path.join(outputDir, `${outputName}_audit.json`);

function password() {
  return `Sb!${crypto.randomBytes(9).toString("base64url")}${crypto.randomInt(10)}`;
}

function quoted(value) {
  return JSON.stringify(String(value));
}

function card(entry) {
  return `[
  #block(width: 94mm, height: 133mm, inset: 4.5mm, fill: rgb("fafff9"), stroke: 0.8pt + rgb("64748b"), radius: 3mm)[
    #align(right)[#text(size: 6pt, fill: rgb("64748b"))[✂ An der Linie ausschneiden]]
    #v(0.5mm)
    #grid(columns: (1fr, auto), column-gutter: 2.5mm)[
      [#text(size: 12.5pt, weight: "bold", fill: rgb("4a8c3f"))[Seniorenassistenz Bernhardt] \
       #text(size: 7.5pt, fill: rgb("64748b"))[Mitarbeiter-Portal]]
      [#image(${quoted(entry.qrFile)}, width: 20mm)]
    ]
    #v(2mm)
    #text(size: 13pt, weight: "bold", fill: rgb("173a1a"))[Ihre neuen Zugangsdaten]
    #v(2mm)
    #text(size: 7pt, weight: "bold", fill: rgb("64748b"))[NAME] #linebreak() #text(size: 9.5pt, weight: "bold")[#raw(${quoted(entry.name)})]
    #v(1.5mm)
    #text(size: 7pt, weight: "bold", fill: rgb("64748b"))[E-MAIL] #linebreak() #text(size: 8pt)[#raw(${quoted(entry.email)})]
    #v(1.5mm)
    #text(size: 7pt, weight: "bold", fill: rgb("64748b"))[NEUES EINMALIGES STARTPASSWORT] #linebreak()
    #block(inset: (x: 2.5mm, y: 1.5mm), fill: rgb("eaf5e7"), radius: 2mm)[#text(size: 9pt, weight: "bold", fill: rgb("173a1a"))[#raw(${quoted(entry.password)})]]
    #v(1.5mm)
    #text(size: 7.2pt, fill: rgb("475569"))[QR-Code scannen: Portal öffnen, E-Mail wird vorbefüllt.]
    #v(1.5mm)
    #block(inset: 2.5mm, fill: rgb("fff7ed"), stroke: 0.5pt + rgb("fdba74"), radius: 2mm)[
      #text(size: 7pt, weight: "bold", fill: rgb("9a3412"))[SICHERHEITSHINWEIS] \
      #text(size: 6.8pt, fill: rgb("7c2d12"))[Dieses Ersatzpasswort gilt nur einmal. Direkt nach dem ersten Login bitte ein persönliches Passwort festlegen und die Karte sicher verwahren.]
    ]
  ]
]`;
}

function compile(source) {
  return new Promise((resolve, reject) => {
    const child = spawn("typst", ["compile", "-", outputPdf], { stdio: ["pipe", "ignore", "pipe"] });
    let stderr = "";
    child.stderr.on("data", (chunk) => { stderr += chunk.toString(); });
    child.on("error", reject);
    child.on("close", (code) => code === 0 ? resolve() : reject(new Error(stderr || `Typst exited with ${code}`)));
    child.stdin.end(`#set text(font: "DejaVu Sans", size: 10pt)\n#page(width: 210mm, height: 297mm, margin: 10mm, numbering: none)[#grid(columns: (1fr, 1fr), gutter: 0mm, ${source.map(card).join(",\n")})]`);
  });
}

async function verifyPortalLogin(entry) {
  const response = await fetch("http://127.0.0.1:3000/api/trpc/portal.login?batch=1", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      0: { json: { email: entry.email, passwort: entry.password } },
    }),
  });
  const payload = await response.json().catch(() => null);
  return Boolean(response.ok && payload?.[0]?.result?.data?.json?.token);
}

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL ist nicht verfügbar.");
const qrTemp = await mkdtemp(path.join(process.cwd(), "scripts", ".ersatz-zugang-"));
let connection;

try {
  connection = await mysql.createConnection(process.env.DATABASE_URL);
  const placeholders = targetEmails.map(() => "?").join(",");
  const [rows] = await connection.execute(
    `SELECT id, vorname, nachname, email, aktiv FROM mitarbeiter WHERE email IN (${placeholders}) ORDER BY nachname, vorname`,
    targetEmails,
  );
  if (rows.length !== targetEmails.length || rows.some((row) => !row.aktiv)) throw new Error("Mindestens ein Zielkonto ist nicht aktiv oder fehlt.");

  const entries = [];
  for (const ma of rows) {
    const startPassword = password();
    const hash = await bcrypt.hash(startPassword, 10);
    const qrFile = path.join(qrTemp, `zugang-${ma.id}.png`);
    await QRCode.toFile(qrFile, `${portalUrl}?email=${encodeURIComponent(ma.email)}`, { width: 420, margin: 1, errorCorrectionLevel: "M", color: { dark: "#173a1a", light: "#ffffff" } });
    entries.push({
      id: ma.id,
      email: ma.email,
      name: `${ma.vorname} ${ma.nachname}`.trim(),
      password: startPassword,
      hash,
      qrFile: path.relative(process.cwd(), qrFile).replaceAll("\\", "/"),
    });
  }

  await compile(entries);
  await connection.beginTransaction();
  for (const entry of entries) {
    await connection.execute(
      "UPDATE mitarbeiter SET passwortHash = ?, passwortWechselErforderlich = 1, startPasswortErstelltAt = UTC_TIMESTAMP() WHERE id = ?",
      [entry.hash, entry.id],
    );
  }
  await connection.commit();
  const verification = await Promise.all(entries.map(async (entry) => ({
    mitarbeiter: entry.name,
    passwort_hash_verifiziert: await bcrypt.compare(entry.password, entry.hash),
    portal_login_erfolgreich: await verifyPortalLogin(entry),
  })));
  if (verification.some((entry) => !entry.passwort_hash_verifiziert || !entry.portal_login_erfolgreich)) {
    throw new Error("Mindestens ein Ersatz-Zugang konnte nicht vollständig verifiziert werden.");
  }
  await writeFile(auditFile, JSON.stringify({
    aktion: "Ersatz-Zugangskarten nach Login-Prüfung",
    zeitpunkt: new Date().toISOString(),
    mitarbeiter: verification,
    klartextpasswoerter_protokolliert: false,
  }, null, 2), { mode: 0o600 });
  console.log(JSON.stringify({ ersatzkarten_erstellt: entries.length, verifikation: verification }, null, 2));
} catch (error) {
  await connection?.rollback();
  throw error;
} finally {
  await connection?.end();
  await rm(qrTemp, { recursive: true, force: true });
}

process.exit(0);
