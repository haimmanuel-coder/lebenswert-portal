import { z } from "zod";
import { router } from "../_core/trpc";
import { portalProtected, adminProcedure } from "../portalAuth";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { besuchsberichte, besuchsberichtDateien, formularVorlagen } from "../../drizzle/schema";
import { eq, desc, and } from "drizzle-orm";
import { createAuditLog } from "../db";
import { transcribeAudio } from "../_core/voiceTranscription";


export const besuchsberichteRouter = router({
  /** Berichte eines Mitarbeiters abrufen */
  list: portalProtected
    .input(z.object({ mitarbeiterId: z.number().optional(), kundenId: z.number().optional() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];
      const rows = await db
        .select()
        .from(besuchsberichte)
        .where(eq(besuchsberichte.mitarbeiterId, input.mitarbeiterId ?? ctx.mitarbeiterId))
        .orderBy(desc(besuchsberichte.createdAt))
        .limit(50);
      return rows;
    }),

  /** Bericht für einen Einsatz abrufen */
  getByEinsatz: portalProtected
    .input(z.object({ einsatzId: z.number() }))
    .query(async ({ ctx, input }) => {
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
  upsert: portalProtected
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
          mitarbeiterId: ctx.mitarbeiterId,
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
  freigeben: portalProtected
    .input(z.object({ id: z.number(), ablehnen: z.boolean().default(false) }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db
        .update(besuchsberichte)
        .set({
          status: input.ablehnen ? "korrektur" : "freigegeben",
          freigegebenVon: ctx.mitarbeiterId,
          freigegebenAt: new Date(),
        })
        .where(eq(besuchsberichte.id, input.id));
      await createAuditLog({
        mitarbeiterId: ctx.mitarbeiterId,
        action: "UPDATE",
        ressource: "besuchsbericht",
        details: `id=${input.id} status=${input.ablehnen ? "korrektur" : "freigegeben"}`,
        status: "success",
      });
      return { success: true };
    }),

  /** Dateien eines Berichts abrufen */
  listDateien: portalProtected
    .input(z.object({ berichtId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];
      return db
        .select()
        .from(besuchsberichtDateien)
        .where(eq(besuchsberichtDateien.berichtId, input.berichtId))
        .orderBy(desc(besuchsberichtDateien.createdAt));
    }),

  /** Datei-Metadaten nach Upload speichern */
  addDatei: portalProtected
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
  listVorlagen: portalProtected.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];
    return db
      .select()
      .from(formularVorlagen)
      .where(eq(formularVorlagen.aktiv, true))
      .orderBy(desc(formularVorlagen.createdAt));
  }),

  /** Formularvorlage erstellen (Admin) */
  createVorlage: portalProtected
    .input(z.object({ name: z.string(), version: z.string(), felder: z.string() }))
    .mutation(async ({ ctx, input }) => {
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

  /** Meine Besuchsberichte abrufen */
  getMeineBerichte: portalProtected.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(besuchsberichte).where(eq(besuchsberichte.mitarbeiterId, ctx.mitarbeiterId)).orderBy(desc(besuchsberichte.datum)).limit(50);
  }),

  /** Alle Besuchsberichte abrufen (Admin) */
  getAlleBerichte: portalProtected.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(besuchsberichte).orderBy(desc(besuchsberichte.datum)).limit(100);
  }),

  /** Spracheingabe transkribieren (Whisper) */
  transkribieren: portalProtected
    .input(z.object({ audioUrl: z.string(), sprache: z.string().default("de") }))
    .mutation(async ({ ctx, input }) => {
      try {
        const result = await transcribeAudio({ audioUrl: input.audioUrl, language: input.sprache });
        if ("error" in result) throw new Error(result.error);
        const r = result as any;
        return { text: r.text ?? "", sprache: r.language ?? "de" };
      } catch (e: any) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Transkription fehlgeschlagen: " + e.message });
      }
    }),
});
