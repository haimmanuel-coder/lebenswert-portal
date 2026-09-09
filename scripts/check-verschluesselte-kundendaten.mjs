import { randomUUID } from "node:crypto";
import mysql from "mysql2/promise";
import { createKunde, createMitarbeiter, getKundeById, getMitarbeiterById, updateKunde, updateMitarbeiter } from "../server/db.ts";

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL ist erforderlich.");
const db = await mysql.createConnection(process.env.DATABASE_URL);
const kennung = randomUUID().replace(/-/g, "").slice(0, 12);
let kundenId;
let mitarbeiterId;
let legacyMitarbeiterId;

try {
  kundenId = await createKunde({
    vorname: "QA",
    nachname: `Gesundheit${kennung}`,
    pflegegrad: 3,
    pflegegradSeit: "2026-01-01",
    aktiv: 1,
  });
  const [nachAnlage] = await db.execute(
    "SELECT pflegegrad, pflegegradSeit, pflegegradVerschluesselt, pflegegradSeitVerschluesselt FROM kunden WHERE id = ?",
    [kundenId],
  );
  const rohAnlage = nachAnlage[0];
  if (rohAnlage.pflegegrad !== null || !String(rohAnlage.pflegegradVerschluesselt ?? "").startsWith("enc:v1:")) {
    throw new Error("Pflegegrad wurde nicht verschlüsselt abgelegt.");
  }
  const gelesenNachAnlage = await getKundeById(kundenId);
  if (gelesenNachAnlage?.pflegegrad !== 3 || gelesenNachAnlage?.pflegegradSeit !== "2026-01-01") {
    throw new Error("Berechtigte Lesesicht konnte die verschlüsselten Gesundheitsdaten nicht korrekt wiederherstellen.");
  }

  await updateKunde(kundenId, { pflegegrad: 4, pflegegradSeit: "2026-02-01" });
  const [nachAenderung] = await db.execute(
    "SELECT pflegegrad, pflegegradSeit, pflegegradVerschluesselt, pflegegradSeitVerschluesselt FROM kunden WHERE id = ?",
    [kundenId],
  );
  const rohAenderung = nachAenderung[0];
  const gelesenNachAenderung = await getKundeById(kundenId);
  if (rohAenderung.pflegegrad !== null || !String(rohAenderung.pflegegradVerschluesselt ?? "").startsWith("enc:v1:") || gelesenNachAenderung?.pflegegrad !== 4 || gelesenNachAenderung?.pflegegradSeit !== "2026-02-01") {
    throw new Error("Änderung verschlüsselter Gesundheitsdaten ist nicht konsistent.");
  }

  mitarbeiterId = await createMitarbeiter({
    vorname: "QA",
    nachname: `Versicherung${kennung}`,
    email: `qa-versicherung-${kennung}@example.invalid`,
    passwortHash: "nicht-zur-anmeldung-verwendet",
    rolle: "mitarbeiter",
    aktiv: 1,
    krankenversicherungsart: "gesetzlich",
    krankenkasse: "Testkasse",
    iban: "DE00123456780000000000",
    steueridentnummer: "12345678901",
    sozialversicherungsnummer: "12 123456 A 123",
  });
  const [maRohNachAnlage] = await db.execute(
    "SELECT krankenversicherungsart, krankenversicherungsartVerschluesselt, krankenkasse, krankenkasseVerschluesselt, iban, steueridentnummer, sozialversicherungsnummer FROM mitarbeiter WHERE id = ?",
    [mitarbeiterId],
  );
  const maRoh = maRohNachAnlage[0];
  const maGelesenNachAnlage = await getMitarbeiterById(mitarbeiterId);
  if (
    maRoh.krankenversicherungsart !== null || !String(maRoh.krankenversicherungsartVerschluesselt ?? "").startsWith("enc:v1:") ||
    maRoh.krankenkasse !== null || !String(maRoh.krankenkasseVerschluesselt ?? "").startsWith("enc:v1:") ||
    !String(maRoh.iban ?? "").startsWith("enc:v1:") || !String(maRoh.steueridentnummer ?? "").startsWith("enc:v1:") || !String(maRoh.sozialversicherungsnummer ?? "").startsWith("enc:v1:") ||
    maGelesenNachAnlage?.krankenversicherungsart !== "gesetzlich" || maGelesenNachAnlage?.krankenkasse !== "Testkasse" ||
    maGelesenNachAnlage?.iban !== "DE00123456780000000000" || maGelesenNachAnlage?.steueridentnummer !== "12345678901" || maGelesenNachAnlage?.sozialversicherungsnummer !== "12 123456 A 123"
  ) {
    throw new Error("Sensible Mitarbeiterstammdaten wurden nicht sicher gespeichert oder wiederhergestellt.");
  }
  await updateMitarbeiter(mitarbeiterId, {
    krankenversicherungsart: "privat",
    krankenkasse: "Neue Testkasse",
    iban: "DE00987654320000000000",
    steueridentnummer: "10987654321",
    sozialversicherungsnummer: "12 654321 B 456",
  });
  const [maRohNachAenderung] = await db.execute(
    "SELECT iban, steueridentnummer, sozialversicherungsnummer FROM mitarbeiter WHERE id = ?",
    [mitarbeiterId],
  );
  const maGelesenNachAenderung = await getMitarbeiterById(mitarbeiterId);
  if (
    !String(maRohNachAenderung[0]?.iban ?? "").startsWith("enc:v1:") ||
    !String(maRohNachAenderung[0]?.steueridentnummer ?? "").startsWith("enc:v1:") ||
    !String(maRohNachAenderung[0]?.sozialversicherungsnummer ?? "").startsWith("enc:v1:") ||
    maGelesenNachAenderung?.krankenversicherungsart !== "privat" ||
    maGelesenNachAenderung?.krankenkasse !== "Neue Testkasse" ||
    maGelesenNachAenderung?.iban !== "DE00987654320000000000" ||
    maGelesenNachAenderung?.steueridentnummer !== "10987654321" ||
    maGelesenNachAenderung?.sozialversicherungsnummer !== "12 654321 B 456"
  ) {
    throw new Error("Änderung verschlüsselter Mitarbeiter-Gesundheitsdaten ist nicht konsistent.");
  }

  const [legacyResult] = await db.execute(
    "INSERT INTO mitarbeiter (vorname, nachname, email, passwortHash, rolle, aktiv, iban, steueridentnummer, sozialversicherungsnummer) VALUES (?, ?, ?, ?, 'mitarbeiter', 1, ?, ?, ?)",
    ["QA", `Altbestand${kennung}`, `qa-altbestand-${kennung}@example.invalid`, "nicht-zur-anmeldung-verwendet", "DE00111122223333444455", "11122233344", "12 111222 C 789"],
  );
  legacyMitarbeiterId = legacyResult.insertId;
  const legacyLesesicht = await getMitarbeiterById(legacyMitarbeiterId);
  if (
    legacyLesesicht?.iban !== "DE00111122223333444455" ||
    legacyLesesicht?.steueridentnummer !== "11122233344" ||
    legacyLesesicht?.sozialversicherungsnummer !== "12 111222 C 789"
  ) {
    throw new Error("Bestehende Klartext-Altdaten bleiben im berechtigten Integrationspfad nicht lesbar.");
  }

  console.log(JSON.stringify({
    anlageVerschluesselt: true,
    aenderungVerschluesselt: true,
    mitarbeiterGesundheitsdatenVerschluesselt: true,
    sensibleAenderungenVerschluesselt: true,
    klareAltdatenRueckwaertskompatibel: true,
    berechtigterLesezugriffWiederhergestellt: true,
    klartextGesundheitsdatenAusgegeben: false,
  }));
} finally {
  if (kundenId) await db.execute("DELETE FROM kunden WHERE id = ?", [kundenId]);
  if (mitarbeiterId) await db.execute("DELETE FROM mitarbeiter WHERE id = ?", [mitarbeiterId]);
  if (legacyMitarbeiterId) await db.execute("DELETE FROM mitarbeiter WHERE id = ?", [legacyMitarbeiterId]);
  await db.end();
  console.log(JSON.stringify({ testdatenBereinigt: true }));
}

process.exit(0);
