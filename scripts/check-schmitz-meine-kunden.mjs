import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { chromium } from "playwright";

const execFileAsync = promisify(execFile);
const pdfPath = process.env.ACCESS_CARD_PDF;
const portalUrl = "https://portal.lebenswert-betreuung.de";

if (!pdfPath) throw new Error("ACCESS_CARD_PDF muss auf die Ersatz-Zugangskarten-PDF zeigen.");

function extrahiereZugangskarte(pdfText) {
  const start = pdfText.search(/schmitz/i);
  if (start < 0) throw new Error("Die geschützte Ersatzkarten-PDF enthält keine Karte für Frau Schmitz.");
  const bereich = pdfText.slice(Math.max(0, start - 500), start + 1_200);
  const email = bereich.match(/[a-z0-9._%+-]+@lebenswert-betreuung\.de/i)?.[0];
  const passwort = bereich.match(/Lb![A-Za-z0-9_-]+/)?.[0];
  if (!email || !passwort) throw new Error("Die Ersatzkarte für Frau Schmitz enthält keinen vollständigen Anmeldedatensatz.");
  return { email, passwort };
}

function leseCookie(setCookie) {
  const ersterTeil = String(setCookie ?? "").split(";")[0];
  const trennzeichen = ersterTeil.indexOf("=");
  if (trennzeichen < 1) throw new Error("Die Anmeldung hat keine sichere Sitzung gesetzt.");
  return { name: ersterTeil.slice(0, trennzeichen), value: ersterTeil.slice(trennzeichen + 1) };
}

const { stdout } = await execFileAsync("pdftotext", [pdfPath, "-"]);
const { email, passwort } = extrahiereZugangskarte(stdout);
const loginAntwort = await fetch(`${portalUrl}/api/trpc/portal.login?batch=1`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ 0: { json: { email, passwort } } }),
});
if (!loginAntwort.ok) throw new Error("Der Startzugang von Frau Schmitz konnte nicht angemeldet werden.");
const cookie = leseCookie(loginAntwort.headers.get("set-cookie"));
const kundenInput = encodeURIComponent(JSON.stringify({ 0: { json: null } }));
const kundenAntwort = await fetch(`${portalUrl}/api/trpc/kunden.list?batch=1&input=${kundenInput}`, {
  headers: { cookie: `${cookie.name}=${cookie.value}` },
});
const kundenPayload = await kundenAntwort.json().catch(() => null);
const serverKunden = kundenPayload?.[0]?.result?.data?.json;
const serverKundenAnzahl = Array.isArray(serverKunden) ? serverKunden.length : -1;
if (!kundenAntwort.ok || serverKundenAnzahl < 0) {
  const fehlercode = kundenPayload?.[0]?.error?.json?.data?.code ?? "unbekannt";
  throw new Error(`Die persönliche Kundenliste konnte nicht sicher vom Server geladen werden (HTTP ${kundenAntwort.status}, Code ${fehlercode}).`);
}

const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});

try {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await context.addInitScript(() => window.localStorage.setItem("lebensnah_onboarding_done_v2", "true"));
  await context.addCookies([{ ...cookie, url: portalUrl, httpOnly: true, secure: true, sameSite: "Lax" }]);
  const page = await context.newPage();
  await page.goto(portalUrl, { waitUntil: "networkidle" });
  const cookieButton = page.getByRole("button", { name: /verstanden.*akzeptieren/i });
  if (await cookieButton.isVisible().catch(() => false)) await cookieButton.click();
  await page.getByTestId("portal-aktuelle-seite").waitFor({ state: "visible", timeout: 15_000 });

  const erstloginHinweisSichtbar = await page.getByText(/Persönliches Passwort festlegen/i).isVisible().catch(() => false);
  const suche = page.locator("#meine-kunden-suche");
  await suche.waitFor({ state: "visible", timeout: 15_000 }).catch(async () => {
    await page.screenshot({ path: "/home/ubuntu/screenshots/schmitz-meine-kunden-fehler.png", fullPage: true });
  });
  const kundenkarten = page.getByTestId("meine-kunden-eintrag");
  const anzahlVorher = await kundenkarten.count();
  if (anzahlVorher === 0) {
    await page.screenshot({ path: "/home/ubuntu/screenshots/schmitz-meine-kunden-fehler.png", fullPage: true });
    throw new Error(`Für Frau Schmitz werden trotz erfolgreicher Anmeldung keine zugeteilten Kunden angezeigt (Serverliste: ${serverKundenAnzahl}).`);
  }

  const ersterKartenText = (await kundenkarten.first().textContent() ?? "").trim();
  const suchwort = ersterKartenText.split(/\s+/)[0];
  if (!suchwort) throw new Error("Für die Kundensuche konnte kein sichtbarer Kundenname bestimmt werden.");
  await suche.fill(suchwort, { force: true });
  await page.waitForTimeout(120);
  const anzahlNachSuche = await kundenkarten.count();
  const sichtbarerText = (await kundenkarten.first().textContent() ?? "").toLocaleLowerCase("de-DE");
  if (anzahlNachSuche < 1 || anzahlNachSuche > anzahlVorher || !sichtbarerText.includes(suchwort.toLocaleLowerCase("de-DE"))) {
    throw new Error("Die Suche in „Meine Kunden“ filtert die zugeteilten Kunden nicht korrekt.");
  }

  console.log(JSON.stringify({
    schmitzStartzugangErfolgreich: true,
    erstloginPasswortwechselWirdAngezeigt: erstloginHinweisSichtbar,
    meineKundenSichtbar: true,
    serverseitigeKundenlisteAnzahl: serverKundenAnzahl,
    sucheInMeineKundenFunktioniert: true,
    klartextZugangsdatenAusgegeben: false,
  }, null, 2));
  await context.close();
} finally {
  await browser.close();
}
