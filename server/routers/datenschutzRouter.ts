import { z } from "zod";
import { router } from "../_core/trpc";
import { portalProtected } from "../portalAuth";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { datenschutzDokumente, datenschutzZustimmungen } from "../../drizzle/schema";
import { eq, desc, and } from "drizzle-orm";


export const datenschutzRouter = router({
  /** Aktuelle Datenschutzvereinbarung abrufen */
  getAktuelle: portalProtected.query(async () => {
    const db = await getDb();
    if (!db) return null;
    const rows = await db
      .select()
      .from(datenschutzDokumente)
      .where(eq(datenschutzDokumente.aktiv, true))
      .orderBy(desc(datenschutzDokumente.createdAt))
      .limit(1);
    return rows[0] ?? null;
  }),

  /** Prüfen ob der eingeloggte Mitarbeiter der aktuellen Version zugestimmt hat */
  checkZustimmung: portalProtected.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return { required: false, zugestimmt: true };
    // Aktuelle Version holen
    const dokRows = await db
      .select()
      .from(datenschutzDokumente)
      .where(eq(datenschutzDokumente.aktiv, true))
      .orderBy(desc(datenschutzDokumente.createdAt))
      .limit(1);
    if (dokRows.length === 0) return { required: false, zugestimmt: true };
    const dok = dokRows[0];
    // Zustimmung prüfen
    const zustRows = await db
      .select()
      .from(datenschutzZustimmungen)
      .where(
        and(
          eq(datenschutzZustimmungen.mitarbeiterId, ctx.mitarbeiterId),
          eq(datenschutzZustimmungen.dokumentId, dok.id)
        )
      )
      .limit(1);
    return {
      required: true,
      zugestimmt: zustRows.length > 0,
      dokument: dok,
    };
  }),

  /** Zustimmung zur aktuellen Version aufzeichnen */
  zustimmen: portalProtected
    .input(z.object({ dokumentId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const dokRows = await db
        .select()
        .from(datenschutzDokumente)
        .where(eq(datenschutzDokumente.id, input.dokumentId))
        .limit(1);
      if (dokRows.length === 0) throw new TRPCError({ code: "NOT_FOUND" });
      const dok = dokRows[0];
      await db.insert(datenschutzZustimmungen).values({
        mitarbeiterId: ctx.mitarbeiterId,
        dokumentId: dok.id,
        dokumentVersion: dok.version,
      });
      return { success: true };
    }),

  /** Neues Datenschutzdokument erstellen (Admin) */
  createDokument: portalProtected
    .input(z.object({ version: z.string(), titel: z.string(), inhalt: z.string(), typ: z.enum(["datenschutzerklaerung", "avv", "einwilligung", "loeschkonzept", "verarbeitungsverzeichnis"]).default("datenschutzerklaerung") }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      // Alle alten als inaktiv setzen
      await db.update(datenschutzDokumente).set({ aktiv: false });
      await db.insert(datenschutzDokumente).values({
        typ: input.typ,
        version: input.version,
        titel: input.titel,
        inhalt: input.inhalt,
        aktiv: true,
      });
      return { success: true };
    }),
});
