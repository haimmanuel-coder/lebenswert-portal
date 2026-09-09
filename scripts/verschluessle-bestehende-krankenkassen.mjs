import mysql from "mysql2/promise";
import { verschluessleMitarbeiterStammdaten } from "../server/sensitiveFieldEncryption.ts";

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL ist erforderlich.");
const db = await mysql.createConnection(process.env.DATABASE_URL);

try {
  const [mitarbeitende] = await db.execute("SELECT id, krankenkasse, krankenkasseVerschluesselt FROM mitarbeiter");
  let migriert = 0;
  for (const ma of mitarbeitende) {
    if (!ma.krankenkasse || ma.krankenkasseVerschluesselt) continue;
    const verschluesselt = verschluessleMitarbeiterStammdaten({ krankenkasse: ma.krankenkasse });
    await db.execute(
      "UPDATE mitarbeiter SET krankenkasse = NULL, krankenkasseVerschluesselt = ? WHERE id = ?",
      [verschluesselt.krankenkasseVerschluesselt, ma.id],
    );
    migriert += 1;
  }
  console.log(JSON.stringify({ migrierteGesundheitsdatensaetze: migriert, klartextGesundheitsdatenAusgegeben: false }));
} finally {
  await db.end();
}

process.exit(0);
