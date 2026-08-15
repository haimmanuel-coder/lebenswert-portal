import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { readFile, mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import mysql from "mysql2/promise";
import bcrypt from "bcryptjs";

const run = promisify(execFile);
const pdfPath = "/home/ubuntu/zugangskarten_ausgabe/zugangskarten.pdf";
const requestedEmails = new Set([
  "anica.schmitz@lebenswert-betreuung.de",
  "yvonne.wagner@lebenswert-betreuung.de",
]);

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL ist nicht verfügbar.");

const tempDir = await mkdtemp(path.join(os.tmpdir(), "karten-check-"));
const textPath = path.join(tempDir, "karten.txt");
let connection;

try {
  await run("pdftotext", ["-layout", pdfPath, textPath]);
  const text = await readFile(textPath, "utf8");
  const emails = [...text.matchAll(/[a-z0-9._+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi)]
    .map((match) => match[0].trim().toLowerCase());
  const passwords = [...text.matchAll(/Sb![A-Za-z0-9_-]+/g)].map((match) => match[0]);
  const targetEmails = [...new Set(emails.filter((email) => requestedEmails.has(email)))];

  connection = await mysql.createConnection(process.env.DATABASE_URL);
  const report = [];
  for (const email of targetEmails) {
    const [rows] = await connection.execute(
      "SELECT aktiv, passwortHash, startPasswortErstelltAt FROM mitarbeiter WHERE email = ? LIMIT 1",
      [email],
    );
    const employee = rows[0];
    const cardPasswordMatches = Boolean(employee?.passwortHash) && (await Promise.all(
      passwords.map((password) => bcrypt.compare(password, employee.passwortHash)),
    )).some(Boolean);
    report.push({
      mitarbeiter: email.split("@")[0],
      konto_aktiv: Boolean(employee?.aktiv),
      zugangskarte_passt_zu_hash: cardPasswordMatches,
      startzugang_erstellt: Boolean(employee?.startPasswortErstelltAt),
    });
  }
  console.log(JSON.stringify(report, null, 2));
} finally {
  await connection?.end();
  await rm(tempDir, { recursive: true, force: true });
}

process.exit(0);
