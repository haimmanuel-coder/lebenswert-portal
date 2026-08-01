import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";
import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { STUNDENSATZ, ANFAHRT_PAUSCHALE, berechneEinsatzkostenInklPauschale } from "@shared/leistungssaetze";

/**
 * Entscheidung 4: Die Rolle "buchhaltung" darf abrechnungsrelevante Daten sehen,
 * aber keine Pflegedokumentation oder Gesundheitsdaten. Diese Funktion entfernt
 * die entsprechenden Felder aus einem Einsatz-Datensatz, bevor er an die
 * Buchhaltung ausgeliefert wird.
 */
function entferneGesundheitsdaten<T extends Record<string, any>>(einsatz: T): T {
  const { bericht, gesundheit, bemerkung, unterschriftMitarbeiter, unterschriftKunde, ...rest } = einsatz as any;
  return rest as T;
}
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { sql, eq, desc, and } from "drizzle-orm";
import { getDb } from "./db";
import { einsaetze as einsaetzeTable, mitarbeiterDokumente, vertretungen, mitarbeiter, einsatzAenderungen, kunden as kundenTable, notifications as notificationsTable } from "../drizzle/schema";
import {
  getMitarbeiterByEmail,
  getMitarbeiterById,
  getAllMitarbeiter,
  createMitarbeiter,
  updateMitarbeiter,
  getAllKunden,
  getKundeById,
  createKunde,
  updateKunde,
  getKundenByMitarbeiter,
  getEinsatzById,
  getEinsaetzeMitAusstehenderFreigabe,
  setUnterschriftFreigabe,
  setKundenZuordnung,
  getZuordnungenForMitarbeiter,
  getZuordnungenForKunde,
  setZuordnungenForKunde,
  isMitarbeiterZugeordnet,
  getEinsaetzeByMitarbeiter,
  getAllEinsaetze,
  getEinsaetzeWithKunden,
  getEinsaetzeByKunde,
  createEinsatz,
  updateEinsatzStatus,
  getLeistungenByMitarbeiter,
  getAllLeistungen,
  getLeistungenByKunde,
  createLeistung,
  updateLeistungStatus,
  deleteLeistung,
  getFahrtenByMitarbeiter,
  getAllFahrten,
  getFahrtenByKunde,
  getFahrtenByMonat,
  createFahrt,
  updateFahrtStatus,
  createAuditLog,
  getAuditLogs,
  getMonatsabschluesse,
  createMonatsabschluss,
  getMonatsStatistik,
  createPasswordResetToken,
  getValidPasswordResetToken,
  markPasswordResetTokenUsed,
  updateMitarbeiterPasswort,
  updateKundeBudget,
  getKundenMitBudgetWarnung,
  istBudgetKritisch,
  getAllKostentraeger,
  searchKostentraeger,
  getKostentraegerById,
  createKostentraeger,
  updateKostentraeger,
  getAllTextbausteine,
  createTextbaustein,
  updateTextbaustein,
  deleteTextbaustein,
  createEBriefLog,
  getEBriefLogs,
  getEbriefLog,
  getEbriefLogByKunde,
  getPflegegradBudgets,
  getLeistungenFuerExport,
  getFahrtenFuerExport,
  getFuehrerscheinChecks,
  createFuehrerscheinCheck,
  updateFuehrerscheinStatus,
  getAllNeukundenaufnahmen,
  createNeukundenaufnahme,
  updateNeukundenaufnahmeStatus,
  createNeukundenPushEintraege,
  getOffeneNeukundenPushFuerMitarbeiter,
  bestaetigeNeukundenPush,
  getAlleOffenenNeukundenPush,
  createVertretungsUebernahme,
  hatVertretungsVollzugriff,
  getAktiveVertretungenFuerMitarbeiter,
  getVertretungsKundenFuerUrlaub,
  getUnterschreitungsZaehler,
} from "./db";
import { ENV } from "./_core/env";
import { adminProcedure, decryptSecret, encryptSecret, portalProcedure, portalProtected, PORTAL_COOKIE, signPortalToken, verifyPortalToken, roleProcedure } from "./portalAuth";
import * as OTPAuth from "otpauth";
import QRCode from "qrcode";
import { pflichtenheftRouter } from "./pflichtenheftRouter";
import { planungRouter } from "./planungRouter";
import { VAPID_PUBLIC, sendBudgetWarnungPush } from "./webpush";
import { twoFactorRouter } from "./routers/twoFactorRouter";
import { datenschutzRouter } from "./routers/datenschutzRouter";
import { verfuegbarkeitenRouter } from "./routers/verfuegbarkeitenRouter";
import { besuchsberichteRouter } from "./routers/besuchsberichteRouter";
import { integrationenRouter, analysenRouter } from "./routers/integrationenRouter";
import { rbacRouter } from "./routers/rbacRouter";
import { umwidmungRouter, sonderfahrtRouter, rechnungspositionRouter, privatrechnungRouter, importRouter } from "./routers/privatrechnungRouter";
import {
  savePushSubscription,
  deletePushSubscription,
  getAllPushSubscriptions,
  getPushSubscriptionsByMitarbeiter,
  getAllKassenanfragen,
  getKassenanfragenByKunde,
  createKassenanfrage,
  updateKassenanfrageStatus,
  // Phase 15
  getAllUrlaubsantraege,
  getUrlaubsantraegeByMitarbeiter,
  createUrlaubsantrag,
  updateUrlaubsantragStatus,
  deleteUrlaubsantrag,
  deleteFahrt,
  getAllKrankmeldungen,
  getKrankmeldungenByMitarbeiter,
  createKrankmeldung,
  deleteKrankmeldung,
  getAllTouren,
  getTourenByMitarbeiter,
  getTourenByDatum,
  createTour,
  updateTourStatus,
  getTourEinsaetze,
  addEinsatzToTour,
  removeEinsatzFromTour,
  updateTourReihenfolge,
  getNotificationsByMitarbeiter,
  getUnreadNotificationCount,
  createNotification,
  markNotificationRead,
  markAllNotificationsRead,
  createRefreshToken,
  getValidRefreshToken,
  invalidateRefreshToken,
  invalidateAllRefreshTokensForMitarbeiter,
  checkDoppelbelegung,
  getBudgetHistorie,
} from "./db";

export const urlaubRouter = router({
  list: portalProtected.query(async ({ ctx }) => {
    const ma = await getMitarbeiterById(ctx.mitarbeiterId);
    if (ma?.rolle === 'admin') return getAllUrlaubsantraege();
    return getUrlaubsantraegeByMitarbeiter(ctx.mitarbeiterId);
  }),
  create: portalProtected
    .input(z.object({
      von: z.string(),
      bis: z.string(),
      tage: z.number().int().min(1),
      notizen: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      await createUrlaubsantrag({ mitarbeiterId: ctx.mitarbeiterId, von: new Date(input.von), bis: new Date(input.bis), tage: input.tage, notizen: input.notizen, status: 'beantragt' });
      // Benachrichtigung an Admin
      const allMa = await getAllMitarbeiter();
      const admins = allMa.filter((m: { rolle: string }) => m.rolle === 'admin');
      const antragsteller = await getMitarbeiterById(ctx.mitarbeiterId);
      for (const admin of admins) {
        await createNotification({
          empfaengerId: admin.id,
          titel: 'Urlaubsantrag eingegangen',
          nachricht: `${antragsteller?.vorname} ${antragsteller?.nachname} hat Urlaub vom ${input.von} bis ${input.bis} (${input.tage} Tage) beantragt.`,
          typ: 'info',
        });
      }
      await createAuditLog({ mitarbeiterId: ctx.mitarbeiterId, action: 'CREATE', ressource: 'urlaub', status: 'success' });
      return { success: true };
    }),
  updateStatus: adminProcedure
    .input(z.object({
      id: z.number().int().positive(),
      status: z.enum(['beantragt', 'genehmigt', 'abgelehnt']),
      adminNotiz: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      await updateUrlaubsantragStatus(input.id, input.status, input.adminNotiz);
      await createAuditLog({ mitarbeiterId: ctx.adminId, action: 'UPDATE', ressource: 'urlaub', details: `id=${input.id} status=${input.status}`, status: 'success' });

      // P2: Bei Genehmigung → DSGVO-Mindestdaten-Push an alle anderen Mitarbeiter
      if (input.status === 'genehmigt') {
        try {
          const kundenDsgvo = await getVertretungsKundenFuerUrlaub(input.id);
          if (kundenDsgvo.length > 0) {
            const alleMa = await getAllMitarbeiter();
            const urlaubsRows = await (await import('./db')).getDb().then(async (db) => {
              if (!db) return [];
              const { urlaubsantraege } = await import('../drizzle/schema');
              const { eq } = await import('drizzle-orm');
              return db.select().from(urlaubsantraege).where(eq(urlaubsantraege.id, input.id)).limit(1);
            });
            const urlaubMitarbeiterId = (urlaubsRows as any[])[0]?.mitarbeiterId;
            const andereMA = alleMa.filter((m: { id: number }) => m.id !== urlaubMitarbeiterId);
            const kundenNamen = kundenDsgvo.map((k: { vorname: string; nachname: string }) => `${k.vorname} ${k.nachname}`).join(', ');
            for (const ma of andereMA) {
              await createNotification({
                empfaengerId: ma.id,
                titel: 'Vertretung benötigt – DSGVO-Mindestdaten',
                nachricht: `Ein Kollege ist im Urlaub. Folgende Kunden benötigen Vertretung: ${kundenNamen}. Bitte Übernahme bestätigen.`,
                typ: 'warnung',
              });
            }
          }
        } catch (e) { console.warn('[P2] Vertretungs-Push fehlgeschlagen:', e); }
      }
      return { success: true };
    }),
  delete: portalProtected
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input, ctx }) => {
      const ma = await getMitarbeiterById(ctx.mitarbeiterId);
      // Nur eigene Anträge löschen (oder Admin darf alle löschen)
      const antraege = await getUrlaubsantraegeByMitarbeiter(ctx.mitarbeiterId);
      const eigenerAntrag = antraege.find((a: { id: number }) => a.id === input.id);
      if (!eigenerAntrag && ma?.rolle !== 'admin') throw new Error('Keine Berechtigung');
      await deleteUrlaubsantrag(input.id);
      await createAuditLog({ mitarbeiterId: ctx.mitarbeiterId, action: 'DELETE', ressource: 'urlaub', details: `id=${input.id}`, status: 'success' });
      return { success: true };
    }),
});

export const krankRouter = router({
  list: portalProtected.query(async ({ ctx }) => {
    const ma = await getMitarbeiterById(ctx.mitarbeiterId);
    if (ma?.rolle === 'admin') return getAllKrankmeldungen();
    return getKrankmeldungenByMitarbeiter(ctx.mitarbeiterId);
  }),
  create: portalProtected
    .input(z.object({
      von: z.string(),
      bis: z.string().optional(),
      tage: z.number().int().min(1).optional(),
      notizen: z.string().optional(),
      auAttest: z.boolean().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      await createKrankmeldung({ mitarbeiterId: ctx.mitarbeiterId, von: new Date(input.von), bis: input.bis ? new Date(input.bis) : undefined, tage: input.tage, notizen: input.notizen, auAttest: input.auAttest });
      const allMa = await getAllMitarbeiter();
      const admins = allMa.filter((m: { rolle: string }) => m.rolle === 'admin');
      const meldender = await getMitarbeiterById(ctx.mitarbeiterId);
      for (const admin of admins) {
        await createNotification({
          empfaengerId: admin.id,
          titel: 'Krankmeldung eingegangen',
          nachricht: `${meldender?.vorname} ${meldender?.nachname} hat sich krank gemeldet (ab ${input.von}).`,
          typ: 'warnung',
        });
      }
      await createAuditLog({ mitarbeiterId: ctx.mitarbeiterId, action: 'CREATE', ressource: 'krankmeldung', status: 'success' });
      return { success: true };
    }),
  delete: portalProtected
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input, ctx }) => {
      const ma = await getMitarbeiterById(ctx.mitarbeiterId);
      const meldungen = await getKrankmeldungenByMitarbeiter(ctx.mitarbeiterId);
      const eigeneMeldung = meldungen.find((m: { id: number }) => m.id === input.id);
      if (!eigeneMeldung && ma?.rolle !== 'admin') throw new Error('Keine Berechtigung');
      await deleteKrankmeldung(input.id);
      await createAuditLog({ mitarbeiterId: ctx.mitarbeiterId, action: 'DELETE', ressource: 'krankmeldung', details: `id=${input.id}`, status: 'success' });
      return { success: true };
    }),
});

export const tourenRouter = router({
  list: portalProtected.query(async ({ ctx }) => {
    const ma = await getMitarbeiterById(ctx.mitarbeiterId);
    if (ma?.rolle === 'admin') return getAllTouren();
    return getTourenByMitarbeiter(ctx.mitarbeiterId);
  }),
  byDatum: portalProtected
    .input(z.object({ datum: z.string() }))
    .query(async ({ input }) => getTourenByDatum(input.datum)),
  create: portalProtected
    .input(z.object({
      mitarbeiterId: z.number().int().positive(),
      datum: z.string(),
      notizen: z.string().optional(),
      titel: z.string().max(200).optional(),
      startzeit: z.string().optional(),
      endzeit: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      // ── 2-Wochen-Vorausplanung: Datum darf maximal 14 Tage in der Zukunft liegen ──
      const tourDatum = new Date(input.datum);
      tourDatum.setHours(0, 0, 0, 0);
      const heute = new Date();
      heute.setHours(0, 0, 0, 0);
      const maxDatum = new Date(heute);
      maxDatum.setDate(maxDatum.getDate() + 14);
      if (tourDatum < heute) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Touren können nicht in der Vergangenheit angelegt werden.' });
      if (tourDatum > maxDatum) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Touren können maximal 2 Wochen (14 Tage) im Voraus geplant werden.' });
      await createTour({ mitarbeiterId: input.mitarbeiterId, datum: new Date(input.datum), notizen: input.notizen, titel: input.titel, startzeit: input.startzeit as any, endzeit: input.endzeit as any, angelegtVon: ctx.mitarbeiterId, status: 'geplant' });
      await createAuditLog({ mitarbeiterId: ctx.mitarbeiterId, action: 'CREATE', ressource: 'tour', details: `datum=${input.datum}`, status: 'success' });
      return { success: true };
    }),
  updateStatus: portalProtected
    .input(z.object({
      id: z.number().int().positive(),
      status: z.enum(['geplant', 'aktiv', 'abgeschlossen']),
    }))
    .mutation(async ({ input, ctx }) => {
      await updateTourStatus(input.id, input.status);
      await createAuditLog({ mitarbeiterId: ctx.mitarbeiterId, action: 'UPDATE', ressource: 'tour', details: `id=${input.id} status=${input.status}`, status: 'success' });
      return { success: true };
    }),
  getEinsaetze: portalProtected
    .input(z.object({ tourId: z.number().int().positive() }))
    .query(async ({ input }) => getTourEinsaetze(input.tourId)),
  optimieren: portalProtected
    .input(z.object({ tourId: z.number().int().positive() }))
    .mutation(async ({ input, ctx }) => {
      const ma = await getMitarbeiterById(ctx.mitarbeiterId);
      if (!ma || !['admin', 'teamleitung'].includes(ma.rolle)) throw new TRPCError({ code: 'FORBIDDEN', message: 'Nur Administration und Teamleitung dürfen Touren neu ordnen.' });
      const stopps = await getTourEinsaetze(input.tourId);
      if (stopps.length < 2) return { success: true, anzahl: stopps.length, hinweis: 'Für diese Tour ist keine Neuordnung nötig.' };
      const normalisieren = (wert: string | null | undefined) => (wert || '').trim().toLocaleLowerCase('de-DE');
      const sortiert = [...stopps].sort((a, b) => {
        const aHatAdresse = Boolean(a.plz || a.ort || a.strasse), bHatAdresse = Boolean(b.plz || b.ort || b.strasse);
        if (aHatAdresse !== bHatAdresse) return aHatAdresse ? -1 : 1;
        return normalisieren(a.plz).localeCompare(normalisieren(b.plz), 'de-DE', { numeric: true })
          || normalisieren(a.ort).localeCompare(normalisieren(b.ort), 'de-DE')
          || normalisieren(a.strasse).localeCompare(normalisieren(b.strasse), 'de-DE', { numeric: true });
      });
      await updateTourReihenfolge(input.tourId, sortiert.map(stopp => stopp.id));
      await createAuditLog({ mitarbeiterId: ctx.mitarbeiterId, action: 'OPTIMIZE', ressource: 'tour', details: `id=${input.tourId} stopps=${sortiert.length} methode=lokale_adressbuendelung`, status: 'success' });
      return { success: true, anzahl: sortiert.length, hinweis: 'Stopps wurden datenschutzfreundlich nach räumlichen Adressbereichen gebündelt.' };
    }),
  addEinsatz: portalProtected
    .input(z.object({
      tourId: z.number().int().positive(),
      einsatzId: z.number().int().positive(),
      reihenfolge: z.number().int().min(0).default(0),
    }))
    .mutation(async ({ input, ctx }) => {
      await addEinsatzToTour(input.tourId, input.einsatzId, input.reihenfolge);
      await createAuditLog({ mitarbeiterId: ctx.mitarbeiterId, action: 'UPDATE', ressource: 'tour', details: `addEinsatz einsatzId=${input.einsatzId}`, status: 'success' });
      return { success: true };
    }),
  removeEinsatz: portalProtected
      .input(z.object({
        tourId: z.number().int().positive(),
        einsatzId: z.number().int().positive(),
      }))
      .mutation(async ({ input, ctx }) => {
        await removeEinsatzFromTour(input.tourId, input.einsatzId);
        await createAuditLog({ mitarbeiterId: ctx.mitarbeiterId, action: 'UPDATE', ressource: 'tour', details: `removeEinsatz einsatzId=${input.einsatzId}`, status: 'success' });
        return { success: true };
      }),

  moveTour: portalProtected
    .input(z.object({
      id: z.number().int().positive(),
      newDatum: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    }))
    .mutation(async ({ input, ctx }) => {
      const tourDatum = new Date(input.newDatum);
      tourDatum.setHours(0, 0, 0, 0);
      const heute = new Date(); heute.setHours(0, 0, 0, 0);
      const maxDatum = new Date(heute); maxDatum.setDate(maxDatum.getDate() + 14);
      if (tourDatum < heute) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Touren können nicht in die Vergangenheit verschoben werden.' });
      if (tourDatum > maxDatum) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Touren können maximal 2 Wochen im Voraus geplant werden.' });
      const db = await (await import('./db')).getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'DB nicht verfügbar' });
      const { touren: tourenTable } = await import('../drizzle/schema');
      const { eq } = await import('drizzle-orm');
      await db.update(tourenTable).set({ datum: tourDatum }).where(eq(tourenTable.id, input.id));
      await createAuditLog({ mitarbeiterId: ctx.mitarbeiterId, action: 'UPDATE', ressource: 'tour', details: `moveTour id=${input.id} newDatum=${input.newDatum}`, status: 'success' });
      return { success: true };
    }),

  deleteTour: portalProtected
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input, ctx }) => {
      const db = await (await import('./db')).getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'DB nicht verfügbar' });
      const { touren: tourenTable } = await import('../drizzle/schema');
      const { eq } = await import('drizzle-orm');
      await db.delete(tourenTable).where(eq(tourenTable.id, input.id));
      await createAuditLog({ mitarbeiterId: ctx.mitarbeiterId, action: 'DELETE', ressource: 'tour', details: `id=${input.id}`, status: 'success' });
      return { success: true };
    }),

  // Erstellt eine Tour aus Drag-and-Drop (Kunde aus Sidebar auf Kalender-Tag)
  createFromKunde: portalProtected
    .input(z.object({
      mitarbeiterId: z.number().int().positive(),
      kundenId: z.number().int().positive(),
      datum: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    }))
    .mutation(async ({ input, ctx }) => {
      const tourDatum = new Date(input.datum);
      tourDatum.setHours(0, 0, 0, 0);
      const heute = new Date(); heute.setHours(0, 0, 0, 0);
      const maxDatum = new Date(heute); maxDatum.setDate(maxDatum.getDate() + 14);
      if (tourDatum < heute) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Touren können nicht in der Vergangenheit angelegt werden.' });
      if (tourDatum > maxDatum) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Touren können maximal 2 Wochen im Voraus geplant werden.' });
      const kunde = (await getAllKunden()).find((k: any) => k.id === input.kundenId && Number(k.aktiv ?? 1) === 1);
      if (!kunde) throw new TRPCError({ code: 'NOT_FOUND', message: 'Der ausgewählte Kunde wurde nicht gefunden oder ist deaktiviert.' });
      const titel = `Besuch ${kunde.vorname} ${kunde.nachname}`;
      const tourId = await createTour({
        mitarbeiterId: input.mitarbeiterId,
        datum: tourDatum,
        titel,
        angelegtVon: ctx.mitarbeiterId,
        status: 'geplant',
      });
      const paragraph = ['45b', '45a', '39'].includes(String(kunde.paragraph)) ? kunde.paragraph as '45b' | '45a' | '39' : '45b';
      const einsatzId = await createEinsatz({
        mitarbeiterId: input.mitarbeiterId,
        kundenId: input.kundenId,
        datum: tourDatum,
        startzeit: '08:00',
        dauerStunden: '1.50',
        paragraph,
      });
      await addEinsatzToTour(tourId, einsatzId, 0);
      await createAuditLog({ mitarbeiterId: ctx.mitarbeiterId, action: 'CREATE', ressource: 'tour', details: `createFromKunde tourId=${tourId} einsatzId=${einsatzId} kundenId=${input.kundenId} datum=${input.datum}`, status: 'success' });
      return { success: true, tourId, einsatzId };
    }),

  // Liefert die dem Mitarbeiter zugewiesenen Kunden (für Kunden-Sidebar im Tourenplanung-Dashboard)
  listZugewieseneKunden: portalProtected.query(async ({ ctx }) => {
    const ma = await getMitarbeiterById(ctx.mitarbeiterId);
    if (!ma) return [];
    // Admin sieht alle Kunden
    if (ma.rolle === 'admin') {
      const alle = await getAllKunden();
      return alle.map((k: any) => ({
        id: k.id,
        vorname: k.vorname,
        nachname: k.nachname,
        ort: k.ort ?? '',
        pflegegrad: k.pflegegrad ?? 0,
        budgetKritisch: istBudgetKritisch(k),
      }));
    }
    // Mitarbeiter sieht nur zugewiesene Kunden
    const zuordnungen = await getZuordnungenForMitarbeiter(ctx.mitarbeiterId);
    if (zuordnungen.length === 0) return [];
    const alle = await getAllKunden();
    const zugewieseneIds = new Set(zuordnungen.map((z: any) => z.kundenId));
    return alle
      .filter((k: any) => zugewieseneIds.has(k.id))
      .map((k: any) => ({
        id: k.id,
        vorname: k.vorname,
        nachname: k.nachname,
        ort: k.ort ?? '',
        pflegegrad: k.pflegegrad ?? 0,
        budgetKritisch: istBudgetKritisch(k),
      }));
  }),

  // Liefert alle genehmigten Urlaubsanträge und Krankmeldungen für den Kalender
  listAbwesenheiten: portalProtected.query(async ({ ctx }) => {
    const ma = await getMitarbeiterById(ctx.mitarbeiterId);
    let urlaubsantraege: any[];
    let krankmeldungen: any[];
    if (ma?.rolle === 'admin') {
      urlaubsantraege = await getAllUrlaubsantraege();
      krankmeldungen = await getAllKrankmeldungen();
    } else {
      urlaubsantraege = await getUrlaubsantraegeByMitarbeiter(ctx.mitarbeiterId);
      krankmeldungen = await getKrankmeldungenByMitarbeiter(ctx.mitarbeiterId);
    }
    const urlaube = urlaubsantraege
      .filter((u: any) => u.status === 'genehmigt')
      .map((u: any) => ({
        typ: 'urlaub' as const,
        mitarbeiterId: u.mitarbeiterId,
        mitarbeiterVorname: u.mitarbeiterVorname ?? '',
        mitarbeiterNachname: u.mitarbeiterNachname ?? '',
        von: u.von instanceof Date ? u.von.toISOString().split('T')[0] : String(u.von).split('T')[0],
        bis: u.bis instanceof Date ? u.bis.toISOString().split('T')[0] : String(u.bis).split('T')[0],
        tage: u.tage,
      }));
    const krankheiten = krankmeldungen.map((k: any) => ({
      typ: 'krank' as const,
      mitarbeiterId: k.mitarbeiterId,
      mitarbeiterVorname: k.mitarbeiterVorname ?? '',
      mitarbeiterNachname: k.mitarbeiterNachname ?? '',
      von: k.von instanceof Date ? k.von.toISOString().split('T')[0] : String(k.von).split('T')[0],
      bis: k.bis ? (k.bis instanceof Date ? k.bis.toISOString().split('T')[0] : String(k.bis).split('T')[0]) : null,
      tage: k.tage ?? null,
    }));
    return [...urlaube, ...krankheiten];
  }),
});

export const notificationsRouter = router({
  list: portalProtected.query(async ({ ctx }) =>
    getNotificationsByMitarbeiter(ctx.mitarbeiterId)
  ),
  unreadCount: portalProtected.query(async ({ ctx }) =>
    getUnreadNotificationCount(ctx.mitarbeiterId)
  ),
  markRead: portalProtected
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      await markNotificationRead(input.id);
      return { success: true };
    }),
  markAllRead: portalProtected.mutation(async ({ ctx }) => {
    await markAllNotificationsRead(ctx.mitarbeiterId);
    return { success: true };
  }),
  /**
   * Löscht eine eigene Benachrichtigung.
   * Bestätigte Meldungen sollen den Arbeitsbereich nicht dauerhaft belegen.
   */
  delete: portalProtected
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      // Nur eigene Benachrichtigungen dürfen entfernt werden.
      await db.delete(notificationsTable).where(
        and(eq(notificationsTable.id, input.id), eq(notificationsTable.empfaengerId, ctx.mitarbeiterId)),
      );
      return { success: true };
    }),
  /** Entfernt alle bereits gelesenen Benachrichtigungen des Nutzers. */
  deleteGelesene: portalProtected.mutation(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    await db.delete(notificationsTable).where(
      and(eq(notificationsTable.empfaengerId, ctx.mitarbeiterId), eq(notificationsTable.gelesen, true)),
    );
    return { success: true };
  }),
});

// ── MODUL 16: MITARBEITERAKTE ─────────────────────────────────────
const mitarbeiterakteRouter = router({
  listDokumente: portalProtected
    .input(z.object({ mitarbeiterId: z.number().int().positive().optional() }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      const targetId = input.mitarbeiterId ?? ctx.mitarbeiterId;
      return db!.select().from(mitarbeiterDokumente)
        .where(eq(mitarbeiterDokumente.mitarbeiterId, targetId))
        .orderBy(desc(mitarbeiterDokumente.createdAt));
    }),
  addDokument: portalProtected
    .input(z.object({
      mitarbeiterId: z.number().int().positive().optional(),
      typ: z.enum(["zertifikat", "arbeitsvertrag", "krankmeldung", "fuehrerschein", "erstehilfe", "sonstiges"]),
      bezeichnung: z.string().min(1).max(255),
      dateiUrl: z.string().optional(),
      dateiname: z.string().optional(),
      ausstellungsdatum: z.string().optional(),
      ablaufdatum: z.string().optional(),
      notizen: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      const targetId = input.mitarbeiterId ?? ctx.mitarbeiterId;
      await db!.insert(mitarbeiterDokumente).values({
        mitarbeiterId: targetId,
        typ: input.typ,
        bezeichnung: input.bezeichnung,
        dateiUrl: input.dateiUrl,
        dateiname: input.dateiname,
        ausstellungsdatum: input.ausstellungsdatum ? new Date(input.ausstellungsdatum) : undefined,
        ablaufdatum: input.ablaufdatum ? new Date(input.ablaufdatum) : undefined,
        notizen: input.notizen,
        hochgeladenVon: ctx.mitarbeiterId,
      });
      return { success: true };
    }),
  deleteDokument: portalProtected
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      const ma = await getMitarbeiterById(ctx.mitarbeiterId);
      // Admin darf alle löschen, Mitarbeiter nur eigene
      const [dok] = await db!.select().from(mitarbeiterDokumente).where(eq(mitarbeiterDokumente.id, input.id));
      if (!dok) throw new TRPCError({ code: 'NOT_FOUND', message: 'Dokument nicht gefunden' });
      if (ma?.rolle !== 'admin' && dok.mitarbeiterId !== ctx.mitarbeiterId) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Keine Berechtigung' });
      }
      await db!.delete(mitarbeiterDokumente).where(eq(mitarbeiterDokumente.id, input.id));
      return { success: true };
    }),
  // Self-Service: Upload-URL für eigene Dokumente generieren
  getUploadUrl: portalProtected
    .input(z.object({
      dateiname: z.string().min(1),
      contentType: z.string().default('application/pdf'),
    }))
    .mutation(async ({ input, ctx }) => {
      const { storagePut } = await import('./storage');
      const key = `mitarbeiter-dokumente/ma-${ctx.mitarbeiterId}/${Date.now()}-${input.dateiname}`;
      const { url } = await storagePut(key, Buffer.from(''), input.contentType);
      return { uploadUrl: url, key };
    }),
});

// ── MODUL 16: VERTRETUNGSZUGANG ───────────────────────────────────
const vertretungenRouter = router({
  list: adminProcedure.query(async () => {
    const db = await getDb();
    return db!.select().from(vertretungen).orderBy(desc(vertretungen.createdAt));
  }),
  create: adminProcedure
    .input(z.object({
      vertreterId: z.number().int().positive(),
      vertretenId: z.number().int().positive(),
      von: z.string(),
      bis: z.string(),
      grund: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      await db!.insert(vertretungen).values({
        vertreterId: input.vertreterId,
        vertretenId: input.vertretenId,
        von: new Date(input.von),
        bis: new Date(input.bis),
        grund: input.grund,
        freigegebenVon: ctx.mitarbeiterId,
        aktiv: true,
      });
      return { success: true };
    }),
  deactivate: adminProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      await db!.update(vertretungen).set({ aktiv: false }).where(eq(vertretungen.id, input.id));
      return { success: true };
    }),
  meineVertretungen: portalProtected.query(async ({ ctx }) => {
    const db = await getDb();
    return db!.select().from(vertretungen)
      .where(eq(vertretungen.vertreterId, ctx.mitarbeiterId))
      .orderBy(desc(vertretungen.von));
  }),
});

export const appRouter = router({
  system: systemRouter,
  pflichtenheft: pflichtenheftRouter,
  /** Einsatzplanung: Termine, Budgetstunden, Lohnkosten, Warnungen, Touren */
  planung: planungRouter,
  urlaub: urlaubRouter,
  krank: krankRouter,
  touren: tourenRouter,
    notifications: notificationsRouter,
  mitarbeiterakte: mitarbeiterakteRouter,
  vertretungen: vertretungenRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  portal: router({
    login: publicProcedure
      .input(z.object({ email: z.string().email(), passwort: z.string().min(1), otp: z.string().regex(/^\d{6}$/).optional() }))
      .mutation(async ({ input, ctx }) => {
        const ma = await getMitarbeiterByEmail(input.email);
        if (!ma || !ma.aktiv) throw new Error("E-Mail oder Passwort ungültig.");
        const valid = await bcrypt.compare(input.passwort, ma.passwortHash);
        if (!valid) {
          await createAuditLog({ mitarbeiterId: ma.id, action: "LOGIN", ressource: "portal", status: "failure", details: "Passwortprüfung fehlgeschlagen" });
          throw new Error("E-Mail oder Passwort ungültig.");
        }
        if (ma.zweiFaktorAktiv) {
          if (!input.otp) return { requiresTwoFactor: true as const, token: null, id: ma.id, vorname: ma.vorname, nachname: ma.nachname, email: ma.email, rolle: ma.rolle };
          if (!ma.zweiFaktorSecret) throw new Error("Zwei-Faktor-Anmeldung ist unvollständig eingerichtet. Bitte Admin kontaktieren.");
          const secret = decryptSecret(ma.zweiFaktorSecret);
          const totp = new OTPAuth.TOTP({ issuer: "Lebenswert Betreuung", label: ma.email, algorithm: "SHA1", digits: 6, period: 30, secret: OTPAuth.Secret.fromBase32(secret) });
          if (totp.validate({ token: input.otp, window: 1 }) === null) {
            await createAuditLog({ mitarbeiterId: ma.id, action: "LOGIN_2FA", ressource: "portal", status: "failure" });
            throw new Error("Der Sicherheitscode ist ungültig oder abgelaufen.");
          }
        }
        const token = await signPortalToken(ma.id, { mfa: true });
        const isSecure = ctx.req.secure || ctx.req.headers['x-forwarded-proto'] === 'https';
        ctx.res.cookie(PORTAL_COOKIE, token, {
          httpOnly: true,
          secure: isSecure,
          sameSite: isSecure ? 'none' : 'lax',
          path: '/',
          maxAge: 30 * 24 * 60 * 60 * 1000,
        });
        await createAuditLog({ mitarbeiterId: ma.id, action: ma.zweiFaktorAktiv ? "LOGIN_2FA" : "LOGIN", ressource: "portal", status: "success" });
        return { requiresTwoFactor: false as const, id: ma.id, vorname: ma.vorname, nachname: ma.nachname, email: ma.email, rolle: ma.rolle, token };
      }),

    logout: publicProcedure.mutation(async ({ ctx }) => {
      const token = ctx.req.cookies?.[PORTAL_COOKIE];
      if (token) {
        const session = await verifyPortalToken(token);
        if (session) await createAuditLog({ mitarbeiterId: session.mitarbeiterId, action: "LOGOUT", ressource: "portal", status: "success" });
      }
      ctx.res.clearCookie(PORTAL_COOKIE, { path: "/" });
      return { success: true };
    }),

    me: portalProcedure.query(async ({ ctx }) => {
      if (!ctx.mitarbeiterId) return null;
      const ma = await getMitarbeiterById(ctx.mitarbeiterId);
      if (!ma) return null;
      return { id: ma.id, vorname: ma.vorname, nachname: ma.nachname, email: ma.email, rolle: ma.rolle, zweiFaktorAktiv: ma.zweiFaktorAktiv, dienstwagen: !!(ma as any).dienstwagen };
    }),

    requestPasswordReset: publicProcedure
      .input(z.object({ email: z.string().email() }))
      .mutation(async ({ input }) => {
        const ma = await getMitarbeiterByEmail(input.email.trim().toLowerCase());
        if (!ma) return { success: true, message: "Falls die E-Mail registriert ist, wurde ein Reset-Link erstellt." };
        const token = nanoid(64);
        await createPasswordResetToken(ma.id, token);
        await createAuditLog({ mitarbeiterId: ma.id, action: "PASSWORD_RESET_REQUEST", ressource: "portal", status: "success" });
        return {
          success: true,
          message: "Reset-Link wurde erstellt.",
          resetToken: token,
          mitarbeiterName: `${ma.vorname} ${ma.nachname}`,
        };
      }),

    validateResetToken: publicProcedure
      .input(z.object({ token: z.string().min(1) }))
      .query(async ({ input }) => {
        const reset = await getValidPasswordResetToken(input.token);
        if (!reset) return { valid: false };
        const ma = await getMitarbeiterById(reset.mitarbeiterId);
        return { valid: true, email: ma?.email ?? "", vorname: ma?.vorname ?? "" };
      }),

    resetPassword: publicProcedure
      .input(z.object({
        token: z.string().min(1),
        neuesPasswort: z.string().min(6, "Passwort muss mindestens 6 Zeichen haben"),
      }))
      .mutation(async ({ input }) => {
        const reset = await getValidPasswordResetToken(input.token);
        if (!reset) throw new Error("Ungültiger oder abgelaufener Reset-Link.");
        const hash = await bcrypt.hash(input.neuesPasswort, 10);
        await updateMitarbeiterPasswort(reset.mitarbeiterId, hash);
        await markPasswordResetTokenUsed(input.token);
        await createAuditLog({ mitarbeiterId: reset.mitarbeiterId, action: "PASSWORD_RESET_DONE", ressource: "portal", status: "success" });
        return { success: true };
      }),

    updateProfile: portalProtected
      .input(z.object({
        vorname: z.string().min(1).optional(),
        nachname: z.string().min(1).optional(),
        telefon: z.string().optional(),
        mobil: z.string().optional(),
        strasse: z.string().optional(),
        plz: z.string().optional(),
        ort: z.string().optional(),
        email: z.string().email().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        const { mitarbeiterId } = ctx;
        const updates: Record<string, string> = {};
        if (input.vorname !== undefined) updates.vorname = input.vorname;
        if (input.nachname !== undefined) updates.nachname = input.nachname;
        if (input.telefon !== undefined) updates.telefon = input.telefon;
        if (input.mobil !== undefined) updates.mobil = input.mobil;
        if (input.strasse !== undefined) updates.strasse = input.strasse;
        if (input.plz !== undefined) updates.plz = input.plz;
        if (input.ort !== undefined) updates.ort = input.ort;
        if (input.email !== undefined) updates.email = input.email;
        if (Object.keys(updates).length === 0) return { success: true };
        await db!.update(mitarbeiter).set(updates).where(eq(mitarbeiter.id, mitarbeiterId));
        await createAuditLog({ mitarbeiterId, action: "PROFILE_UPDATE", ressource: "portal", status: "success" });
        return { success: true };
      }),

    changePassword: portalProtected
      .input(z.object({
        altesPasswort: z.string().min(1),
        neuesPasswort: z.string().min(6, "Neues Passwort muss mindestens 6 Zeichen haben"),
      }))
      .mutation(async ({ ctx, input }) => {
        const ma = await getMitarbeiterById(ctx.mitarbeiterId);
        if (!ma) throw new Error("Mitarbeiter nicht gefunden.");
        const valid = await bcrypt.compare(input.altesPasswort, ma.passwortHash);
        if (!valid) throw new Error("Das aktuelle Passwort ist falsch.");
        const hash = await bcrypt.hash(input.neuesPasswort, 10);
        await updateMitarbeiterPasswort(ctx.mitarbeiterId, hash);
        await createAuditLog({ mitarbeiterId: ctx.mitarbeiterId, action: "PASSWORD_CHANGE", ressource: "portal", status: "success" });
        return { success: true };
      }),

    zweiFaktorStatus: portalProtected.query(async ({ ctx }) => ({
      aktiv: Boolean(ctx.portalMitarbeiter.zweiFaktorAktiv),
      bestaetigtAt: ctx.portalMitarbeiter.zweiFaktorBestaetigtAt,
    })),

    zweiFaktorStarten: portalProtected.mutation(async ({ ctx }) => {
      const secret = new OTPAuth.Secret({ size: 20 }).base32;
      const totp = new OTPAuth.TOTP({ issuer: "Lebenswert Betreuung", label: ctx.portalMitarbeiter.email, algorithm: "SHA1", digits: 6, period: 30, secret: OTPAuth.Secret.fromBase32(secret) });
      const qrCodeDataUrl = await QRCode.toDataURL(totp.toString(), { width: 280, margin: 2, errorCorrectionLevel: "M" });
      const db = await getDb();
      await db!.update(mitarbeiter).set({ zweiFaktorSecret: encryptSecret(secret), zweiFaktorAktiv: false, zweiFaktorBestaetigtAt: null }).where(eq(mitarbeiter.id, ctx.mitarbeiterId));
      await createAuditLog({ mitarbeiterId: ctx.mitarbeiterId, action: "2FA_SETUP_START", ressource: "portal", status: "success" });
      return { secret, qrCodeDataUrl };
    }),

    zweiFaktorBestaetigen: portalProtected
      .input(z.object({ code: z.string().regex(/^\d{6}$/) }))
      .mutation(async ({ ctx, input }) => {
        const ma = await getMitarbeiterById(ctx.mitarbeiterId);
        if (!ma?.zweiFaktorSecret) throw new Error("Bitte die Einrichtung zuerst starten.");
        const secret = decryptSecret(ma.zweiFaktorSecret);
        const totp = new OTPAuth.TOTP({ issuer: "Lebenswert Betreuung", label: ma.email, algorithm: "SHA1", digits: 6, period: 30, secret: OTPAuth.Secret.fromBase32(secret) });
        if (totp.validate({ token: input.code, window: 1 }) === null) throw new Error("Der Sicherheitscode ist ungültig.");
        const db = await getDb();
        await db!.update(mitarbeiter).set({ zweiFaktorAktiv: true, zweiFaktorBestaetigtAt: new Date() }).where(eq(mitarbeiter.id, ctx.mitarbeiterId));
        await createAuditLog({ mitarbeiterId: ctx.mitarbeiterId, action: "2FA_ENABLED", ressource: "portal", status: "success" });
        return { success: true };
      }),

    zweiFaktorDeaktivieren: portalProtected
      .input(z.object({ passwort: z.string().min(1), code: z.string().regex(/^\d{6}$/) }))
      .mutation(async ({ ctx, input }) => {
        const ma = await getMitarbeiterById(ctx.mitarbeiterId);
        if (!ma?.zweiFaktorSecret || !ma.zweiFaktorAktiv) return { success: true };
        if (!(await bcrypt.compare(input.passwort, ma.passwortHash))) throw new Error("Das Passwort ist falsch.");
        const secret = decryptSecret(ma.zweiFaktorSecret);
        const totp = new OTPAuth.TOTP({ issuer: "Lebenswert Betreuung", label: ma.email, algorithm: "SHA1", digits: 6, period: 30, secret: OTPAuth.Secret.fromBase32(secret) });
        if (totp.validate({ token: input.code, window: 1 }) === null) throw new Error("Der Sicherheitscode ist ungültig.");
        const db = await getDb();
        await db!.update(mitarbeiter).set({ zweiFaktorAktiv: false, zweiFaktorSecret: null, zweiFaktorBestaetigtAt: null }).where(eq(mitarbeiter.id, ctx.mitarbeiterId));
        await createAuditLog({ mitarbeiterId: ctx.mitarbeiterId, action: "2FA_DISABLED", ressource: "portal", status: "success" });
        return { success: true };
      }),
  }),

  // ── KUNDEN ───────────────────────────────────────────
  kunden: router({
    // Entscheidung 4: Rollenabhängig gestaffelter Zugriff.
    // Mitarbeiter: strikt nur die eigenen zugewiesenen Kunden (kundenZuordnung).
    // Teamleitung/Buchhaltung/Admin: vollständige Kundenübersicht (Buchhaltung
    // erhält dieselben Stammdaten, da diese abrechnungsrelevant sind – die
    // Einschränkung für Buchhaltung greift bei Pflegedokumentation/Gesundheits-
    // daten in den Einsätzen, siehe einsaetze.list/listWithKunden unten).
    list: portalProtected.query(async ({ ctx }) => {
      const ma = await getMitarbeiterById(ctx.mitarbeiterId);
      if (ma?.rolle === "mitarbeiter") return getKundenByMitarbeiter(ctx.mitarbeiterId);
      return getAllKunden();
    }),

    detail: portalProtected
      .input(z.object({ id: z.number().int().positive() }))
      .query(async ({ input, ctx }) => {
        const ma = await getMitarbeiterById(ctx.mitarbeiterId);
        if (ma?.rolle === "mitarbeiter") {
          const zuordnungen = await getZuordnungenForMitarbeiter(ctx.mitarbeiterId);
          const erlaubt = zuordnungen.some((z: any) => z.kundenId === input.id);
          if (!erlaubt) {
            throw new TRPCError({ code: "FORBIDDEN", message: "Kein Zugriff auf diesen Kunden – nicht zugewiesen." });
          }
        }
        const [kunde, eis, leis, fahr] = await Promise.all([
          getKundeById(input.id),
          getEinsaetzeByKunde(input.id),
          getLeistungenByKunde(input.id),
          getFahrtenByKunde(input.id),
        ]);
        return { kunde, einsaetze: eis, leistungen: leis, fahrten: fahr };
      }),

    create: adminProcedure
      .input(z.object({
        vorname: z.string().min(1),
        nachname: z.string().min(1),
        adresse: z.string().optional(),
        telefon: z.string().optional(),
        pflegegrad: z.number().int().min(1).max(5).optional(),
        paragraph: z.enum(["45b", "45a", "39", "privat"]).optional(),
        kostentraegerId: z.number().int().positive().optional().nullable(),
        versicherungsnummer: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const newId = await createKunde({ ...input, aktiv: 1 });
        // P1: Neukunden-Push an alle Mitarbeiter senden
        if (newId) {
          try { await createNeukundenPushEintraege(newId); } catch (e) { console.warn('[P1] Neukunden-Push fehlgeschlagen:', e); }
        }
        return { success: true };
      }),

    update: adminProcedure
      .input(z.object({
        id: z.number().int().positive(),
        vorname: z.string().min(1).optional(),
        nachname: z.string().min(1).optional(),
        adresse: z.string().optional(),
        telefon: z.string().optional(),
        pflegegrad: z.number().int().min(1).max(5).optional(),
        paragraph: z.enum(["45b", "45a", "39", "privat"]).optional(),
        aktiv: z.number().int().optional(),
        kostentraegerId: z.number().int().positive().optional().nullable(),
        versicherungsnummer: z.string().optional(),
        vollmachtErteilt: z.boolean().optional(),
        vollmachtDatum: z.string().optional(),
        vollmachtSignatur: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await updateKunde(id, data as any);
        return { success: true };
      }),

    updateBudget: adminProcedure
      .input(z.object({
        id: z.number().int().positive(),
        budget45b: z.string().optional(),
        verbraucht45b: z.string().optional(),
        letzteAbrechnung45b: z.string().optional(),
        budget45a: z.string().optional(),
        verbraucht45a: z.string().optional(),
        letzteAbrechnung45a: z.string().optional(),
        budget39: z.string().optional(),
        verbraucht39: z.string().optional(),
        letzteAbrechnung39: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { id, ...data } = input;
        await updateKundeBudget(id, data);
        await createAuditLog({ mitarbeiterId: ctx.mitarbeiterId, action: "UPDATE", ressource: "budget", details: `kundenId=${id}`, status: "success" });
        return { success: true };
      }),

    budgetWarnungen: portalProtected.query(async () => {
      const warnungen = await getKundenMitBudgetWarnung();
      return warnungen.map(k => ({
        id: k.id,
        vorname: k.vorname,
        nachname: k.nachname,
        pflegegrad: k.pflegegrad,
        budget45b: k.budget45b,
        verbraucht45b: k.verbraucht45b,
        budget45a: k.budget45a,
        verbraucht45a: k.verbraucht45a,
        budget39: k.budget39,
        verbraucht39: k.verbraucht39,
      }));
    }),

    // ── MEHRFACH-ZUORDNUNG: Bis zu 3 Mitarbeiter pro Kunde (Admin-only) ──

    /** Gibt alle Mitarbeiter-Zuordnungen für einen Kunden zurück. */
    getZuordnungen: adminProcedure
      .input(z.object({ kundenId: z.number().int().positive() }))
      .query(async ({ input }) => getZuordnungenForKunde(input.kundenId)),

    /**
     * Setzt die Mitarbeiter-Zuordnung für einen Kunden (max. 3).
     * Nur Admins dürfen Zuordnungen ändern.
     */
    setZuordnungen: adminProcedure
      .input(z.object({
        kundenId: z.number().int().positive(),
        zuordnungen: z.array(z.object({
          mitarbeiterId: z.number().int().positive(),
          prioritaet: z.number().int().min(1).max(3),
          rolle: z.enum(['hauptbetreuer', 'vertretung']),
        })).max(3, 'Maximal 3 Mitarbeiter pro Kunde erlaubt.'),
      }))
      .mutation(async ({ input, ctx }) => {
        await setZuordnungenForKunde(input.kundenId, input.zuordnungen, ctx.adminId);
        await createAuditLog({
          mitarbeiterId: ctx.adminId,
          action: 'ADMIN',
          ressource: 'kundenZuordnung',
          details: `kundenId=${input.kundenId} mitarbeiter=${input.zuordnungen.map(z => z.mitarbeiterId).join(',')}`,
          status: 'success',
        });
        return { success: true };
      }),

    budgetHistorie: adminProcedure
      .input(z.object({ kundenId: z.number().int().positive() }))
      .query(async ({ input }) => getBudgetHistorie(input.kundenId)),

    /** DSGVO-Archivierung: Soft-Delete */
    archivieren: adminProcedure
      .input(z.object({
        id: z.number().int().positive(),
        loeschgrund: z.string().min(10),
      }))
            .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        await db.update(kundenTable).set({
          aktiv: 0,
          geloeschtAt: new Date(),
          geloeschtVon: ctx.adminId,
          loeschgrund: input.loeschgrund,
        }).where(eq(kundenTable.id, input.id));
        await createAuditLog({ mitarbeiterId: ctx.adminId, action: 'DSGVO_ARCHIV', ressource: 'kunde', details: `id=${input.id}`, status: 'success' });
        return { success: true };
      }),
    /** DSGVO-Hardlöschung: Anonymisierung + Audit */
    hardDelete: adminProcedure
      .input(z.object({
        id: z.number().int().positive(),
        bestaetigung: z.literal('ENDGUELTIG LOESCHEN'),
        loeschgrund: z.string().min(10),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        const kundeRows = await db.select({ vorname: kundenTable.vorname, nachname: kundenTable.nachname }).from(kundenTable).where(eq(kundenTable.id, input.id)).limit(1);
        if (kundeRows.length === 0) throw new TRPCError({ code: 'NOT_FOUND' });
        const k = kundeRows[0];
        await db.update(kundenTable).set({
          vorname: 'GELOESCHT', nachname: `ID-${input.id}`,
          geburtsdatum: null, strasse: null, plz: null, ort: null,
          telefon: null, mobil: null, email: null, versicherungsnummer: null,
          vollmachtSignatur: null, aktiv: 0,
          geloeschtAt: new Date(), geloeschtVon: ctx.adminId,
          loeschgrund: `HARD-DELETE: ${input.loeschgrund}`,
        }).where(eq(kundenTable.id, input.id));
        await createAuditLog({ mitarbeiterId: ctx.adminId, action: 'DSGVO_HARD_DELETE', ressource: 'kunde', details: `id=${input.id} name=${k.vorname} ${k.nachname}`, status: 'success' });
        return { success: true };
      }),

    /** Paginierte Kundenliste */
    listPaginiert: portalProtected
      .input(z.object({ seite: z.number().int().min(1).default(1), proSeite: z.number().int().min(5).max(100).default(20) }))
      .query(async ({ input }) => {
        const alle = await getAllKunden();
        const aktive = alle.filter((k: any) => k.aktiv !== 0);
        const total = aktive.length;
        const start = (input.seite - 1) * input.proSeite;
        return { kunden: aktive.slice(start, start + input.proSeite), total, seiten: Math.ceil(total / input.proSeite), seite: input.seite };
      }),
  }),

  // ── EINSÄTZE ─────────────────────────────────────────────────────────────
  einsaetze: router({
    list: portalProtected.query(async ({ ctx }) => {
      const ma = await getMitarbeiterById(ctx.mitarbeiterId);
      // Entscheidung 4: Teamleitung benötigt Team-Übersicht für die
      // Leistungsnachweis-Freigabe; Admin ohnehin Vollzugriff.
      if (ma?.rolle === "admin" || ma?.rolle === "teamleitung") return getAllEinsaetze();
      if (ma?.rolle === "buchhaltung") return (await getAllEinsaetze()).map(entferneGesundheitsdaten);
      return getEinsaetzeByMitarbeiter(ctx.mitarbeiterId);
    }),
    listWithKunden: portalProtected.query(async ({ ctx }) => {
      const ma = await getMitarbeiterById(ctx.mitarbeiterId);
      if (ma?.rolle === "admin" || ma?.rolle === "teamleitung") return getEinsaetzeWithKunden();
      if (ma?.rolle === "buchhaltung") return (await getEinsaetzeWithKunden()).map(entferneGesundheitsdaten);
      return getEinsaetzeWithKunden(ctx.mitarbeiterId);
    }),

    create: portalProtected
      .input(z.object({
        kundenId: z.number().int().positive(),
        datum: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        startzeit: z.string().optional(),
        dauerStunden: z.number().min(0.5).optional(),
        paragraph: z.enum(["45b", "45a", "39"]),
        adminOverride: z.boolean().optional(), // Admin kann Budget-Sperre übersteuern
      }))
      .mutation(async ({ input, ctx }) => {
        // ── GESCHÄFTSREGEL 1: Mindestdauer 1,5 Stunden ──
        if (input.dauerStunden !== undefined && input.dauerStunden < 1.5) {
          throw new Error("Mindestdauer: Jeder Einsatz muss mindestens 1,5 Stunden (90 Minuten) dauern.");
        }

        // ── GESCHÄFTSREGEL 2: Doppelbelegungsprüfung ──
        if (input.startzeit && input.dauerStunden) {
          const { mitarbeiterKonflikt, kundenKonflikt } = await checkDoppelbelegung({
            datum: input.datum,
            startzeit: input.startzeit,
            dauerStunden: input.dauerStunden,
            mitarbeiterId: ctx.mitarbeiterId,
            kundenId: input.kundenId,
          });
          if (mitarbeiterKonflikt) {
            throw new Error("Doppelbelegung: Sie haben zu diesem Zeitpunkt bereits einen anderen Einsatz eingetragen.");
          }
          if (kundenKonflikt) {
            throw new Error("Doppelbelegung: Der Kunde hat zu diesem Zeitpunkt bereits einen anderen Einsatz.");
          }
        }

        // ── GESCHÄFTSREGEL 3: Budget-Sperre bei Überschreitung ──
        // Sicherheitshinweis: isAdmin wird IMMER serverseitig aus der Rolle des
        // authentifizierten Mitarbeiters ermittelt. adminOverride ist kein Freifahrtschein
        // für beliebige Nutzer, sondern nur eine UI-Bestätigung, die ausschließlich für
        // tatsächliche Admins wirksam ist (siehe Entscheidung 1: Admin-Ausnahme bleibt
        // bestehen, aber nur für die Rolle "admin").
        const ma = await getMitarbeiterById(ctx.mitarbeiterId);
        const isAdmin = ma?.rolle === 'admin';
        const adminUeberschreibt = isAdmin && !!input.adminOverride;

        // Granulare Prüfung je einzelner §-Position (Entscheidung 8): ein Einsatz
        // trägt genau eine §-Position, daher blockiert diese Prüfung ausschließlich
        // die konkret betroffene Position und keine anderen, bereits gespeicherten
        // Positionen desselben Besuchs.
        if (input.dauerStunden && !adminUeberschreibt) {
          const kunde = await getKundeById(input.kundenId);
          if (kunde) {
            const para = input.paragraph as '45b' | '45a' | '39';
            // Kosten inkl. budgetwirksamer Anfahrtspauschale (Entscheidung 2 + 11).
            const kosten = berechneEinsatzkostenInklPauschale(input.dauerStunden, para);
            const budget = parseFloat(String(para === '45b' ? kunde.budget45b : para === '45a' ? kunde.budget45a : kunde.budget39) || '0');
            const verbraucht = parseFloat(String(para === '45b' ? kunde.verbraucht45b : para === '45a' ? kunde.verbraucht45a : kunde.verbraucht39) || '0');
            const restbudget = budget - verbraucht;
            if (kosten > restbudget) {
              throw new Error(`BUDGETUEBERSCHREITUNG|${para}|${kosten.toFixed(2)}|${restbudget.toFixed(2)}`);
            }
          }
        }

        // Anfahrtspauschale automatisch setzen (Entscheidung 13: pro Einzelbesuch,
        // unabhängig von der Tourenzusammenstellung; Entscheidung 11: ersetzt die
        // kilometerbasierte Kundenabrechnung vollständig).
        const einsatzData: any = { ...input, mitarbeiterId: ctx.mitarbeiterId, anfahrtPauschale: ANFAHRT_PAUSCHALE.toFixed(2) };

        // P3: Mindestzeit-Eskalation (< 1,5h → Zähler erhöhen, ab 3× → Admin-Alert)
        if (input.dauerStunden !== undefined && input.dauerStunden < 1.5) {
          einsatzData.unterschreitungEskaliert = true;
          try {
            const zaehler = await getUnterschreitungsZaehler(ctx.mitarbeiterId);
            if (zaehler >= 2) { // 3. Unterschreitung (0-indexed: 0,1,2)
              const alleMa = await getAllMitarbeiter();
              const admins = alleMa.filter((m: { rolle: string }) => m.rolle === 'admin');
              for (const admin of admins) {
                await createNotification({
                  empfaengerId: admin.id,
                  titel: '⚠️ Mindestzeit-Eskalation',
                  nachricht: `${ma?.vorname} ${ma?.nachname} hat die Mindestbetreuungszeit (1,5h) in den letzten 30 Tagen bereits 3× unterschritten!`,
                  typ: 'warnung',
                });
              }
            }
          } catch (e) { console.warn('[P3] Eskalation fehlgeschlagen:', e); }
        }

                const neuerEinsatz = await createEinsatz(einsatzData);
        await createAuditLog({ mitarbeiterId: ctx.mitarbeiterId, action: "CREATE", ressource: "einsatz", status: "success" });
        // 📅 Automatische Terminbestätigung: In-App-Benachrichtigung an Mitarbeiter
        try {
          const kunde = await getKundeById(input.kundenId);
          await createNotification({
            empfaengerId: ctx.mitarbeiterId,
            titel: '✅ Einsatz bestätigt',
            nachricht: `Ihr Einsatz am ${input.datum} bei ${kunde?.vorname ?? ''} ${kunde?.nachname ?? ''} wurde erfolgreich eingetragen.`,
            typ: 'info',
          });
          // SSE-Echtzeit-Push
          if ((global as any).sseBroadcast) {
            (global as any).sseBroadcast(ctx.mitarbeiterId, 'einsatz_update', {
              message: `Neuer Einsatz am ${input.datum} eingetragen.`,
            });
          }
        } catch (e) { console.warn('[Terminbestätigung] Fehler:', e); }
        return { success: true };
      }),
    updateStatus: portalProtected
      .input(z.object({
        id: z.number().int().positive(),
        status: z.enum(["abgeschlossen", "abgesagt"]),
        bericht: z.string().optional(),
        gesundheit: z.enum(["gut", "stabil", "auffaellig", "kritisch"]).optional(),
        bemerkung: z.string().optional(),
        unterschriftMitarbeiter: z.string().optional(),
        unterschriftKunde: z.string().optional(),
        textbausteinIds: z.string().optional(),
        // Entscheidung 15: Vollmacht-Ersatzunterschrift bei fehlender
        // Unterschriftsfähigkeit des Kunden.
        unterschriftErsatzTyp: z.enum(["keine", "vollmacht", "mitarbeiter_vermerk"]).optional(),
        unterschriftErsatzName: z.string().optional(),
        unterschriftBegruendung: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const updateData: any = { ...input };
        // Primär: Ersatzunterschrift durch bevollmächtigte Person — setzt eine
        // hinterlegte Vollmacht des Kunden voraus (kunden.vollmachtErteilt).
        if (input.unterschriftErsatzTyp === "vollmacht") {
          if (!input.unterschriftErsatzName?.trim()) {
            throw new Error("Name der bevollmächtigten Person ist erforderlich.");
          }
          const einsatzVorher = await getEinsatzById(input.id);
          const kunde = einsatzVorher ? await getKundeById(einsatzVorher.kundenId) : null;
          if (!(kunde as any)?.vollmachtErteilt) {
            throw new Error("Für diesen Kunden liegt keine hinterlegte Vollmacht vor — bitte stattdessen Mitarbeiter-Vermerk verwenden.");
          }
          updateData.unterschriftFreigabeStatus = "nicht_erforderlich";
        }
        // Fallback: Mitarbeiter-Vermerk ohne Vollmacht — erfordert zwingend eine
        // Freitextbegründung und löst eine obligatorische Teamleitung-Freigabe aus.
        if (input.unterschriftErsatzTyp === "mitarbeiter_vermerk") {
          if (!input.unterschriftBegruendung?.trim()) {
            throw new Error("Begründung ist erforderlich, wenn der Kunde nicht unterschriftsfähig ist und keine Vollmacht vorliegt.");
          }
          updateData.unterschriftFreigabeStatus = "ausstehend";
        }
        await updateEinsatzStatus(input.id, ctx.mitarbeiterId, updateData);
        await createAuditLog({ mitarbeiterId: ctx.mitarbeiterId, action: "UPDATE", ressource: "einsatz", details: `id=${input.id} status=${input.status}${input.unterschriftErsatzTyp && input.unterschriftErsatzTyp !== "keine" ? ` unterschriftErsatzTyp=${input.unterschriftErsatzTyp}` : ""}`, status: "success" });

        // Bei ausstehender Freigabe: Teamleitung/Admin per Notification informieren.
        if (updateData.unterschriftFreigabeStatus === "ausstehend") {
          try {
            const alleMa = await getAllMitarbeiter();
            const freigeber = alleMa.filter((m: { rolle: string }) => m.rolle === "admin" || m.rolle === "teamleitung");
            for (const f of freigeber) {
              await createNotification({
                empfaengerId: f.id,
                titel: "✍️ Unterschrift-Freigabe erforderlich",
                nachricht: `Einsatz #${input.id}: Kunde nicht unterschriftsfähig, keine Vollmacht hinterlegt. Bitte Begründung prüfen und freigeben.`,
                typ: "warnung",
              });
            }
          } catch (e) { console.warn("[Entscheidung 15] Freigabe-Benachrichtigung fehlgeschlagen:", e); }
        }

        // Automatischer Push bei Budget-Warnung nach Einsatz-Abschluss
        if (input.status === "abgeschlossen") {
          try {
            const warnungen = await getKundenMitBudgetWarnung();
            if (warnungen.length > 0) {
              const subs = await getAllPushSubscriptions();
              if (subs.length > 0) {
                for (const kunde of warnungen) {
                  await sendBudgetWarnungPush(
                    subs as any[],
                    `${kunde.vorname} ${kunde.nachname}`,
                    (kunde as any).paragraph || "45b",
                    parseFloat(String((kunde as any).restbudget || 0))
                  );
                }
              }
            }
          } catch (pushErr) {
            console.warn("[Push] Budget-Warnung fehlgeschlagen:", pushErr);
          }
        }

                return { success: true };
      }),
    // Entscheidung 15: Obligatorische Freigabe eines Mitarbeiter-Vermerks
    // ("Kunde nicht unterschriftsfähig") durch Teamleitung/Admin.
    listUnterschriftFreigaben: roleProcedure(["admin", "teamleitung"]).query(async () => {
      return getEinsaetzeMitAusstehenderFreigabe();
    }),
    freigebenUnterschrift: roleProcedure(["admin", "teamleitung"])
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(async ({ input, ctx }) => {
        await setUnterschriftFreigabe(input.id, ctx.mitarbeiterId);
        await createAuditLog({ mitarbeiterId: ctx.mitarbeiterId, action: "UPDATE", ressource: "unterschrift_freigabe", details: `einsatzId=${input.id}`, status: "success" });
        return { success: true };
      }),
    listChanges: portalProtected
      .input(z.object({ einsatzId: z.number().int().positive() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return [];
        return db.select().from(einsatzAenderungen).where(eq(einsatzAenderungen.einsatzId, input.einsatzId)).orderBy(desc(einsatzAenderungen.createdAt)).limit(50);
      }),
    recordChange: portalProtected
      .input(z.object({
        einsatzId: z.number().int().positive(),
        aenderungstyp: z.enum(["erstellt", "geaendert", "abgesagt", "verschoben", "bestaetigt", "abgelehnt"]),
        aenderungsgrund: z.string().optional(),
        alteDaten: z.string().optional(),
        neueDaten: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        await db.insert(einsatzAenderungen).values({
          einsatzId: input.einsatzId,
          aenderungstyp: input.aenderungstyp,
          aenderungsgrund: input.aenderungsgrund ?? null,
          alteDaten: input.alteDaten ?? null,
          neueDaten: input.neueDaten ?? null,
          geaendertVonId: ctx.mitarbeiterId,
        });
        return { success: true };
      }),
  }),
  // ── LEISTUNGEN ───────────────────────────────────────
  leistungen: router({
    list: portalProtected.query(async ({ ctx }) => {
      const ma = await getMitarbeiterById(ctx.mitarbeiterId);
      if (ma?.rolle === "admin") return getAllLeistungen();
      return getLeistungenByMitarbeiter(ctx.mitarbeiterId);
    }),

    create: portalProtected
      .input(z.object({
        kundenId: z.number().int().positive(),
        monat: z.string().regex(/^\d{4}-\d{2}$/),
        paragraph: z.enum(["45b", "45a", "39"]),
        stunden: z.number().min(0.5),
        anzahlEinsaetze: z.number().int().min(1),
        bemerkung: z.string().optional(),
        unterschriftLeister: z.string().optional(),
        unterschriftKunde: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        await createLeistung({ ...input, mitarbeiterId: ctx.mitarbeiterId } as any);
        await createAuditLog({ mitarbeiterId: ctx.mitarbeiterId, action: "CREATE", ressource: "leistung", status: "success" });
        return { success: true };
      }),

    updateStatus: roleProcedure(["admin", "teamleitung"])
      .input(z.object({
        id: z.number().int().positive(),
        status: z.enum(["offen", "pruefung", "freigegeben", "versendet"]),
      }))
      .mutation(async ({ input, ctx }) => {
        await updateLeistungStatus(input.id, input.status);
        await createAuditLog({ mitarbeiterId: ctx.mitarbeiterId, action: "UPDATE", ressource: "leistung", details: `id=${input.id} status=${input.status}`, status: "success" });
        return { success: true };
      }),

    delete: portalProtected
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(async ({ input, ctx }) => {
        const ma = await getMitarbeiterById(ctx.mitarbeiterId);
        const eigene = await getLeistungenByMitarbeiter(ctx.mitarbeiterId);
        const eigeneLeistung = eigene.find((l: { id: number }) => l.id === input.id);
        if (!eigeneLeistung && ma?.rolle !== 'admin') throw new Error('Keine Berechtigung');
        await deleteLeistung(input.id);
        await createAuditLog({ mitarbeiterId: ctx.mitarbeiterId, action: 'DELETE', ressource: 'leistung', details: `id=${input.id}`, status: 'success' });
        return { success: true };
      }),
  }),

  // ── FAHRTEN ──────────────────────────────────────────
  fahrten: router({
    list: portalProtected.query(async ({ ctx }) => {
      const ma = await getMitarbeiterById(ctx.mitarbeiterId);
      if (ma?.rolle === "admin") return getAllFahrten();
      return getFahrtenByMitarbeiter(ctx.mitarbeiterId);
    }),

    byMonat: adminProcedure
      .input(z.object({ monat: z.string().regex(/^\d{4}-\d{2}$/) }))
      .query(async ({ input }) => getFahrtenByMonat(input.monat)),

    create: portalProtected
      .input(z.object({
        datum: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        vonOrt: z.string().min(1),
        nachOrt: z.string().min(1),
        kilometer: z.number().positive(),
        typ: z.enum(["normal", "sonder"]),
        kundenId: z.number().int().positive().optional().nullable(),
        zweck: z.string().optional(),
        kilometerHin: z.number().optional(),
        kilometerRueck: z.number().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        // Entscheidung 12 + Befund 5: Mitarbeiter mit Dienstwagen erhalten keine
        // km-Erstattung (1%-Regelung). Das Flag wird jetzt direkt an createFahrt
        // übergeben, das es tatsächlich auswertet (zuvor wirkungslos).
        const ma = await getMitarbeiterById(ctx.mitarbeiterId);
        const hatDienstwagen = (ma as any)?.dienstwagen === true || (ma as any)?.dienstwagen === 1;
        await createFahrt({ ...input, mitarbeiterId: ctx.mitarbeiterId, hatDienstwagen } as any);
        await createAuditLog({ mitarbeiterId: ctx.mitarbeiterId, action: "CREATE", ressource: "fahrt", status: "success" });
        return { success: true };
      }),

    updateStatus: adminProcedure
      .input(z.object({
        id: z.number().int().positive(),
        status: z.enum(["offen", "eingereicht", "erstattet"]),
      }))
      .mutation(async ({ input, ctx }) => {
        await updateFahrtStatus(input.id, input.status);
        await createAuditLog({ mitarbeiterId: ctx.adminId, action: "UPDATE", ressource: "fahrt", details: `id=${input.id} status=${input.status}`, status: "success" });
        return { success: true };
      }),

    delete: portalProtected
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(async ({ input, ctx }) => {
        await deleteFahrt(input.id);
        await createAuditLog({ mitarbeiterId: ctx.mitarbeiterId, action: "DELETE", ressource: "fahrt", details: `id=${input.id}`, status: "success" });
        return { success: true };
      }),
  }),

  // ── MODUL 1: KOSTENTRÄGER ─────────────────────────────
  kostentraeger: router({
    list: portalProtected.query(async () => getAllKostentraeger()),

    search: portalProtected
      .input(z.object({ query: z.string().min(1) }))
      .query(async ({ input }) => searchKostentraeger(input.query)),

    detail: portalProtected
      .input(z.object({ id: z.number().int().positive() }))
      .query(async ({ input }) => getKostentraegerById(input.id)),

    create: adminProcedure
      .input(z.object({
        name: z.string().min(1),
        ikNummer: z.string().optional(),
        typ: z.enum(["pflegekasse", "krankenkasse", "beihilfe", "privat", "sonstige"]).default("pflegekasse"),
        strasse: z.string().optional(),
        plz: z.string().optional(),
        ort: z.string().optional(),
        telefon: z.string().optional(),
        email: z.string().email().optional().or(z.literal("")),
        fax: z.string().optional(),
        abrechnungsart: z.enum(["dta", "email", "ebrief", "post", "manuell"]).optional(),
        notizen: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        await createKostentraeger({ ...input, aktiv: 1 });
        await createAuditLog({ mitarbeiterId: ctx.adminId, action: "CREATE", ressource: "kostentraeger", details: `name=${input.name}`, status: "success" });
        return { success: true };
      }),

    update: adminProcedure
      .input(z.object({
        id: z.number().int().positive(),
        name: z.string().min(1).optional(),
        ikNummer: z.string().optional(),
        typ: z.enum(["pflegekasse", "krankenkasse", "beihilfe", "privat", "sonstige"]).optional(),
        strasse: z.string().optional(),
        plz: z.string().optional(),
        ort: z.string().optional(),
        telefon: z.string().optional(),
        email: z.string().optional(),
        fax: z.string().optional(),
        abrechnungsart: z.enum(["dta", "email", "ebrief", "post", "manuell"]).optional(),
        notizen: z.string().optional(),
        aktiv: z.number().int().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { id, ...data } = input;
        await updateKostentraeger(id, data as any);
        await createAuditLog({ mitarbeiterId: ctx.adminId, action: "UPDATE", ressource: "kostentraeger", details: `id=${id}`, status: "success" });
        return { success: true };
      }),
  }),

  // ── MODUL 3: TEXTBAUSTEINE ────────────────────────────
  textbausteine: router({
    list: portalProtected.query(async () => getAllTextbausteine()),

    create: adminProcedure
      .input(z.object({
        titel: z.string().min(1),
        inhalt: z.string().min(1),
        kategorie: z.enum(["bericht", "gesundheit", "aktivitaet", "bemerkung", "sonstiges"]).default("bericht"),
        paragraph: z.enum(["45b", "45a", "39", "alle"]).default("alle"),
      }))
      .mutation(async ({ input, ctx }) => {
        await createTextbaustein({ ...input, aktiv: 1 });
        await createAuditLog({ mitarbeiterId: ctx.adminId, action: "CREATE", ressource: "textbaustein", status: "success" });
        return { success: true };
      }),

    update: adminProcedure
      .input(z.object({
        id: z.number().int().positive(),
        titel: z.string().min(1).optional(),
        inhalt: z.string().min(1).optional(),
        kategorie: z.enum(["bericht", "gesundheit", "aktivitaet", "bemerkung", "sonstiges"]).optional(),
        paragraph: z.enum(["45b", "45a", "39", "alle"]).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { id, ...data } = input;
        await updateTextbaustein(id, data as any);
        await createAuditLog({ mitarbeiterId: ctx.adminId, action: "UPDATE", ressource: "textbaustein", details: `id=${id}`, status: "success" });
        return { success: true };
      }),

    delete: adminProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(async ({ input, ctx }) => {
        await deleteTextbaustein(input.id);
        await createAuditLog({ mitarbeiterId: ctx.adminId, action: "DELETE", ressource: "textbaustein", details: `id=${input.id}`, status: "success" });
        return { success: true };
      }),
  }),

  // ── MODUL 5: E-BRIEF ─────────────────────────────────
  ebrief: router({
    list: adminProcedure
      .input(z.object({ limit: z.number().int().min(1).max(500).default(100) }))
      .query(async ({ input }) => getEbriefLog(input.limit)),

    byKunde: portalProtected
      .input(z.object({ kundenId: z.number().int().positive() }))
      .query(async ({ input }) => getEbriefLogByKunde(input.kundenId)),

    send: portalProtected
      .input(z.object({
        kundenId: z.number().int().positive().optional(),
        kostentraegerId: z.number().int().positive().optional(),
        betreff: z.string().min(1),
        inhalt: z.string().min(1),
        empfaenger: z.string().min(1),
        typ: z.enum(["leistungsnachweis", "protokoll", "kostenvoranschlag", "sonstiges"]).default("sonstiges"),
        versandart: z.enum(["email", "ebrief", "post"]).default("email"),
        referenzId: z.number().int().positive().optional(),
        referenzTyp: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        await createEBriefLog({
          ...input,
          mitarbeiterId: ctx.mitarbeiterId,
          status: "versendet",
        } as any);
        await createAuditLog({
          mitarbeiterId: ctx.mitarbeiterId,
          action: "EXPORT",
          ressource: "ebrief",
          details: `empfaenger=${input.empfaenger} betreff=${input.betreff}`,
          status: "success",
        });
        return { success: true };
      }),
  }),

  // ── MODUL 6: MASSEN-EXPORT ────────────────────────────
  export: router({
    monatspaket: adminProcedure
      .input(z.object({ monat: z.string().regex(/^\d{4}-\d{2}$/) }))
      .query(async ({ input }) => {
        const [eis, leis, fahr, maList, kundenList] = await Promise.all([
          getAllEinsaetze(),
          getAllLeistungen(),
          getAllFahrten(),
          getAllMitarbeiter(),
          getAllKunden(),
        ]);

        const monEis = eis.filter((e) => {
          const d = typeof e.datum === "string" ? e.datum : (e.datum as Date).toISOString().split("T")[0];
          return d?.slice(0, 7) === input.monat;
        });
        const monLeis = leis.filter((l) => l.monat === input.monat);
        const monFahr = fahr.filter((f) => {
          const d = typeof f.datum === "string" ? f.datum : (f.datum as Date).toISOString().split("T")[0];
          return d?.slice(0, 7) === input.monat;
        });

        // Einsätze CSV
        const einsaetzeCsv = [
          "Mitarbeiter;Datum;Kunde;Paragraph;Stunden;Status;Gesundheit;Bericht",
          ...monEis.map((e) => {
            const ma = maList.find((m) => m.id === e.mitarbeiterId);
            const k = kundenList.find((c) => c.id === e.kundenId);
            const d = typeof e.datum === "string" ? e.datum : (e.datum as Date).toISOString().split("T")[0];
            return `${ma?.nachname ?? ""} ${ma?.vorname ?? ""};${d};${k?.nachname ?? ""} ${k?.vorname ?? ""};§${e.paragraph} SGB XI;${e.dauerStunden ?? 0};${e.status};${e.gesundheit ?? ""};${(e.bericht ?? "").replace(/;/g, ",")}`;
          }),
        ].join("\n");

        // Leistungsnachweise CSV
        const leistungenCsv = [
          "Mitarbeiter;Kunde;Monat;Paragraph;Stunden;Einsätze;Betrag (€);Status",
          ...monLeis.map((l) => {
            const ma = maList.find((m) => m.id === l.mitarbeiterId);
            const k = kundenList.find((c) => c.id === l.kundenId);
            return `${ma?.nachname ?? ""} ${ma?.vorname ?? ""};${k?.nachname ?? ""} ${k?.vorname ?? ""};${l.monat};§${l.paragraph} SGB XI;${l.stunden ?? 0};${l.anzahlEinsaetze ?? 0};${l.betrag ?? 0};${l.status}`;
          }),
        ].join("\n");

        // Fahrtkosten CSV
        const fahrenCsv = [
          "Mitarbeiter;Datum;Von;Nach;Kilometer;Typ;Vergütung (€);Status",
          ...monFahr.map((f) => {
            const ma = maList.find((m) => m.id === f.mitarbeiterId);
            const d = typeof f.datum === "string" ? f.datum : (f.datum as Date).toISOString().split("T")[0];
            return `${ma?.nachname ?? ""} ${ma?.vorname ?? ""};${d};${f.vonOrt};${f.nachOrt};${f.kilometer};${f.typ};${f.verguetung ?? 0};${(f as any).abrechnungsStatus ?? "offen"}`;
          }),
        ].join("\n");

        const gesamtStunden = monEis.reduce((s, e) => s + parseFloat(String(e.dauerStunden ?? 0)), 0);
        const gesamtKm = monFahr.reduce((s, f) => s + parseFloat(String(f.kilometer ?? 0)), 0);
        const gesamtVerguetung = monFahr.reduce((s, f) => s + parseFloat(String(f.verguetung ?? 0)), 0);
        const gesamtBetrag = monLeis.reduce((s, l) => s + parseFloat(String(l.betrag ?? 0)), 0);

        return {
          monat: input.monat,
          stats: {
            einsaetze: monEis.length,
            stunden: Math.round(gesamtStunden * 100) / 100,
            leistungen: monLeis.length,
            betrag: Math.round(gesamtBetrag * 100) / 100,
            fahrten: monFahr.length,
            km: Math.round(gesamtKm * 10) / 10,
            verguetung: Math.round(gesamtVerguetung * 100) / 100,
          },
          csv: {
            einsaetze: einsaetzeCsv,
            leistungen: leistungenCsv,
            fahrten: fahrenCsv,
          },
        };
      }),
  }),

  // ── ADMIN ─────────────────────────────────────────────
  admin: router({
    dashboardStats: adminProcedure.query(async () => {
      const [alleKunden, alleMitarbeiter, offeneUrlaube, aktiveKrank] = await Promise.all([
        getAllKunden(),
        getAllMitarbeiter(),
        getAllUrlaubsantraege().then(l => l.filter((u: { status: string }) => u.status === 'beantragt')),
        getAllKrankmeldungen().then(l => l.filter((k: { bis: Date | string | null }) => {
          if (!k.bis) return true;
          return new Date(k.bis) >= new Date();
        })),
      ]);
      const heute = new Date().toISOString().split('T')[0];
      const monatsStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
      // Budget-Ampel
      const budgetAmpel = alleKunden.map((k: Record<string, unknown>) => {
        const b45b = parseFloat(String(k.budget45b ?? 0));
        const v45b = parseFloat(String(k.verbraucht45b ?? 0));
        const b45a = parseFloat(String(k.budget45a ?? 0));
        const v45a = parseFloat(String(k.verbraucht45a ?? 0));
        const b39  = parseFloat(String(k.budget39  ?? 0));
        const v39  = parseFloat(String(k.verbraucht39  ?? 0));
        const ampel = (b: number, v: number) => b <= 0 ? 'grau' : v / b >= 0.9 ? 'rot' : v / b >= 0.7 ? 'gelb' : 'gruen';
        return { id: k.id as number, name: `${k.vorname} ${k.nachname}`,
          p45b: { budget: b45b, verbraucht: v45b, ampel: ampel(b45b, v45b) },
          p45a: { budget: b45a, verbraucht: v45a, ampel: ampel(b45a, v45a) },
          p39:  { budget: b39,  verbraucht: v39,  ampel: ampel(b39, v39) },
        };
      });
      // Auslastung
      const db2 = await getDb();
      const monEinsaetze = db2 ? await db2.select().from(einsaetzeTable).where(sql`DATE(${einsaetzeTable.datum}) >= ${monatsStart}`) : [];
      const auslastung = alleMitarbeiter.map((m: Record<string, unknown>) => {
        const meineEinsaetze = monEinsaetze.filter((e: { mitarbeiterId: number }) => e.mitarbeiterId === m.id);
        const istStunden = meineEinsaetze.reduce((s: number, e: { dauerStunden: string | null }) => s + parseFloat(String(e.dauerStunden ?? 0)), 0);
        const sollStunden = m.beschaeftigungsart === 'minijob' ? 40 : m.beschaeftigungsart === 'teilzeit' ? 80 : 160;
        return { id: m.id as number, name: `${m.vorname} ${m.nachname}`, art: m.beschaeftigungsart as string,
          istStunden: Math.round(istStunden * 10) / 10, sollStunden,
          auslastungProzent: Math.min(100, Math.round((istStunden / (sollStunden as number)) * 100)) };
      });
      const heuteEinsaetze = db2 ? await db2.select().from(einsaetzeTable).where(sql`DATE(${einsaetzeTable.datum}) = ${heute}`) : [];
      const rotKunden = budgetAmpel.filter((k: { p45b: { ampel: string }; p45a: { ampel: string }; p39: { ampel: string } }) => k.p45b.ampel === 'rot' || k.p45a.ampel === 'rot' || k.p39.ampel === 'rot').length;
      return {
        budgetAmpel,
        auslastung,
        kpis: {
          aktiveKunden: alleKunden.filter((k: { aktiv: unknown }) => k.aktiv).length,
          aktiveMitarbeiter: alleMitarbeiter.filter((m: { aktiv: unknown }) => m.aktiv !== false).length,
          heuteEinsaetze: heuteEinsaetze.length,
          offeneUrlaube: offeneUrlaube.length,
          aktivKrank: aktiveKrank.length,
          rotKunden,
        },
      };
    }),
    mitarbeiterList: adminProcedure.query(async () => getAllMitarbeiter()),

    updateRolle: adminProcedure
      .input(z.object({
        mitarbeiterId: z.number().int().positive(),
        rolle: z.enum(["mitarbeiter", "teamleitung", "buchhaltung", "admin"]),
      }))
      .mutation(async ({ input, ctx }) => {
        await updateMitarbeiter(input.mitarbeiterId, { rolle: input.rolle } as any);
        await createAuditLog({ mitarbeiterId: ctx.adminId, action: "ADMIN", ressource: "mitarbeiter", details: `rolle=${input.rolle} id=${input.mitarbeiterId}`, status: "success" });
        return { success: true };
      }),

    mitarbeiterCreate: adminProcedure
      .input(z.object({
        vorname: z.string().min(1),
        nachname: z.string().min(1),
        email: z.string().email(),
        passwort: z.string().min(6),
        rolle: z.enum(["mitarbeiter", "teamleitung", "buchhaltung", "admin"]).default("mitarbeiter"),
        telefon: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const hash = await bcrypt.hash(input.passwort, 10);
        await createMitarbeiter({ ...input, passwortHash: hash, aktiv: 1 });
        await createAuditLog({ mitarbeiterId: ctx.adminId, action: "ADMIN", ressource: "mitarbeiter", details: `create ${input.email}`, status: "success" });
        return { success: true };
      }),

    mitarbeiterUpdate: adminProcedure
      .input(z.object({
        id: z.number().int().positive(),
        vorname: z.string().min(1).optional(),
        nachname: z.string().min(1).optional(),
        email: z.string().email().optional(),
        rolle: z.enum(["mitarbeiter", "teamleitung", "buchhaltung", "admin"]).optional(),
        aktiv: z.number().int().optional(),
        telefon: z.string().optional(),
        neuesPasswort: z.string().min(6).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { id, neuesPasswort, ...data } = input;
        const updateData: Record<string, unknown> = { ...data };
        if (neuesPasswort) updateData.passwortHash = await bcrypt.hash(neuesPasswort, 10);
        await updateMitarbeiter(id, updateData as any);
        await createAuditLog({ mitarbeiterId: ctx.adminId, action: "ADMIN", ressource: "mitarbeiter", details: `update id=${id}`, status: "success" });
        return { success: true };
      }),

    getZuordnung: adminProcedure
      .input(z.object({ mitarbeiterId: z.number().int().positive() }))
      .query(async ({ input }) => getZuordnungenForMitarbeiter(input.mitarbeiterId)),

    setZuordnung: adminProcedure
      .input(z.object({
        mitarbeiterId: z.number().int().positive(),
        kundenIds: z.array(z.number().int().positive()),
      }))
      .mutation(async ({ input, ctx }) => {
        await setKundenZuordnung(input.mitarbeiterId, input.kundenIds);
        await createAuditLog({ mitarbeiterId: ctx.adminId, action: "ADMIN", ressource: "zuordnung", details: `ma=${input.mitarbeiterId} kunden=${input.kundenIds.join(",")}`, status: "success" });
        return { success: true };
      }),

    statistik: adminProcedure
      .input(z.object({ monat: z.string().regex(/^\d{4}-\d{2}$/) }))
      .query(async ({ input }) => getMonatsStatistik(input.monat)),

    monatsabschluesse: adminProcedure.query(async () => getMonatsabschluesse()),

    monatsabschluss: adminProcedure
      .input(z.object({ monat: z.string().regex(/^\d{4}-\d{2}$/) }))
      .mutation(async ({ input, ctx }) => {
        const [eis, leis, fahr, maList] = await Promise.all([
          getAllEinsaetze(),
          getAllLeistungen(),
          getAllFahrten(),
          getAllMitarbeiter(),
        ]);

        const monEis = eis.filter((e) => {
          const d = typeof e.datum === "string" ? e.datum : (e.datum as Date).toISOString().split("T")[0];
          return d?.slice(0, 7) === input.monat;
        });
        const monLeis = leis.filter((l) => l.monat === input.monat);
        const monFahr = fahr.filter((f) => {
          const d = typeof f.datum === "string" ? f.datum : (f.datum as Date).toISOString().split("T")[0];
          return d?.slice(0, 7) === input.monat;
        });

        const gesamtStunden = monEis.reduce((s, e) => s + parseFloat(String(e.dauerStunden ?? 0)), 0);
        const gesamtKm = monFahr.reduce((s, f) => s + parseFloat(String(f.kilometer ?? 0)), 0);
        const gesamtVerguetung = monFahr.reduce((s, f) => s + parseFloat(String(f.verguetung ?? 0)), 0);

        const csvRows = [
          "Mitarbeiter;Datum;Kunde;Paragraph;Stunden;Status",
          ...monEis.map((e) => {
            const ma = maList.find((m) => m.id === e.mitarbeiterId);
            const d = typeof e.datum === "string" ? e.datum : (e.datum as Date).toISOString().split("T")[0];
            return `${ma?.nachname ?? ""} ${ma?.vorname ?? ""};${d};${e.kundenId};§${e.paragraph} SGB XI;${e.dauerStunden ?? 0};${e.status}`;
          }),
        ];
        const csvExport = csvRows.join("\n");

        await createMonatsabschluss({
          monat: input.monat,
          adminId: ctx.adminId,
          gesamtStunden,
          gesamtEinsaetze: monEis.length,
          gesamtKm,
          gesamtVerguetung,
          csvExport,
        });

        await createAuditLog({ mitarbeiterId: ctx.adminId, action: "EXPORT", ressource: "monatsabschluss", details: `monat=${input.monat}`, status: "success" });
        return { success: true, csvExport, stats: { einsaetze: monEis.length, stunden: gesamtStunden, km: gesamtKm, verguetung: gesamtVerguetung } };
      }),

    mitarbeiterDetail: adminProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .query(async ({ input }) => getMitarbeiterById(input.id)),

    updateZertifikat: adminProcedure
      .input(z.object({
        id: z.number().int().positive(),
        zertifikatStatus: z.enum(["erhalten", "angemeldet", "nicht_angemeldet"]),
        zertifikatDatum: z.string().optional(),
        zertifikatAblauf: z.string().optional(),
        zertifikatBemerkung: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { id, ...data } = input;
        await updateMitarbeiter(id, data as any);
        await createAuditLog({ mitarbeiterId: ctx.adminId, action: "ADMIN", ressource: "zertifikat", details: `ma=${id} status=${data.zertifikatStatus}`, status: "success" });
        return { success: true };
      }),

    updateStammdaten: adminProcedure
      .input(z.object({
        id: z.number().int().positive(),
        vorname: z.string().min(1).optional(),
        nachname: z.string().min(1).optional(),
        email: z.string().email().optional(),
        telefon: z.string().optional(),
        mobil: z.string().optional(),
        strasse: z.string().optional(),
        plz: z.string().optional(),
        ort: z.string().optional(),
        geburtsdatum: z.string().optional(),
        eintrittsdatum: z.string().optional(),
        position: z.string().optional(),
        beschaeftigungsart: z.enum(["minijob", "teilzeit", "vollzeit"]).optional(),
        rolle: z.enum(["mitarbeiter", "teamleitung", "buchhaltung", "admin"]).optional(),
        aktiv: z.number().int().optional(),
        notizen: z.string().optional(),
        neuesPasswort: z.string().min(6).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { id, neuesPasswort, ...data } = input;
        const updateData: Record<string, unknown> = { ...data };
        if (neuesPasswort) updateData.passwortHash = await bcrypt.hash(neuesPasswort, 10);
        await updateMitarbeiter(id, updateData as any);
        await createAuditLog({ mitarbeiterId: ctx.adminId, action: "ADMIN", ressource: "mitarbeiter", details: `stammdaten update id=${id}`, status: "success" });
        return { success: true };
      }),

    updateArbeitsvertrag: adminProcedure
      .input(z.object({
        id: z.number().int().positive(),
        arbeitsvertragUrl: z.string().url(),
        arbeitsvertragDateiname: z.string(),
        arbeitsvertragDatum: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { id, ...data } = input;
        await updateMitarbeiter(id, data as any);
        await createAuditLog({ mitarbeiterId: ctx.adminId, action: "ADMIN", ressource: "arbeitsvertrag", details: `ma=${id} datei=${data.arbeitsvertragDateiname}`, status: "success" });
        return { success: true };
      }),

    getUploadUrl: adminProcedure
      .input(z.object({
        mitarbeiterId: z.number().int().positive(),
        dateiname: z.string().min(1),
        contentType: z.string().default("application/pdf"),
      }))
      .mutation(async ({ input, ctx }) => {
        const { storagePut } = await import("./storage");
        const key = `arbeitsvertraege/ma-${input.mitarbeiterId}/${Date.now()}-${input.dateiname}`;
        const { url } = await storagePut(key, Buffer.from(""), input.contentType);
        await createAuditLog({ mitarbeiterId: ctx.adminId, action: "ADMIN", ressource: "arbeitsvertrag", details: `upload-url ma=${input.mitarbeiterId}`, status: "success" });
        return { uploadUrl: url, key };
      }),

    auditLogs: adminProcedure
      .input(z.object({ limit: z.number().int().min(1).max(500).default(200) }))
      .query(async ({ input }) => getAuditLogs(input.limit)),

    // ── KOSTENTRÄGER ──────────────────────────────────
    kostentraegerList: adminProcedure.query(async () => getAllKostentraeger()),

    kostentraegerSearch: adminProcedure
      .input(z.object({ query: z.string().min(1) }))
      .query(async ({ input }) => searchKostentraeger(input.query)),

    kostentraegerCreate: adminProcedure
      .input(z.object({
        name: z.string().min(1),
        kurzname: z.string().optional(),
        ikNummer: z.string().optional(),
        typ: z.enum(["pflegekasse", "krankenkasse", "privat", "sonstige"]).default("pflegekasse"),
        strasse: z.string().optional(),
        plz: z.string().optional(),
        ort: z.string().optional(),
        telefon: z.string().optional(),
        fax: z.string().optional(),
        email: z.string().email().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        await createKostentraeger({ ...input, aktiv: 1 });
        await createAuditLog({ mitarbeiterId: ctx.adminId, action: "ADMIN", ressource: "kostentraeger", details: `create ${input.name}`, status: "success" });
        return { success: true };
      }),

    kostentraegerUpdate: adminProcedure
      .input(z.object({
        id: z.number().int().positive(),
        name: z.string().min(1).optional(),
        kurzname: z.string().optional(),
        ikNummer: z.string().optional(),
        typ: z.enum(["pflegekasse", "krankenkasse", "privat", "sonstige"]).optional(),
        strasse: z.string().optional(),
        plz: z.string().optional(),
        ort: z.string().optional(),
        telefon: z.string().optional(),
        aktiv: z.number().int().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { id, ...data } = input;
        await updateKostentraeger(id, data as any);
        await createAuditLog({ mitarbeiterId: ctx.adminId, action: "ADMIN", ressource: "kostentraeger", details: `update id=${id}`, status: "success" });
        return { success: true };
      }),

    // ── TEXTBAUSTEINE ──────────────────────────────────
    textbausteine: portalProcedure
      .input(z.object({
        paragraph: z.string().optional(),
        kategorie: z.string().optional(),
      }))
      .query(async ({ input }) => getAllTextbausteine(input.paragraph, input.kategorie)),

    textbausteineCreate: adminProcedure
      .input(z.object({
        kategorie: z.enum(["bericht", "gesundheit", "aktivitaet", "bemerkung", "sonstiges"]),
        paragraph: z.enum(["45b", "45a", "39", "alle"]),
        titel: z.string().min(1),
        inhalt: z.string().min(1),
      }))
      .mutation(async ({ input, ctx }) => {
        await createTextbaustein({ ...input, aktiv: 1 });
        await createAuditLog({ mitarbeiterId: ctx.adminId, action: "ADMIN", ressource: "textbaustein", details: `create ${input.titel}`, status: "success" });
        return { success: true };
      }),

    textbausteineUpdate: adminProcedure
      .input(z.object({
        id: z.number().int().positive(),
        titel: z.string().min(1).optional(),
        inhalt: z.string().min(1).optional(),
        aktiv: z.number().int().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { id, ...data } = input;
        await updateTextbaustein(id, data as any);
        await createAuditLog({ mitarbeiterId: ctx.adminId, action: "ADMIN", ressource: "textbaustein", details: `update id=${id}`, status: "success" });
        return { success: true };
      }),

    /** Löscht einen Textbaustein (Admin). */
    textbausteineDelete: adminProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(async ({ input, ctx }) => {
        await deleteTextbaustein(input.id);
        await createAuditLog({ mitarbeiterId: ctx.adminId, action: "DELETE", ressource: "textbaustein", details: `id=${input.id}`, status: "success" });
        return { success: true };
      }),

    // ── PFLEGEGRAD-BUDGET ──────────────────────────────
    pflegegradBudget: portalProcedure
      .input(z.object({ pflegegrad: z.number().int().min(1).max(5) }))
      .query(async ({ input }) => getPflegegradBudgets(input.pflegegrad)),

    // ── FAHRTKOSTEN-BERECHNUNG (Distanz-Schätzung) ────
    fahrtkostenBerechne: portalProcedure
      .input(z.object({
        vonAdresse: z.string().min(1),
        nachAdresse: z.string().min(1),
      }))
      .mutation(async ({ input }) => {
        try {
          const { makeRequest } = await import("./_core/map");
          const result = await makeRequest("/maps/api/distancematrix/json", {
            origins: input.vonAdresse,
            destinations: input.nachAdresse,
            mode: "driving",
            language: "de",
          });
          const element = (result as any)?.rows?.[0]?.elements?.[0];
          if (element?.status === "OK") {
            const distanzM = element.distance?.value ?? 0;
            const km = Math.round(distanzM / 100) / 10; // auf 0.1 km runden
            const verguetung = Math.round(km * 0.30 * 100) / 100; // 0,30 €/km
            return { km, verguetung, distanzText: element.distance?.text, dauerText: element.duration?.text };
          }
          return { km: 0, verguetung: 0, distanzText: null, dauerText: null };
        } catch {
          return { km: 0, verguetung: 0, distanzText: null, dauerText: null };
        }
      }),

    // ── E-BRIEF MODUL ──────────────────────────────────
    eBriefSend: adminProcedure
      .input(z.object({
        empfaenger: z.string().min(1),
        betreff: z.string().min(1),
        inhalt: z.string().optional(),
        anhangName: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        // Versand-Log speichern (E-Mail-Dienst kann später angebunden werden)
        await createEBriefLog({
          mitarbeiterId: ctx.adminId,
          empfaenger: input.empfaenger,
          betreff: input.betreff,
          inhalt: input.inhalt,
          status: "versendet",
        });
        await createAuditLog({ mitarbeiterId: ctx.adminId, action: "EXPORT", ressource: "ebrief", details: `an=${input.empfaenger} betreff=${input.betreff}`, status: "success" });
        return { success: true };
      }),

    eBriefLogs: adminProcedure
      .input(z.object({ limit: z.number().int().min(1).max(200).default(50) }))
      .query(async ({ input }) => getEBriefLogs(input.limit)),

    // ── MASSEN-EXPORT (ZIP-Download) ───────────────────
    massExport: adminProcedure
      .input(z.object({
        monat: z.string().regex(/^\d{4}-\d{2}$/),
        mitarbeiterId: z.number().int().positive().optional(),
        typ: z.enum(["leistungen", "fahrten", "alle"]).default("alle"),
      }))
      .mutation(async ({ input, ctx }) => {
        const [leis, fahr, maList, kundenList] = await Promise.all([
          getLeistungenFuerExport(input.monat, input.mitarbeiterId),
          getFahrtenFuerExport(input.monat, input.mitarbeiterId),
          getAllMitarbeiter(),
          getAllKunden(),
        ]);

        const getMaName = (id: number) => { const m = maList.find(m => m.id === id); return m ? `${m.nachname} ${m.vorname}` : `MA-${id}`; };
        const getKdName = (id: number | null) => { if (!id) return ""; const k = kundenList.find(k => k.id === id); return k ? `${k.nachname} ${k.vorname}` : `KD-${id}`; };

        // CSV für Leistungsnachweise
        const leistungenCsv = [
          "Mitarbeiter;Monat;Kunde;Paragraph;Stunden;Einsätze;Betrag;Status",
          ...leis.map(l => `${getMaName(l.mitarbeiterId)};${l.monat};${getKdName(l.kundenId)};§${l.paragraph} SGB XI;${l.stunden};${l.anzahlEinsaetze};${l.betrag} €;${l.status}`),
        ].join("\n");

        // CSV für Fahrten
        const fahrenCsv = [
          "Mitarbeiter;Datum;Von;Nach;km;Typ;Vergütung;Kunde;Zweck",
          ...fahr.map(f => {
            const d = typeof f.datum === "string" ? f.datum : (f.datum as Date).toISOString().split("T")[0];
            return `${getMaName(f.mitarbeiterId)};${d};${f.vonOrt};${f.nachOrt};${f.kilometer};${f.typ};${f.verguetung} €;${getKdName(f.kundenId ?? null)};${f.zweck ?? ""}`;
          }),
        ].join("\n");

        await createAuditLog({ mitarbeiterId: ctx.adminId, action: "EXPORT", ressource: "massexport", details: `monat=${input.monat} typ=${input.typ}`, status: "success" });

        return {
          success: true,
          monat: input.monat,
          leistungenCsv: input.typ !== "fahrten" ? leistungenCsv : null,
          fahrenCsv: input.typ !== "leistungen" ? fahrenCsv : null,
          stats: { leistungen: leis.length, fahrten: fahr.length },
        };
      }),
    // ── DATEV-EXPORT ──────────────────────────────────
    datevExport: adminProcedure
      .input(z.object({ monat: z.string().regex(/^\d{4}-\d{2}$/) }))
      .mutation(async ({ input, ctx }) => {
        const [leis, maList, kundenList] = await Promise.all([
          getLeistungenFuerExport(input.monat),
          getAllMitarbeiter(),
          getAllKunden(),
        ]);
        const getMaName = (id: number) => { const m = maList.find(m => m.id === id); return m ? `${m.nachname} ${m.vorname}` : `MA-${id}`; };
        const getKdName = (id: number | null) => { if (!id) return ''; const k = kundenList.find(k => k.id === id); return k ? `${k.nachname} ${k.vorname}` : `KD-${id}`; };
        // DATEV LODAS-Format (vereinfacht): Personalnummer;Lohnart;Betrag;Kostenstelle
        const header = 'Personalnummer;Nachname;Vorname;Lohnart;Betrag;Monat;Kostenstelle;Bemerkung';
        const rows = leis.map(l => {
          const ma = maList.find(m => m.id === l.mitarbeiterId);
          const pnr = String(l.mitarbeiterId).padStart(6, '0');
          const lohnart = l.paragraph === '45b' ? '1001' : l.paragraph === '45a' ? '1002' : '1003';
          const betrag = (parseFloat(String(l.betrag || 0))).toFixed(2).replace('.', ',');
          return `${pnr};${ma?.nachname || ''};${ma?.vorname || ''};${lohnart};${betrag};${input.monat};${l.paragraph};${getKdName(l.kundenId || null)}`;
        });
        const csv = [header, ...rows].join('\r\n');
        await createAuditLog({ mitarbeiterId: ctx.adminId, action: 'EXPORT', ressource: 'datev', details: `monat=${input.monat} zeilen=${rows.length}`, status: 'success' });
        return { csv, dateiname: `DATEV_LODAS_${input.monat}.csv`, zeilen: rows.length };
      }),

    // ── LEXWARE-EXPORT ──────────────────────────────────
    lexwareExport: adminProcedure
      .input(z.object({ monat: z.string().regex(/^\d{4}-\d{2}$/) }))
      .mutation(async ({ input, ctx }) => {
        const [leis, fahr, maList, kundenList] = await Promise.all([
          getLeistungenFuerExport(input.monat),
          getFahrtenFuerExport(input.monat),
          getAllMitarbeiter(),
          getAllKunden(),
        ]);
        const getMaName = (id: number) => { const m = maList.find(m => m.id === id); return m ? `${m.nachname}, ${m.vorname}` : `MA-${id}`; };
        const getKdName = (id: number | null) => { if (!id) return ''; const k = kundenList.find(k => k.id === id); return k ? `${k.nachname}, ${k.vorname}` : `KD-${id}`; };
        // Lexware-Lohnabrechnung CSV
        const leistungenHeader = 'Mitarbeiter;Monat;Paragraph;Stunden;Einsaetze;Betrag;Status';
        const leistungenRows = leis.map(l =>
          `${getMaName(l.mitarbeiterId)};${input.monat};${l.paragraph};${parseFloat(String(l.stunden || 0)).toFixed(2).replace('.', ',')};${l.anzahlEinsaetze};${parseFloat(String(l.betrag || 0)).toFixed(2).replace('.', ',')};${l.status}`
        );
        const fahrtenHeader = 'Mitarbeiter;Monat;Km;Betrag';
        const fahrtenRows = fahr.map(f =>
          `${getMaName(f.mitarbeiterId)};${input.monat};${parseFloat(String(f.kilometer || 0)).toFixed(1).replace('.', ',')};${(parseFloat(String(f.kilometer || 0)) * 0.30).toFixed(2).replace('.', ',')}`
        );
        const leistungenCsv = [leistungenHeader, ...leistungenRows].join('\r\n');
        const fahrtenCsv = [fahrtenHeader, ...fahrtenRows].join('\r\n');
        await createAuditLog({ mitarbeiterId: ctx.adminId, action: 'EXPORT', ressource: 'lexware', details: `monat=${input.monat}`, status: 'success' });
        return { leistungenCsv, fahrtenCsv, dateiname: `Lexware_${input.monat}.csv`, zeilen: leistungenRows.length + fahrtenRows.length };
      }),

    // ── LEISTUNGSNACHWEIS-FREIGABE ───────────────────────
    leistungenFreigabe: roleProcedure(["admin", "teamleitung"])
      .input(z.object({ limit: z.number().int().min(1).max(200).default(100) }))
      .query(async ({ input }) => {
        const alle = await getAllLeistungen();
        return alle.filter((l: any) => l.status === 'pruefung' || l.status === 'offen').slice(0, input.limit);
      }),

    leistungFreigeben: roleProcedure(["admin", "teamleitung"])
      .input(z.object({
        id: z.number().int().positive(),
        aktion: z.enum(['freigeben', 'ablehnen']),
        adminNotiz: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const neuerStatus = input.aktion === 'freigeben' ? 'freigegeben' : 'offen';
        await updateLeistungStatus(input.id, neuerStatus as any);
        await createAuditLog({ mitarbeiterId: ctx.mitarbeiterId, action: 'UPDATE', ressource: 'leistung', details: `id=${input.id} aktion=${input.aktion}`, status: 'success' });
        return { success: true };
      }),
  }),

  // ── PUSH-BENACHRICHTIGUNGEN ───────────────────────────
  push: router({
    // VAPID Public Key für Frontend
    vapidKey: publicProcedure.query(() => ({ publicKey: VAPID_PUBLIC })),

    // Subscription speichern
    subscribe: portalProtected
      .input(z.object({
        endpoint: z.string().url(),
        p256dh: z.string().min(1),
        auth: z.string().min(1),
      }))
      .mutation(async ({ input, ctx }) => {
        await savePushSubscription({
          mitarbeiterId: ctx.mitarbeiterId,
          endpoint: input.endpoint,
          p256dh: input.p256dh,
          auth: input.auth,
        });
        return { success: true };
      }),

    // Subscription entfernen
    unsubscribe: portalProtected
      .input(z.object({ endpoint: z.string() }))
      .mutation(async ({ input, ctx }) => {
        await deletePushSubscription(ctx.mitarbeiterId, input.endpoint);
        return { success: true };
      }),

    // Budget-Warnung manuell an alle senden (Admin)
    sendBudgetWarnung: adminProcedure
      .input(z.object({
        kundenName: z.string(),
        paragraph: z.string(),
        restBudget: z.number(),
      }))
      .mutation(async ({ input }) => {
        const subs = await getAllPushSubscriptions();
        const sent = await sendBudgetWarnungPush(
          subs.map(s => ({ endpoint: s.endpoint, p256dh: s.p256dh, auth: s.auth })),
          input.kundenName,
          input.paragraph,
          input.restBudget
        );
        return { success: true, sent };
      }),
  }),

  // ── FÜHRERSCHEIN-CHECKS ─────────────────────────────
  fuehrerschein: router({
    list: portalProcedure.query(async ({ ctx }) => {
      return getFuehrerscheinChecks(ctx.mitarbeiterId ?? undefined);
    }),

    listAll: adminProcedure.query(async () => {
      const rows = await getFuehrerscheinChecks();
      return (rows as any).rows ?? rows;
    }),

    create: portalProcedure
      .input(z.object({
        fotoUrl: z.string().optional(),
        fotoKey: z.string().optional(),
        pruefDatum: z.string(),
        naechstesPruefDatum: z.string(),
        bemerkung: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        await createFuehrerscheinCheck({
          mitarbeiterId: ctx.mitarbeiterId ?? 0,
          fotoKey: input.fotoKey,
          fotoUrl: input.fotoUrl,
          pruefDatum: input.pruefDatum,
          naechstesPruefDatum: input.naechstesPruefDatum,
          status: 'gueltig',
          bemerkung: input.bemerkung,
        });
        return { success: true };
      }),

    updateStatus: adminProcedure
      .input(z.object({ id: z.number(), status: z.enum(['gueltig', 'faellig', 'ueberfaellig']) }))
      .mutation(async ({ input }) => {
        await updateFuehrerscheinStatus(input.id, input.status);
        return { success: true };
      }),

    vapidKey: portalProcedure.query(() => ({ key: VAPID_PUBLIC })),
  }),

  // ── NEUKUNDENAUFNAHMEN ───────────────────────────────
  neukundenaufnahme: router({
    list: adminProcedure.query(async () => {
      return getAllNeukundenaufnahmen();
    }),

    create: portalProcedure
      .input(z.object({
        vorname: z.string().min(1),
        nachname: z.string().min(1),
        geburtsdatum: z.string().optional(),
        strasse: z.string().optional(),
        plz: z.string().optional(),
        ort: z.string().optional(),
        telefon: z.string().optional(),
        email: z.string().optional(),
        pflegegrad: z.number().min(1).max(5).optional(),
        kostentraeger: z.string().optional(),
        versicherungsnummer: z.string().optional(),
        paragraph: z.enum(['45b', '45a', '39']).optional(),
        vollmachtUnterschrift: z.string().optional(),
        kundenUnterschrift: z.string().optional(),
        notizen: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        await createNeukundenaufnahme({ ...input, erstelltVon: ctx.mitarbeiterId ?? undefined });
        return { success: true };
      }),

    updateStatus: adminProcedure
      .input(z.object({ id: z.number(), status: z.enum(['aufgenommen', 'in_bearbeitung', 'abgeschlossen']) }))
      .mutation(async ({ input }) => {
        await updateNeukundenaufnahmeStatus(input.id, input.status);
        return { success: true };
      }),
  }),

  // ── KASSENANFRAGEN ───────────────────────────────────
  kassenanfrage: router({
    list: portalProtected
      .input(z.object({ kundenId: z.number().optional() }).optional())
      .query(async ({ ctx, input }) => {
        if (input?.kundenId) {
          return getKassenanfragenByKunde(input.kundenId);
        }
        const ma = await getMitarbeiterById(ctx.mitarbeiterId);
        if (ma?.rolle === 'admin') return getAllKassenanfragen();
        return getAllKassenanfragen(ctx.mitarbeiterId);
      }),

    create: portalProtected
      .input(z.object({
        kundenId: z.number().int().positive(),
        kostentraegerId: z.number().int().positive().optional(),
        anfrageTyp: z.enum(['budget_45b', 'budget_45a', 'budget_39', 'alle_budgets', 'pflegegrad', 'sonstiges']),
        vollmachtText: z.string().optional(),
        unterschriftKunde: z.string().optional(),
        unterschriftMitarbeiter: z.string().optional(),
        notizen: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        await createKassenanfrage({ ...input, mitarbeiterId: ctx.mitarbeiterId });
        await createAuditLog({ mitarbeiterId: ctx.mitarbeiterId, action: 'CREATE', ressource: 'kassenanfrage', status: 'success' });
        return { success: true };
      }),

    updateStatus: portalProtected
      .input(z.object({
        id: z.number().int().positive(),
        status: z.enum(['offen', 'gesendet', 'beantwortet', 'abgelehnt']),
        antwort: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        await updateKassenanfrageStatus(input.id, input.status, input.antwort);
        await createAuditLog({ mitarbeiterId: ctx.mitarbeiterId, action: 'UPDATE', ressource: 'kassenanfrage', details: `id=${input.id} status=${input.status}`, status: 'success' });
        return { success: true };
      }),
  }),

  // ── P1: NEUKUNDEN-PUSH-BESTÄTIGUNGEN ─────────────────────────────────────────
  neukundenPush: router({
    // Mitarbeiter: eigene offene Bestätigungen abrufen
    meineOffenen: portalProtected.query(async ({ ctx }) => {
      return getOffeneNeukundenPushFuerMitarbeiter(ctx.mitarbeiterId);
    }),

    // Mitarbeiter: Bestätigung abgeben
    bestaetigen: portalProtected
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(async ({ input, ctx }) => {
        await bestaetigeNeukundenPush(input.id, ctx.mitarbeiterId);
        await createAuditLog({ mitarbeiterId: ctx.mitarbeiterId, action: 'UPDATE', ressource: 'neukunden_push', details: `id=${input.id}`, status: 'success' });
        return { success: true };
      }),

    // Admin: alle unbestätigten Einträge sehen (Eskalations-Übersicht)
    alleOffen: adminProcedure.query(async () => {
      return getAlleOffenenNeukundenPush();
    }),

    // Admin: 24h/48h-Eskalation manuell auslösen (oder per Heartbeat)
    eskaliereStale: adminProcedure.mutation(async ({ ctx }) => {
      const { getStaleNeukundenPush, eskaliereNeukundenPush } = await import('./db');
      // 24h-Stufe: noch auf Stufe 0 und älter als 24h
      const stale24h = await getStaleNeukundenPush(24 * 60 * 60 * 1000);
      let eskaliert = 0;
      for (const row of stale24h) {
        const stufe = (row.eskalationsstufe ?? 0) as number;
        if (stufe === 0) {
          await eskaliereNeukundenPush(row.id, 1);
          await createNotification({
            empfaengerId: row.mitarbeiterId,
            titel: '⚠️ Erinnerung: Neukunden-Bestätigung ausstehend',
            nachricht: 'Du hast eine Neukunden-Bestätigung noch nicht abgehakt. Bitte jetzt erledigen.',
            typ: 'warnung',
          });
          eskaliert++;
        }
      }
      // 48h-Stufe: auf Stufe 1 und älter als 48h → Admin-Alert
      const stale48h = await getStaleNeukundenPush(48 * 60 * 60 * 1000);
      for (const row of stale48h) {
        const stufe = (row.eskalationsstufe ?? 0) as number;
        if (stufe === 1) {
          await eskaliereNeukundenPush(row.id, 2);
          const alleMa = await getAllMitarbeiter();
          const admins = alleMa.filter((m: { rolle: string }) => m.rolle === 'admin');
          for (const admin of admins) {
            await createNotification({
              empfaengerId: admin.id,
              titel: '🚨 Admin-Alert: Neukunden-Push 48h unbestätigt',
              nachricht: `Mitarbeiter-ID ${row.mitarbeiterId} hat eine Neukunden-Bestätigung seit 48h nicht abgehakt!`,
              typ: 'fehler',
            });
          }
          eskaliert++;
        }
      }
      await createAuditLog({ mitarbeiterId: ctx.adminId, action: 'ADMIN', ressource: 'neukunden_push_eskalation', details: `eskaliert=${eskaliert}`, status: 'success' });
      return { success: true, eskaliert };
    }),
  }),

  // ── P2: VERTRETUNGS-ÜBERNAHMEN ────────────────────────────────────────────────
  vertretungUebernahme: router({
    // Mitarbeiter: Vertretung für einen Kunden übernehmen
    uebernahme: portalProtected
      .input(z.object({
        urlaubsantragId: z.number().int().positive(),
        kundenId: z.number().int().positive(),
        vollzugriffBisDatum: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      }))
      .mutation(async ({ input, ctx }) => {
        const vollzugriffBis = new Date(input.vollzugriffBisDatum);
        await createVertretungsUebernahme({
          urlaubsantragId: input.urlaubsantragId,
          kundenId: input.kundenId,
          vertreterId: ctx.mitarbeiterId,
          vollzugriffBis,
        });
        await createAuditLog({ mitarbeiterId: ctx.mitarbeiterId, action: 'CREATE', ressource: 'vertretung_uebernahme', details: `kunde=${input.kundenId}`, status: 'success' });
        return { success: true };
      }),

    // Mitarbeiter: eigene aktive Vertretungen abrufen
    meineAktiven: portalProtected.query(async ({ ctx }) => {
      return getAktiveVertretungenFuerMitarbeiter(ctx.mitarbeiterId);
    }),

    // Prüfen ob Vollzugriff auf einen Kunden besteht
    pruefeZugriff: portalProtected
      .input(z.object({ kundenId: z.number().int().positive() }))
      .query(async ({ input, ctx }) => {
        const hatZugriff = await hatVertretungsVollzugriff(ctx.mitarbeiterId, input.kundenId);
        return { hatZugriff };
      }),

    // Admin: abgelaufene Vertretungen bereinigen und Admin-Abschluss-Nachricht senden
    bereinigen: adminProcedure.mutation(async ({ ctx }) => {
      const { getAbgelaufeneVertretungen, deaktiviereVertretung } = await import('./db');
      const abgelaufene = await getAbgelaufeneVertretungen();
      let bereinigt = 0;
      for (const v of abgelaufene) {
        await deaktiviereVertretung(v.id);
        // Admin-Abschluss-Nachricht
        const alleMa = await getAllMitarbeiter();
        const admins = alleMa.filter((m: { rolle: string }) => m.rolle === 'admin');
        for (const admin of admins) {
          await createNotification({
            empfaengerId: admin.id,
            titel: '✅ Vertretung beendet',
            nachricht: `Vertretung für Kunden-ID ${v.kundenId} durch Mitarbeiter-ID ${v.vertreterId} ist abgelaufen und wurde bereinigt.`,
            typ: 'info',
          });
        }
        bereinigt++;
      }
      await createAuditLog({ mitarbeiterId: ctx.adminId, action: 'ADMIN', ressource: 'vertretung_bereinigung', details: `bereinigt=${bereinigt}`, status: 'success' });
      return { success: true, bereinigt };
    }),
  }),

  // ── P3: ADMIN-DIENSTWAGEN-VERWALTUNG ─────────────────────────────────────────
  dienstwagen: router({
    // Admin: Dienstwagen-Flag für Mitarbeiter setzen
    setzen: adminProcedure
      .input(z.object({
        mitarbeiterId: z.number().int().positive(),
        dienstwagen: z.boolean(),
        fahrzeugTyp: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error('DB nicht verfügbar');
        await db.update(mitarbeiter)
          .set({ dienstwagen: input.dienstwagen ? 1 : 0, fahrzeugTyp: input.fahrzeugTyp ?? null } as any)
          .where(eq(mitarbeiter.id, input.mitarbeiterId));
        await createAuditLog({ mitarbeiterId: ctx.adminId, action: 'ADMIN', ressource: 'dienstwagen', details: `ma=${input.mitarbeiterId} dienstwagen=${input.dienstwagen}`, status: 'success' });
        return { success: true };
      }),
  }),

    twoFactor: twoFactorRouter,
  datenschutz: datenschutzRouter,
  verfuegbarkeiten: verfuegbarkeitenRouter,
  besuchsberichte: besuchsberichteRouter,
  integrationen: integrationenRouter,
  analysen: analysenRouter,
  rbac: rbacRouter,
  umwidmung: umwidmungRouter,
  sonderfahrt: sonderfahrtRouter,
  rechnungsposition: rechnungspositionRouter,
  privatrechnung: privatrechnungRouter,
  import: importRouter,
});

export type AppRouter = typeof appRouter;