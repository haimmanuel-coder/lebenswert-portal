import { promisify } from "node:util";
import { execFile } from "node:child_process";

const execFileAsync = promisify(execFile);
const pdfPath = process.env.ACCESS_CARD_PDF;
if (!pdfPath) throw new Error("ACCESS_CARD_PDF muss auf die Ersatz-Zugangskarten-PDF zeigen.");

const { stdout } = await execFileAsync("pdftotext", [pdfPath, "-"]);
const emails = [...stdout.matchAll(/[a-z0-9._%+-]+@lebenswert-betreuung\.de/gi)].map((match) => match[0]);
const passwoerter = [...stdout.matchAll(/Lb![A-Za-z0-9_-]+/g)].map((match) => match[0]);
if (emails.length !== 2 || passwoerter.length !== 2) throw new Error("Die Ersatz-Zugangskarten enthalten nicht genau zwei vollständige Anmeldedatensätze.");

const ergebnisse = [];
for (let index = 0; index < emails.length; index += 1) {
  const response = await fetch("https://portal.lebenswert-betreuung.de/api/trpc/portal.login?batch=1", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ 0: { json: { email: emails[index], passwort: passwoerter[index] } } }),
  });
  const payload = await response.json().catch(() => null);
  const sitzungGesetzt = Boolean(response.headers.get("set-cookie")) || Boolean(payload?.[0]?.result?.data?.json?.token);
  ergebnisse.push(response.ok && sitzungGesetzt);
}

console.log(JSON.stringify({
  gepruefteKonten: ergebnisse.length,
  beideLoginsErfolgreich: ergebnisse.every(Boolean),
  klartextZugangsdatenAusgegeben: false,
}, null, 2));

if (!ergebnisse.every(Boolean)) process.exitCode = 1;
