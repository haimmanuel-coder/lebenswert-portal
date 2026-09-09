import { execFile } from "node:child_process";
import { promisify } from "node:util";
import mysql from "mysql2/promise";

const execFileAsync = promisify(execFile);
const pdfPath = process.env.ACCESS_CARD_PDF;
const databaseUrl = process.env.DATABASE_URL;
const portalUrl = (process.env.TEST_PORTAL_BASE_URL || "https://portal.lebenswert-betreuung.de").replace(/\/$/, "");

if (!pdfPath) throw new Error("ACCESS_CARD_PDF muss auf die Ersatz-Zugangskarten-PDF zeigen.");
if (!databaseUrl) throw new Error("DATABASE_URL ist für den Zuweisungsabgleich erforderlich.");

function leseCookies(response) {
  const setCookies = typeof response.headers.getSetCookie === "function"
    ? response.headers.getSetCookie()
    : [response.headers.get("set-cookie")].filter(Boolean);
  return setCookies.map((wert) => wert.split(";")[0]).join("; ");
}

async function fuehreTrpcQueryAus(cookie) {
  const input = encodeURIComponent(JSON.stringify({ 0: { json: null } }));
  const response = await fetch(`${portalUrl}/api/trpc/kunden.list?batch=1&input=${input}`, {
    headers: { cookie },
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error("Die Dashboard-Kundenabfrage wurde nicht erfolgreich beantwortet.");
  const kunden = payload?.[0]?.result?.data?.json;
  if (!Array.isArray(kunden)) throw new Error("Die Dashboard-Kundenabfrage liefert keine Kundenliste.");
  return kunden;
}

const { stdout } = await execFileAsync("pdftotext", [pdfPath, "-"]);
const emails = [...stdout.matchAll(/[a-z0-9._%+-]+@lebenswert-betreuung\.de/gi)].map((match) => match[0]);
const passwoerter = [...stdout.matchAll(/Lb![A-Za-z0-9_-]+/g)].map((match) => match[0]);
if (emails.length !== 2 || passwoerter.length !== 2) {
  throw new Error("Die Ersatz-Zugangskarten enthalten nicht genau zwei vollständige Anmeldedatensätze.");
}

const db = await mysql.createConnection(databaseUrl);
try {
  const ergebnisse = [];
  for (let index = 0; index < emails.length; index += 1) {
    const login = await fetch(`${portalUrl}/api/trpc/portal.login?batch=1`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ 0: { json: { email: emails[index], passwort: passwoerter[index] } } }),
    });
    const cookie = leseCookies(login);
    if (!login.ok || !cookie) throw new Error("Der Mitarbeiterlogin konnte keine sichere Sitzung erstellen.");

    const kundenAusDashboard = await fuehreTrpcQueryAus(cookie);
    const [zuordnungen] = await db.execute(
      `SELECT DISTINCT kz.kundenId
         FROM kundenZuordnung kz
         INNER JOIN mitarbeiter m ON m.id = kz.mitarbeiterId AND m.aktiv = 1
         INNER JOIN kunden k ON k.id = kz.kundenId AND k.aktiv = 1
        WHERE LOWER(m.email) = LOWER(?)
        ORDER BY kz.kundenId ASC`,
      [emails[index]],
    );

    const erwarteteIds = new Set(zuordnungen.map((eintrag) => Number(eintrag.kundenId)));
    const dashboardIds = kundenAusDashboard.map((kunde) => Number(kunde.id));
    const vollstaendigeNamen = kundenAusDashboard.every((kunde) =>
      typeof kunde.vorname === "string" && kunde.vorname.trim().length > 0
      && typeof kunde.nachname === "string" && kunde.nachname.trim().length > 0,
    );
    const keineDoppelten = new Set(dashboardIds).size === dashboardIds.length;
    const exaktZugeordnet = dashboardIds.length === erwarteteIds.size
      && dashboardIds.every((kundenId) => erwarteteIds.has(kundenId));

    ergebnisse.push({
      zuordnungStimmt: exaktZugeordnet,
      vollstaendigeKundennamen: vollstaendigeNamen,
      keineDoppeltenKunden: keineDoppelten,
      zugeordneteKundenAnzahl: erwarteteIds.size,
      dashboardKundenAnzahl: dashboardIds.length,
    });
  }

  const erfolgreich = ergebnisse.every((ergebnis) =>
    ergebnis.zuordnungStimmt && ergebnis.vollstaendigeKundennamen && ergebnis.keineDoppeltenKunden,
  );
  console.log(JSON.stringify({
    gepruefteMitarbeiterkonten: ergebnisse.length,
    dashboardDatenquelle: "kunden.list",
    alleZuweisungenStimmen: erfolgreich,
    ergebnisse,
    klartextZugangsdatenAusgegeben: false,
  }, null, 2));
  if (!erfolgreich) process.exitCode = 1;
} finally {
  await db.end();
}
