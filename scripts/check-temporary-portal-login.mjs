import "dotenv/config";
import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import mysql from "mysql2/promise";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL ist für den temporären Login-Test erforderlich.");

const portalUrl = (process.env.TEST_PORTAL_BASE_URL || "http://127.0.0.1:3000").replace(/\/$/, "");
const kennung = randomUUID().replace(/-/g, "").slice(0, 16);
const email = `qa-login-${kennung}@example.invalid`;
const passwort = `Qa!${kennung}A9`;
const db = await mysql.createConnection(databaseUrl);
let mitarbeiterId;

try {
  const passwortHash = await bcrypt.hash(passwort, 10);
  const [insertErgebnis] = await db.execute(
    `INSERT INTO mitarbeiter
      (vorname, nachname, email, passwortHash, rolle, aktiv, passwortWechselErforderlich, zweiFaktorAktiv, datevEinwilligung)
     VALUES (?, ?, ?, ?, 'mitarbeiter', 1, 0, 0, 0)`,
    ["Temporär", "Loginprüfung", email, passwortHash],
  );
  mitarbeiterId = insertErgebnis.insertId;

  const antwort = await fetch(`${portalUrl}/api/trpc/portal.login?batch=1`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ 0: { json: { email, passwort } } }),
  });
  const payload = await antwort.json().catch(() => null);
  const cookie = antwort.headers.get("set-cookie") || "";
  const antwortDaten = payload?.[0]?.result?.data?.json ?? {};
  const cookieHeader = cookie.split(";")[0];
  const profilAntwort = await fetch(`${portalUrl}/api/trpc/portal.me?batch=1&input=${encodeURIComponent(JSON.stringify({ 0: { json: null } }))}`, {
    headers: { cookie: cookieHeader },
  });
  const profil = await profilAntwort.json().catch(() => null);
  const profilId = profil?.[0]?.result?.data?.json?.id;

  const resetAntwort = await fetch(`${portalUrl}/api/trpc/portal.requestPasswordReset?batch=1`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ 0: { json: { email } } }),
  });
  const resetPayload = await resetAntwort.json().catch(() => null);
  const resetDaten = resetPayload?.[0]?.result?.data?.json ?? {};
  const erfolgreich = antwort.ok
    && cookie.includes("lb_portal_token=")
    && !Object.hasOwn(antwortDaten, "token")
    && profilAntwort.ok
    && profilId === mitarbeiterId
    && resetAntwort.ok
    && !Object.hasOwn(resetDaten, "resetToken")
    && !Object.hasOwn(resetDaten, "mitarbeiterName");

  console.log(JSON.stringify({
    portal: portalUrl,
    testkonto: email.replace(/^(.{4}).*(@.*)$/, "$1…$2"),
    kontoAktiv: true,
    loginErfolgreich: erfolgreich,
    sitzungscookieGesetzt: cookie.includes("lb_portal_token="),
    sitzungUeberCookieBestaetigt: profilId === mitarbeiterId,
    resetTokenImBrowserVersteckt: !Object.hasOwn(resetDaten, "resetToken"),
    klartextpasswortAusgegeben: false,
  }, null, 2));

  if (!erfolgreich) throw new Error("Temporärer Portal-Login konnte nicht vollständig verifiziert werden.");
} finally {
  if (mitarbeiterId) {
    await db.execute("DELETE FROM passwordResets WHERE mitarbeiterId = ?", [mitarbeiterId]);
    await db.execute("DELETE FROM auditLogs WHERE mitarbeiterId = ?", [mitarbeiterId]);
    await db.execute("DELETE FROM mitarbeiterArbeitsmuster WHERE mitarbeiterId = ?", [mitarbeiterId]);
    await db.execute("DELETE FROM mitarbeiter WHERE id = ?", [mitarbeiterId]);
    console.log(JSON.stringify({ testkontoBereinigt: true }, null, 2));
  }
  // Der Testprozess besitzt keine langlebige Datenbankaufgabe. `destroy()`
  // schließt die kurzlebige Verbindung deterministisch, auch wenn der Treiber
  // auf eine Keep-Alive-Bereinigung warten würde.
  db.destroy();
}
