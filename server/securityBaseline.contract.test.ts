import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { buildPasswortResetEmail } from "./emailService";

const root = join(__dirname, "..");
const router = readFileSync(join(root, "server", "routers.ts"), "utf8");
const auth = readFileSync(join(root, "server", "portalAuth.ts"), "utf8");
const index = readFileSync(join(root, "server", "_core", "index.ts"), "utf8");
const login = readFileSync(join(root, "client", "src", "pages", "Login.tsx"), "utf8");
const main = readFileSync(join(root, "client", "src", "main.tsx"), "utf8");
const db = readFileSync(join(root, "server", "db.ts"), "utf8");

describe("Sicherheitsbasis: Zugang und Reset", () => {
  it("liefert weder ein Sitzungs-JWT noch ein Reset-Token an den Browser zurück", () => {
    const resetBlock = router.slice(router.indexOf("requestPasswordReset:"), router.indexOf("validateResetToken:"));
    const loginBlock = router.slice(router.indexOf("login: publicProcedure"), router.indexOf("logout: publicProcedure"));
    expect(resetBlock).not.toContain("resetToken:");
    expect(resetBlock).not.toContain("mitarbeiterName:");
    expect(loginBlock).not.toMatch(/passwortWechselErforderlich[^\n]*, token/);
    expect(login).not.toContain("data.resetToken");
    expect(main).not.toContain("Authorization: `Bearer ${token}`");
  });

  it("setzt sichere 12-Stunden-Sitzungen und echte Reset-Rate-Limit-Pfade ein", () => {
    expect(auth).toContain('setExpirationTime(options?.expiresIn ?? "12h")');
    expect(router).toContain("maxAge: 12 * 60 * 60 * 1000");
    expect(index).toContain('"/api/trpc/portal.requestPasswordReset"');
    expect(index).toContain('"/api/trpc/portal.resetPassword"');
    expect(router).toContain("ERLAUBTE_PORTAL_ORIGINS");
    expect(router).toContain("ermittleSicherePortalUrl(ctx.req)");
  });

  it("stellt den Reset-Link nur in einer HTML-sicheren E-Mail bereit", () => {
    const email = buildPasswortResetEmail({ name: "<Test>", link: "https://portal.test/?x=<wert>" });
    expect(email).toContain("&lt;Test&gt;");
    expect(email).toContain("https://portal.test/?x=&lt;wert&gt;");
    expect(email).toContain("einmalig und zeitlich begrenzt");
    expect(router).toContain("if (!versand.success)");
    expect(router).toContain("await markPasswordResetTokenUsed(token)");
  });
});

describe("Sicherheitsbasis: personenbezogene Verfahren", () => {
  it("schützt Führerschein- und Neukundenanlage mit Portal-Anmeldung", () => {
    const fuehrerschein = router.slice(router.indexOf("fuehrerschein: router"), router.indexOf("neukundenaufnahme: router"));
    const neukunden = router.slice(router.indexOf("neukundenaufnahme: router"), router.indexOf("kassenanfrage: router"));
    expect(fuehrerschein).toContain("list: portalProtected");
    expect(fuehrerschein).toContain("create: portalProtected");
    expect(neukunden).toContain("create: portalProtected");
    expect(fuehrerschein).toContain('getFuehrerscheinChecks("alle")');
  });

  it("liefert Mitarbeitenden bei paginierten Kundenlisten nur ihre Zuteilungen", () => {
    const kundenBereich = router.slice(router.indexOf("listPaginiert:"), router.indexOf("export: adminProcedure"));
    expect(kundenBereich).toContain('ctx.portalMitarbeiter.rolle');
    expect(kundenBereich).toContain('getKundenByMitarbeiter(ctx.mitarbeiterId)');
    expect(kundenBereich).toContain('getKundenPaginiert(input.seite, input.proSeite)');
  });

  it("protokolliert sensible Kundenlesevorgänge ohne Inhaltsdaten", () => {
    const kundenBereich = router.slice(router.indexOf("kunden: router"), router.indexOf("einsatzplanung:"));
    expect(kundenBereich).toContain('ressource: "kunde_liste"');
    expect(kundenBereich).toContain('ressource: "kunde_detail"');
    expect(kundenBereich).toContain('details: `kundeId=${input.id}`');
  });

  it("bindet Benachrichtigungen an den Empfänger und archiviert Fahrten statt sie regulär zu vernichten", () => {
    expect(db).toContain("markNotificationRead(id: number, empfaengerId: number)");
    expect(db).toContain("eq(notifications.empfaengerId, empfaengerId)");
    expect(db).toContain("softDeleteFahrt(id: number, geloeschtVon: number)");
    expect(db).toContain("set({ geloeschtAt: new Date(), geloeschtVon })");
    expect(router).toContain("await markNotificationRead(input.id, ctx.mitarbeiterId)");
    expect(router).toContain("await softDeleteFahrt(input.id, ctx.mitarbeiterId)");
  });

  it("begrenzt direkte Medienuploads auf dokumentierte Formate und protokolliert sie", () => {
    expect(index).toContain('"image/jpeg", "image/png", "image/webp"');
    expect(index).toContain('"audio/webm", "audio/mpeg", "audio/wav", "audio/ogg", "audio/mp4", "audio/x-m4a"');
    expect(index).toContain('ressource: "foto_upload"');
    expect(index).toContain('ressource: "audio_upload"');
  });
});
