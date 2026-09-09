import { readFile } from "node:fs/promises";
import mysql from "mysql2/promise";
import { storagePut } from "../server/storage.ts";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL ist für die sichere Zugangskarten-Ablage erforderlich.");

const dateiname = process.env.ZUGANGSKARTEN_DATEINAME || "Zugangskarten_Seniorenassistenz_Bernhardt.pdf";
if (!/^[a-zA-Z0-9._-]+\.pdf$/.test(dateiname)) throw new Error("Ungültiger Ausgabedateiname.");
const dateipfad = `/home/ubuntu/zugangskarten-pdf/${dateiname}`;
const datei = await readFile(dateipfad);
const db = await mysql.createConnection(databaseUrl);

try {
  const angeforderteAnzahl = Number(process.env.ZUGANGSKARTEN_ANZAHL);
  const [aktive] = await db.execute("SELECT COUNT(*) AS anzahl FROM mitarbeiter WHERE aktiv = 1 AND rolle <> 'admin'");
  const kartenAnzahl = Number.isInteger(angeforderteAnzahl) && angeforderteAnzahl > 0
    ? angeforderteAnzahl
    : Number(aktive[0]?.anzahl ?? 0);
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
