import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";
import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import {
  getMitarbeiterByEmail,
  getMitarbeiterById,
  getAllMitarbeiter,
  createMitarbeiter,
  updateMitarbeiter,
  getAllKunden,
  getKundeById,
  createKunde,
  updateKunde,
  getKundenByMitarbeiter,
  setKundenZuordnung,
  getZuordnungenForMitarbeiter,
  getEinsaetzeByMitarbeiter,
  getAllEinsaetze,
  getEinsaetzeByKunde,
  createEinsatz,
  updateEinsatzStatus,
  getLeistungenByMitarbeiter,
  getAllLeistungen,
  getLeistungenByKunde,
  createLeistung,
  updateLeistungStatus,
  getFahrtenByMitarbeiter,
  getAllFahrten,
  getFahrtenByKunde,
  getFahrtenByMonat,
  createFahrt,
  updateFahrtStatus,
  createAuditLog,
  getAuditLogs,
  getMonatsabschluesse,
  createMonatsabschluss,
  getMonatsStatistik,
  createPasswordResetToken,
  getValidPasswordResetToken,
  markPasswordResetTokenUsed,
  updateMitarbeiterPasswort,
  updateKundeBudget,
  getKundenMitBudgetWarnung,
  getAllKostentraeger,
  searchKostentraeger,
  getKostentraegerById,
  createKostentraeger,
  updateKostentraeger,
  getAllTextbausteine,
  createTextbaustein,
  updateTextbaustein,
  deleteTextbaustein,
  createEBriefLog,
  getEBriefLogs,
  getEbriefLog,
  getEbriefLogByKunde,
  getPflegegradBudgets,
  getLeistungenFuerExport,
  getFahrtenFuerExport,
  getFuehrerscheinChecks,
  createFuehrerscheinCheck,
  updateFuehrerscheinStatus,
  getAllNeukundenaufnahmen,
  createNeukundenaufnahme,
  updateNeukundenaufnahmeStatus,
} from "./db";
import { SignJWT, jwtVerify } from "jose";
import { ENV } from "./_core/env";
import { VAPID_PUBLIC, sendBudgetWarnungPush } from "./webpush";
import {
  savePushSubscription,
  deletePushSubscription,
  getAllPushSubscriptions,
  getPushSubscriptionsByMitarbeiter,
  getAllKassenanfragen,
  getKassenanfragenByKunde,
  createKassenanfrage,
  updateKassenanfrageStatus,
} from "./db";

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || "lebenswert-secret-key");
const PORTAL_COOKIE = "lb_portal_token";

async function signPortalToken(mitarbeiterId: number) {
  return new SignJWT({ mitarbeiterId })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("30d")
    .sign(JWT_SECRET);
}

async function verifyPortalToken(token: string): Promise<number | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return (payload as { mitarbeiterId: number }).mitarbeiterId;
  } catch {
    return null;
  }
}

const portalProcedure = publicProcedure.use(async ({ ctx, next }) => {
  let token = ctx.req.cookies?.[PORTAL_COOKIE];
  if (!token) {
    const authHeader = ctx.req.headers?.['authorization'] as string | undefined;
    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.slice(7);
    }
  }
  let mitarbeiterId: number | null = null;
  if (token) mitarbeiterId = await verifyPortalToken(token);
  return next({ ctx: { ...ctx, mitarbeiterId } });
});

const portalProtected = portalProcedure.use(async ({ ctx, next }) => {
  if (!ctx.mitarbeiterId) throw new Error("Nicht angemeldet");
  return next({ ctx: { ...ctx, mitarbeiterId: ctx.mitarbeiterId as number } });
});

const adminProcedure = portalProtected.use(async ({ ctx, next }) => {
  const ma = await getMitarbeiterById(ctx.mitarbeiterId);
  if (!ma || ma.rolle !== "admin") throw new Error("Keine Admin-Berechtigung");
  return next({ ctx: { ...ctx, adminId: ctx.mitarbeiterId } });
});

export const appRouter = router({
  system: systemRouter,

  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  portal: router({
    login: publicProcedure
      .input(z.object({ email: z.string().email(), passwort: z.string().min(1) }))
      .mutation(async ({ input, ctx }) => {
        const ma = await getMitarbeiterByEmail(input.email);
        if (!ma) throw new Error("E-Mail oder Passwort ungültig.");
        const valid = await bcrypt.compare(input.passwort, ma.passwortHash);
        if (!valid) throw new Error("E-Mail oder Passwort ungültig.");
        const token = await signPortalToken(ma.id);
        const isSecure = ctx.req.secure || ctx.req.headers['x-forwarded-proto'] === 'https';
        ctx.res.cookie(PORTAL_COOKIE, token, {
          httpOnly: true,
          secure: isSecure,
          sameSite: isSecure ? 'none' : 'lax',
          path: '/',
          maxAge: 30 * 24 * 60 * 60 * 1000,
        });
        await createAuditLog({ mitarbeiterId: ma.id, action: "LOGIN", ressource: "portal", status: "success" });
        return { id: ma.id, vorname: ma.vorname, nachname: ma.nachname, email: ma.email, rolle: ma.rolle, token };
      }),

    logout: publicProcedure.mutation(async ({ ctx }) => {
      const token = ctx.req.cookies?.[PORTAL_COOKIE];
      if (token) {
        const id = await verifyPortalToken(token);
        if (id) await createAuditLog({ mitarbeiterId: id, action: "LOGOUT", ressource: "portal", status: "success" });
      }
      ctx.res.clearCookie(PORTAL_COOKIE, { path: "/" });
      return { success: true };
    }),

    me: portalProcedure.query(async ({ ctx }) => {
      if (!ctx.mitarbeiterId) return null;
      const ma = await getMitarbeiterById(ctx.mitarbeiterId);
      if (!ma) return null;
      return { id: ma.id, vorname: ma.vorname, nachname: ma.nachname, email: ma.email, rolle: ma.rolle };
    }),

    requestPasswordReset: publicProcedure
      .input(z.object({ email: z.string().email() }))
      .mutation(async ({ input }) => {
        const ma = await getMitarbeiterByEmail(input.email.trim().toLowerCase());
        if (!ma) return { success: true, message: "Falls die E-Mail registriert ist, wurde ein Reset-Link erstellt." };
        const token = nanoid(64);
        await createPasswordResetToken(ma.id, token);
        await createAuditLog({ mitarbeiterId: ma.id, action: "PASSWORD_RESET_REQUEST", ressource: "portal", status: "success" });
        return {
          success: true,
          message: "Reset-Link wurde erstellt.",
          resetToken: token,
          mitarbeiterName: `${ma.vorname} ${ma.nachname}`,
        };
      }),

    validateResetToken: publicProcedure
      .input(z.object({ token: z.string().min(1) }))
      .query(async ({ input }) => {
        const reset = await getValidPasswordResetToken(input.token);
        if (!reset) return { valid: false };
        const ma = await getMitarbeiterById(reset.mitarbeiterId);
        return { valid: true, email: ma?.email ?? "", vorname: ma?.vorname ?? "" };
      }),

    resetPassword: publicProcedure
      .input(z.object({
        token: z.string().min(1),
        neuesPasswort: z.string().min(6, "Passwort muss mindestens 6 Zeichen haben"),
      }))
      .mutation(async ({ input }) => {
        const reset = await getValidPasswordResetToken(input.token);
        if (!reset) throw new Error("Ungültiger oder abgelaufener Reset-Link.");
        const hash = await bcrypt.hash(input.neuesPasswort, 10);
        await updateMitarbeiterPasswort(reset.mitarbeiterId, hash);
        await markPasswordResetTokenUsed(input.token);
        await createAuditLog({ mitarbeiterId: reset.mitarbeiterId, action: "PASSWORD_RESET_DONE", ressource: "portal", status: "success" });
        return { success: true };
      }),
  }),

  // ── KUNDEN ───────────────────────────────────────────
  kunden: router({
    list: portalProtected.query(async () => getAllKunden()),

    detail: portalProtected
      .input(z.object({ id: z.number().int().positive() }))
      .query(async ({ input }) => {
        const [kunde, eis, leis, fahr] = await Promise.all([
          getKundeById(input.id),
          getEinsaetzeByKunde(input.id),
          getLeistungenByKunde(input.id),
          getFahrtenByKunde(input.id),
        ]);
        return { kunde, einsaetze: eis, leistungen: leis, fahrten: fahr };
      }),

    create: adminProcedure
      .input(z.object({
        vorname: z.string().min(1),
        nachname: z.string().min(1),
        adresse: z.string().optional(),
        telefon: z.string().optional(),
        pflegegrad: z.number().int().min(1).max(5).optional(),
        paragraph: z.enum(["45b", "45a", "39", "privat"]).optional(),
        kostentraegerId: z.number().int().positive().optional().nullable(),
        versicherungsnummer: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        await createKunde({ ...input, aktiv: 1 });
        return { success: true };
      }),

    update: adminProcedure
      .input(z.object({
        id: z.number().int().positive(),
        vorname: z.string().min(1).optional(),
        nachname: z.string().min(1).optional(),
        adresse: z.string().optional(),
        telefon: z.string().optional(),
        pflegegrad: z.number().int().min(1).max(5).optional(),
        paragraph: z.enum(["45b", "45a", "39", "privat"]).optional(),
        aktiv: z.number().int().optional(),
        kostentraegerId: z.number().int().positive().optional().nullable(),
        versicherungsnummer: z.string().optional(),
        vollmachtErteilt: z.boolean().optional(),
        vollmachtDatum: z.string().optional(),
        vollmachtSignatur: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await updateKunde(id, data as any);
        return { success: true };
      }),

    updateBudget: adminProcedure
      .input(z.object({
        id: z.number().int().positive(),
        budget45b: z.string().optional(),
        verbraucht45b: z.string().optional(),
        letzteAbrechnung45b: z.string().optional(),
        budget45a: z.string().optional(),
        verbraucht45a: z.string().optional(),
        letzteAbrechnung45a: z.string().optional(),
        budget39: z.string().optional(),
        verbraucht39: z.string().optional(),
        letzteAbrechnung39: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { id, ...data } = input;
        await updateKundeBudget(id, data);
        await createAuditLog({ mitarbeiterId: ctx.mitarbeiterId, action: "UPDATE", ressource: "budget", details: `kundenId=${id}`, status: "success" });
        return { success: true };
      }),

    budgetWarnungen: portalProtected.query(async () => {
      const warnungen = await getKundenMitBudgetWarnung();
      return warnungen.map(k => ({
        id: k.id,
        vorname: k.vorname,
        nachname: k.nachname,
        pflegegrad: k.pflegegrad,
        budget45b: k.budget45b,
        verbraucht45b: k.verbraucht45b,
        budget45a: k.budget45a,
        verbraucht45a: k.verbraucht45a,
        budget39: k.budget39,
        verbraucht39: k.verbraucht39,
      }));
    }),
  }),

  // ── EINSÄTZE ─────────────────────────────────────────
  einsaetze: router({
    list: portalProtected.query(async ({ ctx }) => {
      const ma = await getMitarbeiterById(ctx.mitarbeiterId);
      if (ma?.rolle === "admin") return getAllEinsaetze();
      return getEinsaetzeByMitarbeiter(ctx.mitarbeiterId);
    }),

    create: portalProtected
      .input(z.object({
        kundenId: z.number().int().positive(),
        datum: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        startzeit: z.string().optional(),
        dauerStunden: z.number().min(0.5).optional(),
        paragraph: z.enum(["45b", "45a", "39"]),
      }))
      .mutation(async ({ input, ctx }) => {
        await createEinsatz({ ...input, mitarbeiterId: ctx.mitarbeiterId } as any);
        await createAuditLog({ mitarbeiterId: ctx.mitarbeiterId, action: "CREATE", ressource: "einsatz", status: "success" });
        return { success: true };
      }),

    updateStatus: portalProtected
      .input(z.object({
        id: z.number().int().positive(),
        status: z.enum(["abgeschlossen", "abgesagt"]),
        bericht: z.string().optional(),
        gesundheit: z.enum(["gut", "stabil", "auffaellig", "kritisch"]).optional(),
        bemerkung: z.string().optional(),
        unterschriftMitarbeiter: z.string().optional(),
        unterschriftKunde: z.string().optional(),
        textbausteinIds: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        await updateEinsatzStatus(input.id, ctx.mitarbeiterId, input);
        await createAuditLog({ mitarbeiterId: ctx.mitarbeiterId, action: "UPDATE", ressource: "einsatz", details: `id=${input.id} status=${input.status}`, status: "success" });

        // Automatischer Push bei Budget-Warnung nach Einsatz-Abschluss
        if (input.status === "abgeschlossen") {
          try {
            const warnungen = await getKundenMitBudgetWarnung();
            if (warnungen.length > 0) {
              const subs = await getAllPushSubscriptions();
              if (subs.length > 0) {
                for (const kunde of warnungen) {
                  await sendBudgetWarnungPush(
                    subs as any[],
                    `${kunde.vorname} ${kunde.nachname}`,
                    (kunde as any).paragraph || "45b",
                    parseFloat(String((kunde as any).restbudget || 0))
                  );
                }
              }
            }
          } catch (pushErr) {
            console.warn("[Push] Budget-Warnung fehlgeschlagen:", pushErr);
          }
        }

        return { success: true };
      }),
  }),

  // ── LEISTUNGEN ───────────────────────────────────────
  leistungen: router({
    list: portalProtected.query(async ({ ctx }) => {
      const ma = await getMitarbeiterById(ctx.mitarbeiterId);
      if (ma?.rolle === "admin") return getAllLeistungen();
      return getLeistungenByMitarbeiter(ctx.mitarbeiterId);
    }),

    create: portalProtected
      .input(z.object({
        kundenId: z.number().int().positive(),
        monat: z.string().regex(/^\d{4}-\d{2}$/),
        paragraph: z.enum(["45b", "45a", "39"]),
        stunden: z.number().min(0.5),
        anzahlEinsaetze: z.number().int().min(1),
        bemerkung: z.string().optional(),
        unterschriftLeister: z.string().optional(),
        unterschriftKunde: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        await createLeistung({ ...input, mitarbeiterId: ctx.mitarbeiterId } as any);
        await createAuditLog({ mitarbeiterId: ctx.mitarbeiterId, action: "CREATE", ressource: "leistung", status: "success" });
        return { success: true };
      }),

    updateStatus: adminProcedure
      .input(z.object({
        id: z.number().int().positive(),
        status: z.enum(["offen", "pruefung", "freigegeben", "versendet"]),
      }))
      .mutation(async ({ input, ctx }) => {
        await updateLeistungStatus(input.id, input.status);
        await createAuditLog({ mitarbeiterId: ctx.adminId, action: "UPDATE", ressource: "leistung", details: `id=${input.id} status=${input.status}`, status: "success" });
        return { success: true };
      }),
  }),

  // ── FAHRTEN ──────────────────────────────────────────
  fahrten: router({
    list: portalProtected.query(async ({ ctx }) => {
      const ma = await getMitarbeiterById(ctx.mitarbeiterId);
      if (ma?.rolle === "admin") return getAllFahrten();
      return getFahrtenByMitarbeiter(ctx.mitarbeiterId);
    }),

    byMonat: adminProcedure
      .input(z.object({ monat: z.string().regex(/^\d{4}-\d{2}$/) }))
      .query(async ({ input }) => getFahrtenByMonat(input.monat)),

    create: portalProtected
      .input(z.object({
        datum: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        vonOrt: z.string().min(1),
        nachOrt: z.string().min(1),
        kilometer: z.number().positive(),
        typ: z.enum(["normal", "sonder"]),
        kundenId: z.number().int().positive().optional().nullable(),
        zweck: z.string().optional(),
        kilometerHin: z.number().optional(),
        kilometerRueck: z.number().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        await createFahrt({ ...input, mitarbeiterId: ctx.mitarbeiterId } as any);
        await createAuditLog({ mitarbeiterId: ctx.mitarbeiterId, action: "CREATE", ressource: "fahrt", status: "success" });
        return { success: true };
      }),

    updateStatus: adminProcedure
      .input(z.object({
        id: z.number().int().positive(),
        status: z.enum(["offen", "eingereicht", "erstattet"]),
      }))
      .mutation(async ({ input, ctx }) => {
        await updateFahrtStatus(input.id, input.status);
        await createAuditLog({ mitarbeiterId: ctx.adminId, action: "UPDATE", ressource: "fahrt", details: `id=${input.id} status=${input.status}`, status: "success" });
        return { success: true };
      }),
  }),

  // ── MODUL 1: KOSTENTRÄGER ─────────────────────────────
  kostentraeger: router({
    list: portalProtected.query(async () => getAllKostentraeger()),

    search: portalProtected
      .input(z.object({ query: z.string().min(1) }))
      .query(async ({ input }) => searchKostentraeger(input.query)),

    detail: portalProtected
      .input(z.object({ id: z.number().int().positive() }))
      .query(async ({ input }) => getKostentraegerById(input.id)),

    create: adminProcedure
      .input(z.object({
        name: z.string().min(1),
        ikNummer: z.string().optional(),
        typ: z.enum(["pflegekasse", "krankenkasse", "beihilfe", "privat", "sonstige"]).default("pflegekasse"),
        strasse: z.string().optional(),
        plz: z.string().optional(),
        ort: z.string().optional(),
        telefon: z.string().optional(),
        email: z.string().email().optional().or(z.literal("")),
        fax: z.string().optional(),
        abrechnungsart: z.enum(["dta", "email", "ebrief", "post", "manuell"]).optional(),
        notizen: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        await createKostentraeger({ ...input, aktiv: 1 });
        await createAuditLog({ mitarbeiterId: ctx.adminId, action: "CREATE", ressource: "kostentraeger", details: `name=${input.name}`, status: "success" });
        return { success: true };
      }),

    update: adminProcedure
      .input(z.object({
        id: z.number().int().positive(),
        name: z.string().min(1).optional(),
        ikNummer: z.string().optional(),
        typ: z.enum(["pflegekasse", "krankenkasse", "beihilfe", "privat", "sonstige"]).optional(),
        strasse: z.string().optional(),
        plz: z.string().optional(),
        ort: z.string().optional(),
        telefon: z.string().optional(),
        email: z.string().optional(),
        fax: z.string().optional(),
        abrechnungsart: z.enum(["dta", "email", "ebrief", "post", "manuell"]).optional(),
        notizen: z.string().optional(),
        aktiv: z.number().int().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { id, ...data } = input;
        await updateKostentraeger(id, data as any);
        await createAuditLog({ mitarbeiterId: ctx.adminId, action: "UPDATE", ressource: "kostentraeger", details: `id=${id}`, status: "success" });
        return { success: true };
      }),
  }),

  // ── MODUL 3: TEXTBAUSTEINE ────────────────────────────
  textbausteine: router({
    list: portalProtected.query(async () => getAllTextbausteine()),

    create: adminProcedure
      .input(z.object({
        titel: z.string().min(1),
        inhalt: z.string().min(1),
        kategorie: z.enum(["bericht", "gesundheit", "aktivitaet", "bemerkung", "sonstiges"]).default("bericht"),
        paragraph: z.enum(["45b", "45a", "39", "alle"]).default("alle"),
      }))
      .mutation(async ({ input, ctx }) => {
        await createTextbaustein({ ...input, aktiv: 1 });
        await createAuditLog({ mitarbeiterId: ctx.adminId, action: "CREATE", ressource: "textbaustein", status: "success" });
        return { success: true };
      }),

    update: adminProcedure
      .input(z.object({
        id: z.number().int().positive(),
        titel: z.string().min(1).optional(),
        inhalt: z.string().min(1).optional(),
        kategorie: z.enum(["bericht", "gesundheit", "aktivitaet", "bemerkung", "sonstiges"]).optional(),
        paragraph: z.enum(["45b", "45a", "39", "alle"]).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { id, ...data } = input;
        await updateTextbaustein(id, data as any);
        await createAuditLog({ mitarbeiterId: ctx.adminId, action: "UPDATE", ressource: "textbaustein", details: `id=${id}`, status: "success" });
        return { success: true };
      }),

    delete: adminProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(async ({ input, ctx }) => {
        await deleteTextbaustein(input.id);
        await createAuditLog({ mitarbeiterId: ctx.adminId, action: "DELETE", ressource: "textbaustein", details: `id=${input.id}`, status: "success" });
        return { success: true };
      }),
  }),

  // ── MODUL 5: E-BRIEF ─────────────────────────────────
  ebrief: router({
    list: adminProcedure
      .input(z.object({ limit: z.number().int().min(1).max(500).default(100) }))
      .query(async ({ input }) => getEbriefLog(input.limit)),

    byKunde: portalProtected
      .input(z.object({ kundenId: z.number().int().positive() }))
      .query(async ({ input }) => getEbriefLogByKunde(input.kundenId)),

    send: portalProtected
      .input(z.object({
        kundenId: z.number().int().positive().optional(),
        kostentraegerId: z.number().int().positive().optional(),
        betreff: z.string().min(1),
        inhalt: z.string().min(1),
        empfaenger: z.string().min(1),
        typ: z.enum(["leistungsnachweis", "protokoll", "kostenvoranschlag", "sonstiges"]).default("sonstiges"),
        versandart: z.enum(["email", "ebrief", "post"]).default("email"),
        referenzId: z.number().int().positive().optional(),
        referenzTyp: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        await createEBriefLog({
          ...input,
          mitarbeiterId: ctx.mitarbeiterId,
          status: "versendet",
        } as any);
        await createAuditLog({
          mitarbeiterId: ctx.mitarbeiterId,
          action: "EXPORT",
          ressource: "ebrief",
          details: `empfaenger=${input.empfaenger} betreff=${input.betreff}`,
          status: "success",
        });
        return { success: true };
      }),
  }),

  // ── MODUL 6: MASSEN-EXPORT ────────────────────────────
  export: router({
    monatspaket: adminProcedure
      .input(z.object({ monat: z.string().regex(/^\d{4}-\d{2}$/) }))
      .query(async ({ input }) => {
        const [eis, leis, fahr, maList, kundenList] = await Promise.all([
          getAllEinsaetze(),
          getAllLeistungen(),
          getAllFahrten(),
          getAllMitarbeiter(),
          getAllKunden(),
        ]);

        const monEis = eis.filter((e) => {
          const d = typeof e.datum === "string" ? e.datum : (e.datum as Date).toISOString().split("T")[0];
          return d?.slice(0, 7) === input.monat;
        });
        const monLeis = leis.filter((l) => l.monat === input.monat);
        const monFahr = fahr.filter((f) => {
          const d = typeof f.datum === "string" ? f.datum : (f.datum as Date).toISOString().split("T")[0];
          return d?.slice(0, 7) === input.monat;
        });

        // Einsätze CSV
        const einsaetzeCsv = [
          "Mitarbeiter;Datum;Kunde;Paragraph;Stunden;Status;Gesundheit;Bericht",
          ...monEis.map((e) => {
            const ma = maList.find((m) => m.id === e.mitarbeiterId);
            const k = kundenList.find((c) => c.id === e.kundenId);
            const d = typeof e.datum === "string" ? e.datum : (e.datum as Date).toISOString().split("T")[0];
            return `${ma?.nachname ?? ""} ${ma?.vorname ?? ""};${d};${k?.nachname ?? ""} ${k?.vorname ?? ""};§${e.paragraph} SGB XI;${e.dauerStunden ?? 0};${e.status};${e.gesundheit ?? ""};${(e.bericht ?? "").replace(/;/g, ",")}`;
          }),
        ].join("\n");

        // Leistungsnachweise CSV
        const leistungenCsv = [
          "Mitarbeiter;Kunde;Monat;Paragraph;Stunden;Einsätze;Betrag (€);Status",
          ...monLeis.map((l) => {
            const ma = maList.find((m) => m.id === l.mitarbeiterId);
            const k = kundenList.find((c) => c.id === l.kundenId);
            return `${ma?.nachname ?? ""} ${ma?.vorname ?? ""};${k?.nachname ?? ""} ${k?.vorname ?? ""};${l.monat};§${l.paragraph} SGB XI;${l.stunden ?? 0};${l.anzahlEinsaetze ?? 0};${l.betrag ?? 0};${l.status}`;
          }),
        ].join("\n");

        // Fahrtkosten CSV
        const fahrenCsv = [
          "Mitarbeiter;Datum;Von;Nach;Kilometer;Typ;Vergütung (€);Status",
          ...monFahr.map((f) => {
            const ma = maList.find((m) => m.id === f.mitarbeiterId);
            const d = typeof f.datum === "string" ? f.datum : (f.datum as Date).toISOString().split("T")[0];
            return `${ma?.nachname ?? ""} ${ma?.vorname ?? ""};${d};${f.vonOrt};${f.nachOrt};${f.kilometer};${f.typ};${f.verguetung ?? 0};${(f as any).abrechnungsStatus ?? "offen"}`;
          }),
        ].join("\n");

        const gesamtStunden = monEis.reduce((s, e) => s + parseFloat(String(e.dauerStunden ?? 0)), 0);
        const gesamtKm = monFahr.reduce((s, f) => s + parseFloat(String(f.kilometer ?? 0)), 0);
        const gesamtVerguetung = monFahr.reduce((s, f) => s + parseFloat(String(f.verguetung ?? 0)), 0);
        const gesamtBetrag = monLeis.reduce((s, l) => s + parseFloat(String(l.betrag ?? 0)), 0);

        return {
          monat: input.monat,
          stats: {
            einsaetze: monEis.length,
            stunden: Math.round(gesamtStunden * 100) / 100,
            leistungen: monLeis.length,
            betrag: Math.round(gesamtBetrag * 100) / 100,
            fahrten: monFahr.length,
            km: Math.round(gesamtKm * 10) / 10,
            verguetung: Math.round(gesamtVerguetung * 100) / 100,
          },
          csv: {
            einsaetze: einsaetzeCsv,
            leistungen: leistungenCsv,
            fahrten: fahrenCsv,
          },
        };
      }),
  }),

  // ── ADMIN ─────────────────────────────────────────────
  admin: router({
    mitarbeiterList: adminProcedure.query(async () => getAllMitarbeiter()),

    mitarbeiterCreate: adminProcedure
      .input(z.object({
        vorname: z.string().min(1),
        nachname: z.string().min(1),
        email: z.string().email(),
        passwort: z.string().min(6),
        rolle: z.enum(["mitarbeiter", "admin"]).default("mitarbeiter"),
        telefon: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const hash = await bcrypt.hash(input.passwort, 10);
        await createMitarbeiter({ ...input, passwortHash: hash, aktiv: 1 });
        await createAuditLog({ mitarbeiterId: ctx.adminId, action: "ADMIN", ressource: "mitarbeiter", details: `create ${input.email}`, status: "success" });
        return { success: true };
      }),

    mitarbeiterUpdate: adminProcedure
      .input(z.object({
        id: z.number().int().positive(),
        vorname: z.string().min(1).optional(),
        nachname: z.string().min(1).optional(),
        email: z.string().email().optional(),
        rolle: z.enum(["mitarbeiter", "admin"]).optional(),
        aktiv: z.number().int().optional(),
        telefon: z.string().optional(),
        neuesPasswort: z.string().min(6).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { id, neuesPasswort, ...data } = input;
        const updateData: Record<string, unknown> = { ...data };
        if (neuesPasswort) updateData.passwortHash = await bcrypt.hash(neuesPasswort, 10);
        await updateMitarbeiter(id, updateData as any);
        await createAuditLog({ mitarbeiterId: ctx.adminId, action: "ADMIN", ressource: "mitarbeiter", details: `update id=${id}`, status: "success" });
        return { success: true };
      }),

    getZuordnung: adminProcedure
      .input(z.object({ mitarbeiterId: z.number().int().positive() }))
      .query(async ({ input }) => getZuordnungenForMitarbeiter(input.mitarbeiterId)),

    setZuordnung: adminProcedure
      .input(z.object({
        mitarbeiterId: z.number().int().positive(),
        kundenIds: z.array(z.number().int().positive()),
      }))
      .mutation(async ({ input, ctx }) => {
        await setKundenZuordnung(input.mitarbeiterId, input.kundenIds);
        await createAuditLog({ mitarbeiterId: ctx.adminId, action: "ADMIN", ressource: "zuordnung", details: `ma=${input.mitarbeiterId} kunden=${input.kundenIds.join(",")}`, status: "success" });
        return { success: true };
      }),

    statistik: adminProcedure
      .input(z.object({ monat: z.string().regex(/^\d{4}-\d{2}$/) }))
      .query(async ({ input }) => getMonatsStatistik(input.monat)),

    monatsabschluesse: adminProcedure.query(async () => getMonatsabschluesse()),

    monatsabschluss: adminProcedure
      .input(z.object({ monat: z.string().regex(/^\d{4}-\d{2}$/) }))
      .mutation(async ({ input, ctx }) => {
        const [eis, leis, fahr, maList] = await Promise.all([
          getAllEinsaetze(),
          getAllLeistungen(),
          getAllFahrten(),
          getAllMitarbeiter(),
        ]);

        const monEis = eis.filter((e) => {
          const d = typeof e.datum === "string" ? e.datum : (e.datum as Date).toISOString().split("T")[0];
          return d?.slice(0, 7) === input.monat;
        });
        const monLeis = leis.filter((l) => l.monat === input.monat);
        const monFahr = fahr.filter((f) => {
          const d = typeof f.datum === "string" ? f.datum : (f.datum as Date).toISOString().split("T")[0];
          return d?.slice(0, 7) === input.monat;
        });

        const gesamtStunden = monEis.reduce((s, e) => s + parseFloat(String(e.dauerStunden ?? 0)), 0);
        const gesamtKm = monFahr.reduce((s, f) => s + parseFloat(String(f.kilometer ?? 0)), 0);
        const gesamtVerguetung = monFahr.reduce((s, f) => s + parseFloat(String(f.verguetung ?? 0)), 0);

        const csvRows = [
          "Mitarbeiter;Datum;Kunde;Paragraph;Stunden;Status",
          ...monEis.map((e) => {
            const ma = maList.find((m) => m.id === e.mitarbeiterId);
            const d = typeof e.datum === "string" ? e.datum : (e.datum as Date).toISOString().split("T")[0];
            return `${ma?.nachname ?? ""} ${ma?.vorname ?? ""};${d};${e.kundenId};§${e.paragraph} SGB XI;${e.dauerStunden ?? 0};${e.status}`;
          }),
        ];
        const csvExport = csvRows.join("\n");

        await createMonatsabschluss({
          monat: input.monat,
          adminId: ctx.adminId,
          gesamtStunden,
          gesamtEinsaetze: monEis.length,
          gesamtKm,
          gesamtVerguetung,
          csvExport,
        });

        await createAuditLog({ mitarbeiterId: ctx.adminId, action: "EXPORT", ressource: "monatsabschluss", details: `monat=${input.monat}`, status: "success" });
        return { success: true, csvExport, stats: { einsaetze: monEis.length, stunden: gesamtStunden, km: gesamtKm, verguetung: gesamtVerguetung } };
      }),

    mitarbeiterDetail: adminProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .query(async ({ input }) => getMitarbeiterById(input.id)),

    updateZertifikat: adminProcedure
      .input(z.object({
        id: z.number().int().positive(),
        zertifikatStatus: z.enum(["erhalten", "angemeldet", "nicht_angemeldet"]),
        zertifikatDatum: z.string().optional(),
        zertifikatAblauf: z.string().optional(),
        zertifikatBemerkung: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { id, ...data } = input;
        await updateMitarbeiter(id, data as any);
        await createAuditLog({ mitarbeiterId: ctx.adminId, action: "ADMIN", ressource: "zertifikat", details: `ma=${id} status=${data.zertifikatStatus}`, status: "success" });
        return { success: true };
      }),

    updateStammdaten: adminProcedure
      .input(z.object({
        id: z.number().int().positive(),
        vorname: z.string().min(1).optional(),
        nachname: z.string().min(1).optional(),
        email: z.string().email().optional(),
        telefon: z.string().optional(),
        mobil: z.string().optional(),
        strasse: z.string().optional(),
        plz: z.string().optional(),
        ort: z.string().optional(),
        geburtsdatum: z.string().optional(),
        eintrittsdatum: z.string().optional(),
        position: z.string().optional(),
        beschaeftigungsart: z.enum(["minijob", "teilzeit", "vollzeit"]).optional(),
        rolle: z.enum(["mitarbeiter", "admin"]).optional(),
        aktiv: z.number().int().optional(),
        notizen: z.string().optional(),
        neuesPasswort: z.string().min(6).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { id, neuesPasswort, ...data } = input;
        const updateData: Record<string, unknown> = { ...data };
        if (neuesPasswort) updateData.passwortHash = await bcrypt.hash(neuesPasswort, 10);
        await updateMitarbeiter(id, updateData as any);
        await createAuditLog({ mitarbeiterId: ctx.adminId, action: "ADMIN", ressource: "mitarbeiter", details: `stammdaten update id=${id}`, status: "success" });
        return { success: true };
      }),

    updateArbeitsvertrag: adminProcedure
      .input(z.object({
        id: z.number().int().positive(),
        arbeitsvertragUrl: z.string().url(),
        arbeitsvertragDateiname: z.string(),
        arbeitsvertragDatum: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { id, ...data } = input;
        await updateMitarbeiter(id, data as any);
        await createAuditLog({ mitarbeiterId: ctx.adminId, action: "ADMIN", ressource: "arbeitsvertrag", details: `ma=${id} datei=${data.arbeitsvertragDateiname}`, status: "success" });
        return { success: true };
      }),

    getUploadUrl: adminProcedure
      .input(z.object({
        mitarbeiterId: z.number().int().positive(),
        dateiname: z.string().min(1),
        contentType: z.string().default("application/pdf"),
      }))
      .mutation(async ({ input, ctx }) => {
        const { storagePut } = await import("./storage");
        const key = `arbeitsvertraege/ma-${input.mitarbeiterId}/${Date.now()}-${input.dateiname}`;
        const { url } = await storagePut(key, Buffer.from(""), input.contentType);
        await createAuditLog({ mitarbeiterId: ctx.adminId, action: "ADMIN", ressource: "arbeitsvertrag", details: `upload-url ma=${input.mitarbeiterId}`, status: "success" });
        return { uploadUrl: url, key };
      }),

    auditLogs: adminProcedure
      .input(z.object({ limit: z.number().int().min(1).max(500).default(200) }))
      .query(async ({ input }) => getAuditLogs(input.limit)),

    // ── KOSTENTRÄGER ──────────────────────────────────
    kostentraegerList: adminProcedure.query(async () => getAllKostentraeger()),

    kostentraegerSearch: adminProcedure
      .input(z.object({ query: z.string().min(1) }))
      .query(async ({ input }) => searchKostentraeger(input.query)),

    kostentraegerCreate: adminProcedure
      .input(z.object({
        name: z.string().min(1),
        kurzname: z.string().optional(),
        ikNummer: z.string().optional(),
        typ: z.enum(["pflegekasse", "krankenkasse", "privat", "sonstige"]).default("pflegekasse"),
        strasse: z.string().optional(),
        plz: z.string().optional(),
        ort: z.string().optional(),
        telefon: z.string().optional(),
        fax: z.string().optional(),
        email: z.string().email().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        await createKostentraeger({ ...input, aktiv: 1 });
        await createAuditLog({ mitarbeiterId: ctx.adminId, action: "ADMIN", ressource: "kostentraeger", details: `create ${input.name}`, status: "success" });
        return { success: true };
      }),

    kostentraegerUpdate: adminProcedure
      .input(z.object({
        id: z.number().int().positive(),
        name: z.string().min(1).optional(),
        kurzname: z.string().optional(),
        ikNummer: z.string().optional(),
        typ: z.enum(["pflegekasse", "krankenkasse", "privat", "sonstige"]).optional(),
        strasse: z.string().optional(),
        plz: z.string().optional(),
        ort: z.string().optional(),
        telefon: z.string().optional(),
        aktiv: z.number().int().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { id, ...data } = input;
        await updateKostentraeger(id, data as any);
        await createAuditLog({ mitarbeiterId: ctx.adminId, action: "ADMIN", ressource: "kostentraeger", details: `update id=${id}`, status: "success" });
        return { success: true };
      }),

    // ── TEXTBAUSTEINE ──────────────────────────────────
    textbausteine: portalProcedure
      .input(z.object({
        paragraph: z.string().optional(),
        kategorie: z.string().optional(),
      }))
      .query(async ({ input }) => getAllTextbausteine(input.paragraph, input.kategorie)),

    textbausteineCreate: adminProcedure
      .input(z.object({
        kategorie: z.enum(["bericht", "gesundheit", "aktivitaet", "bemerkung", "sonstiges"]),
        paragraph: z.enum(["45b", "45a", "39", "alle"]),
        titel: z.string().min(1),
        inhalt: z.string().min(1),
      }))
      .mutation(async ({ input, ctx }) => {
        await createTextbaustein({ ...input, aktiv: 1 });
        await createAuditLog({ mitarbeiterId: ctx.adminId, action: "ADMIN", ressource: "textbaustein", details: `create ${input.titel}`, status: "success" });
        return { success: true };
      }),

    textbausteineUpdate: adminProcedure
      .input(z.object({
        id: z.number().int().positive(),
        titel: z.string().min(1).optional(),
        inhalt: z.string().min(1).optional(),
        aktiv: z.number().int().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { id, ...data } = input;
        await updateTextbaustein(id, data as any);
        await createAuditLog({ mitarbeiterId: ctx.adminId, action: "ADMIN", ressource: "textbaustein", details: `update id=${id}`, status: "success" });
        return { success: true };
      }),

    // ── PFLEGEGRAD-BUDGET ──────────────────────────────
    pflegegradBudget: portalProcedure
      .input(z.object({ pflegegrad: z.number().int().min(1).max(5) }))
      .query(async ({ input }) => getPflegegradBudgets(input.pflegegrad)),

    // ── FAHRTKOSTEN-BERECHNUNG (Distanz-Schätzung) ────
    fahrtkostenBerechne: portalProcedure
      .input(z.object({
        vonAdresse: z.string().min(1),
        nachAdresse: z.string().min(1),
      }))
      .mutation(async ({ input }) => {
        try {
          const { makeRequest } = await import("./_core/map");
          const result = await makeRequest("/maps/api/distancematrix/json", {
            origins: input.vonAdresse,
            destinations: input.nachAdresse,
            mode: "driving",
            language: "de",
          });
          const element = (result as any)?.rows?.[0]?.elements?.[0];
          if (element?.status === "OK") {
            const distanzM = element.distance?.value ?? 0;
            const km = Math.round(distanzM / 100) / 10; // auf 0.1 km runden
            const verguetung = Math.round(km * 0.30 * 100) / 100; // 0,30 €/km
            return { km, verguetung, distanzText: element.distance?.text, dauerText: element.duration?.text };
          }
          return { km: 0, verguetung: 0, distanzText: null, dauerText: null };
        } catch {
          return { km: 0, verguetung: 0, distanzText: null, dauerText: null };
        }
      }),

    // ── E-BRIEF MODUL ──────────────────────────────────
    eBriefSend: adminProcedure
      .input(z.object({
        empfaenger: z.string().min(1),
        betreff: z.string().min(1),
        inhalt: z.string().optional(),
        anhangName: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        // Versand-Log speichern (E-Mail-Dienst kann später angebunden werden)
        await createEBriefLog({
          mitarbeiterId: ctx.adminId,
          empfaenger: input.empfaenger,
          betreff: input.betreff,
          inhalt: input.inhalt,
          status: "versendet",
        });
        await createAuditLog({ mitarbeiterId: ctx.adminId, action: "EXPORT", ressource: "ebrief", details: `an=${input.empfaenger} betreff=${input.betreff}`, status: "success" });
        return { success: true };
      }),

    eBriefLogs: adminProcedure
      .input(z.object({ limit: z.number().int().min(1).max(200).default(50) }))
      .query(async ({ input }) => getEBriefLogs(input.limit)),

    // ── MASSEN-EXPORT (ZIP-Download) ───────────────────
    massExport: adminProcedure
      .input(z.object({
        monat: z.string().regex(/^\d{4}-\d{2}$/),
        mitarbeiterId: z.number().int().positive().optional(),
        typ: z.enum(["leistungen", "fahrten", "alle"]).default("alle"),
      }))
      .mutation(async ({ input, ctx }) => {
        const [leis, fahr, maList, kundenList] = await Promise.all([
          getLeistungenFuerExport(input.monat, input.mitarbeiterId),
          getFahrtenFuerExport(input.monat, input.mitarbeiterId),
          getAllMitarbeiter(),
          getAllKunden(),
        ]);

        const getMaName = (id: number) => { const m = maList.find(m => m.id === id); return m ? `${m.nachname} ${m.vorname}` : `MA-${id}`; };
        const getKdName = (id: number | null) => { if (!id) return ""; const k = kundenList.find(k => k.id === id); return k ? `${k.nachname} ${k.vorname}` : `KD-${id}`; };

        // CSV für Leistungsnachweise
        const leistungenCsv = [
          "Mitarbeiter;Monat;Kunde;Paragraph;Stunden;Einsätze;Betrag;Status",
          ...leis.map(l => `${getMaName(l.mitarbeiterId)};${l.monat};${getKdName(l.kundenId)};§${l.paragraph} SGB XI;${l.stunden};${l.anzahlEinsaetze};${l.betrag} €;${l.status}`),
        ].join("\n");

        // CSV für Fahrten
        const fahrenCsv = [
          "Mitarbeiter;Datum;Von;Nach;km;Typ;Vergütung;Kunde;Zweck",
          ...fahr.map(f => {
            const d = typeof f.datum === "string" ? f.datum : (f.datum as Date).toISOString().split("T")[0];
            return `${getMaName(f.mitarbeiterId)};${d};${f.vonOrt};${f.nachOrt};${f.kilometer};${f.typ};${f.verguetung} €;${getKdName(f.kundenId ?? null)};${f.zweck ?? ""}`;
          }),
        ].join("\n");

        await createAuditLog({ mitarbeiterId: ctx.adminId, action: "EXPORT", ressource: "massexport", details: `monat=${input.monat} typ=${input.typ}`, status: "success" });

        return {
          success: true,
          monat: input.monat,
          leistungenCsv: input.typ !== "fahrten" ? leistungenCsv : null,
          fahrenCsv: input.typ !== "leistungen" ? fahrenCsv : null,
          stats: { leistungen: leis.length, fahrten: fahr.length },
        };
      }),
  }),

  // ── PUSH-BENACHRICHTIGUNGEN ───────────────────────────
  push: router({
    // VAPID Public Key für Frontend
    vapidKey: publicProcedure.query(() => ({ publicKey: VAPID_PUBLIC })),

    // Subscription speichern
    subscribe: portalProtected
      .input(z.object({
        endpoint: z.string().url(),
        p256dh: z.string().min(1),
        auth: z.string().min(1),
      }))
      .mutation(async ({ input, ctx }) => {
        await savePushSubscription({
          mitarbeiterId: ctx.mitarbeiterId,
          endpoint: input.endpoint,
          p256dh: input.p256dh,
          auth: input.auth,
        });
        return { success: true };
      }),

    // Subscription entfernen
    unsubscribe: portalProtected
      .input(z.object({ endpoint: z.string() }))
      .mutation(async ({ input, ctx }) => {
        await deletePushSubscription(ctx.mitarbeiterId, input.endpoint);
        return { success: true };
      }),

    // Budget-Warnung manuell an alle senden (Admin)
    sendBudgetWarnung: adminProcedure
      .input(z.object({
        kundenName: z.string(),
        paragraph: z.string(),
        restBudget: z.number(),
      }))
      .mutation(async ({ input }) => {
        const subs = await getAllPushSubscriptions();
        const sent = await sendBudgetWarnungPush(
          subs.map(s => ({ endpoint: s.endpoint, p256dh: s.p256dh, auth: s.auth })),
          input.kundenName,
          input.paragraph,
          input.restBudget
        );
        return { success: true, sent };
      }),
  }),

  // ── FÜHRERSCHEIN-CHECKS ─────────────────────────────
  fuehrerschein: router({
    list: portalProcedure.query(async ({ ctx }) => {
      return getFuehrerscheinChecks(ctx.mitarbeiterId ?? undefined);
    }),

    listAll: adminProcedure.query(async () => {
      const rows = await getFuehrerscheinChecks();
      return (rows as any).rows ?? rows;
    }),

    create: portalProcedure
      .input(z.object({
        fotoUrl: z.string().optional(),
        fotoKey: z.string().optional(),
        pruefDatum: z.string(),
        naechstesPruefDatum: z.string(),
        bemerkung: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        await createFuehrerscheinCheck({
          mitarbeiterId: ctx.mitarbeiterId ?? 0,
          fotoKey: input.fotoKey,
          fotoUrl: input.fotoUrl,
          pruefDatum: input.pruefDatum,
          naechstesPruefDatum: input.naechstesPruefDatum,
          status: 'gueltig',
          bemerkung: input.bemerkung,
        });
        return { success: true };
      }),

    updateStatus: adminProcedure
      .input(z.object({ id: z.number(), status: z.enum(['gueltig', 'faellig', 'ueberfaellig']) }))
      .mutation(async ({ input }) => {
        await updateFuehrerscheinStatus(input.id, input.status);
        return { success: true };
      }),

    vapidKey: portalProcedure.query(() => ({ key: VAPID_PUBLIC })),
  }),

  // ── NEUKUNDENAUFNAHMEN ───────────────────────────────
  neukundenaufnahme: router({
    list: adminProcedure.query(async () => {
      return getAllNeukundenaufnahmen();
    }),

    create: portalProcedure
      .input(z.object({
        vorname: z.string().min(1),
        nachname: z.string().min(1),
        geburtsdatum: z.string().optional(),
        strasse: z.string().optional(),
        plz: z.string().optional(),
        ort: z.string().optional(),
        telefon: z.string().optional(),
        email: z.string().optional(),
        pflegegrad: z.number().min(1).max(5).optional(),
        kostentraeger: z.string().optional(),
        versicherungsnummer: z.string().optional(),
        paragraph: z.enum(['45b', '45a', '39']).optional(),
        vollmachtUnterschrift: z.string().optional(),
        kundenUnterschrift: z.string().optional(),
        notizen: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        await createNeukundenaufnahme({ ...input, erstelltVon: ctx.mitarbeiterId ?? undefined });
        return { success: true };
      }),

    updateStatus: adminProcedure
      .input(z.object({ id: z.number(), status: z.enum(['aufgenommen', 'in_bearbeitung', 'abgeschlossen']) }))
      .mutation(async ({ input }) => {
        await updateNeukundenaufnahmeStatus(input.id, input.status);
        return { success: true };
      }),
  }),

  // ── KASSENANFRAGEN ───────────────────────────────────
  kassenanfrage: router({
    list: portalProtected
      .input(z.object({ kundenId: z.number().optional() }).optional())
      .query(async ({ ctx, input }) => {
        if (input?.kundenId) {
          return getKassenanfragenByKunde(input.kundenId);
        }
        const ma = await getMitarbeiterById(ctx.mitarbeiterId);
        if (ma?.rolle === 'admin') return getAllKassenanfragen();
        return getAllKassenanfragen(ctx.mitarbeiterId);
      }),

    create: portalProtected
      .input(z.object({
        kundenId: z.number().int().positive(),
        kostentraegerId: z.number().int().positive().optional(),
        anfrageTyp: z.enum(['budget_45b', 'budget_45a', 'budget_39', 'alle_budgets', 'pflegegrad', 'sonstiges']),
        vollmachtText: z.string().optional(),
        unterschriftKunde: z.string().optional(),
        unterschriftMitarbeiter: z.string().optional(),
        notizen: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        await createKassenanfrage({ ...input, mitarbeiterId: ctx.mitarbeiterId });
        await createAuditLog({ mitarbeiterId: ctx.mitarbeiterId, action: 'CREATE', ressource: 'kassenanfrage', status: 'success' });
        return { success: true };
      }),

    updateStatus: portalProtected
      .input(z.object({
        id: z.number().int().positive(),
        status: z.enum(['offen', 'gesendet', 'beantwortet', 'abgelehnt']),
        antwort: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        await updateKassenanfrageStatus(input.id, input.status, input.antwort);
        await createAuditLog({ mitarbeiterId: ctx.mitarbeiterId, action: 'UPDATE', ressource: 'kassenanfrage', details: `id=${input.id} status=${input.status}`, status: 'success' });
        return { success: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;
