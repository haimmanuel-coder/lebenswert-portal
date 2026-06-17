import bcrypt from "bcryptjs";
import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import {
  getMitarbeiterByEmail,
  getMitarbeiterById,
  getAllKunden,
  getEinsaetzeByMitarbeiter,
  createEinsatz,
  updateEinsatzStatus,
  getLeistungenByMitarbeiter,
  createLeistung,
  getFahrtenByMitarbeiter,
  createFahrt,
} from "./db";
import { SignJWT, jwtVerify } from "jose";
import { ENV } from "./_core/env";

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || "lebensnah-secret-key");
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
  if (!ctx.mitarbeiterId) {
    throw new Error("Nicht angemeldet");
  }
  return next({ ctx: { ...ctx, mitarbeiterId: ctx.mitarbeiterId as number } });
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
        return {
          id: ma.id,
          vorname: ma.vorname,
          nachname: ma.nachname,
          email: ma.email,
          rolle: ma.rolle,
        };
      }),

    logout: publicProcedure.mutation(({ ctx }) => {
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
    list: portalProtected.query(async () => {
      return getAllKunden();
    }),
  }),

  // ── EINSÄTZE ─────────────────────────────────────────
  einsaetze: router({
    list: portalProtected.query(async ({ ctx }) => {
      return getEinsaetzeByMitarbeiter(ctx.mitarbeiterId);
    }),

    create: portalProtected
      .input(
        z.object({
          kundenId: z.number().int().positive(),
          datum: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
          startzeit: z.string().optional(),
          dauerStunden: z.number().min(0.5).optional(),
          paragraph: z.enum(["45b", "45a", "39"]),
        })
      )
      .mutation(async ({ input, ctx }) => {
        await createEinsatz({ ...input, mitarbeiterId: ctx.mitarbeiterId });
        return { success: true };
      }),

    updateStatus: portalProtected
      .input(
        z.object({
          id: z.number().int().positive(),
          status: z.enum(["abgeschlossen", "abgesagt"]),
          bericht: z.string().optional(),
          gesundheit: z.enum(["gut", "stabil", "auffaellig", "kritisch"]).optional(),
          bemerkung: z.string().optional(),
          unterschriftMitarbeiter: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        await updateEinsatzStatus(input.id, ctx.mitarbeiterId, input);
        return { success: true };
      }),
  }),

  // ── LEISTUNGEN ───────────────────────────────────────
  leistungen: router({
    list: portalProtected.query(async ({ ctx }) => {
      return getLeistungenByMitarbeiter(ctx.mitarbeiterId);
    }),

    create: portalProtected
      .input(
        z.object({
          kundenId: z.number().int().positive(),
          monat: z.string().regex(/^\d{4}-\d{2}$/),
          paragraph: z.enum(["45b", "45a", "39"]),
          stunden: z.number().min(0.5),
          anzahlEinsaetze: z.number().int().min(1),
          bemerkung: z.string().optional(),
          unterschriftLeister: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        await createLeistung({ ...input, mitarbeiterId: ctx.mitarbeiterId });
        return { success: true };
      }),
  }),

  // ── FAHRTEN ──────────────────────────────────────────
  fahrten: router({
    list: portalProtected.query(async ({ ctx }) => {
      return getFahrtenByMitarbeiter(ctx.mitarbeiterId);
    }),

    create: portalProtected
      .input(
        z.object({
          datum: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
          vonOrt: z.string().min(1),
          nachOrt: z.string().min(1),
          kilometer: z.number().positive(),
          typ: z.enum(["normal", "sonder"]),
          kundenId: z.number().int().positive().optional().nullable(),
          zweck: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        await createFahrt({ ...input, mitarbeiterId: ctx.mitarbeiterId });
        return { success: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;
