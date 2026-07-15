import { z } from "zod";
import { router, publicProcedure } from "../\_core/trpc";
import { TRPCError } from "@trpc/server";
import {
  generate2FASetup,
  activate2FA,
  deactivate2FA,
  get2FAStatus,
  verifyTOTP,
  useRecoveryCode,
  get2FASecret,
} from "../twoFactor";
import { createAuditLog, getMitarbeiterById } from "../db";
import { jwtVerify } from "jose";

const JWT_SECRET_KEY = new TextEncoder().encode(process.env.JWT_SECRET || "lebenswert-secret-key");

// Inline portal-protected procedure (same pattern as routers.ts)
async function getMaIdFromCtx(ctx: { req: { headers: { authorization?: string } } }): Promise<number | null> {
  const authHeader = ctx.req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7);
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET_KEY);
    return typeof payload.mitarbeiterId === 'number' ? payload.mitarbeiterId : null;
  } catch {
    return null;
  }
}

export const twoFactorRouter = router({
  /** 2FA-Status des eingeloggten Mitarbeiters */
  getStatus: publicProcedure.query(async ({ ctx }) => {
    const maId = await getMaIdFromCtx(ctx as any);
    if (!maId) throw new TRPCError({ code: "UNAUTHORIZED" });
    return await get2FAStatus(maId);
  }),

  /** QR-Code und Secret für 2FA-Einrichtung generieren */
  setupGenerate: publicProcedure.mutation(async ({ ctx }) => {
    const maId = await getMaIdFromCtx(ctx as any);
    if (!maId) throw new TRPCError({ code: "UNAUTHORIZED" });
    const status = await get2FAStatus(maId);
    if (status.enabled) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "2FA ist bereits aktiviert" });
    }
    const ma = await getMitarbeiterById(maId);
    const setup = await generate2FASetup(maId, ma?.email ?? `ma-${maId}`);
    return setup;
  }),

  /** 2FA aktivieren: TOTP-Code verifizieren und Wiederherstellungscodes ausgeben */
  activate: publicProcedure
    .input(z.object({ secret: z.string(), token: z.string().length(6) }))
    .mutation(async ({ ctx, input }) => {
      const maId = await getMaIdFromCtx(ctx as any);
      if (!maId) throw new TRPCError({ code: "UNAUTHORIZED" });
      const valid = verifyTOTP(input.secret, input.token);
      if (!valid) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Ungültiger TOTP-Code" });
      }
      const recoveryCodes = await activate2FA(maId, input.secret);
      await createAuditLog({
        mitarbeiterId: maId,
        action: "2FA",
        ressource: "mitarbeiter",
        details: "2FA aktiviert",
        status: "success",
      });
      return { recoveryCodes };
    }),

  /** 2FA deaktivieren (TOTP-Code oder Wiederherstellungscode erforderlich) */
  deactivate: publicProcedure
    .input(z.object({ token: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const maId = await getMaIdFromCtx(ctx as any);
      if (!maId) throw new TRPCError({ code: "UNAUTHORIZED" });
      const secret = await get2FASecret(maId);
      if (!secret) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "2FA ist nicht aktiviert" });
      }
      const validTotp = verifyTOTP(secret, input.token);
      const validRecovery = !validTotp ? await useRecoveryCode(maId, input.token) : false;
      if (!validTotp && !validRecovery) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Ungültiger Code" });
      }
      await deactivate2FA(maId);
      await createAuditLog({
        mitarbeiterId: maId,
        action: "2FA",
        ressource: "mitarbeiter",
        details: "2FA deaktiviert",
        status: "success",
      });
      return { success: true };
    }),

  /** TOTP-Code beim Login verifizieren */
  verifyLogin: publicProcedure
    .input(z.object({ token: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const maId = await getMaIdFromCtx(ctx as any);
      if (!maId) throw new TRPCError({ code: "UNAUTHORIZED" });
      const secret = await get2FASecret(maId);
      if (!secret) return { success: true, required: false };
      const validTotp = verifyTOTP(secret, input.token);
      const validRecovery = !validTotp ? await useRecoveryCode(maId, input.token) : false;
      if (!validTotp && !validRecovery) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Ungültiger 2FA-Code" });
      }
      return { success: true, required: true };
    }),
});
