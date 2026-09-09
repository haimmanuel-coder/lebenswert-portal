import mysql from "mysql2/promise";
import { verschluessleKundenGesundheitsdaten } from "../server/sensitiveFieldEncryption.ts";

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL ist erforderlich.");
const db = await mysql.createConnection(process.env.DATABASE_URL);

try {
  const [kunden] = await db.execute(
    "SELECT id, pflegegrad, pflegegradSeit, pflegegradVerschluesselt, pflegegradSeitVerschluesselt FROM kunden",
  );
  let migriert = 0;
  for (const kunde of kunden) {
    if (kunde.pflegegradVerschluesselt) continue;
    const daten = verschluessleKundenGesundheitsdaten({
      pflegegrad: kunde.pflegegrad,
      pflegegradSeit: kunde.pflegegradSeit,
    });
    if (!daten.pflegegradVerschluesselt) continue;
    await db.execute(
      "UPDATE kunden SET pflegegrad = NULL, pflegegradSeit = NULL, pflegegradVerschluesselt = ?, pflegegradSeitVerschluesselt = ? WHERE id = ?",
      [daten.pflegegradVerschluesselt, daten.pflegegradSeitVerschluesselt ?? null, kunde.id],
    );
    migriert += 1;
  }
  console.log(JSON.stringify({ migrierteGesundheitsdatensaetze: migriert, klartextwerteAusgegeben: false }));
} finally {
  await db.end();
}
