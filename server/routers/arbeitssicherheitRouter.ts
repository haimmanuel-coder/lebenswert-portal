import { z } from "zod";
import { router } from "../_core/trpc.js";
import { adminProcedure, portalProtected } from "../portalAuth.js";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db.js";
import { eq, and, isNull, desc, asc, lte, gte, isNotNull } from "drizzle-orm";
import {
  gefaehrdungsbeurteilungen,
  psaAusgaben,
  arbeitsmedVorsorgen,
  alleinarbeitsProtokolle,
  arbeitssicherheitUnterweisungen,
  mitarbeiter,
} from "../../drizzle/schema.js";

// ─── Hilfsfunktionen ────────────────────────────────────────────────────────

function addYears(dateStr: string, years: number): string {
  const d = new Date(dateStr);
  d.setFullYear(d.getFullYear() + years);
  return d.toISOString().split("T")[0];
}

function todayStr(): string {
  return new Date().toISOString().split("T")[0];
}

// ─── Themen-Labels ──────────────────────────────────────────────────────────
export const UNTERWEISUNG_THEMEN: Record<string, string> = {
  notfall_erste_hilfe: "Verhalten in Notfällen & Erste Hilfe",
  hygiene_desinfektion: "Hygiene- und Desinfektionsmaßnahmen",
  ergonomie_heben_tragen: "Ergonomisches Heben, Tragen und Bewegen",
  deeskalation_demenz: "Deeskalation bei herausforderndem Verhalten",
  verkehrssicherheit: "Verkehrssicherheit bei Dienstfahrten",
  psa_verwendung: "Verwendung persönlicher Schutzausrüstung (PSA)",
  alleinarbeit_schutz: "Schutz bei Alleinarbeit",
  biostoff_infektionsschutz: "Biostoff- und Infektionsschutz",
  sonstiges: "Sonstiges",
};

export const PSA_TYPEN: Record<string, string> = {
  einmalhandschuhe: "Einmalhandschuhe",
  ffp2_maske: "FFP2-Maske",
  mund_nasen_schutz: "Mund-Nasen-Schutz",
  schutzkittel: "Schutzkittel",
  schutzbrille: "Schutzbrille",
  desinfektionsmittel: "Händedesinfektionsmittel",
  sonstiges: "Sonstiges",
};

export const BEREICH_LABELS: Record<string, string> = {
  haushalt_senior: "Haushalt beim Senioren",
  wegeunfall: "Wegeunfall / Dienstfahrt",
  ergonomie_physisch: "Ergonomie & physische Belastung",
  psychisch: "Psychische Belastung",
  hygiene_infektion: "Hygiene & Infektionsschutz",
  sonstiges: "Sonstiges",
};

// ─── Router ─────────────────────────────────────────────────────────────────

export const arbeitssicherheitRouter = router({

  // ── Gefährdungsbeurteilung ────────────────────────────────────────────────
  gefaehrdung: router({
    list: adminProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(gefaehrdungsbeurteilungen).orderBy(desc(gefaehrdungsbeurteilungen.createdAt));
    }),

    create: adminProcedure
      .input(z.object({
        titel: z.string().min(1),
        bereich: z.enum(["haushalt_senior","wegeunfall","ergonomie_physisch","psychisch","hygiene_infektion","sonstiges"]),
        risikobeschreibung: z.string().min(1),
        massnahmen: z.string().optional(),
        verantwortlich: z.string().optional(),
        risikoStufe: z.enum(["niedrig","mittel","hoch"]).default("mittel"),
        naechstePruefung: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        await db.insert(gefaehrdungsbeurteilungen).values({
          titel: input.titel,
          bereich: input.bereich,
          risikobeschreibung: input.risikobeschreibung,
          massnahmen: input.massnahmen ?? null,
          verantwortlich: input.verantwortlich ?? null,
          risikoStufe: input.risikoStufe,
          naechstePruefung: (input.naechstePruefung ?? null) as any,
          erstelltVon: ctx.adminId,
        } as any);
        return { success: true };
      }),

    update: adminProcedure
      .input(z.object({
        id: z.number().int().positive(),
        status: z.enum(["offen","in_bearbeitung","erledigt"]).optional(),
        massnahmen: z.string().optional(),
        naechstePruefung: z.string().optional(),
        risikoStufe: z.enum(["niedrig","mittel","hoch"]).optional(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const upd: Record<string, unknown> = {};
        if (input.status !== undefined) upd.status = input.status;
        if (input.massnahmen !== undefined) upd.massnahmen = input.massnahmen;
        if (input.naechstePruefung !== undefined) upd.naechstePruefung = input.naechstePruefung;
        if (input.risikoStufe !== undefined) upd.risikoStufe = input.risikoStufe;
        await db.update(gefaehrdungsbeurteilungen).set(upd as any).where(eq(gefaehrdungsbeurteilungen.id, input.id));
        return { success: true };
      }),

    delete: adminProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        await db.delete(gefaehrdungsbeurteilungen).where(eq(gefaehrdungsbeurteilungen.id, input.id));
        return { success: true };
      }),
  }),

  // ── PSA-Ausgaben ──────────────────────────────────────────────────────────
  psa: router({
    listByMitarbeiter: adminProcedure
      .input(z.object({ mitarbeiterId: z.number().int().positive() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return [];
        return db.select().from(psaAusgaben)
          .where(eq(psaAusgaben.mitarbeiterId, input.mitarbeiterId))
          .orderBy(desc(psaAusgaben.ausgabeDatum));
      }),

    listAll: adminProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];
      const rows = await db.select({
        id: psaAusgaben.id,
        mitarbeiterId: psaAusgaben.mitarbeiterId,
        psaTyp: psaAusgaben.psaTyp,
        groesse: psaAusgaben.groesse,
        menge: psaAusgaben.menge,
        ausgabeDatum: psaAusgaben.ausgabeDatum,
        rueckgabeDatum: psaAusgaben.rueckgabeDatum,
        zustand: psaAusgaben.zustand,
        notizen: psaAusgaben.notizen,
        createdAt: psaAusgaben.createdAt,
        maVorname: mitarbeiter.vorname,
        maNachname: mitarbeiter.nachname,
      })
        .from(psaAusgaben)
        .leftJoin(mitarbeiter, eq(psaAusgaben.mitarbeiterId, mitarbeiter.id))
        .orderBy(desc(psaAusgaben.ausgabeDatum));
      return rows;
    }),

    create: adminProcedure
      .input(z.object({
        mitarbeiterId: z.number().int().positive(),
        psaTyp: z.enum(["einmalhandschuhe","ffp2_maske","mund_nasen_schutz","schutzkittel","schutzbrille","desinfektionsmittel","sonstiges"]),
        groesse: z.string().optional(),
        menge: z.number().int().min(1).default(1),
        ausgabeDatum: z.string().min(1),
        notizen: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        await db.insert(psaAusgaben).values({
          mitarbeiterId: input.mitarbeiterId,
          psaTyp: input.psaTyp,
          groesse: input.groesse ?? null,
          menge: input.menge,
          ausgabeDatum: input.ausgabeDatum as any,
          notizen: input.notizen ?? null,
          ausgegebenVon: ctx.adminId,
        } as any);
        return { success: true };
      }),

    rueckgabe: adminProcedure
      .input(z.object({ id: z.number().int().positive(), rueckgabeDatum: z.string().min(1) }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        await db.update(psaAusgaben)
          .set({ rueckgabeDatum: input.rueckgabeDatum as any, zustand: "zurueckgegeben" } as any)
          .where(eq(psaAusgaben.id, input.id));
        return { success: true };
      }),

    delete: adminProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        await db.delete(psaAusgaben).where(eq(psaAusgaben.id, input.id));
        return { success: true };
      }),

    meinePsa: portalProtected.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(psaAusgaben)
        .where(eq(psaAusgaben.mitarbeiterId, ctx.mitarbeiterId))
        .orderBy(desc(psaAusgaben.ausgabeDatum));
    }),
  }),

  // ── Arbeitsmedizinische Vorsorge ──────────────────────────────────────────
  vorsorge: router({
    listByMitarbeiter: adminProcedure
      .input(z.object({ mitarbeiterId: z.number().int().positive() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return [];
        return db.select().from(arbeitsmedVorsorgen)
          .where(eq(arbeitsmedVorsorgen.mitarbeiterId, input.mitarbeiterId))
          .orderBy(desc(arbeitsmedVorsorgen.faelligkeit));
      }),

    listAll: adminProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];
      const rows = await db.select({
        id: arbeitsmedVorsorgen.id,
        mitarbeiterId: arbeitsmedVorsorgen.mitarbeiterId,
        vorsorgeart: arbeitsmedVorsorgen.vorsorgeart,
        anlass: arbeitsmedVorsorgen.anlass,
        faelligkeit: arbeitsmedVorsorgen.faelligkeit,
        durchgefuehrtAm: arbeitsmedVorsorgen.durchgefuehrtAm,
        arzt: arbeitsmedVorsorgen.arzt,
        ergebnis: arbeitsmedVorsorgen.ergebnis,
        naechsteFaelligkeit: arbeitsmedVorsorgen.naechsteFaelligkeit,
        notizen: arbeitsmedVorsorgen.notizen,
        createdAt: arbeitsmedVorsorgen.createdAt,
        maVorname: mitarbeiter.vorname,
        maNachname: mitarbeiter.nachname,
      })
        .from(arbeitsmedVorsorgen)
        .leftJoin(mitarbeiter, eq(arbeitsmedVorsorgen.mitarbeiterId, mitarbeiter.id))
        .orderBy(asc(arbeitsmedVorsorgen.faelligkeit));
      return rows;
    }),

    create: adminProcedure
      .input(z.object({
        mitarbeiterId: z.number().int().positive(),
        vorsorgeart: z.enum(["pflicht","angebot","wunsch"]),
        anlass: z.string().min(1),
        faelligkeit: z.string().min(1),
        arzt: z.string().optional(),
        notizen: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        await db.insert(arbeitsmedVorsorgen).values({
          mitarbeiterId: input.mitarbeiterId,
          vorsorgeart: input.vorsorgeart,
          anlass: input.anlass,
          faelligkeit: input.faelligkeit as any,
          arzt: input.arzt ?? null,
          notizen: input.notizen ?? null,
        } as any);
        return { success: true };
      }),

    abschliessen: adminProcedure
      .input(z.object({
        id: z.number().int().positive(),
        durchgefuehrtAm: z.string().min(1),
        ergebnis: z.enum(["geeignet","bedingt_geeignet","nicht_geeignet"]),
        arzt: z.string().optional(),
        naechsteFaelligkeit: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        await db.update(arbeitsmedVorsorgen)
          .set({
            durchgefuehrtAm: input.durchgefuehrtAm as any,
            ergebnis: input.ergebnis,
            arzt: input.arzt ?? null,
            naechsteFaelligkeit: (input.naechsteFaelligkeit ?? null) as any,
          } as any)
          .where(eq(arbeitsmedVorsorgen.id, input.id));
        return { success: true };
      }),

    delete: adminProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        await db.delete(arbeitsmedVorsorgen).where(eq(arbeitsmedVorsorgen.id, input.id));
        return { success: true };
      }),

    meineVorsorgen: portalProtected.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(arbeitsmedVorsorgen)
        .where(eq(arbeitsmedVorsorgen.mitarbeiterId, ctx.mitarbeiterId))
        .orderBy(asc(arbeitsmedVorsorgen.faelligkeit));
    }),
  }),

  // ── Alleinarbeit ──────────────────────────────────────────────────────────
  alleinarbeit: router({
    checkIn: portalProtected
      .input(z.object({
        kundenId: z.number().int().positive().optional(),
        einsatzId: z.number().int().positive().optional(),
        notfallKontakt: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        // Vorherige offene Check-ins automatisch schließen
        await db.update(alleinarbeitsProtokolle)
          .set({ checkInStatus: "ausgecheckt", checkOutZeit: new Date() } as any)
          .where(and(
            eq(alleinarbeitsProtokolle.mitarbeiterId, ctx.mitarbeiterId),
            eq(alleinarbeitsProtokolle.checkInStatus, "eingecheckt"),
          ));
        await db.insert(alleinarbeitsProtokolle).values({
          mitarbeiterId: ctx.mitarbeiterId,
          kundenId: input.kundenId ?? null,
          einsatzId: input.einsatzId ?? null,
          checkInZeit: new Date(),
          checkInStatus: "eingecheckt",
          notfallKontakt: input.notfallKontakt ?? null,
        } as any);
        return { success: true };
      }),

    checkOut: portalProtected
      .input(z.object({ bemerkung: z.string().optional() }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        await db.update(alleinarbeitsProtokolle)
          .set({
            checkInStatus: "ausgecheckt",
            checkOutZeit: new Date(),
            bemerkung: input.bemerkung ?? null,
          } as any)
          .where(and(
            eq(alleinarbeitsProtokolle.mitarbeiterId, ctx.mitarbeiterId),
            eq(alleinarbeitsProtokolle.checkInStatus, "eingecheckt"),
          ));
        return { success: true };
      }),

    meinStatus: portalProtected.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return null;
      const rows = await db.select().from(alleinarbeitsProtokolle)
        .where(and(
          eq(alleinarbeitsProtokolle.mitarbeiterId, ctx.mitarbeiterId),
          eq(alleinarbeitsProtokolle.checkInStatus, "eingecheckt"),
        ))
        .orderBy(desc(alleinarbeitsProtokolle.checkInZeit))
        .limit(1);
      return rows[0] ?? null;
    }),

    meinVerlauf: portalProtected.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(alleinarbeitsProtokolle)
        .where(eq(alleinarbeitsProtokolle.mitarbeiterId, ctx.mitarbeiterId))
        .orderBy(desc(alleinarbeitsProtokolle.createdAt))
        .limit(30);
    }),

    listOffen: adminProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];
      const rows = await db.select({
        id: alleinarbeitsProtokolle.id,
        mitarbeiterId: alleinarbeitsProtokolle.mitarbeiterId,
        kundenId: alleinarbeitsProtokolle.kundenId,
        checkInZeit: alleinarbeitsProtokolle.checkInZeit,
        checkInStatus: alleinarbeitsProtokolle.checkInStatus,
        notfallKontakt: alleinarbeitsProtokolle.notfallKontakt,
        maVorname: mitarbeiter.vorname,
        maNachname: mitarbeiter.nachname,
      })
        .from(alleinarbeitsProtokolle)
        .leftJoin(mitarbeiter, eq(alleinarbeitsProtokolle.mitarbeiterId, mitarbeiter.id))
        .where(eq(alleinarbeitsProtokolle.checkInStatus, "eingecheckt"))
        .orderBy(asc(alleinarbeitsProtokolle.checkInZeit));
      return rows;
    }),

    notfallMelden: adminProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        await db.update(alleinarbeitsProtokolle)
          .set({ checkInStatus: "notfall" } as any)
          .where(eq(alleinarbeitsProtokolle.id, input.id));
        return { success: true };
      }),
  }),

  // ── Unterweisungen ────────────────────────────────────────────────────────
  unterweisung: router({
    listByMitarbeiter: adminProcedure
      .input(z.object({ mitarbeiterId: z.number().int().positive() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return [];
        return db.select().from(arbeitssicherheitUnterweisungen)
          .where(eq(arbeitssicherheitUnterweisungen.mitarbeiterId, input.mitarbeiterId))
          .orderBy(desc(arbeitssicherheitUnterweisungen.unterweisungsDatum));
      }),

    listAll: adminProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];
      const rows = await db.select({
        id: arbeitssicherheitUnterweisungen.id,
        mitarbeiterId: arbeitssicherheitUnterweisungen.mitarbeiterId,
        thema: arbeitssicherheitUnterweisungen.thema,
        unterweisungsDatum: arbeitssicherheitUnterweisungen.unterweisungsDatum,
        naechsteFaelligkeit: arbeitssicherheitUnterweisungen.naechsteFaelligkeit,
        bestaetigt: arbeitssicherheitUnterweisungen.bestaetigt,
        bestaetigtAm: arbeitssicherheitUnterweisungen.bestaetigtAm,
        inhalt: arbeitssicherheitUnterweisungen.inhalt,
        createdAt: arbeitssicherheitUnterweisungen.createdAt,
        maVorname: mitarbeiter.vorname,
        maNachname: mitarbeiter.nachname,
      })
        .from(arbeitssicherheitUnterweisungen)
        .leftJoin(mitarbeiter, eq(arbeitssicherheitUnterweisungen.mitarbeiterId, mitarbeiter.id))
        .orderBy(desc(arbeitssicherheitUnterweisungen.unterweisungsDatum));
      return rows;
    }),

    adminCreate: adminProcedure
      .input(z.object({
        mitarbeiterId: z.number().int().positive(),
        thema: z.enum(["notfall_erste_hilfe","hygiene_desinfektion","ergonomie_heben_tragen","deeskalation_demenz","verkehrssicherheit","psa_verwendung","alleinarbeit_schutz","biostoff_infektionsschutz","sonstiges"]),
        unterweisungsDatum: z.string().min(1),
        inhalt: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const naechste = addYears(input.unterweisungsDatum, 1);
        await db.insert(arbeitssicherheitUnterweisungen).values({
          mitarbeiterId: input.mitarbeiterId,
          thema: input.thema,
          unterweisungsDatum: input.unterweisungsDatum as any,
          naechsteFaelligkeit: naechste as any,
          inhalt: input.inhalt ?? null,
          durchgefuehrtVon: ctx.adminId,
        } as any);
        return { success: true };
      }),

    bestaetigen: portalProtected
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        // Nur eigene Unterweisungen bestätigen
        const rows = await db.select().from(arbeitssicherheitUnterweisungen)
          .where(and(
            eq(arbeitssicherheitUnterweisungen.id, input.id),
            eq(arbeitssicherheitUnterweisungen.mitarbeiterId, ctx.mitarbeiterId),
          )).limit(1);
        if (!rows[0]) throw new TRPCError({ code: "FORBIDDEN" });
        await db.update(arbeitssicherheitUnterweisungen)
          .set({ bestaetigt: true, bestaetigtAm: new Date() } as any)
          .where(eq(arbeitssicherheitUnterweisungen.id, input.id));
        return { success: true };
      }),

    meineUnterweisungen: portalProtected.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(arbeitssicherheitUnterweisungen)
        .where(eq(arbeitssicherheitUnterweisungen.mitarbeiterId, ctx.mitarbeiterId))
        .orderBy(desc(arbeitssicherheitUnterweisungen.unterweisungsDatum));
    }),

    delete: adminProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        await db.delete(arbeitssicherheitUnterweisungen).where(eq(arbeitssicherheitUnterweisungen.id, input.id));
        return { success: true };
      }),
  }),

  // ── Dashboard / KPIs ──────────────────────────────────────────────────────
  dashboard: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) return { offeneGefaehrdungen: 0, psaAusgabenGesamt: 0, ueberfaelligeVorsorgen: 0, offeneAlleinarbeit: 0, offeneUnterweisungen: 0 };

    const today = todayStr();

    const [gefaehrdungRows, psaRows, vorsorgeRows, alleinarbeitRows, unterweisungRows] = await Promise.all([
      db.select({ id: gefaehrdungsbeurteilungen.id })
        .from(gefaehrdungsbeurteilungen)
        .where(eq(gefaehrdungsbeurteilungen.status, "offen")),
      db.select({ id: psaAusgaben.id }).from(psaAusgaben),
      db.select({ id: arbeitsmedVorsorgen.id })
        .from(arbeitsmedVorsorgen)
        .where(and(
          lte(arbeitsmedVorsorgen.faelligkeit, today as any),
          eq(arbeitsmedVorsorgen.ergebnis, "ausstehend"),
        )),
      db.select({ id: alleinarbeitsProtokolle.id })
        .from(alleinarbeitsProtokolle)
        .where(eq(alleinarbeitsProtokolle.checkInStatus, "eingecheckt")),
      db.select({ id: arbeitssicherheitUnterweisungen.id })
        .from(arbeitssicherheitUnterweisungen)
        .where(eq(arbeitssicherheitUnterweisungen.bestaetigt, false)),
    ]);

    return {
      offeneGefaehrdungen: gefaehrdungRows.length,
      psaAusgabenGesamt: psaRows.length,
      ueberfaelligeVorsorgen: vorsorgeRows.length,
      offeneAlleinarbeit: alleinarbeitRows.length,
      offeneUnterweisungen: unterweisungRows.length,
    };
  }),
});
