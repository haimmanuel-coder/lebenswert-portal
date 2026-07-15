import { z } from "zod";
import { router } from "../_core/trpc";
import { portalProtected } from "../portalAuth";
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


// Inline portal-protected procedure (same pattern as routers.ts)
export const twoFactorRouter = router({
  /** 2FA-Status des eingeloggten Mitarbeiters */
  getStatus: portalProtected.query(async ({ ctx }) => {
    return await get2FAStatus(ctx.mitarbeiterId);
  }),

  /** QR-Code und Secret für 2FA-Einrichtung generieren */
  setupGenerate: portalProtected.mutation(async ({ ctx }) => {
    const status = await get2FAStatus(ctx.mitarbeiterId);
    if (status.enabled) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "2FA ist bereits aktiviert" });
    }
    const ma = await getMitarbeiterById(ctx.mitarbeiterId);
    const setup = await generate2FASetup(ctx.mitarbeiterId, ma?.email ?? `ma-${ctx.mitarbeiterId}`);
    return setup;
  }),

  /** 2FA aktivieren: TOTP-Code verifizieren und Wiederherstellungscodes ausgeben */
  activate: portalProtected
    .input(z.object({ secret: z.string(), token: z.string().length(6) }))
    .mutation(async ({ ctx, input }) => {
      const valid = verifyTOTP(input.secret, input.token);
      if (!valid) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Ungültiger TOTP-Code" });
      }
      const recoveryCodes = await activate2FA(ctx.mitarbeiterId, input.secret);
      await createAuditLog({
        mitarbeiterId: ctx.mitarbeiterId,
        action: "2FA",
        ressource: "mitarbeiter",
        details: "2FA aktiviert",
        status: "success",
      });
      return { recoveryCodes };
    }),

  /** 2FA deaktivieren (TOTP-Code oder Wiederherstellungscode erforderlich) */
  deactivate: portalProtected
    .input(z.object({ token: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const secret = await get2FASecret(ctx.mitarbeiterId);
      if (!secret) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "2FA ist nicht aktiviert" });
      }
      const validTotp = verifyTOTP(secret, input.token);
      const validRecovery = !validTotp ? await useRecoveryCode(ctx.mitarbeiterId, input.token) : false;
      if (!validTotp && !validRecovery) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Ungültiger Code" });
      }
      await deactivate2FA(ctx.mitarbeiterId);
      await createAuditLog({
        mitarbeiterId: ctx.mitarbeiterId,
        action: "2FA",
        ressource: "mitarbeiter",
        details: "2FA deaktiviert",
        status: "success",
      });
      return { success: true };
    }),

  /** TOTP-Code beim Login verifizieren */
  verifyLogin: portalProtected
    .input(z.object({ token: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const secret = await get2FASecret(ctx.mitarbeiterId);
      if (!secret) return { success: true, required: false };
      const validTotp = verifyTOTP(secret, input.token);
      const validRecovery = !validTotp ? await useRecoveryCode(ctx.mitarbeiterId, input.token) : false;
      if (!validTotp && !validRecovery) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Ungültiger 2FA-Code" });
      }
      return { success: true, required: true };
    }),
});
