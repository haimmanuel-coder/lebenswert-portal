import mysql from "mysql2/promise";
import { signPortalToken, PORTAL_COOKIE } from "../server/portalAuth.ts";

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL ist nicht verfügbar.");
const connection = await mysql.createConnection(process.env.DATABASE_URL);

try {
  const [rows] = await connection.execute(
    "SELECT id FROM mitarbeiter WHERE aktiv = 1 AND rolle <> 'admin' ORDER BY id LIMIT 1",
  );
  if (!rows.length) throw new Error("Kein aktiver Mitarbeiter für den Mitteilungen-Test verfügbar.");

  const mitarbeiterId = Number(rows[0].id);
  const token = await signPortalToken(mitarbeiterId, { mfa: true, expiresIn: "5m" });
  const input = encodeURIComponent(JSON.stringify({ 0: { json: null } }));
  const names = ["list", "liste"];

  for (const name of names) {
    const response = await fetch(`http://127.0.0.1:3000/api/trpc/mitteilungen.${name}?batch=1&input=${input}`, {
      headers: { cookie: `${PORTAL_COOKIE}=${token}` },
    });
    const payload = await response.json().catch(() => null);
    const result = payload?.[0]?.result?.data?.json;
    if (!response.ok || !Array.isArray(result)) {
      throw new Error(`mitteilungen.${name} liefert keine gültige Liste.`);
    }
  }

  const [insertResult] = await connection.execute(
    "INSERT INTO mitteilungen (titel, inhalt, prioritaet, erstelltVon, lesebestaetigung_pflicht, aktiv) VALUES (?, ?, 'normal', ?, 1, 1)",
    ["Regressionstest Lesebestätigung", "Temporäre technische Testmitteilung – wird unmittelbar wieder gelöscht.", mitarbeiterId],
  );
  const mitteilungId = Number(insertResult.insertId);

  try {
    const before = await fetch(`http://127.0.0.1:3000/api/trpc/mitteilungen.list?batch=1&input=${input}`, {
      headers: { cookie: `${PORTAL_COOKIE}=${token}` },
    }).then((response) => response.json());
    const beforeEntry = before?.[0]?.result?.data?.json?.find((entry) => Number(entry.id) === mitteilungId);
    if (!beforeEntry || beforeEntry.gelesen) throw new Error("Testmitteilung wurde nicht als ungelesen geliefert.");

    const mutation = await fetch("http://127.0.0.1:3000/api/trpc/mitteilungen.bestaetigen?batch=1", {
      method: "POST",
      headers: { "content-type": "application/json", cookie: `${PORTAL_COOKIE}=${token}` },
      body: JSON.stringify({ 0: { json: { mitteilungId } } }),
    }).then((response) => response.json());
    if (!mutation?.[0]?.result?.data?.json?.ok) throw new Error("Lesebestätigung wurde nicht akzeptiert.");

    const after = await fetch(`http://127.0.0.1:3000/api/trpc/mitteilungen.liste?batch=1&input=${input}`, {
      headers: { cookie: `${PORTAL_COOKIE}=${token}` },
    }).then((response) => response.json());
    const afterEntry = after?.[0]?.result?.data?.json?.find((entry) => Number(entry.id) === mitteilungId);
    if (!afterEntry?.gelesen) throw new Error("Lesebestätigung wurde in der Liste nicht gespeichert.");
  } finally {
    await connection.execute("DELETE FROM mitteilungen_lesebestaetigung WHERE mitteilungId = ? AND mitarbeiterId = ?", [mitteilungId, mitarbeiterId]);
    await connection.execute("DELETE FROM mitteilungen WHERE id = ?", [mitteilungId]);
  }

  console.log("Mitteilungen-Alias und Lesebestätigung geprüft: list/liste liefern gültige Antworten, Bestätigung wird gespeichert und Testdaten wurden bereinigt.");
} finally {
  await connection.end();
}

process.exit(0);
