import bcrypt from "bcryptjs";
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
  getFahrtenByMitarbeiter,
  getAllFahrten,
  getFahrtenByKunde,
  createFahrt,
  createAuditLog,
  getAuditLogs,
  getMonatsabschluesse,
  createMonatsabschluss,
  getMonatsStatistik,
} from "./db";
import { SignJWT, jwtVerify } from "jose";
import { ENV } from "./_core/env";

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || "lebenswert-secret-key");
const PORTAL_COOKIE = "lb_portal_token";

// ── PORTAL AUTH HELPER ────────────────────────────────
async function signPortalToken(mitarbeiterId: number) {
  return new SignJWT({ mitarbeiterId })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("8h")
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

// ── PORTAL PROCEDURE (JWT-Cookie) ─────────────────────
const portalProcedure = publicProcedure.use(async ({ ctx, next }) => {
  const token = ctx.req.cookies?.[PORTAL_COOKIE];
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

// ── ROUTER ────────────────────────────────────────────
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

  // ── PORTAL AUTH ──────────────────────────────────────
  portal: router({
    login: publicProcedure
      .input(z.object({ email: z.string().email(), passwort: z.string().min(1) }))
      .mutation(async ({ input, ctx }) => {
        const ma = await getMitarbeiterByEmail(input.email);
        if (!ma) throw new Error("E-Mail oder Passwort ungültig.");
        const valid = await bcrypt.compare(input.passwort, ma.passwortHash);
        if (!valid) throw new Error("E-Mail oder Passwort ungültig.");
        const token = await signPortalToken(ma.id);
        ctx.res.cookie(PORTAL_COOKIE, token, {
          httpOnly: true,
          secure: ctx.req.protocol === "https",
          sameSite: "none",
          path: "/",
          maxAge: 8 * 60 * 60 * 1000,
        });
        await createAuditLog({ mitarbeiterId: ma.id, action: "LOGIN", ressource: "portal", status: "success" });
        return { id: ma.id, vorname: ma.vorname, nachname: ma.nachname, email: ma.email, rolle: ma.rolle };
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
  }),

  // ── KUNDEN ───────────────────────────────────────────
  kunden: router({
    list: portalProtected.query(async ({ ctx }) => {
      const ma = await getMitarbeiterById(ctx.mitarbeiterId);
      if (ma?.rolle === "admin") return getAllKunden();
      return getAllKunden(); // alle sehen alle Kunden (Zuordnung nur für Filter)
    }),

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
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await updateKunde(id, data);
        return { success: true };
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
      }))
      .mutation(async ({ input, ctx }) => {
        await updateEinsatzStatus(input.id, ctx.mitarbeiterId, input);
        await createAuditLog({ mitarbeiterId: ctx.mitarbeiterId, action: "UPDATE", ressource: "einsatz", details: `id=${input.id} status=${input.status}`, status: "success" });
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
      }))
      .mutation(async ({ input, ctx }) => {
        await createLeistung({ ...input, mitarbeiterId: ctx.mitarbeiterId } as any);
        await createAuditLog({ mitarbeiterId: ctx.mitarbeiterId, action: "CREATE", ressource: "leistung", status: "success" });
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

    create: portalProtected
      .input(z.object({
        datum: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        vonOrt: z.string().min(1),
        nachOrt: z.string().min(1),
        kilometer: z.number().positive(),
        typ: z.enum(["normal", "sonder"]),
        kundenId: z.number().int().positive().optional().nullable(),
        zweck: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        await createFahrt({ ...input, mitarbeiterId: ctx.mitarbeiterId } as any);
        await createAuditLog({ mitarbeiterId: ctx.mitarbeiterId, action: "CREATE", ressource: "fahrt", status: "success" });
        return { success: true };
      }),
  }),

  // ── ADMIN ─────────────────────────────────────────────
  admin: router({
    // Mitarbeiter-Verwaltung
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

    // Kunden-Zuordnung
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

    // Statistiken
    statistik: adminProcedure
      .input(z.object({ monat: z.string().regex(/^\d{4}-\d{2}$/) }))
      .query(async ({ input }) => getMonatsStatistik(input.monat)),

    // Monatsabschluss
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

        // CSV generieren
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

    // Audit-Log
    auditLogs: adminProcedure
      .input(z.object({ limit: z.number().int().min(1).max(500).default(200) }))
      .query(async ({ input }) => getAuditLogs(input.limit)),
  }),
});

export type AppRouter = typeof appRouter;
