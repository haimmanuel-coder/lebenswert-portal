import { readFile } from "node:fs/promises";
import mysql from "mysql2/promise";
import { storagePut } from "../server/storage.ts";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL ist für die sichere Zugangskarten-Ablage erforderlich.");

const dateipfad = "/home/ubuntu/zugangskarten-pdf/Zugangskarten_Seniorenassistenz_Bernhardt.pdf";
const dateiname = "Zugangskarten_Seniorenassistenz_Bernhardt.pdf";
const datei = await readFile(dateipfad);
const db = await mysql.createConnection(databaseUrl);

try {
  const [aktive] = await db.execute("SELECT COUNT(*) AS anzahl FROM mitarbeiter WHERE aktiv = 1 AND rolle <> 'admin'");
  const kartenAnzahl = Number(aktive[0]?.anzahl ?? 0);
  if (kartenAnzahl < 1) throw new Error("Es wurden keine aktiven Nicht-Admin-Mitarbeitenden gefunden.");

  const zeitstempel = new Date().toISOString().replace(/[:.]/g, "-");
  const gespeichert = await storagePut(
    `zugangskarten-pdf/${zeitstempel}-${dateiname}`,
    datei,
    "application/pdf",
  );
  await db.execute(
    "INSERT INTO zugangskartenPdfAusgaben (storageKey, dateiname, kartenAnzahl) VALUES (?, ?, ?)",
    [gespeichert.key, dateiname, kartenAnzahl],
  );
  console.log(JSON.stringify({ sichereAusgabeErstellt: true, kartenAnzahl, klartextpasswoerterAusgegeben: false }, null, 2));
} finally {
  await db.end();
}

process.exit(0);
