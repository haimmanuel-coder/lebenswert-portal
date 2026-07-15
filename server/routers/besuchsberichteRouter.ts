import { z } from "zod";
import { router, publicProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { besuchsberichte, besuchsberichtDateien, formularVorlagen } from "../../drizzle/schema";
import { eq, desc, and } from "drizzle-orm";
import { jwtVerify } from "jose";
import { createAuditLog } from "../db";

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

export const besuchsberichteRouter = router({
  /** Berichte eines Mitarbeiters abrufen */
  list: publicProcedure
    .input(z.object({ mitarbeiterId: z.number().optional(), kundenId: z.number().optional() }))
    .query(async ({ ctx, input }) => {
      const maId = await getMaIdFromCtx(ctx);
      if (!maId) throw new TRPCError({ code: "UNAUTHORIZED" });
      const db = await getDb();
      if (!db) return [];
      const rows = await db
        .select()
        .from(besuchsberichte)
        .where(eq(besuchsberichte.mitarbeiterId, input.mitarbeiterId ?? maId))
        .orderBy(desc(besuchsberichte.createdAt))
        .limit(50);
      return rows;
    }),

  /** Bericht für einen Einsatz abrufen */
  getByEinsatz: publicProcedure
    .input(z.object({ einsatzId: z.number() }))
    .query(async ({ ctx, input }) => {
      const maId = await getMaIdFromCtx(ctx);
      if (!maId) throw new TRPCError({ code: "UNAUTHORIZED" });
      const db = await getDb();
      if (!db) return null;
      const rows = await db
        .select()
        .from(besuchsberichte)
        .where(eq(besuchsberichte.einsatzId, input.einsatzId))
        .limit(1);
      return rows[0] ?? null;
    }),

  /** Bericht erstellen oder aktualisieren */
  upsert: publicProcedure
    .input(
      z.object({
        einsatzId: z.number(),
        kundenId: z.number(),
        taetigkeiten: z.string().default(""),
        beobachtungen: z.string().optional(),
        besonderheiten: z.string().optional(),
        naechsteSchritte: z.string().optional(),
        einreichen: z.boolean().default(false),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const maId = await getMaIdFromCtx(ctx);
      if (!maId) throw new TRPCError({ code: "UNAUTHORIZED" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const existing = await db
        .select()
        .from(besuchsberichte)
        .where(eq(besuchsberichte.einsatzId, input.einsatzId))
        .limit(1);

      const status = input.einreichen ? "eingereicht" : "entwurf";

      if (existing.length > 0) {
        await db
          .update(besuchsberichte)
          .set({
            taetigkeiten: input.taetigkeiten || existing[0].taetigkeiten,
            beobachtungen: input.beobachtungen ?? existing[0].beobachtungen,
            besonderheiten: input.besonderheiten ?? existing[0].besonderheiten,
            naechsteSchritte: input.naechsteSchritte ?? existing[0].naechsteSchritte,
            status,
          })
          .where(eq(besuchsberichte.id, existing[0].id));
        return { id: existing[0].id, success: true };
      } else {
        const result = await db.insert(besuchsberichte).values({
          einsatzId: input.einsatzId,
          kundenId: input.kundenId,
          mitarbeiterId: maId,
          datum: new Date(),
          taetigkeiten: input.taetigkeiten || "",
          beobachtungen: input.beobachtungen ?? null,
          besonderheiten: input.besonderheiten ?? null,
          naechsteSchritte: input.naechsteSchritte ?? null,
          status,
        });
        return { id: (result as any).insertId, success: true };
      }
    }),

  /** Bericht freigeben (Admin/Teamleitung) */
  freigeben: publicProcedure
    .input(z.object({ id: z.number(), ablehnen: z.boolean().default(false) }))
    .mutation(async ({ ctx, input }) => {
      const maId = await getMaIdFromCtx(ctx);
      if (!maId) throw new TRPCError({ code: "UNAUTHORIZED" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db
        .update(besuchsberichte)
        .set({
          status: input.ablehnen ? "korrektur" : "freigegeben",
          freigegebenVon: maId,
          freigegebenAt: new Date(),
        })
        .where(eq(besuchsberichte.id, input.id));
      await createAuditLog({
        mitarbeiterId: maId,
        action: "UPDATE",
        ressource: "besuchsbericht",
        details: `id=${input.id} status=${input.ablehnen ? "korrektur" : "freigegeben"}`,
        status: "success",
      });
      return { success: true };
    }),

  /** Dateien eines Berichts abrufen */
  listDateien: publicProcedure
    .input(z.object({ berichtId: z.number() }))
    .query(async ({ ctx, input }) => {
      const maId = await getMaIdFromCtx(ctx);
      if (!maId) throw new TRPCError({ code: "UNAUTHORIZED" });
      const db = await getDb();
      if (!db) return [];
      return db
        .select()
        .from(besuchsberichtDateien)
        .where(eq(besuchsberichtDateien.berichtId, input.berichtId))
        .orderBy(desc(besuchsberichtDateien.createdAt));
    }),

  /** Datei-Metadaten nach Upload speichern */
  addDatei: publicProcedure
    .input(
      z.object({
        berichtId: z.number(),
        dateiKey: z.string(),
        dateiUrl: z.string(),
        dateiname: z.string().optional(),
        mimeType: z.string().optional(),
        groesse: z.number().optional(),
        kategorie: z.enum(["foto", "dokument", "unterschrift", "sonstiges"]).default("foto"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const maId = await getMaIdFromCtx(ctx);
      if (!maId) throw new TRPCError({ code: "UNAUTHORIZED" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.insert(besuchsberichtDateien).values({
        berichtId: input.berichtId,
        dateiKey: input.dateiKey,
        dateiUrl: input.dateiUrl,
        dateiname: input.dateiname ?? null,
        mimeType: input.mimeType ?? null,
        groesse: input.groesse ?? null,
        kategorie: input.kategorie,
      });
      return { success: true };
    }),

  /** Formularvorlagen abrufen */
  listVorlagen: publicProcedure.query(async ({ ctx }) => {
    const maId = await getMaIdFromCtx(ctx);
    if (!maId) throw new TRPCError({ code: "UNAUTHORIZED" });
    const db = await getDb();
    if (!db) return [];
    return db
      .select()
      .from(formularVorlagen)
      .where(eq(formularVorlagen.aktiv, true))
      .orderBy(desc(formularVorlagen.createdAt));
  }),

  /** Formularvorlage erstellen (Admin) */
  createVorlage: publicProcedure
    .input(z.object({ name: z.string(), version: z.string(), felder: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const maId = await getMaIdFromCtx(ctx);
      if (!maId) throw new TRPCError({ code: "UNAUTHORIZED" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.insert(formularVorlagen).values({
        name: input.name,
        version: input.version,
        felder: input.felder,
        aktiv: true,
      });
      return { success: true };
    }),
});
