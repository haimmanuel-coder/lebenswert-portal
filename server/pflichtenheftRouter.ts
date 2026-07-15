import { z } from "zod";
import { and, desc, eq, gte, inArray, lte, or, sql } from "drizzle-orm";
import { router } from "./_core/trpc";
import { getDb } from "./db";
import { createAuditLog } from "./db";
import {
  arbeitszeitKonten,
  backupLaeufe,
  besuchsberichte,
  budgetTransaktionen,
  datenschutzDokumente,
  einwilligungen,
  einsaetze,
  integrationsLaeufe,
  integrationen,
  kunden,
  leistungen,
  loeschAnfragen,
  mitarbeiter,
  prognoseSnapshots,
  terminRueckmeldungen,
  verfuegbarkeiten,
} from "../drizzle/schema";
import { adminProcedure, encryptSecret, requireRecht, roleProcedure, sichereAnzeige } from "./portalAuth";
import { storagePut } from "./storage";
import { invokeLLM } from "./_core/llm";
import { cacheStatus, deleteCacheKeys, getOrSetCachedJson } from "./cache";

const managementProcedure = roleProcedure(["admin", "teamleitung"]);
const financeProcedure = roleProcedure(["admin", "buchhaltung"]);

function csvCell(value: unknown) {
  const text = value == null ? "" : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}
function toCsv(rows: Record<string, unknown>[]) {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  return [headers.map(csvCell).join(";"), ...rows.map(row => headers.map(h => csvCell(row[h])).join(";"))].join("\n");
}
async function planungsVorschlaege(input: { datum: string; startzeit: string; dauerStunden: number }) {
  const db = await getDb();
  const datum = new Date(`${input.datum}T00:00:00`);
  const wochentag = datum.getDay() === 0 ? 7 : datum.getDay();
  const [staff, availabilities, dayAssignments] = await Promise.all([
    db!.select().from(mitarbeiter).where(and(eq(mitarbeiter.aktiv, 1), inArray(mitarbeiter.rolle, ["mitarbeiter", "teamleitung"]))),
    db!.select().from(verfuegbarkeiten).where(eq(verfuegbarkeiten.wochentag, wochentag)),
    db!.select().from(einsaetze).where(and(eq(einsaetze.datum, datum), inArray(einsaetze.status, ["geplant", "bestaetigt", "aenderung_angefragt"]))),
  ]);
  const requestedMinutes = Number(input.startzeit.slice(0, 2)) * 60 + Number(input.startzeit.slice(3, 5));
  const endMinutes = requestedMinutes + Math.round(input.dauerStunden * 60);
  return staff.map(person => {
    const slots = availabilities.filter(slot => slot.mitarbeiterId === person.id && (!slot.gueltigVon || new Date(slot.gueltigVon) <= datum) && (!slot.gueltigBis || new Date(slot.gueltigBis) >= datum));
    const blocked = slots.some(slot => slot.status === "nicht_verfuegbar");
    const matching = slots.find(slot => { const start = Number(slot.vonZeit.slice(0,2)) * 60 + Number(slot.vonZeit.slice(3,5)); const end = Number(slot.bisZeit.slice(0,2)) * 60 + Number(slot.bisZeit.slice(3,5)); return slot.status !== "nicht_verfuegbar" && start <= requestedMinutes && end >= endMinutes; });
    const auslastung = dayAssignments.filter(einsatz => einsatz.mitarbeiterId === person.id).reduce((sum, einsatz) => sum + Number(einsatz.dauerStunden || 0), 0);
    const score = blocked ? -1000 : (matching?.status === "bevorzugt" ? 120 : matching ? 90 : 20) - auslastung * 10;
    return { mitarbeiterId: person.id, name: `${person.vorname} ${person.nachname}`, score: Math.round(score), auslastung, verfuegbarkeit: blocked ? "nicht verfügbar" : matching?.status === "bevorzugt" ? "bevorzugte Zeit" : matching ? "verfügbar" : "keine Zeit hinterlegt" };
  }).filter(item => item.score > -1000).sort((a, b) => b.score - a.score);
}

function reportSuggestion(input: { taetigkeiten: string; beobachtungen?: string; besonderheiten?: string }) {
  const parts = [input.taetigkeiten, input.beobachtungen, input.besonderheiten].filter(Boolean).join(" ");
  const alerts = /(sturz|schmerz|fieber|verwirrt|wunde|notfall|verschlechter)/i.test(parts);
  const next = alerts
    ? "Auffälligkeit erkannt: Bitte zeitnah Teamleitung informieren, Verlauf dokumentieren und bei akuter Gefahr den medizinischen Notdienst verständigen."
    : "Dokumentation ist plausibel. Beim nächsten Besuch Wohlbefinden, vereinbarte Tätigkeiten und erkennbare Veränderungen erneut prüfen.";
  return `${next} Dieser Hinweis unterstützt nur die Dokumentation und ersetzt keine fachliche oder medizinische Entscheidung.`;
}

export const pflichtenheftRouter = router({
  verfuegbarkeit: router({
    meine: requireRecht("berichte:lesen").query(async ({ ctx }) => {
      const db = await getDb();
      return db!.select().from(verfuegbarkeiten).where(eq(verfuegbarkeiten.mitarbeiterId, ctx.mitarbeiterId)).orderBy(verfuegbarkeiten.wochentag, verfuegbarkeiten.vonZeit);
    }),
    team: managementProcedure.query(async () => {
      const db = await getDb();
      return db!.select({ verfuegbarkeit: verfuegbarkeiten, vorname: mitarbeiter.vorname, nachname: mitarbeiter.nachname })
        .from(verfuegbarkeiten).innerJoin(mitarbeiter, eq(verfuegbarkeiten.mitarbeiterId, mitarbeiter.id))
        .orderBy(mitarbeiter.nachname, verfuegbarkeiten.wochentag);
    }),
    speichern: requireRecht("berichte:lesen").input(z.object({
      id: z.number().int().positive().optional(),
      wochentag: z.number().int().min(1).max(7),
      vonZeit: z.string().regex(/^\d{2}:\d{2}$/),
      bisZeit: z.string().regex(/^\d{2}:\d{2}$/),
      gueltigVon: z.string().optional(), gueltigBis: z.string().optional(),
      status: z.enum(["verfuegbar", "nicht_verfuegbar", "bevorzugt"]),
      notiz: z.string().max(500).optional(),
    })).mutation(async ({ ctx, input }) => {
      if (input.bisZeit <= input.vonZeit) throw new Error("Die Endzeit muss nach der Startzeit liegen.");
      const db = await getDb();
      const values = { wochentag: input.wochentag, vonZeit: input.vonZeit, bisZeit: input.bisZeit, status: input.status, notiz: input.notiz, gueltigVon: input.gueltigVon ? new Date(`${input.gueltigVon}T00:00:00`) : null, gueltigBis: input.gueltigBis ? new Date(`${input.gueltigBis}T00:00:00`) : null, mitarbeiterId: ctx.mitarbeiterId };
      if (input.id) await db!.update(verfuegbarkeiten).set(values).where(and(eq(verfuegbarkeiten.id, input.id), eq(verfuegbarkeiten.mitarbeiterId, ctx.mitarbeiterId)));
      else await db!.insert(verfuegbarkeiten).values(values);
      await createAuditLog({ mitarbeiterId: ctx.mitarbeiterId, action: "AVAILABILITY_SAVE", ressource: "verfuegbarkeit", status: "success" });
      return { success: true };
    }),
    loeschen: requireRecht("berichte:lesen").input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      await db!.delete(verfuegbarkeiten).where(and(eq(verfuegbarkeiten.id, input.id), eq(verfuegbarkeiten.mitarbeiterId, ctx.mitarbeiterId)));
      return { success: true };
    }),
  }),

  termine: router({
    meineOffenen: requireRecht("berichte:lesen").query(async ({ ctx }) => {
      const db = await getDb();
      const today = new Date(`${new Date().toISOString().slice(0, 10)}T00:00:00`);
      return db!.select({ einsatz: einsaetze, kundeVorname: kunden.vorname, kundeNachname: kunden.nachname })
        .from(einsaetze).innerJoin(kunden, eq(einsaetze.kundenId, kunden.id))
        .where(and(eq(einsaetze.mitarbeiterId, ctx.mitarbeiterId), gte(einsaetze.datum, today)))
        .orderBy(einsaetze.datum, einsaetze.startzeit);
    }),
    reagieren: requireRecht("berichte:lesen").input(z.object({
      einsatzId: z.number().int().positive(), aktion: z.enum(["bestaetigt", "abgesagt", "aenderung_angefragt"]),
      grund: z.string().max(1000).optional(), wunschDatum: z.string().optional(), wunschZeit: z.string().optional(),
    })).mutation(async ({ ctx, input }) => {
      if (input.aktion !== "bestaetigt" && !input.grund?.trim()) throw new Error("Bitte einen Grund angeben.");
      const db = await getDb();
      const existing = await db!.select().from(einsaetze).where(and(eq(einsaetze.id, input.einsatzId), eq(einsaetze.mitarbeiterId, ctx.mitarbeiterId))).limit(1);
      if (!existing[0]) throw new Error("Termin nicht gefunden.");
      await db!.insert(terminRueckmeldungen).values({ einsatzId: input.einsatzId, mitarbeiterId: ctx.mitarbeiterId, aktion: input.aktion, grund: input.grund, wunschDatum: input.wunschDatum ? new Date(`${input.wunschDatum}T00:00:00`) : null, wunschZeit: input.wunschZeit });
      await db!.update(einsaetze).set({
        status: input.aktion,
        bestaetigtAt: input.aktion === "bestaetigt" ? new Date() : null,
        absagegrund: input.aktion === "abgesagt" ? input.grund : null,
        aenderungswunsch: input.aktion === "aenderung_angefragt" ? [input.grund, input.wunschDatum, input.wunschZeit].filter(Boolean).join(" | ") : null,
      }).where(eq(einsaetze.id, input.einsatzId));
      await createAuditLog({ mitarbeiterId: ctx.mitarbeiterId, action: `APPOINTMENT_${input.aktion.toUpperCase()}`, ressource: `einsatz:${input.einsatzId}`, status: "success" });
      return { success: true };
    }),
    zeiterfassung: requireRecht("berichte:lesen").input(z.object({ einsatzId: z.number().int().positive(), aktion: z.enum(["start", "ende"]) })).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      const rows = await db!.select().from(einsaetze).where(and(eq(einsaetze.id, input.einsatzId), eq(einsaetze.mitarbeiterId, ctx.mitarbeiterId))).limit(1);
      if (!rows[0]) throw new Error("Termin nicht gefunden.");
      const now = new Date();
      if (input.aktion === "ende" && !rows[0].tatsaechlicherStart) throw new Error("Der Termin wurde noch nicht gestartet.");
      await db!.update(einsaetze).set(input.aktion === "start" ? { tatsaechlicherStart: now } : { tatsaechlichesEnde: now, status: "abgeschlossen" }).where(eq(einsaetze.id, input.einsatzId));
      return { success: true };
    }),
  }),

  planung: router({
    vorschlaege: managementProcedure.input(z.object({ kundenId: z.number().int().positive(), datum: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), startzeit: z.string().regex(/^\d{2}:\d{2}$/), dauerStunden: z.number().min(0.5).max(10) })).mutation(async ({ input }) => ({ vorschlaege: await planungsVorschlaege(input) })),
    automatischEinplanen: managementProcedure.input(z.object({ kundenId: z.number().int().positive(), datum: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), startzeit: z.string().regex(/^\d{2}:\d{2}$/), dauerStunden: z.number().min(0.5).max(10) })).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      const [kunde] = await db!.select().from(kunden).where(and(eq(kunden.id, input.kundenId), eq(kunden.aktiv, 1))).limit(1);
      if (!kunde) throw new Error("Kunde nicht gefunden.");
      const datum = new Date(`${input.datum}T00:00:00`);
      const duplicate = await db!.select().from(einsaetze).where(and(eq(einsaetze.kundenId, input.kundenId), eq(einsaetze.datum, datum), inArray(einsaetze.status, ["geplant", "bestaetigt", "aenderung_angefragt"]))).limit(1);
      if (duplicate[0]) throw new Error("Für diesen Kunden besteht an diesem Tag bereits ein Termin.");
      const ranking = await planungsVorschlaege(input);
      const selected = ranking[0];
      if (!selected) throw new Error("Kein verfügbarer Mitarbeiter gefunden.");
      const paragraph = kunde.paragraph === "privat" ? "45b" : kunde.paragraph || "45b";
      await db!.insert(einsaetze).values({ mitarbeiterId: selected.mitarbeiterId, kundenId: input.kundenId, datum, startzeit: input.startzeit, dauerStunden: String(input.dauerStunden), paragraph, status: "geplant", bemerkung: "Automatisch geplant – bitte durch Teamleitung prüfen." });
      await createAuditLog({ mitarbeiterId: ctx.mitarbeiterId, action: "AUTOMATIC_ASSIGNMENT", ressource: `kunde:${input.kundenId}`, status: "success", details: `${selected.name} | ${input.datum} ${input.startzeit}` });
      return { success: true, mitarbeiter: selected.name, begruendung: `${selected.verfuegbarkeit}, bisher ${selected.auslastung.toFixed(1)} Std. an diesem Tag` };
    }),
  }),

  berichte: router({
    liste: requireRecht("berichte:lesen").input(z.object({ kundenId: z.number().int().positive().optional(), status: z.enum(["entwurf", "eingereicht", "freigegeben", "korrektur"]).optional() }).optional()).query(async ({ ctx, input }) => {
      const db = await getDb();
      const filters = [] as any[];
      if (ctx.portalMitarbeiter.rolle === "mitarbeiter") filters.push(eq(besuchsberichte.mitarbeiterId, ctx.mitarbeiterId));
      if (input?.kundenId) filters.push(eq(besuchsberichte.kundenId, input.kundenId));
      if (input?.status) filters.push(eq(besuchsberichte.status, input.status));
      return db!.select({ bericht: besuchsberichte, kundeVorname: kunden.vorname, kundeNachname: kunden.nachname, mitarbeiterVorname: mitarbeiter.vorname, mitarbeiterNachname: mitarbeiter.nachname })
        .from(besuchsberichte).innerJoin(kunden, eq(besuchsberichte.kundenId, kunden.id)).innerJoin(mitarbeiter, eq(besuchsberichte.mitarbeiterId, mitarbeiter.id))
        .where(filters.length ? and(...filters) : undefined).orderBy(desc(besuchsberichte.datum));
    }),
    kiVorschlag: requireRecht("berichte:lesen").input(z.object({ taetigkeiten: z.string().min(3).max(4000), beobachtungen: z.string().max(4000).optional(), besonderheiten: z.string().max(4000).optional() })).mutation(async ({ ctx, input }) => {
      const fallback = reportSuggestion(input);
      try {
        const response = await invokeLLM({
          messages: [
            { role: "system", content: "Du unterstützt Mitarbeitende eines deutschen Betreuungsdienstes bei einer sachlichen Besuchsdokumentation. Formuliere höchstens drei kurze, neutrale nächste Schritte. Erfinde keine Diagnosen, Medikamente oder Tatsachen. Bei Warnzeichen empfehle nur Teamleitung und bei akuter Gefahr den medizinischen Notdienst. Weise abschließend knapp darauf hin, dass der Text geprüft werden muss und keine medizinische Entscheidung ersetzt." },
            { role: "user", content: `Durchgeführte Tätigkeiten:\n${input.taetigkeiten}\n\nBeobachtungen:\n${input.beobachtungen || "Keine Angabe"}\n\nBesonderheiten:\n${input.besonderheiten || "Keine Angabe"}` },
          ],
          maxTokens: 280,
        });
        const content = response.choices[0]?.message.content;
        const text = typeof content === "string" ? content.trim() : "";
        await createAuditLog({ mitarbeiterId: ctx.mitarbeiterId, action: "AI_REPORT_SUGGESTION", ressource: "besuchsbericht-entwurf", status: text ? "success" : "partial" });
        return { text: text || fallback, quelle: text ? "ki" as const : "regelwerk" as const };
      } catch {
        await createAuditLog({ mitarbeiterId: ctx.mitarbeiterId, action: "AI_REPORT_SUGGESTION", ressource: "besuchsbericht-entwurf", status: "partial" });
        return { text: fallback, quelle: "regelwerk" as const };
      }
    }),
    fotosHochladen: requireRecht("berichte:lesen").input(z.object({ fotos: z.array(z.object({ dateiname: z.string().min(1).max(180), mimeType: z.enum(["image/jpeg", "image/png", "image/webp"]), base64: z.string().min(20).max(7_500_000) })).min(1).max(4) })).mutation(async ({ ctx, input }) => {
      const uploads: string[] = [];
      for (const foto of input.fotos) {
        const expectedPrefix = `data:${foto.mimeType};base64,`;
        if (!foto.base64.startsWith(expectedPrefix)) throw new Error("Dateityp und Bildinhalt stimmen nicht überein.");
        const raw = foto.base64.slice(expectedPrefix.length);
        const data = Buffer.from(raw, "base64");
        if (!data.length || data.length > 5 * 1024 * 1024) throw new Error("Ein Foto darf höchstens 5 MB groß sein.");
        const isJpeg = data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff;
        const isPng = data.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
        const isWebp = data.subarray(0, 4).toString("ascii") === "RIFF" && data.subarray(8, 12).toString("ascii") === "WEBP";
        if ((foto.mimeType === "image/jpeg" && !isJpeg) || (foto.mimeType === "image/png" && !isPng) || (foto.mimeType === "image/webp" && !isWebp)) throw new Error("Die Datei ist kein gültiges Bild.");
        const extension = foto.mimeType === "image/png" ? "png" : foto.mimeType === "image/webp" ? "webp" : "jpg";
        const safeName = foto.dateiname.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80);
        const stored = await storagePut(`besuchsberichte/${ctx.mitarbeiterId}/${Date.now()}-${safeName}.${extension}`, data, foto.mimeType);
        uploads.push(stored.url);
      }
      await createAuditLog({ mitarbeiterId: ctx.mitarbeiterId, action: "REPORT_PHOTO_UPLOAD", ressource: "besuchsbericht", status: "success", details: JSON.stringify({ anzahl: uploads.length }) });
      return { urls: uploads };
    }),
    speichern: requireRecht("berichte:lesen").input(z.object({
      id: z.number().int().positive().optional(), einsatzId: z.number().int().positive().optional(), kundenId: z.number().int().positive(), datum: z.string(), dauerMinuten: z.number().int().min(1).max(1440).optional(),
      taetigkeiten: z.string().min(3), beobachtungen: z.string().optional(), besonderheiten: z.string().optional(), naechsteSchritte: z.string().optional(), kiVorschlag: z.string().optional(),
      anhangUrls: z.array(z.string().min(1).refine(value => value.startsWith("/manus-storage/") || /^https:\/\//.test(value), "Ungültiger Dateipfad")).max(10).optional(), status: z.enum(["entwurf", "eingereicht"]).default("entwurf"),
    })).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      const values = { einsatzId: input.einsatzId, kundenId: input.kundenId, mitarbeiterId: ctx.mitarbeiterId, datum: new Date(`${input.datum}T00:00:00`), dauerMinuten: input.dauerMinuten, taetigkeiten: input.taetigkeiten, beobachtungen: input.beobachtungen, besonderheiten: input.besonderheiten, naechsteSchritte: input.naechsteSchritte, kiVorschlag: input.kiVorschlag, anhangUrls: JSON.stringify(input.anhangUrls ?? []), status: input.status };
      if (input.id) {
        const own = await db!.select().from(besuchsberichte).where(and(eq(besuchsberichte.id, input.id), eq(besuchsberichte.mitarbeiterId, ctx.mitarbeiterId))).limit(1);
        if (!own[0] || own[0].status === "freigegeben") throw new Error("Dieser Bericht kann nicht geändert werden.");
        await db!.update(besuchsberichte).set(values).where(eq(besuchsberichte.id, input.id));
      } else await db!.insert(besuchsberichte).values(values);
      await createAuditLog({ mitarbeiterId: ctx.mitarbeiterId, action: input.status === "eingereicht" ? "REPORT_SUBMIT" : "REPORT_SAVE", ressource: "besuchsbericht", status: "success" });
      return { success: true };
    }),
    freigeben: requireRecht("berichte:freigeben").input(z.object({ id: z.number().int().positive(), aktion: z.enum(["freigegeben", "korrektur"]), hinweis: z.string().optional() })).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      await db!.update(besuchsberichte).set({ status: input.aktion, freigegebenVon: ctx.mitarbeiterId, freigegebenAt: input.aktion === "freigegeben" ? new Date() : null, naechsteSchritte: input.hinweis ? sql`CONCAT(COALESCE(${besuchsberichte.naechsteSchritte}, ''), ${`\nFreigabehinweis: ${input.hinweis}`})` : undefined }).where(eq(besuchsberichte.id, input.id));
      return { success: true };
    }),
  }),

  integrationen: router({
    liste: requireRecht("integrationen:verwalten").query(async () => {
      const db = await getDb();
      const rows = await db!.select().from(integrationen).orderBy(integrationen.anbieter);
      return rows.map(r => ({ ...r, verschluesselteZugangsdaten: undefined, zugangGespeichert: Boolean(r.verschluesselteZugangsdaten) }));
    }),
    speichern: requireRecht("integrationen:verwalten").input(z.object({
      id: z.number().int().positive().optional(), anbieter: z.enum(["datev", "optadata", "pflegekassen", "gehaltsprogramm", "email", "ebrief", "redis", "maps", "ki"]),
      bezeichnung: z.string().min(2), basisUrl: z.string().url().optional().or(z.literal("")), secret: z.string().optional(), konfiguration: z.record(z.string(), z.unknown()).optional(),
    })).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      const values: any = { anbieter: input.anbieter, bezeichnung: input.bezeichnung, basisUrl: input.basisUrl || null, konfiguration: JSON.stringify(input.konfiguration ?? {}) };
      if (input.secret) { values.verschluesselteZugangsdaten = encryptSecret(input.secret); values.zugangHinweis = sichereAnzeige(input.secret); }
      if (input.id) await db!.update(integrationen).set(values).where(eq(integrationen.id, input.id));
      else await db!.insert(integrationen).values({ ...values, status: "nicht_eingerichtet" });
      await createAuditLog({ mitarbeiterId: ctx.mitarbeiterId, action: "INTEGRATION_SAVE", ressource: input.anbieter, status: "success" });
      return { success: true };
    }),
    testen: requireRecht("integrationen:verwalten").input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      const rows = await db!.select().from(integrationen).where(eq(integrationen.id, input.id)).limit(1);
      const item = rows[0];
      if (!item) throw new Error("Schnittstelle nicht gefunden.");
      const lauf = await db!.insert(integrationsLaeufe).values({ integrationId: item.id, gestartetVon: ctx.mitarbeiterId, typ: "test", status: "gestartet" });
      if (!item.basisUrl) {
        await db!.update(integrationen).set({ status: "nicht_eingerichtet", letzterTestAt: new Date(), letzterTestStatus: "fehler", letzterFehler: "API-Adresse fehlt" }).where(eq(integrationen.id, item.id));
        throw new Error("Bitte zuerst die offizielle API-Adresse und Zugangsdaten hinterlegen.");
      }
      try {
        const response = await fetch(item.basisUrl, { method: "GET", signal: AbortSignal.timeout(8000), redirect: "manual" });
        const ok = response.status > 0 && response.status < 500;
        await db!.update(integrationen).set({ status: ok ? "testmodus" : "fehler", letzterTestAt: new Date(), letzterTestStatus: ok ? "erfolg" : "fehler", letzterFehler: ok ? null : `HTTP ${response.status}` }).where(eq(integrationen.id, item.id));
        await db!.insert(integrationsLaeufe).values({ integrationId: item.id, gestartetVon: ctx.mitarbeiterId, typ: "test", status: ok ? "erfolg" : "fehler", meldung: `HTTP ${response.status}`, beendetAt: new Date() });
        return { success: ok, status: response.status };
      } catch (error) {
        const message = error instanceof Error ? error.message : "Verbindung fehlgeschlagen";
        await db!.update(integrationen).set({ status: "fehler", letzterTestAt: new Date(), letzterTestStatus: "fehler", letzterFehler: message }).where(eq(integrationen.id, item.id));
        throw new Error(`Verbindungstest fehlgeschlagen: ${message}`);
      }
    }),
    laeufe: requireRecht("integrationen:verwalten").query(async () => {
      const db = await getDb();
      return db!.select({ lauf: integrationsLaeufe, anbieter: integrationen.anbieter, bezeichnung: integrationen.bezeichnung }).from(integrationsLaeufe).innerJoin(integrationen, eq(integrationsLaeufe.integrationId, integrationen.id)).orderBy(desc(integrationsLaeufe.createdAt)).limit(100);
    }),
    cacheStatus: requireRecht("integrationen:verwalten").query(() => cacheStatus()),
  }),

  exporte: router({
    datevMitarbeiter: financeProcedure.input(z.object({ monat: z.string().regex(/^\d{4}-\d{2}$/) })).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      const ma = await db!.select().from(mitarbeiter).where(and(eq(mitarbeiter.aktiv, 1), eq(mitarbeiter.datevEinwilligung, true)));
      const konten = await db!.select().from(arbeitszeitKonten).where(eq(arbeitszeitKonten.monat, input.monat));
      const rows = ma.map(m => { const k = konten.find(x => x.mitarbeiterId === m.id); return { Personalnummer: m.id, Vorname: m.vorname, Nachname: m.nachname, Monat: input.monat, Sollstunden: k?.sollStunden ?? "", Iststunden: k?.istStunden ?? "", Ueberstunden: k?.ueberstunden ?? "" }; });
      await createAuditLog({ mitarbeiterId: ctx.mitarbeiterId, action: "DATEV_EXPORT", ressource: input.monat, status: "success", details: `${rows.length} Datensätze` });
      return { dateiname: `datev-${input.monat}.csv`, csv: toCsv(rows), anzahl: rows.length };
    }),
    optadataLeistungen: financeProcedure.input(z.object({ von: z.string(), bis: z.string() })).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      const vonMonat = input.von.slice(0, 7); const bisMonat = input.bis.slice(0, 7);
      const data = await db!.select({ leistung: leistungen, kundeVorname: kunden.vorname, kundeNachname: kunden.nachname, versicherungsnummer: kunden.versicherungsnummer }).from(leistungen).innerJoin(kunden, eq(leistungen.kundenId, kunden.id)).where(and(gte(leistungen.monat, vonMonat), lte(leistungen.monat, bisMonat)));
      const rows = data.map(x => ({ Kunde: `${x.kundeVorname} ${x.kundeNachname}`, Versicherungsnummer: x.versicherungsnummer ?? "", Monat: x.leistung.monat, Paragraph: x.leistung.paragraph, Stunden: x.leistung.stunden, Betrag: x.leistung.betrag ?? "" }));
      await createAuditLog({ mitarbeiterId: ctx.mitarbeiterId, action: "OPTADATA_EXPORT", ressource: `${input.von}:${input.bis}`, status: "success", details: `${rows.length} Datensätze` });
      return { dateiname: `optadata-${input.von}-${input.bis}.csv`, csv: toCsv(rows), anzahl: rows.length };
    }),
  }),

  datenschutz: router({
    dokumente: requireRecht("datenschutz:verwalten").query(async () => { const db = await getDb(); return db!.select().from(datenschutzDokumente).orderBy(desc(datenschutzDokumente.createdAt)); }),
    dokumentSpeichern: requireRecht("datenschutz:verwalten").input(z.object({ typ: z.enum(["datenschutzerklaerung", "avv", "einwilligung", "loeschkonzept", "verarbeitungsverzeichnis"]), titel: z.string().min(3), version: z.string().min(1), inhalt: z.string().optional(), dateiUrl: z.string().url().optional(), gueltigAb: z.string().optional() })).mutation(async ({ ctx, input }) => {
      const db = await getDb(); await db!.insert(datenschutzDokumente).values({ ...input, gueltigAb: input.gueltigAb ? new Date(`${input.gueltigAb}T00:00:00`) : null }); await createAuditLog({ mitarbeiterId: ctx.mitarbeiterId, action: "PRIVACY_DOCUMENT_CREATE", ressource: input.typ, status: "success" }); return { success: true };
    }),
    meineEinwilligungen: requireRecht("berichte:lesen").query(async ({ ctx }) => { const db = await getDb(); return db!.select().from(einwilligungen).where(and(eq(einwilligungen.personTyp, "mitarbeiter"), eq(einwilligungen.personId, ctx.mitarbeiterId))).orderBy(desc(einwilligungen.createdAt)); }),
    datevEinwilligung: requireRecht("berichte:lesen").input(z.object({ erteilt: z.boolean(), dokumentVersion: z.string().default("1.0") })).mutation(async ({ ctx, input }) => {
      const db = await getDb(); const now = new Date(); await db!.update(mitarbeiter).set({ datevEinwilligung: input.erteilt, datevEinwilligungAt: input.erteilt ? now : null }).where(eq(mitarbeiter.id, ctx.mitarbeiterId)); await db!.insert(einwilligungen).values({ personTyp: "mitarbeiter", personId: ctx.mitarbeiterId, zweck: "datev", erteilt: input.erteilt, dokumentVersion: input.dokumentVersion, widerrufenAt: input.erteilt ? null : now }); return { success: true };
    }),
    loeschAnfragen: requireRecht("datenschutz:verwalten").query(async () => { const db = await getDb(); return db!.select().from(loeschAnfragen).orderBy(desc(loeschAnfragen.createdAt)); }),
    loeschungAnfragen: requireRecht("datenschutz:verwalten").input(z.object({ personTyp: z.enum(["mitarbeiter", "kunde"]), personId: z.number().int().positive(), grund: z.string().min(3) })).mutation(async ({ ctx, input }) => { const db = await getDb(); await db!.insert(loeschAnfragen).values(input); await createAuditLog({ mitarbeiterId: ctx.mitarbeiterId, action: "DELETION_REQUEST", ressource: `${input.personTyp}:${input.personId}`, status: "success" }); return { success: true }; }),
    kundenSoftDelete: requireRecht("kunden:loeschen").input(z.object({ kundenId: z.number().int().positive(), grund: z.string().min(3) })).mutation(async ({ ctx, input }) => { const db = await getDb(); await db!.update(kunden).set({ aktiv: 0, geloeschtAt: new Date(), geloeschtVon: ctx.mitarbeiterId, loeschgrund: input.grund }).where(eq(kunden.id, input.kundenId)); await createAuditLog({ mitarbeiterId: ctx.mitarbeiterId, action: "CUSTOMER_SOFT_DELETE", ressource: `kunde:${input.kundenId}`, status: "success", details: input.grund }); return { success: true }; }),
  }),

  analyse: router({
    dashboard: financeProcedure.query(async () => getOrSetCachedJson("analyse:dashboard", 30, async () => {
      const db = await getDb();
      const [kundenRows, maRows, einsatzRows, reportRows, budgetRows] = await Promise.all([
        db!.select().from(kunden).where(eq(kunden.aktiv, 1)), db!.select().from(mitarbeiter).where(eq(mitarbeiter.aktiv, 1)), db!.select().from(einsaetze), db!.select().from(besuchsberichte), db!.select().from(budgetTransaktionen).orderBy(desc(budgetTransaktionen.createdAt)).limit(500),
      ]);
      const planned = einsatzRows.filter(e => ["geplant", "bestaetigt"].includes(e.status)).length;
      const completed = einsatzRows.filter(e => e.status === "abgeschlossen").length;
      const absagen = einsatzRows.filter(e => e.status === "abgesagt").length;
      const verbrauch = kundenRows.reduce((sum, k) => sum + Number(k.verbraucht45b || 0) + Number(k.verbraucht45a || 0) + Number(k.verbraucht39 || 0), 0);
      const budget = kundenRows.reduce((sum, k) => sum + Number(k.budget45b || 0) + Number(k.budget45a || 0) + Number(k.budget39 || 0), 0);
      const kundenProMa = maRows.length ? kundenRows.length / maRows.length : 0;
      const trend = budgetRows.slice(0, 12).map(b => ({ datum: b.createdAt, verbraucht: b.typ === "rueckerstattung" ? -Number(b.betrag || 0) : Number(b.betrag || 0), budget: 0 })).reverse();
      return { kennzahlen: { kunden: kundenRows.length, mitarbeiter: maRows.length, geplanteEinsaetze: planned, abgeschlosseneEinsaetze: completed, absagen, berichteOffen: reportRows.filter(r => r.status === "eingereicht").length, budget, verbrauch, auslastungProzent: planned + completed ? Math.round(completed / (planned + completed) * 100) : 0, kundenProMitarbeiter: Number(kundenProMa.toFixed(1)) }, trend };
    })),
    prognosen: financeProcedure.query(async () => { const db = await getDb(); return db!.select().from(prognoseSnapshots).orderBy(desc(prognoseSnapshots.createdAt)).limit(100); }),
    prognoseErstellen: financeProcedure.input(z.object({ monat: z.string().regex(/^\d{4}-\d{2}$/), typ: z.enum(["budget", "personal", "auslastung", "umsatz"]), basisWert: z.number(), wachstumProzent: z.number().min(-100).max(500).default(0), details: z.string().optional() })).mutation(async ({ input }) => { const db = await getDb(); const prognose = input.basisWert * (1 + input.wachstumProzent / 100); await db!.insert(prognoseSnapshots).values({ monat: input.monat, typ: input.typ, basisWert: String(input.basisWert), prognoseWert: String(prognose), vertrauenProzent: 70, details: input.details }); await deleteCacheKeys("analyse:dashboard"); return { success: true, prognose }; }),
  }),

  backups: router({
    status: adminProcedure.query(async () => { const db = await getDb(); return db!.select().from(backupLaeufe).orderBy(desc(backupLaeufe.createdAt)).limit(50); }),
    nachweisEintragen: adminProcedure.input(z.object({ typ: z.enum(["datenbank", "dokumente", "vollbackup"]), status: z.enum(["erfolg", "fehler"]), speicherort: z.string().optional(), pruefsumme: z.string().optional(), meldung: z.string().optional() })).mutation(async ({ ctx, input }) => { const db = await getDb(); await db!.insert(backupLaeufe).values({ ...input, beendetAt: new Date() }); await createAuditLog({ mitarbeiterId: ctx.mitarbeiterId, action: "BACKUP_EVIDENCE_CREATE", ressource: input.typ, status: input.status === "erfolg" ? "success" : "failure" }); return { success: true }; }),
  }),
});
