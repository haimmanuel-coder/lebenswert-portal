/**
 * ════════════════════════════════════════════════════════════════════════════
 *  UNTERWEISUNGS-NACHWEIS-ROUTER
 * ════════════════════════════════════════════════════════════════════════════
 *
 * Rechtssichere digitale Unterweisungen mit:
 *  - Vorlagen-Verwaltung (Admin)
 *  - Digitaler Unterschrift (Canvas → Base64 → S3)
 *  - PDF-Nachweis-Generierung (jsPDF → S3, unveränderlich)
 *  - Inhalt-Snapshot zum Zeitpunkt der Bestätigung
 *  - IP-Adresse + Browser-Info als Metadaten
 *
 * Gesetzliche Grundlagen: §12 ArbSchG, DGUV Grundsatz 300-001
 */

import { z } from "zod";
import { router } from "../_core/trpc.js";
import { adminProcedure, portalProtected } from "../portalAuth.js";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db.js";
import { eq, and, desc, isNull } from "drizzle-orm";
import {
  unterweisungsVorlagen,
  unterweisungsNachweise,
  arbeitssicherheitUnterweisungen,
  mitarbeiter,
} from "../../drizzle/schema.js";
import { storagePut, storageGetSignedUrl } from "../storage.js";
// @ts-ignore – jsPDF hat keine perfekten ESM-Typen im Node-Kontext
import { jsPDF } from "jspdf";

// ─── Hilfsfunktionen ────────────────────────────────────────────────────────

function themaLabel(thema: string): string {
  const labels: Record<string, string> = {
    notfall_erste_hilfe: "Verhalten in Notfällen & Erste Hilfe",
    hygiene_desinfektion: "Hygiene & Desinfektion",
    ergonomie_heben_tragen: "Ergonomie: Heben & Tragen",
    deeskalation_demenz: "Deeskalation bei Demenz",
    verkehrssicherheit: "Verkehrssicherheit",
    psa_verwendung: "PSA-Verwendung",
    alleinarbeit_schutz: "Schutz bei Alleinarbeit",
    biostoff_infektionsschutz: "Biologische Arbeitsstoffe & Infektionsschutz",
    sonstiges: "Sonstiges",
  };
  return labels[thema] ?? thema;
}

/**
 * Generiert ein rechtssicheres PDF-Nachweis-Dokument.
 * Gibt den PDF-Buffer zurück.
 */
async function generateNachweisPdf(params: {
  maVorname: string;
  maNachname: string;
  titel: string;
  thema: string;
  version: string;
  inhalt: string;
  unterweisungsDatum: string;
  bestaetigtAm: Date;
  unterschriftBase64: string; // data:image/png;base64,...
  ipAdresse: string;
  browserInfo: string;
}): Promise<Buffer> {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = 210;
  const margin = 20;
  const contentW = pageW - 2 * margin;
  let y = 20;

  // ── Kopfzeile ──────────────────────────────────────────────────────────────
  doc.setFillColor(74, 140, 63); // Lebenswert-Grün
  doc.rect(0, 0, pageW, 18, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Lebenswert Betreuung GmbH", margin, 8);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("Unterweisungsnachweis gemäß §12 ArbSchG", margin, 14);
  doc.setTextColor(0, 0, 0);
  y = 28;

  // ── Titel ──────────────────────────────────────────────────────────────────
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text(params.titel, margin, y);
  y += 8;

  // ── Trennlinie ─────────────────────────────────────────────────────────────
  doc.setDrawColor(74, 140, 63);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageW - margin, y);
  y += 6;

  // ── Metadaten-Tabelle ──────────────────────────────────────────────────────
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  const meta = [
    ["Mitarbeiter:", `${params.maVorname} ${params.maNachname}`],
    ["Thema:", themaLabel(params.thema)],
    ["Version:", params.version],
    ["Unterweisungsdatum:", params.unterweisungsDatum],
    ["Bestätigt am:", params.bestaetigtAm.toLocaleString("de-DE")],
  ];
  for (const [label, value] of meta) {
    doc.setFont("helvetica", "bold");
    doc.text(label, margin, y);
    doc.setFont("helvetica", "normal");
    doc.text(value, margin + 52, y);
    y += 6;
  }
  y += 4;

  // ── Inhalt ─────────────────────────────────────────────────────────────────
  doc.setFillColor(248, 250, 248);
  doc.rect(margin, y - 2, contentW, 4, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Unterweisungsinhalt", margin, y + 1);
  y += 8;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  // Markdown-ähnlichen Text bereinigen und umbrechen
  const cleanContent = params.inhalt
    .replace(/^#{1,3}\s+/gm, "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1");
  const lines = doc.splitTextToSize(cleanContent, contentW);
  // Maximal 120 Zeilen (ca. 2/3 Seite) für den Inhalt
  const maxLines = 120;
  const displayLines = lines.slice(0, maxLines);
  if (lines.length > maxLines) displayLines.push("... (Inhalt gekürzt – vollständige Version im Portal)");
  doc.text(displayLines, margin, y);
  y += displayLines.length * 4 + 8;

  // Neue Seite wenn nötig
  if (y > 220) {
    doc.addPage();
    y = 20;
  }

  // ── Unterschrift ───────────────────────────────────────────────────────────
  doc.setDrawColor(74, 140, 63);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageW - margin, y);
  y += 6;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Digitale Unterschrift des Mitarbeiters", margin, y);
  y += 6;

  // Unterschrift-Bild einfügen (falls vorhanden)
  if (params.unterschriftBase64 && params.unterschriftBase64.startsWith("data:image")) {
    try {
      const imgData = params.unterschriftBase64;
      doc.addImage(imgData, "PNG", margin, y, 80, 30);
      y += 34;
    } catch {
      doc.setFont("helvetica", "italic");
      doc.setFontSize(9);
      doc.text("[Unterschrift konnte nicht eingebettet werden]", margin, y);
      y += 8;
    }
  }

  // Unterschrift-Linie
  doc.setDrawColor(100, 100, 100);
  doc.setLineWidth(0.3);
  doc.line(margin, y, margin + 90, y);
  y += 4;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(`${params.maVorname} ${params.maNachname}`, margin, y);
  doc.text(params.bestaetigtAm.toLocaleDateString("de-DE"), margin + 50, y);
  y += 10;

  // ── Rechtssichere Metadaten ────────────────────────────────────────────────
  doc.setFillColor(240, 240, 240);
  doc.rect(margin, y, contentW, 22, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("Technische Nachweismetadaten (rechtssicher, unveränderlich)", margin + 2, y + 5);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.text(`IP-Adresse: ${params.ipAdresse}`, margin + 2, y + 10);
  doc.text(`Browser: ${params.browserInfo.slice(0, 80)}`, margin + 2, y + 15);
  doc.text(`Zeitstempel (UTC): ${params.bestaetigtAm.toISOString()}`, margin + 2, y + 20);
  y += 28;

  // ── Fußzeile ───────────────────────────────────────────────────────────────
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(120, 120, 120);
    doc.text(
      `Lebenswert Betreuung GmbH · Unterweisungsnachweis · Seite ${i}/${pageCount} · Erstellt: ${new Date().toLocaleDateString("de-DE")}`,
      margin,
      290,
    );
    doc.setTextColor(0, 0, 0);
  }

  // Buffer zurückgeben
  const pdfOutput = doc.output("arraybuffer");
  return Buffer.from(pdfOutput);
}

// ─── Router ─────────────────────────────────────────────────────────────────

export const unterweisungNachweisRouter = router({

  // ── Vorlagen-Verwaltung (Admin) ────────────────────────────────────────────

  vorlagen: router({
    list: adminProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(unterweisungsVorlagen)
        .where(eq(unterweisungsVorlagen.aktiv, true))
        .orderBy(desc(unterweisungsVorlagen.createdAt));
    }),

    listAlle: adminProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(unterweisungsVorlagen)
        .orderBy(desc(unterweisungsVorlagen.createdAt));
    }),

    create: adminProcedure
      .input(z.object({
        titel: z.string().min(3).max(255),
        thema: z.enum([
          "notfall_erste_hilfe", "hygiene_desinfektion", "ergonomie_heben_tragen",
          "deeskalation_demenz", "verkehrssicherheit", "psa_verwendung",
          "alleinarbeit_schutz", "biostoff_infektionsschutz", "sonstiges",
        ]),
        inhalt: z.string().min(10),
        version: z.string().default("1.0"),
        pflicht: z.boolean().default(true),
        gueltigBis: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        await db.insert(unterweisungsVorlagen).values({
          titel: input.titel,
          thema: input.thema,
          inhalt: input.inhalt,
          version: input.version,
          pflicht: input.pflicht,
          gueltigBis: input.gueltigBis ? (input.gueltigBis as any) : null,
          erstelltVon: ctx.adminId,
        } as any);
        return { success: true };
      }),

    update: adminProcedure
      .input(z.object({
        id: z.number().int().positive(),
        titel: z.string().min(3).max(255).optional(),
        inhalt: z.string().min(10).optional(),
        version: z.string().optional(),
        pflicht: z.boolean().optional(),
        gueltigBis: z.string().nullable().optional(),
        aktiv: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const { id, ...updates } = input;
        await db.update(unterweisungsVorlagen)
          .set(updates as any)
          .where(eq(unterweisungsVorlagen.id, id));
        return { success: true };
      }),

    delete: adminProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        // Soft-Delete: aktiv = false
        await db.update(unterweisungsVorlagen)
          .set({ aktiv: false } as any)
          .where(eq(unterweisungsVorlagen.id, input.id));
        return { success: true };
      }),
  }),

  // ── Unterweisungen an Mitarbeiter senden (Admin) ───────────────────────────

  anMitarbeiterSenden: adminProcedure
    .input(z.object({
      vorlagenId: z.number().int().positive(),
      mitarbeiterIds: z.array(z.number().int().positive()).min(1),
      unterweisungsDatum: z.string().min(1),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      // Vorlage laden
      const [vorlage] = await db.select().from(unterweisungsVorlagen)
        .where(eq(unterweisungsVorlagen.id, input.vorlagenId)).limit(1);
      if (!vorlage) throw new TRPCError({ code: "NOT_FOUND", message: "Vorlage nicht gefunden" });
      // Für jeden Mitarbeiter eine Unterweisung anlegen
      const naechste = new Date(input.unterweisungsDatum);
      naechste.setFullYear(naechste.getFullYear() + 1);
      const naechsteStr = naechste.toISOString().split("T")[0];
      for (const maId of input.mitarbeiterIds) {
        await db.insert(arbeitssicherheitUnterweisungen).values({
          mitarbeiterId: maId,
          thema: vorlage.thema,
          unterweisungsDatum: input.unterweisungsDatum as any,
          naechsteFaelligkeit: naechsteStr as any,
          inhalt: vorlage.inhalt,
          bestaetigt: false,
          durchgefuehrtVon: ctx.adminId,
        } as any);
      }
      return { success: true, anzahl: input.mitarbeiterIds.length };
    }),

  // ── Bestätigung mit Unterschrift (Mitarbeiter) ─────────────────────────────

  bestaetigenMitUnterschrift: portalProtected
    .input(z.object({
      unterweisungId: z.number().int().positive(),
      unterschriftBase64: z.string().min(50), // data:image/png;base64,...
      ipAdresse: z.string().default("unbekannt"),
      browserInfo: z.string().default("unbekannt"),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // Unterweisung laden und Berechtigung prüfen
      const [unterweisung] = await db.select().from(arbeitssicherheitUnterweisungen)
        .where(and(
          eq(arbeitssicherheitUnterweisungen.id, input.unterweisungId),
          eq(arbeitssicherheitUnterweisungen.mitarbeiterId, ctx.mitarbeiterId),
        )).limit(1);
      if (!unterweisung) throw new TRPCError({ code: "FORBIDDEN", message: "Unterweisung nicht gefunden" });
      if (unterweisung.bestaetigt) throw new TRPCError({ code: "BAD_REQUEST", message: "Bereits bestätigt" });

      // Mitarbeiter-Daten laden
      const [ma] = await db.select({
        vorname: mitarbeiter.vorname,
        nachname: mitarbeiter.nachname,
      }).from(mitarbeiter).where(eq(mitarbeiter.id, ctx.mitarbeiterId)).limit(1);
      if (!ma) throw new TRPCError({ code: "NOT_FOUND" });

      const jetzt = new Date();

      // 1. Unterschrift als PNG in S3 speichern
      let unterschriftKey: string | null = null;
      let unterschriftUrl: string | null = null;
      try {
        // Base64 → Buffer
        const base64Data = input.unterschriftBase64.replace(/^data:image\/\w+;base64,/, "");
        const imgBuffer = Buffer.from(base64Data, "base64");
        const result = await storagePut(
          `unterweisungen/unterschriften/ma_${ctx.mitarbeiterId}_uw_${input.unterweisungId}.png`,
          imgBuffer,
          "image/png",
        );
        unterschriftKey = result.key;
        unterschriftUrl = result.url;
      } catch (err) {
        console.error("[Unterweisung] Unterschrift-Upload fehlgeschlagen:", err);
        // Nicht blockieren – Bestätigung trotzdem durchführen
      }

      // 2. PDF-Nachweis generieren und in S3 speichern
      let pdfKey: string | null = null;
      let pdfUrl: string | null = null;
      try {
        const pdfBuffer = await generateNachweisPdf({
          maVorname: ma.vorname,
          maNachname: ma.nachname,
          titel: `Sicherheitsunterweisung: ${themaLabel(unterweisung.thema)}`,
          thema: unterweisung.thema,
          version: "1.0",
          inhalt: unterweisung.inhalt ?? "Kein Inhalt hinterlegt.",
          unterweisungsDatum: typeof unterweisung.unterweisungsDatum === "string"
            ? unterweisung.unterweisungsDatum
            : (unterweisung.unterweisungsDatum as any)?.toISOString?.()?.split("T")[0] ?? "",
          bestaetigtAm: jetzt,
          unterschriftBase64: input.unterschriftBase64,
          ipAdresse: input.ipAdresse,
          browserInfo: input.browserInfo,
        });
        const pdfResult = await storagePut(
          `unterweisungen/nachweise/ma_${ctx.mitarbeiterId}_uw_${input.unterweisungId}_${jetzt.getTime()}.pdf`,
          pdfBuffer,
          "application/pdf",
        );
        pdfKey = pdfResult.key;
        pdfUrl = pdfResult.url;
      } catch (err) {
        console.error("[Unterweisung] PDF-Generierung fehlgeschlagen:", err);
        // Nicht blockieren
      }

      // 3. Nachweis in DB speichern
      await db.insert(unterweisungsNachweise).values({
        unterweisungId: input.unterweisungId,
        mitarbeiterId: ctx.mitarbeiterId,
        unterschriftKey,
        unterschriftUrl,
        pdfKey,
        pdfUrl,
        ipAdresse: input.ipAdresse,
        browserInfo: input.browserInfo.slice(0, 499),
        bestaetigtAm: jetzt,
        inhaltSnapshot: unterweisung.inhalt,
        titelSnapshot: themaLabel(unterweisung.thema),
        versionSnapshot: "1.0",
      } as any);

      // 4. Unterweisung als bestätigt markieren
      await db.update(arbeitssicherheitUnterweisungen)
        .set({ bestaetigt: true, bestaetigtAm: jetzt } as any)
        .where(eq(arbeitssicherheitUnterweisungen.id, input.unterweisungId));

      return { success: true, pdfUrl };
    }),

  // ── Nachweis abrufen (signierte S3-URL) ────────────────────────────────────

  getNachweis: portalProtected
    .input(z.object({ unterweisungId: z.number().int().positive() }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) return null;
      const [nachweis] = await db.select().from(unterweisungsNachweise)
        .where(and(
          eq(unterweisungsNachweise.unterweisungId, input.unterweisungId),
          eq(unterweisungsNachweise.mitarbeiterId, ctx.mitarbeiterId),
        )).orderBy(desc(unterweisungsNachweise.createdAt)).limit(1);
      if (!nachweis) return null;
      // Signierte URL für PDF generieren (falls Key vorhanden)
      let signedPdfUrl: string | null = null;
      if (nachweis.pdfKey) {
        try {
          signedPdfUrl = await storageGetSignedUrl(nachweis.pdfKey);
        } catch {
          signedPdfUrl = nachweis.pdfUrl; // Fallback auf direkten Pfad
        }
      }
      return { ...nachweis, signedPdfUrl };
    }),

  // Admin: Nachweis für beliebigen Mitarbeiter abrufen
  adminGetNachweis: adminProcedure
    .input(z.object({
      unterweisungId: z.number().int().positive(),
      mitarbeiterId: z.number().int().positive(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;
      const [nachweis] = await db.select().from(unterweisungsNachweise)
        .where(and(
          eq(unterweisungsNachweise.unterweisungId, input.unterweisungId),
          eq(unterweisungsNachweise.mitarbeiterId, input.mitarbeiterId),
        )).orderBy(desc(unterweisungsNachweise.createdAt)).limit(1);
      if (!nachweis) return null;
      let signedPdfUrl: string | null = null;
      if (nachweis.pdfKey) {
        try {
          signedPdfUrl = await storageGetSignedUrl(nachweis.pdfKey);
        } catch {
          signedPdfUrl = nachweis.pdfUrl;
        }
      }
      return { ...nachweis, signedPdfUrl };
    }),

  // Admin: Alle Nachweise für eine Unterweisung
  adminAlleNachweise: adminProcedure
    .input(z.object({ unterweisungId: z.number().int().positive() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      return db.select({
        id: unterweisungsNachweise.id,
        mitarbeiterId: unterweisungsNachweise.mitarbeiterId,
        pdfKey: unterweisungsNachweise.pdfKey,
        pdfUrl: unterweisungsNachweise.pdfUrl,
        bestaetigtAm: unterweisungsNachweise.bestaetigtAm,
        titelSnapshot: unterweisungsNachweise.titelSnapshot,
        versionSnapshot: unterweisungsNachweise.versionSnapshot,
        maVorname: mitarbeiter.vorname,
        maNachname: mitarbeiter.nachname,
      })
        .from(unterweisungsNachweise)
        .leftJoin(mitarbeiter, eq(unterweisungsNachweise.mitarbeiterId, mitarbeiter.id))
        .where(eq(unterweisungsNachweise.unterweisungId, input.unterweisungId))
        .orderBy(desc(unterweisungsNachweise.bestaetigtAm));
    }),

  // Admin: Alle Nachweise eines Mitarbeiters
  adminNachweiseByMitarbeiter: adminProcedure
    .input(z.object({ mitarbeiterId: z.number().int().positive() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(unterweisungsNachweise)
        .where(eq(unterweisungsNachweise.mitarbeiterId, input.mitarbeiterId))
        .orderBy(desc(unterweisungsNachweise.bestaetigtAm));
    }),

  // MA: Eigene Nachweise abrufen
  meineNachweise: portalProtected.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(unterweisungsNachweise)
      .where(eq(unterweisungsNachweise.mitarbeiterId, ctx.mitarbeiterId))
      .orderBy(desc(unterweisungsNachweise.bestaetigtAm));
  }),
});
