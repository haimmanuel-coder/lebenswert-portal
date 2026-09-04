import mysql from "mysql2/promise";
import { verschluessleMitarbeiterStammdaten } from "../server/sensitiveFieldEncryption.ts";

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL ist erforderlich.");
const db = await mysql.createConnection(process.env.DATABASE_URL);

try {
  const [mitarbeitende] = await db.execute(
    "SELECT id, krankenversicherungsart, krankenversicherungsartVerschluesselt FROM mitarbeiter",
  );
  let migriert = 0;
  for (const ma of mitarbeitende) {
    if (ma.krankenversicherungsartVerschluesselt || ma.krankenversicherungsart === null) continue;
    const verschluesselt = verschluessleMitarbeiterStammdaten({ krankenversicherungsart: ma.krankenversicherungsart });
    await db.execute(
      "UPDATE mitarbeiter SET krankenversicherungsart = NULL, krankenversicherungsartVerschluesselt = ? WHERE id = ?",
      [verschluesselt.krankenversicherungsartVerschluesselt, ma.id],
    );
    migriert += 1;
  }
  console.log(JSON.stringify({ migrierteGesundheitsdatensaetze: migriert, klartextGesundheitsdatenAusgegeben: false }));
} finally {
  await db.end();
}

process.exit(0);
