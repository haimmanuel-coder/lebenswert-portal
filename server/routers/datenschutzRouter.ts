import { z } from "zod";
import { router } from "../_core/trpc";
import { portalProtected } from "../portalAuth";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { datenschutzDokumente, datenschutzZustimmungen, mitarbeiter as mitarbeiterTable } from "../../drizzle/schema";
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

  /** Meine Zustimmungen abrufen (Frontend-kompatibel) */
  getMeineZustimmungen: portalProtected.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];
    const dokumente = await db.select().from(datenschutzDokumente).where(eq(datenschutzDokumente.aktiv, true));
    const meineZ = await db.select().from(datenschutzZustimmungen).where(eq(datenschutzZustimmungen.mitarbeiterId, ctx.mitarbeiterId));
    const zugestimmteIds = new Set(meineZ.map(z => z.dokumentId));
    return dokumente.map(d => ({
      id: d.id, typ: d.typ, titel: d.titel, version: d.version,
      zugestimmt: zugestimmteIds.has(d.id),
      zugestimmtAt: meineZ.find(z => z.dokumentId === d.id)?.zugestimmtAt ?? null,
    }));
  }),

  /** Alle Zustimmungen abrufen (Admin) */
  getAlleZustimmungen: portalProtected.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];
    const alleMa = await db.select({ id: mitarbeiterTable.id, vorname: mitarbeiterTable.vorname, nachname: mitarbeiterTable.nachname }).from(mitarbeiterTable);
    const alleZ = await db.select().from(datenschutzZustimmungen);
    const dokumente = await db.select().from(datenschutzDokumente).where(eq(datenschutzDokumente.aktiv, true));
    return alleMa.map(ma => ({
      mitarbeiterId: ma.id,
      name: `${ma.vorname} ${ma.nachname}`,
      zustimmungen: dokumente.map(d => ({
        dokumentId: d.id, typ: d.typ, titel: d.titel,
        zugestimmt: alleZ.some(z => z.mitarbeiterId === ma.id && z.dokumentId === d.id),
      })),
    }));
  }),

  /** Frontend-kompatible zustimmen-Procedure (DsgvoErstDialog nutzt typ/version) */
  zustimmenByTyp: portalProtected
    .input(z.object({
      typ: z.enum(["datenschutzerklaerung", "avv", "einwilligung", "loeschkonzept", "verarbeitungsverzeichnis"]),
      zugestimmt: z.boolean(),
      version: z.string().default("1.0"),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!input.zugestimmt) return { success: true };
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      let dokRows = await db.select().from(datenschutzDokumente)
        .where(and(eq(datenschutzDokumente.typ, input.typ), eq(datenschutzDokumente.aktiv, true))).limit(1);
      if (dokRows.length === 0) {
        const titelMap: Record<string, string> = {
          datenschutzerklaerung: "Datenschutzerkl\u00e4rung", avv: "Auftragsverarbeitungsvertrag",
          einwilligung: "Einwilligung Datenverarbeitung", loeschkonzept: "L\u00f6schkonzept",
          verarbeitungsverzeichnis: "Verarbeitungsverzeichnis",
        };
        await db.insert(datenschutzDokumente).values({
          typ: input.typ, version: input.version,
          titel: titelMap[input.typ] ?? input.typ, inhalt: "", aktiv: true,
        });
        dokRows = await db.select().from(datenschutzDokumente)
          .where(and(eq(datenschutzDokumente.typ, input.typ), eq(datenschutzDokumente.aktiv, true))).limit(1);
      }
      const dok = dokRows[0];
      const existing = await db.select().from(datenschutzZustimmungen)
        .where(and(eq(datenschutzZustimmungen.mitarbeiterId, ctx.mitarbeiterId), eq(datenschutzZustimmungen.dokumentId, dok.id))).limit(1);
      if (existing.length === 0) {
        await db.insert(datenschutzZustimmungen).values({
          mitarbeiterId: ctx.mitarbeiterId, dokumentId: dok.id, dokumentVersion: dok.version,
        });
      }
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

  /** Alle Dokumente abrufen – Admin-Interface */
  listAlleDokumente: portalProtected.query(async () => {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(datenschutzDokumente).orderBy(desc(datenschutzDokumente.createdAt));
  }),

  /** Einzelnes Dokument bearbeiten (Admin) */
  updateDokument: portalProtected
    .input(z.object({
      id: z.number().int().positive(),
      titel: z.string().min(1),
      inhalt: z.string().min(1),
      version: z.string().min(1),
      aktiv: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.update(datenschutzDokumente)
        .set({ titel: input.titel, inhalt: input.inhalt, version: input.version, aktiv: input.aktiv ?? true })
        .where(eq(datenschutzDokumente.id, input.id));
      return { success: true };
    }),

  /** Dokument als neue Version anlegen (versioniert, altes wird deaktiviert) */
  neueVersion: portalProtected
    .input(z.object({
      id: z.number().int().positive(),
      titel: z.string().min(1),
      inhalt: z.string().min(1),
      neueVersion: z.string().min(1),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const altRows = await db.select().from(datenschutzDokumente).where(eq(datenschutzDokumente.id, input.id)).limit(1);
      if (altRows.length === 0) throw new TRPCError({ code: "NOT_FOUND" });
      const alt = altRows[0];
      await db.update(datenschutzDokumente).set({ aktiv: false }).where(eq(datenschutzDokumente.id, input.id));
      await db.insert(datenschutzDokumente).values({
        typ: alt.typ, titel: input.titel, inhalt: input.inhalt, version: input.neueVersion, aktiv: true,
      });
      return { success: true };
    }),

  /** Dokument deaktivieren (kein Hard-Delete, Audit-Trail bleibt erhalten) */
  deaktiviereDokument: portalProtected
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.update(datenschutzDokumente).set({ aktiv: false }).where(eq(datenschutzDokumente.id, input.id));
      return { success: true };
    }),
});
