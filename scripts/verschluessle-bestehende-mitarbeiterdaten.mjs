import crypto from "node:crypto";
import mysql from "mysql2/promise";

const databaseUrl = process.env.DATABASE_URL;
const schluesselMaterial = process.env.CREDENTIAL_ENCRYPTION_KEY || process.env.JWT_SECRET;
if (!databaseUrl || !schluesselMaterial) throw new Error("DATABASE_URL und ein Verschlüsselungsschlüssel sind erforderlich.");

const schluessel = crypto.createHash("sha256").update(schluesselMaterial).digest();
const prefix = "enc:v1:";
function verschluesseln(wert) {
  if (!wert || wert.startsWith(prefix)) return wert;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", schluessel, iv);
  const daten = Buffer.concat([cipher.update(wert, "utf8"), cipher.final()]);
  return `${prefix}${iv.toString("base64")}.${cipher.getAuthTag().toString("base64")}.${daten.toString("base64")}`;
}

const db = await mysql.createConnection(databaseUrl);
try {
  const [mitarbeitende] = await db.execute("SELECT id, sozialversicherungsnummer, steueridentnummer, iban FROM mitarbeiter");
  let migriert = 0;
  for (const eintrag of mitarbeitende) {
    const sozial = verschluesseln(eintrag.sozialversicherungsnummer);
    const steuer = verschluesseln(eintrag.steueridentnummer);
    const iban = verschluesseln(eintrag.iban);
    if (sozial !== eintrag.sozialversicherungsnummer || steuer !== eintrag.steueridentnummer || iban !== eintrag.iban) {
      await db.execute("UPDATE mitarbeiter SET sozialversicherungsnummer = ?, steueridentnummer = ?, iban = ? WHERE id = ?", [sozial, steuer, iban, eintrag.id]);
      migriert++;
    }
  }
  console.log(JSON.stringify({ migrierteMitarbeiterDatensaetze: migriert, klartextwerteAusgegeben: false }, null, 2));
} finally {
  await db.end();
}
