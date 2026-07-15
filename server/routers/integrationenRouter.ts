import { z } from "zod";
import { router, publicProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { integrationen, integrationsLaeufe, analyseSnapshots, backupProtokolle } from "../../drizzle/schema";
import { eq, desc } from "drizzle-orm";
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

export const integrationenRouter = router({
  /** Alle Integrationen abrufen */
  list: publicProcedure.query(async ({ ctx }) => {
    const maId = await getMaIdFromCtx(ctx);
    if (!maId) throw new TRPCError({ code: "UNAUTHORIZED" });
    const db = await getDb();
    if (!db) return [];
    return db.select().from(integrationen).orderBy(desc(integrationen.createdAt));
  }),

  /** Integration erstellen oder aktualisieren */
  upsert: publicProcedure
    .input(
      z.object({
        id: z.number().optional(),
        anbieter: z.string(),
        name: z.string(),
        modus: z.enum(["vorbereitet", "aktiv", "deaktiviert", "fehler"]).default("vorbereitet"),
        endpoint: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const maId = await getMaIdFromCtx(ctx);
      if (!maId) throw new TRPCError({ code: "UNAUTHORIZED" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      if (input.id) {
        await db
          .update(integrationen)
          .set({ modus: input.modus, endpoint: input.endpoint ?? null })
          .where(eq(integrationen.id, input.id));
      } else {
        await db.insert(integrationen).values({
          anbieter: input.anbieter,
          name: input.name,
          modus: input.modus,
          endpoint: input.endpoint ?? null,
        });
      }
      return { success: true };
    }),

  /** Verbindungstest simulieren */
  testVerbindung: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const maId = await getMaIdFromCtx(ctx);
      if (!maId) throw new TRPCError({ code: "UNAUTHORIZED" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      // Simulierter Test: immer "Zugang fehlt" für OptaData/DATEV/Lexware
      const rows = await db.select().from(integrationen).where(eq(integrationen.id, input.id)).limit(1);
      if (rows.length === 0) throw new TRPCError({ code: "NOT_FOUND" });
      const integration = rows[0];
      const testOk = integration.modus === "aktiv" && !!integration.endpoint;
      await db
        .update(integrationen)
        .set({ letzterTest: new Date(), letzterTestStatus: testOk ? "ok" : "fehler" })
        .where(eq(integrationen.id, input.id));
      // Lauf protokollieren
      await db.insert(integrationsLaeufe).values({
        integrationId: input.id,
        status: testOk ? "erfolgreich" : "fehlgeschlagen",
        fehlerCode: testOk ? null : "ZUGANG_FEHLT",
        fehlerMeldung: testOk ? null : "Zugangsdaten fehlen oder Endpunkt nicht erreichbar",
      });
      return { success: testOk, status: testOk ? "ok" : "fehler" };
    }),

  /** Letzte Läufe einer Integration */
  listLaeufe: publicProcedure
    .input(z.object({ integrationId: z.number() }))
    .query(async ({ ctx, input }) => {
      const maId = await getMaIdFromCtx(ctx);
      if (!maId) throw new TRPCError({ code: "UNAUTHORIZED" });
      const db = await getDb();
      if (!db) return [];
      return db
        .select()
        .from(integrationsLaeufe)
        .where(eq(integrationsLaeufe.integrationId, input.integrationId))
        .orderBy(desc(integrationsLaeufe.createdAt))
        .limit(20);
    }),
});

export const analysenRouter = router({
  /** Analyse-Snapshots abrufen */
  list: publicProcedure
    .input(z.object({ typ: z.string().optional(), monat: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      const maId = await getMaIdFromCtx(ctx);
      if (!maId) throw new TRPCError({ code: "UNAUTHORIZED" });
      const db = await getDb();
      if (!db) return [];
      return db
        .select()
        .from(analyseSnapshots)
        .orderBy(desc(analyseSnapshots.createdAt))
        .limit(100);
    }),

  /** Backup-Protokolle abrufen */
  listBackups: publicProcedure.query(async ({ ctx }) => {
    const maId = await getMaIdFromCtx(ctx);
    if (!maId) throw new TRPCError({ code: "UNAUTHORIZED" });
    const db = await getDb();
    if (!db) return [];
    return db
      .select()
      .from(backupProtokolle)
      .orderBy(desc(backupProtokolle.createdAt))
      .limit(30);
  }),
});
