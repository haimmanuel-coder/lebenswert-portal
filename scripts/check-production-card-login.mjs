import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const pdfPath = process.env.ACCESS_CARD_PDF;
if (!pdfPath) throw new Error("ACCESS_CARD_PDF muss auf eine Zugangskarten-PDF zeigen.");

const { stdout } = await execFileAsync("pdftotext", [pdfPath, "-"]);
const email = stdout.match(/[a-z0-9._%+-]+@lebenswert-betreuung\.de/i)?.[0];
const password = stdout.match(/Sb![A-Za-z0-9_-]+\d/)?.[0];
if (!email || !password) throw new Error("E-Mail oder Einmalpasswort konnte nicht sicher aus der Zugangskarte gelesen werden.");

const response = await fetch("https://portal.lebenswert-betreuung.de/api/trpc/portal.login?batch=1", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ 0: { json: { email, passwort: password } } }),
});
const payload = await response.json().catch(() => null);
const loginErfolgreich = Boolean(response.ok && payload?.[0]?.result?.data?.json?.token);

console.log(JSON.stringify({
  produktionsadresse: "https://portal.lebenswert-betreuung.de",
  oeffentlicher_portal_login_erfolgreich: loginErfolgreich,
  getestetes_konto: email.replace(/^(.{2}).*(@.*)$/, "$1…$2"),
  klartextpasswort_ausgegeben: false,
}, null, 2));

if (!loginErfolgreich) process.exitCode = 1;
