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
        .where(and(eq(verfuegbarkeiten.mitarbeiterId, targetId), eq(verfuegbarkeiten.aktiv, true)));
    }),

  /** Verfügbarkeit erstellen */
  create: publicProcedure
    .input(
      z.object({
        wochentag: WochentagEnum,
        zeitVon: z.string(), // "HH:MM"
        zeitBis: z.string(),
        sollstunden: z.number().optional(),
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
        zeitVon: input.zeitVon,
        zeitBis: input.zeitBis,
        sollstunden: input.sollstunden?.toString() ?? "0.00",
        gueltigVon: input.gueltigVon ?? null,
        gueltigBis: input.gueltigBis ?? null,
        aktiv: true,
      } as any);
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
        .set({ aktiv: false })
        .where(and(eq(verfuegbarkeiten.id, input.id), eq(verfuegbarkeiten.mitarbeiterId, maId)));
      return { success: true };
    }),
});
