import { z } from "zod";
import { router } from "../_core/trpc";
import { portalProtected, adminProcedure } from "../portalAuth";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import {
  integrationen,
  integrationsLaeufe,
  analyseSnapshots,
  backupProtokolle,
  einsaetze as einsaetzeTable,
  kunden as kundenTable,
  mitarbeiter as mitarbeiterTable,
  fahrten as fahrtenTable,
  leistungen as leistungenTable,
} from "../../drizzle/schema";
import { eq, desc, sql, gte, and } from "drizzle-orm";


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
      const rows = await db.select().from(integrationen).where(eq(integrationen.id, input.id)).limit(1);
      if (rows.length === 0) throw new TRPCError({ code: "NOT_FOUND" });
      const integration = rows[0];
      const testOk = integration.status === "aktiv" && !!integration.basisUrl;
      await db
        .update(integrationen)
        .set({ letzterTestAt: new Date(), letzterTestStatus: testOk ? "erfolg" : "fehler" })
        .where(eq(integrationen.id, input.id));
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

  /** Umsatzprognose: geplante Einsätze × Stundensätze */
  umsatzPrognose: portalProtected
    .input(z.object({ monate: z.number().int().min(1).max(12).default(3) }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return { prognose: [], gesamt: 0 };
      const heute = new Date();
      const ergebnis: { monat: string; geplant: number; abgeschlossen: number; umsatz: number }[] = [];
      for (let i = 0; i < input.monate; i++) {
        const d = new Date(heute.getFullYear(), heute.getMonth() + i, 1);
        const monatStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        const rows = await db
          .select({ status: einsaetzeTable.status, dauerStunden: einsaetzeTable.dauerStunden })
          .from(einsaetzeTable)
          .where(sql`DATE_FORMAT(${einsaetzeTable.datum}, '%Y-%m') = ${monatStr}`);
        const geplant = rows.filter((r) => r.status === "geplant").length;
        const abgeschlossen = rows.filter((r) => r.status === "abgeschlossen").length;
        const stunden = rows.reduce((s, r) => s + parseFloat(String(r.dauerStunden ?? 0)), 0);
        ergebnis.push({ monat: monatStr, geplant, abgeschlossen, umsatz: Math.round(stunden * 28.5) });
      }
      return { prognose: ergebnis, gesamt: ergebnis.reduce((s, r) => s + r.umsatz, 0) };
    }),

  /** Mitarbeiter-Auslastungsanalyse */
  mitarbeiterAuslastung: portalProtected.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];
    const heute = new Date();
    const monatsStart = `${heute.getFullYear()}-${String(heute.getMonth() + 1).padStart(2, "0")}-01`;
    const alleMa = await db.select().from(mitarbeiterTable);
    const monEinsaetze = await db
      .select({ mitarbeiterId: einsaetzeTable.mitarbeiterId, dauerStunden: einsaetzeTable.dauerStunden })
      .from(einsaetzeTable)
      .where(sql`DATE(${einsaetzeTable.datum}) >= ${monatsStart}`);
    return alleMa.map((m) => {
      const meineE = monEinsaetze.filter((e) => e.mitarbeiterId === m.id);
      const ist = meineE.reduce((s, e) => s + parseFloat(String(e.dauerStunden ?? 0)), 0);
      const soll = m.beschaeftigungsart === "minijob" ? 40 : m.beschaeftigungsart === "teilzeit" ? 80 : 160;
      const ampel = ist / soll >= 0.9 ? "gruen" : ist / soll >= 0.6 ? "gelb" : "rot";
      return {
        id: m.id,
        name: `${m.vorname} ${m.nachname}`,
        art: m.beschaeftigungsart ?? "vollzeit",
        istStunden: Math.round(ist * 10) / 10,
        sollStunden: soll,
        auslastungProzent: Math.min(100, Math.round((ist / soll) * 100)),
        ampel,
      };
    });
  }),

  /** Kundenzuwachs-Analyse */
  kundenzuwachs: portalProtected
    .input(z.object({ monate: z.number().int().min(1).max(12).default(6) }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];
      const heute = new Date();
      const ergebnis: { monat: string; gesamt: number; aktiv: number; neu: number }[] = [];
      for (let i = input.monate - 1; i >= 0; i--) {
        const d = new Date(heute.getFullYear(), heute.getMonth() - i, 1);
        const monatStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        const alleKunden = await db.select({ id: kundenTable.id, aktiv: kundenTable.aktiv, createdAt: kundenTable.createdAt }).from(kundenTable);
        const gesamt = alleKunden.length;
        const aktiv = alleKunden.filter((k) => k.aktiv != null).length;
        const neu = alleKunden.filter((k) => {
          const ca = k.createdAt ? new Date(k.createdAt) : null;
          return ca && `${ca.getFullYear()}-${String(ca.getMonth() + 1).padStart(2, "0")}` === monatStr;
        }).length;
        ergebnis.push({ monat: monatStr, gesamt, aktiv, neu });
      }
      return ergebnis;
    }),

  /** Pflegegradanalyse */
  pflegegradAnalyse: portalProtected.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];
    const kunden = await db.select({ pflegegrad: kundenTable.pflegegrad, aktiv: kundenTable.aktiv }).from(kundenTable);
    const verteilung: Record<number, { gesamt: number; aktiv: number }> = {};
    for (let pg = 1; pg <= 5; pg++) verteilung[pg] = { gesamt: 0, aktiv: 0 };
    kunden.forEach((k) => {
      const pg = k.pflegegrad ?? 0;
      if (pg >= 1 && pg <= 5) {
        verteilung[pg].gesamt++;
        if (k.aktiv) verteilung[pg].aktiv++;
      }
    });
    return Object.entries(verteilung).map(([pg, v]) => ({ pflegegrad: Number(pg), ...v }));
  }),

  /** Pünktlichkeitsanalyse */
  puenktlichkeit: portalProtected.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return { puenktlich: 0, verspaetet: 0, quote: 100 };
    const einsaetze = await db
      .select({ status: einsaetzeTable.status, startzeit: einsaetzeTable.startzeit })
      .from(einsaetzeTable)
      .where(sql`${einsaetzeTable.status} = 'abgeschlossen'`)
      .limit(200);
    const puenktlich = einsaetze.filter((e) => e.startzeit !== null).length;
    const verspaetet = einsaetze.length - puenktlich;
    const quote = einsaetze.length > 0 ? Math.round((puenktlich / einsaetze.length) * 100) : 100;
    return { puenktlich, verspaetet, quote, gesamt: einsaetze.length };
  }),

  /** Analyse-Dashboard-Zusammenfassung */
  getDashboard: portalProtected.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return null;
    const heute = new Date();
    const monatsStart = `${heute.getFullYear()}-${String(heute.getMonth() + 1).padStart(2, "0")}-01`;
    const [alleKunden, alleMa, monEinsaetze, alleFahrten] = await Promise.all([
      db.select({ id: kundenTable.id, aktiv: kundenTable.aktiv }).from(kundenTable),
      db.select({ id: mitarbeiterTable.id, aktiv: mitarbeiterTable.aktiv }).from(mitarbeiterTable),
      db.select({ status: einsaetzeTable.status, dauerStunden: einsaetzeTable.dauerStunden }).from(einsaetzeTable).where(sql`DATE(${einsaetzeTable.datum}) >= ${monatsStart}`),
      db.select({ kilometer: fahrtenTable.kilometer }).from(fahrtenTable).where(sql`DATE(${fahrtenTable.datum}) >= ${monatsStart}`),
    ]);
    const stunden = monEinsaetze.reduce((s, e) => s + parseFloat(String(e.dauerStunden ?? 0)), 0);
    const km = alleFahrten.reduce((s, f) => s + parseFloat(String(f.kilometer ?? 0)), 0);
    return {
      aktiveKunden: alleKunden.filter((k) => k.aktiv).length,
      aktiveMitarbeiter: alleMa.filter((m) => m.aktiv != null).length,
      monatsEinsaetze: monEinsaetze.length,
      abgeschlosseneEinsaetze: monEinsaetze.filter((e) => e.status === "abgeschlossen").length,
      monatsStunden: Math.round(stunden * 10) / 10,
      monatsKm: Math.round(km),
      umsatzPrognose: Math.round(stunden * 28.5),
    };
  }),
});
