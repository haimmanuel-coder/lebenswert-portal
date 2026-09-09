import { z } from "zod";
import { router } from "../_core/trpc";
import { portalProtected, adminProcedure, roleProcedure } from "../portalAuth";
import { TRPCError } from "@trpc/server";
import { checkDoppelbelegung, createEinsatz, createAuditLog, getDb, getKundeById, getMitarbeiterById, isMitarbeiterZugeordnet } from "../db";
import { besuchsberichte, besuchsberichtDateien, formularVorlagen } from "../../drizzle/schema";
import { eq, desc, and } from "drizzle-orm";
import { transcribeAudio } from "../_core/voiceTranscription";
import { generateBesuchsberichtPdf } from "../pdfGenerator";
import { sendEmail, buildBesuchsberichtEmail } from "../emailService";
import { storagePut } from "../storage";
import { berechneStunden } from "../../shared/planungsLogik";
import { ANFAHRT_PAUSCHALE, berechneEinsatzkostenInklPauschale } from "../../shared/leistungssaetze";
import { schliesseEinsatzMitFolgenAtomar } from "../einsatzAbschlussService";


export const besuchsberichteRouter = router({
  /**
   * Variante A: Ein manuell erfasster Bericht erzeugt genau einen abgeschlossenen
   * Einsatz und nutzt danach denselben Folgeprozess wie der Einsatzabschluss.
   */
  create: portalProtected
    .input(z.object({
      kundenId: z.number().int().positive(),
      datum: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      startzeit: z.string().regex(/^\d{2}:\d{2}$/),
      endzeit: z.string().regex(/^\d{2}:\d{2}$/),
      paragraph: z.enum(["45b", "45a", "39"]),
      kilometer: z.number().min(0).max(1000).optional(),
      fahrtVonOrt: z.string().trim().max(200).optional(),
      fahrtNachOrt: z.string().trim().max(200).optional(),
      inhalt: z.string().trim().min(1).max(10_000),
      stimmung: z.enum(["sehr_gut", "gut", "neutral", "besorgniserregend"]).optional(),
      massnahmen: z.string().trim().max(5_000).optional(),
      naechsterTermin: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      unterschriftKunde: z.boolean().default(false),
    }))
    .mutation(async ({ ctx, input }) => {
      const dauerStunden = berechneStunden(input.startzeit, input.endzeit);
      if (dauerStunden === null || dauerStunden < 1.5) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Mindestdauer: Jeder Einsatz muss mindestens 1,5 Stunden (90 Minuten) dauern." });
      }
      const ma = await getMitarbeiterById(ctx.mitarbeiterId);
      if (ma?.rolle === "mitarbeiter" && !(await isMitarbeiterZugeordnet(ctx.mitarbeiterId, input.kundenId))) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Besuchsberichte dürfen nur für zugeordnete Kunden angelegt werden." });
      }
      const konflikt = await checkDoppelbelegung({
        datum: input.datum,
        startzeit: input.startzeit,
        dauerStunden,
        mitarbeiterId: ctx.mitarbeiterId,
        kundenId: input.kundenId,
      });
      if (konflikt.mitarbeiterKonflikt || konflikt.kundenKonflikt) {
        throw new TRPCError({ code: "CONFLICT", message: "Doppelbelegung: Für diesen Zeitpunkt besteht bereits ein Einsatz." });
      }
      const kunde = await getKundeById(input.kundenId);
      if (!kunde) throw new TRPCError({ code: "NOT_FOUND", message: "Kunde nicht gefunden." });
      const kosten = berechneEinsatzkostenInklPauschale(dauerStunden, input.paragraph);
      const budget = Number(input.paragraph === "45b" ? kunde.budget45b : input.paragraph === "45a" ? kunde.budget45a : kunde.budget39);
      const verbraucht = Number(input.paragraph === "45b" ? kunde.verbraucht45b : input.paragraph === "45a" ? kunde.verbraucht45a : kunde.verbraucht39);
      if (ma?.rolle !== "admin" && kosten > budget - verbraucht) {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Das verfügbare Budget dieses Paragraphen reicht für den Einsatz einschließlich 6-€-Anfahrtspauschale nicht aus." });
      }

      // Der frühere Defekt: Berichte wurden ohne Einsatz gespeichert und lösten
      // keine Leistungsnachweis- oder Fahrtfolge aus. Der Einsatz ist hier die
      // einzige Quelle für alle buchungsrelevanten Folgen.
      const einsatzId = await createEinsatz({
        mitarbeiterId: ctx.mitarbeiterId,
        kundenId: input.kundenId,
        datum: input.datum as any,
        startzeit: input.startzeit,
        endzeit: input.endzeit,
        dauerStunden,
        paragraph: input.paragraph,
        anfahrtPauschale: ANFAHRT_PAUSCHALE.toFixed(2),
        notizen: "Aus Besuchsbericht erzeugter Einsatz",
      } as any);
      const tatsaechlicherStart = new Date(`${input.datum}T${input.startzeit}:00.000Z`).toISOString();
      const tatsaechlichesEnde = new Date(`${input.datum}T${input.endzeit}:00.000Z`).toISOString();
      const besonderheiten = [
        input.stimmung ? `Stimmung: ${input.stimmung}` : null,
        input.naechsterTermin ? `Nächster Termin: ${input.naechsterTermin}` : null,
      ].filter(Boolean).join(" · ") || null;
      const folge = await schliesseEinsatzMitFolgenAtomar({
        einsatzId,
        mitarbeiterId: ctx.mitarbeiterId,
        einsatzUpdate: {
          bericht: input.inhalt,
          bemerkung: input.massnahmen || undefined,
          unterschriftKunde: input.unterschriftKunde ? "vorhanden" : undefined,
          tatsaechlicherStart: new Date(tatsaechlicherStart),
          tatsaechlichesEnde: new Date(tatsaechlichesEnde),
        },
        folgen: {
          taetigkeiten: input.inhalt,
          beobachtungen: input.massnahmen,
          besonderheiten,
          naechsteSchritte: input.naechsterTermin ? `Nächster Termin: ${input.naechsterTermin}` : undefined,
          tatsaechlicherStart,
          tatsaechlichesEnde,
          fahrtKilometer: input.kilometer,
          fahrtVonOrt: input.fahrtVonOrt,
          fahrtNachOrt: input.fahrtNachOrt,
        },
      });
      await createAuditLog({ mitarbeiterId: ctx.mitarbeiterId, action: "CREATE", ressource: "besuchsbericht", details: `einsatzId=${einsatzId}`, status: "success" });
      return { success: true, einsatzId, berichtId: folge.berichtId };
    }),

  /** Berichte eines Mitarbeiters abrufen */
  list: portalProtected
    .input(z.object({ mitarbeiterId: z.number().optional(), kundenId: z.number().optional() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];
      const darfFremdeBerichteSehen = ["admin", "teamleitung"].includes(ctx.portalMitarbeiter.rolle);
      const zielMitarbeiterId = darfFremdeBerichteSehen ? (input.mitarbeiterId ?? ctx.mitarbeiterId) : ctx.mitarbeiterId;
      const rows = await db
        .select()
        .from(besuchsberichte)
        .where(eq(besuchsberichte.mitarbeiterId, zielMitarbeiterId))
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
      const bericht = rows[0] ?? null;
      if (bericht && !["admin", "teamleitung"].includes(ctx.portalMitarbeiter.rolle) && bericht.mitarbeiterId !== ctx.mitarbeiterId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Dieser Besuchsbericht gehört nicht zu Ihrem Konto." });
      }
      return bericht;
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
        if (ctx.portalMitarbeiter.rolle === "mitarbeiter" && existing[0].status !== "entwurf") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Automatisch erzeugte Besuchsberichte sind schreibgeschützt. Bitte stattdessen eine Korrektur anfragen." });
        }
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

  /** Mitarbeiter beantragt eine Korrektur; Admin/Teamleitung prüft sie im Archiv. */
  anfrageKorrektur: portalProtected
    .input(z.object({ id: z.number().int().positive(), begruendung: z.string().trim().min(5).max(1000) }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const rows = await db.select().from(besuchsberichte).where(eq(besuchsberichte.id, input.id)).limit(1);
      const bericht = rows[0];
      if (!bericht || (ctx.portalMitarbeiter.rolle === "mitarbeiter" && bericht.mitarbeiterId !== ctx.mitarbeiterId)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Für diesen Besuchsbericht kann keine Korrektur angefragt werden." });
      }
      const vermerk = `[Korrekturanfrage ${new Date().toLocaleDateString("de-DE")}]: ${input.begruendung}`;
      await db.update(besuchsberichte).set({
        status: "korrektur",
        besonderheiten: [bericht.besonderheiten, vermerk].filter(Boolean).join("\n"),
      } as any).where(eq(besuchsberichte.id, input.id));
      await createAuditLog({ mitarbeiterId: ctx.mitarbeiterId, action: "UPDATE", ressource: "besuchsbericht", details: `Korrekturanfrage id=${input.id}`, status: "success" });
      return { success: true };
    }),

  /** Admin oder Teamleitung bearbeitet die angefragte Korrektur und gibt die Fassung frei. */
  bearbeiteKorrektur: portalProtected
    .input(z.object({ id: z.number().int().positive(), taetigkeiten: z.string().trim().min(1).max(10000).optional(), freigeben: z.boolean().default(true) }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.portalMitarbeiter.rolle !== "admin" && ctx.portalMitarbeiter.rolle !== "teamleitung") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Nur Admin oder Teamleitung dürfen Korrekturen bearbeiten." });
      }
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const rows = await db.select().from(besuchsberichte).where(eq(besuchsberichte.id, input.id)).limit(1);
      const bericht = rows[0];
      if (!bericht) throw new TRPCError({ code: "NOT_FOUND", message: "Besuchsbericht nicht gefunden." });
      await db.update(besuchsberichte).set({
        ...(input.taetigkeiten ? { taetigkeiten: input.taetigkeiten } : {}),
        status: input.freigeben ? "genehmigt" : "eingereicht",
        freigegebenVon: ctx.mitarbeiterId,
        freigegebenAt: new Date(),
      } as any).where(eq(besuchsberichte.id, input.id));
      await createAuditLog({ mitarbeiterId: ctx.mitarbeiterId, action: "UPDATE", ressource: "besuchsbericht", details: `Korrektur bearbeitet id=${input.id}`, status: "success" });
      return { success: true };
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
  getAlleBerichte: roleProcedure(["admin", "teamleitung"]).query(async ({ ctx }) => {
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

  /** PDF eines Besuchsberichts generieren und als URL zurückgeben */
  generatePdf: portalProtected
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const rows = await db.select().from(besuchsberichte).where(eq(besuchsberichte.id, input.id)).limit(1);
      if (!rows.length) throw new TRPCError({ code: "NOT_FOUND" });
      const b = rows[0];
      const kunde = await getKundeById(b.kundenId);
      const ma = await getMitarbeiterById(b.mitarbeiterId);
      const pdfBuf = await generateBesuchsberichtPdf({
        id: b.id,
        datum: b.datum,
        kundeVorname: kunde?.vorname ?? "Unbekannt",
        kundeNachname: kunde?.nachname ?? "",
        mitarbeiterVorname: ma?.vorname ?? "Unbekannt",
        mitarbeiterNachname: ma?.nachname ?? "",
        taetigkeiten: b.taetigkeiten,
        beobachtungen: b.beobachtungen,
        besonderheiten: b.besonderheiten,
        naechsteSchritte: b.naechsteSchritte,
        status: b.status,
        dauerMinuten: b.dauerMinuten,
      });
      const key = `besuchsberichte/bericht-${b.id}-${Date.now()}.pdf`;
      const { url } = await storagePut(key, pdfBuf, "application/pdf");
      return { url, key };
    }),

  /** Besuchsbericht per E-Mail versenden */
  sendEmail: portalProtected
    .input(z.object({ id: z.number().int().positive(), empfaenger: z.string().email() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const rows = await db.select().from(besuchsberichte).where(eq(besuchsberichte.id, input.id)).limit(1);
      if (!rows.length) throw new TRPCError({ code: "NOT_FOUND" });
      const b = rows[0];
      const kunde = await getKundeById(b.kundenId);
      const ma = await getMitarbeiterById(b.mitarbeiterId);
      const pdfBuf = await generateBesuchsberichtPdf({
        id: b.id, datum: b.datum,
        kundeVorname: kunde?.vorname ?? "Unbekannt", kundeNachname: kunde?.nachname ?? "",
        mitarbeiterVorname: ma?.vorname ?? "Unbekannt", mitarbeiterNachname: ma?.nachname ?? "",
        taetigkeiten: b.taetigkeiten, beobachtungen: b.beobachtungen,
        besonderheiten: b.besonderheiten, naechsteSchritte: b.naechsteSchritte,
        status: b.status, dauerMinuten: b.dauerMinuten,
      });
      const datum = b.datum instanceof Date ? b.datum.toLocaleDateString("de-DE") : String(b.datum);
      const html = buildBesuchsberichtEmail({
        kundeVorname: kunde?.vorname ?? "", kundeNachname: kunde?.nachname ?? "",
        mitarbeiterVorname: ma?.vorname ?? "", mitarbeiterNachname: ma?.nachname ?? "",
        datum, berichtId: b.id,
      });
      const result = await sendEmail({
        to: input.empfaenger,
        subject: `Besuchsbericht #${b.id} – ${datum}`,
        html,
        attachments: [{ filename: `besuchsbericht-${b.id}.pdf`, content: pdfBuf, contentType: "application/pdf" }],
      });
      await createAuditLog({ mitarbeiterId: ctx.mitarbeiterId, action: "EMAIL", ressource: "besuchsbericht", details: `id=${b.id} to=${input.empfaenger}`, status: result.success ? "success" : "failure" });
      return result;
    }),
});
