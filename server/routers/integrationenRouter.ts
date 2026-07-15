import { z } from "zod";
import { router } from "../_core/trpc";
import { portalProtected, adminProcedure } from "../portalAuth";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { integrationen, integrationsLaeufe, analyseSnapshots, backupProtokolle } from "../../drizzle/schema";
import { eq, desc } from "drizzle-orm";


export const integrationenRouter = router({
  /** Alle Integrationen abrufen */
  list: portalProtected.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(integrationen).orderBy(desc(integrationen.createdAt));
  }),

  /** Integration erstellen oder aktualisieren */
  upsert: portalProtected
    .input(
      z.object({
        id: z.number().optional(),
        anbieter: z.string(),
        bezeichnung: z.string(),
        status: z.enum(["nicht_eingerichtet", "testmodus", "aktiv", "fehler", "pausiert"]).default("nicht_eingerichtet"),
        basisUrl: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      if (input.id) {
        await db
          .update(integrationen)
          .set({ status: input.status, basisUrl: input.basisUrl ?? null })
          .where(eq(integrationen.id, input.id));
      } else {
        await db.insert(integrationen).values({
          anbieter: input.anbieter as any,
          bezeichnung: input.bezeichnung,
          status: input.status,
          basisUrl: input.basisUrl ?? null,
        });
      }
      return { success: true };
    }),

  /** Verbindungstest simulieren */
  testVerbindung: portalProtected
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      // Simulierter Test: immer "Zugang fehlt" für OptaData/DATEV/Lexware
      const rows = await db.select().from(integrationen).where(eq(integrationen.id, input.id)).limit(1);
      if (rows.length === 0) throw new TRPCError({ code: "NOT_FOUND" });
      const integration = rows[0];
      const testOk = integration.status === "aktiv" && !!integration.basisUrl;
      await db
        .update(integrationen)
        .set({ letzterTestAt: new Date(), letzterTestStatus: testOk ? "erfolg" : "fehler" })
        .where(eq(integrationen.id, input.id));
      // Lauf protokollieren
      await db.insert(integrationsLaeufe).values({
        integrationId: input.id,
        typ: "test",
        status: testOk ? "erfolg" : "fehler",
        meldung: testOk ? null : "Zugangsdaten fehlen oder Endpunkt nicht erreichbar",
      });
      return { success: testOk, status: testOk ? "ok" : "fehler" };
    }),

  /** Letzte Läufe einer Integration */
  listLaeufe: portalProtected
    .input(z.object({ integrationId: z.number() }))
    .query(async ({ ctx, input }) => {
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
  list: portalProtected
    .input(z.object({ typ: z.string().optional(), monat: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];
      return db
        .select()
        .from(analyseSnapshots)
        .orderBy(desc(analyseSnapshots.createdAt))
        .limit(100);
    }),

  /** Backup-Protokolle abrufen */
  listBackups: portalProtected.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];
    return db
      .select()
      .from(backupProtokolle)
      .orderBy(desc(backupProtokolle.createdAt))
      .limit(30);
  }),
});
