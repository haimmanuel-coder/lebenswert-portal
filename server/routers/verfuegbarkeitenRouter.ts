import { z } from "zod";
import { router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { verfuegbarkeiten } from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";
import { portalProtected } from "../portalAuth";

export const verfuegbarkeitenRouter = router({
  /** Verfügbarkeiten eines Mitarbeiters abrufen */
  list: portalProtected
    .input(z.object({ mitarbeiterId: z.number().optional() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];
      const targetId = input.mitarbeiterId ?? ctx.mitarbeiterId;
      return db
        .select()
        .from(verfuegbarkeiten)
        .where(eq(verfuegbarkeiten.mitarbeiterId, targetId));
    }),

  /** Verfügbarkeit erstellen */
  create: portalProtected
    .input(
      z.object({
        wochentag: z.number().int().min(1).max(7),
        vonZeit: z.string(),
        bisZeit: z.string(),
        status: z.enum(["verfuegbar", "nicht_verfuegbar", "bevorzugt"]).default("verfuegbar"),
        gueltigVon: z.string().optional(),
        gueltigBis: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.insert(verfuegbarkeiten).values({
        mitarbeiterId: ctx.mitarbeiterId,
        wochentag: input.wochentag,
        vonZeit: input.vonZeit,
        bisZeit: input.bisZeit,
        status: input.status,
        gueltigVon: input.gueltigVon ? new Date(`${input.gueltigVon}T00:00:00`) : null,
        gueltigBis: input.gueltigBis ? new Date(`${input.gueltigBis}T00:00:00`) : null,
      });
      return { success: true };
    }),

  /** Verfügbarkeit deaktivieren (Soft-Delete) */
  delete: portalProtected
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db
        .update(verfuegbarkeiten)
        .set({ status: "nicht_verfuegbar" })
        .where(and(eq(verfuegbarkeiten.id, input.id), eq(verfuegbarkeiten.mitarbeiterId, ctx.mitarbeiterId)));
      return { success: true };
    }),
});
