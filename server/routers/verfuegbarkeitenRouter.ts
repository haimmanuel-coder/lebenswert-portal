import { z } from "zod";
import { router, publicProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { verfuegbarkeiten } from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";
import { jwtVerify } from "jose";

const JWT_SECRET_KEY = new TextEncoder().encode(process.env.JWT_SECRET || "lebenswert-secret-key");

async function getMaIdFromCtx(ctx: any): Promise<number | null> {
  const authHeader = ctx.req?.headers?.authorization;
  if (!authHeader?.startsWith("Bearer ")) return null;
  try {
    const { payload } = await jwtVerify(authHeader.slice(7), JWT_SECRET_KEY);
    return typeof payload.mitarbeiterId === "number" ? payload.mitarbeiterId : null;
  } catch {
    return null;
  }
}

const WochentagEnum = z.enum(["mo", "di", "mi", "do", "fr", "sa", "so"]);

export const verfuegbarkeitenRouter = router({
  /** Verfügbarkeiten eines Mitarbeiters abrufen */
  list: publicProcedure
    .input(z.object({ mitarbeiterId: z.number().optional() }))
    .query(async ({ ctx, input }) => {
      const maId = await getMaIdFromCtx(ctx);
      if (!maId) throw new TRPCError({ code: "UNAUTHORIZED" });
      const db = await getDb();
      if (!db) return [];
      const targetId = input.mitarbeiterId ?? maId;
      return db
        .select()
        .from(verfuegbarkeiten)
        .where(eq(verfuegbarkeiten.mitarbeiterId, targetId));
    }),

  /** Verfügbarkeit erstellen */
  create: publicProcedure
    .input(
      z.object({
        wochentag: z.number().int().min(1).max(7), // 1=Mo...7=So
        vonZeit: z.string(), // "HH:MM"
        bisZeit: z.string(),
        status: z.enum(["verfuegbar", "nicht_verfuegbar", "bevorzugt"]).default("verfuegbar"),
        gueltigVon: z.string().optional(),
        gueltigBis: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const maId = await getMaIdFromCtx(ctx);
      if (!maId) throw new TRPCError({ code: "UNAUTHORIZED" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.insert(verfuegbarkeiten).values({
        mitarbeiterId: maId,
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
  delete: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const maId = await getMaIdFromCtx(ctx);
      if (!maId) throw new TRPCError({ code: "UNAUTHORIZED" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db
        .update(verfuegbarkeiten)
        .set({ status: "nicht_verfuegbar" })
        .where(and(eq(verfuegbarkeiten.id, input.id), eq(verfuegbarkeiten.mitarbeiterId, maId)));
      return { success: true };
    }),
});
