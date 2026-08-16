import mysql from "mysql2/promise";
import { signPortalToken, PORTAL_COOKIE } from "../server/portalAuth.ts";

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL ist nicht verfügbar.");

const connection = await mysql.createConnection(process.env.DATABASE_URL);
const testTag = `[TEST-AUDIT-${Date.now()}]`;
let riskId = null;
let psaId = null;
let textbausteinId = null;
let budgetId = null;
let kassenanfrageId = null;
let kundenTestId = null;

async function mutation(token, path, input) {
  const response = await fetch(`http://127.0.0.1:3000/api/trpc/${path}?batch=1`, {
    method: "POST",
    headers: { "content-type": "application/json", cookie: `${PORTAL_COOKIE}=${token}` },
    body: JSON.stringify({ 0: { json: input } }),
  });
  const payload = await response.json().catch(() => null);
  const result = payload?.[0]?.result?.data?.json;
  if (!response.ok || !result?.success) throw new Error(`${path} war nicht erfolgreich: ${JSON.stringify(payload)}`);
  return result;
}

try {
  const [admins] = await connection.execute("SELECT id FROM mitarbeiter WHERE rolle = 'admin' AND aktiv = 1 ORDER BY id LIMIT 1");
  const [mitarbeiterRows] = await connection.execute("SELECT id FROM mitarbeiter WHERE rolle <> 'admin' AND aktiv = 1 ORDER BY id LIMIT 1");
  const [kundenRows] = await connection.execute("SELECT id FROM kunden WHERE aktiv = 1 ORDER BY id LIMIT 1");
  if (!admins.length || !mitarbeiterRows.length || !kundenRows.length) throw new Error("Kein aktiver Admin, Mitarbeiter oder Kunde für den Audit-Test verfügbar.");

  const token = await signPortalToken(Number(admins[0].id), { mfa: true, expiresIn: "5m" });
  const mitarbeiterId = Number(mitarbeiterRows[0].id);
  const kundenId = Number(kundenRows[0].id);

  await mutation(token, "kunden.create", {
    vorname: `${testTag} Kunde`,
    nachname: "Prüfung",
    adresse: "Teststraße 1, 12345 Musterstadt",
    telefon: "000000000",
    pflegegrad: 1,
    paragraph: "45b",
  });
  const [kundenCreated] = await connection.execute("SELECT id FROM kunden WHERE vorname = ? AND nachname = ?", [`${testTag} Kunde`, "Prüfung"]);
  kundenTestId = Number(kundenCreated[0]?.id);
  if (!kundenTestId) throw new Error("Testkunde wurde nicht angelegt.");

  await mutation(token, "kunden.update", { id: kundenTestId, telefon: "000000001" });
  const [kundenUpdated] = await connection.execute("SELECT telefon, aktiv FROM kunden WHERE id = ?", [kundenTestId]);
  if (kundenUpdated[0]?.telefon !== "000000001" || Number(kundenUpdated[0]?.aktiv) !== 1) throw new Error("Testkunde wurde nicht korrekt geändert.");

  await mutation(token, "kunden.delete", { id: kundenTestId });
  const [kundenDeleted] = await connection.execute("SELECT aktiv FROM kunden WHERE id = ?", [kundenTestId]);
  if (Number(kundenDeleted[0]?.aktiv) !== 0) throw new Error("Testkunde wurde nicht über den vorgesehenen App-Pfad deaktiviert.");

  await mutation(token, "kassenanfrage.create", {
    kundenId,
    anfrageTyp: "sonstiges",
    notizen: `${testTag} Kassenanfrage`,
  });
  const [kassenanfrageRows] = await connection.execute("SELECT id FROM kassenanfragen WHERE notizen = ?", [`${testTag} Kassenanfrage`]);
  kassenanfrageId = Number(kassenanfrageRows[0]?.id);
  if (!kassenanfrageId) throw new Error("Kassenanfrage wurde nicht angelegt.");

  await mutation(token, "kassenanfrage.updateStatus", { id: kassenanfrageId, status: "beantwortet", antwort: `${testTag} Antwort` });
  const [kassenanfrageUpdated] = await connection.execute("SELECT status, antwort FROM kassenanfragen WHERE id = ?", [kassenanfrageId]);
  if (kassenanfrageUpdated[0]?.status !== "beantwortet" || kassenanfrageUpdated[0]?.antwort !== `${testTag} Antwort`) throw new Error("Kassenanfrage wurde nicht korrekt aktualisiert.");

  await mutation(token, "planung.loescheDatensatz", { bereich: "kassenanfrage", id: kassenanfrageId, grund: "Temporärer Admin-Audit-Test" });
  const [kassenanfrageDeleted] = await connection.execute("SELECT geloeschtAt, geloeschtVon FROM kassenanfragen WHERE id = ?", [kassenanfrageId]);
  if (!kassenanfrageDeleted[0]?.geloeschtAt || !kassenanfrageDeleted[0]?.geloeschtVon) throw new Error("Kassenanfrage wurde nicht korrekt per Soft-Delete gelöscht.");
  kassenanfrageId = null;

  const budget = await mutation(token, "budget.create", {
    kundenId,
    leistungsbereich: "sonstige",
    jahresbudgetCent: 15000,
    gueltigAb: "2026-01-01",
    gueltigBis: "2026-12-31",
    stundensatzCent: 3500,
    notizen: `${testTag} Budget`,
  });
  budgetId = Number(budget.id);
  if (!budgetId) throw new Error("Budget wurde nicht angelegt.");

  await mutation(token, "budget.update", { id: budgetId, jahresbudgetCent: 18000, notizen: `${testTag} Budget aktualisiert` });
  const [budgetUpdated] = await connection.execute("SELECT jahresbudgetCent, notizen FROM jahresbudgets WHERE id = ?", [budgetId]);
  if (Number(budgetUpdated[0]?.jahresbudgetCent) !== 18000 || budgetUpdated[0]?.notizen !== `${testTag} Budget aktualisiert`) throw new Error("Budget wurde nicht korrekt aktualisiert.");

  await mutation(token, "budget.delete", { id: budgetId });
  budgetId = null;
  const [budgetRemaining] = await connection.execute("SELECT COUNT(*) AS anzahl FROM jahresbudgets WHERE notizen LIKE ?", [`${testTag}%`]);
  if (Number(budgetRemaining[0]?.anzahl) !== 0) throw new Error("Budget-Testdaten wurden nicht entfernt.");

  await mutation(token, "textbausteine.create", {
    titel: `${testTag} Textbaustein`,
    inhalt: "Temporärer technischer Testinhalt – wird im selben Ablauf gelöscht.",
    kategorie: "sonstiges",
    paragraph: "alle",
  });
  const [textbausteinRows] = await connection.execute("SELECT id FROM textbausteine WHERE titel = ?", [`${testTag} Textbaustein`]);
  textbausteinId = Number(textbausteinRows[0]?.id);
  if (!textbausteinId) throw new Error("Textbaustein wurde nicht angelegt.");

  await mutation(token, "textbausteine.update", { id: textbausteinId, inhalt: "Aktualisierter technischer Testinhalt" });
  const [textbausteinUpdated] = await connection.execute("SELECT inhalt FROM textbausteine WHERE id = ?", [textbausteinId]);
  if (textbausteinUpdated[0]?.inhalt !== "Aktualisierter technischer Testinhalt") throw new Error("Textbaustein wurde nicht korrekt aktualisiert.");

  await mutation(token, "textbausteine.delete", { id: textbausteinId });
  textbausteinId = null;
  const [textbausteinDeleted] = await connection.execute("SELECT aktiv FROM textbausteine WHERE titel = ?", [`${testTag} Textbaustein`]);
  if (Number(textbausteinDeleted[0]?.aktiv) !== 0) throw new Error("Textbaustein wurde nicht korrekt deaktiviert.");

  await mutation(token, "arbeitssicherheit.gefaehrdung.create", {
    titel: `${testTag} Gefährdungsbeurteilung`,
    bereich: "sonstiges",
    risikobeschreibung: "Temporäre technische Testdaten – werden im selben Ablauf gelöscht.",
    massnahmen: "Temporäre Testmaßnahme",
    verantwortlich: "Systemtest",
    risikoStufe: "niedrig",
    naechstePruefung: "2026-12-31",
  });
  const [riskRows] = await connection.execute("SELECT id, status, massnahmen FROM gefaehrdungsbeurteilungen WHERE titel = ?", [`${testTag} Gefährdungsbeurteilung`]);
  riskId = Number(riskRows[0]?.id);
  if (!riskId) throw new Error("Gefährdungsbeurteilung wurde nicht angelegt.");

  await mutation(token, "arbeitssicherheit.gefaehrdung.update", { id: riskId, status: "erledigt", massnahmen: "Aktualisierte Testmaßnahme" });
  const [riskUpdated] = await connection.execute("SELECT status, massnahmen FROM gefaehrdungsbeurteilungen WHERE id = ?", [riskId]);
  if (riskUpdated[0]?.status !== "erledigt" || riskUpdated[0]?.massnahmen !== "Aktualisierte Testmaßnahme") throw new Error("Gefährdungsbeurteilung wurde nicht korrekt aktualisiert.");

  await mutation(token, "arbeitssicherheit.psa.create", {
    mitarbeiterId,
    psaTyp: "einmalhandschuhe",
    menge: 1,
    ausgabeDatum: "2026-08-16",
    notizen: `${testTag} PSA-Ausgabe`,
  });
  const [psaRows] = await connection.execute("SELECT id FROM psa_ausgaben WHERE notizen = ?", [`${testTag} PSA-Ausgabe`]);
  psaId = Number(psaRows[0]?.id);
  if (!psaId) throw new Error("PSA-Ausgabe wurde nicht angelegt.");

  await mutation(token, "arbeitssicherheit.psa.rueckgabe", { id: psaId, rueckgabeDatum: "2026-08-17" });
  const [psaUpdated] = await connection.execute("SELECT zustand, rueckgabeDatum FROM psa_ausgaben WHERE id = ?", [psaId]);
  if (psaUpdated[0]?.zustand !== "zurueckgegeben" || !psaUpdated[0]?.rueckgabeDatum) throw new Error("PSA-Rückgabe wurde nicht korrekt gespeichert.");

  await mutation(token, "arbeitssicherheit.gefaehrdung.delete", { id: riskId });
  riskId = null;
  await mutation(token, "arbeitssicherheit.psa.delete", { id: psaId });
  psaId = null;

  const [remaining] = await connection.execute("SELECT (SELECT COUNT(*) FROM gefaehrdungsbeurteilungen WHERE titel = ?) AS risks, (SELECT COUNT(*) FROM psa_ausgaben WHERE notizen = ?) AS psas", [`${testTag} Gefährdungsbeurteilung`, `${testTag} PSA-Ausgabe`]);
  if (Number(remaining[0]?.risks) !== 0 || Number(remaining[0]?.psas) !== 0) throw new Error("Testdaten wurden nicht vollständig entfernt.");

  console.log("Admin-Schreibtest bestanden: Kunde, Kassenanfrage, Budget, Textbaustein, Gefährdungsbeurteilung und PSA-Ausgabe wurden erstellt, aktualisiert, deaktiviert/gelöscht und vollständig bereinigt.");
} finally {
  if (kundenTestId) {
    await connection.execute("DELETE FROM neukundenPushBestaetigung WHERE kundenId = ?", [kundenTestId]);
    await connection.execute("DELETE FROM budget_45b WHERE kundenId = ?", [kundenTestId]);
    await connection.execute("DELETE FROM budget_39 WHERE kundenId = ?", [kundenTestId]);
    await connection.execute("DELETE FROM jahresbudgets WHERE kundenId = ?", [kundenTestId]);
    await connection.execute("DELETE FROM kunden_zuordnung WHERE kundenId = ?", [kundenTestId]);
    await connection.execute("DELETE FROM kunden WHERE id = ?", [kundenTestId]);
  }
  if (kassenanfrageId) await connection.execute("DELETE FROM kassenanfragen WHERE id = ?", [kassenanfrageId]);
  if (budgetId) await connection.execute("DELETE FROM jahresbudgets WHERE id = ?", [budgetId]);
  if (textbausteinId) await connection.execute("DELETE FROM textbausteine WHERE id = ?", [textbausteinId]);
  if (riskId) await connection.execute("DELETE FROM gefaehrdungsbeurteilungen WHERE id = ?", [riskId]);
  if (psaId) await connection.execute("DELETE FROM psa_ausgaben WHERE id = ?", [psaId]);
  await connection.execute("DELETE FROM textbausteine WHERE titel LIKE ?", [`${testTag}%`]);
  await connection.execute("DELETE FROM jahresbudgets WHERE notizen LIKE ?", [`${testTag}%`]);
  await connection.execute("DELETE FROM kassenanfragen WHERE notizen LIKE ?", [`${testTag}%`]);
  const [testKunden] = await connection.execute("SELECT id FROM kunden WHERE vorname LIKE ?", [`${testTag}%`]);
  for (const kunde of testKunden) {
    const id = Number(kunde.id);
    await connection.execute("DELETE FROM neukundenPushBestaetigung WHERE kundenId = ?", [id]);
    await connection.execute("DELETE FROM budget_45b WHERE kundenId = ?", [id]);
    await connection.execute("DELETE FROM budget_39 WHERE kundenId = ?", [id]);
    await connection.execute("DELETE FROM jahresbudgets WHERE kundenId = ?", [id]);
    await connection.execute("DELETE FROM kunden_zuordnung WHERE kundenId = ?", [id]);
    await connection.execute("DELETE FROM kunden WHERE id = ?", [id]);
  }
  await connection.execute("DELETE FROM gefaehrdungsbeurteilungen WHERE titel LIKE ?", [`${testTag}%`]);
  await connection.execute("DELETE FROM psa_ausgaben WHERE notizen LIKE ?", [`${testTag}%`]);
  await connection.end();
}

process.exit(0);
