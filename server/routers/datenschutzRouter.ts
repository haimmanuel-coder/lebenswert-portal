import { z } from "zod";
import { router } from "../_core/trpc";
import { portalProtected } from "../portalAuth";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import {
  datenschutzDokumente,
  datenschutzZustimmungen,
  datenschutzAuditLog,
  mitarbeiter as mitarbeiterTable,
  arbeitssicherheitUnterweisungen,
} from "../../drizzle/schema";
import { eq, desc, and, lte, isNull, or } from "drizzle-orm";
import { sendEmail } from "../emailService";
import { notifyOwner } from "../_core/notification";

/** HTML-Template für DSGVO-Benachrichtigungs-E-Mail */
function buildDsgvoUpdateEmail(data: { vorname: string; nachname: string; titel: string; version: string }): string {
  return `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
      <div style="background:#1a5c38;color:#fff;padding:20px;border-radius:8px 8px 0 0">
        <h2 style="margin:0">Lebenswert Betreuung</h2>
        <p style="margin:4px 0 0">Wichtige Datenschutz-Information</p>
      </div>
      <div style="background:#f9f9f9;padding:20px;border:1px solid #e0e0e0">
        <p>Hallo <strong>${data.vorname} ${data.nachname}</strong>,</p>
        <p>wir haben unsere Datenschutzunterlagen aktualisiert:</p>
        <div style="background:#e8f5e9;border-left:4px solid #4a8c3f;padding:12px 16px;margin:16px 0;border-radius:4px">
          <strong>${data.titel}</strong> &ndash; Version ${data.version}
        </div>
        <p>Bitte melden Sie sich im <strong>Mitarbeiter-Portal</strong> an und bestätigen Sie die neue Version, um weiterhin Zugang zu allen Funktionen zu haben.</p>
        <div style="text-align:center;margin:24px 0">
          <a href="https://portal.lebenswert-betreuung.de" style="background:#4a8c3f;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold">Zum Portal &rarr;</a>
        </div>
        <p style="color:#666;font-size:12px">Falls Sie Fragen haben, wenden Sie sich bitte an Ihre Teamleitung.</p>
        <p style="margin-top:24px">Mit freundlichen Grüßen<br><strong>Lebenswert Betreuung GmbH</strong></p>
      </div>
      <div style="background:#e8f5e9;padding:10px;font-size:11px;color:#555;border-radius:0 0 8px 8px">
        Diese E-Mail wurde automatisch generiert. | DSGVO-konform verarbeitet.
      </div>
    </div>`;
}

/** Audit-Log-Eintrag schreiben (intern) */
async function writeAuditLog(params: {
  aktion: string;
  dokumentId?: number | null;
  dokumentTitel?: string | null;
  adminId?: number | null;
  adminName?: string | null;
  details?: Record<string, unknown> | null;
}) {
  try {
    const db = await getDb();
    if (!db) return;
    await db.insert(datenschutzAuditLog).values({
      aktion: params.aktion,
      dokumentId: params.dokumentId ?? null,
      dokumentTitel: params.dokumentTitel ?? null,
      adminId: params.adminId ?? null,
      adminName: params.adminName ?? null,
      details: params.details ? JSON.stringify(params.details) : null,
    });
  } catch (e) {
    console.error("[AuditLog] Fehler beim Schreiben:", e);
  }
}

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
    const dokRows = await db
      .select()
      .from(datenschutzDokumente)
      .where(eq(datenschutzDokumente.aktiv, true))
      .orderBy(desc(datenschutzDokumente.createdAt))
      .limit(1);
    if (dokRows.length === 0) return { required: false, zugestimmt: true };
    const dok = dokRows[0];
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

  /**
   * Pflichtprüfung beim Login: Gibt alle aktiven Pflicht-Dokumente zurück,
   * denen der Mitarbeiter noch nicht zugestimmt hat.
   */
  checkPflichtZustimmungen: portalProtected.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];
    // Alle aktiven Dokumente
    const dokumente = await db
      .select()
      .from(datenschutzDokumente)
      .where(eq(datenschutzDokumente.aktiv, true));
    if (dokumente.length === 0) return [];
    // Meine Zustimmungen
    const meineZ = await db
      .select()
      .from(datenschutzZustimmungen)
      .where(eq(datenschutzZustimmungen.mitarbeiterId, ctx.mitarbeiterId));
    const zugestimmteIds = new Set(meineZ.map((z) => z.dokumentId));
    // Fehlende Zustimmungen zurückgeben
    return dokumente
      .filter((d) => !zugestimmteIds.has(d.id))
      .map((d) => ({ id: d.id, titel: d.titel, version: d.version, typ: d.typ, inhalt: d.inhalt }));
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
      await writeAuditLog({
        aktion: "zustimmung_gespeichert",
        dokumentId: dok.id,
        dokumentTitel: dok.titel,
        adminId: ctx.mitarbeiterId,
        details: { version: dok.version },
      });
      return { success: true };
    }),

  /** Meine Zustimmungen abrufen (Frontend-kompatibel) */
  getMeineZustimmungen: portalProtected.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];
    const dokumente = await db.select().from(datenschutzDokumente).where(eq(datenschutzDokumente.aktiv, true));
    const meineZ = await db.select().from(datenschutzZustimmungen).where(eq(datenschutzZustimmungen.mitarbeiterId, ctx.mitarbeiterId));
    const zugestimmteIds = new Set(meineZ.map((z) => z.dokumentId));
    return dokumente.map((d) => ({
      id: d.id, typ: d.typ, titel: d.titel, version: d.version,
      zugestimmt: zugestimmteIds.has(d.id),
      zugestimmtAt: meineZ.find((z) => z.dokumentId === d.id)?.zugestimmtAt ?? null,
    }));
  }),

  /** Alle Zustimmungen abrufen (Admin) */
  getAlleZustimmungen: portalProtected.query(async () => {
    const db = await getDb();
    if (!db) return [];
    const alleMa = await db.select({ id: mitarbeiterTable.id, vorname: mitarbeiterTable.vorname, nachname: mitarbeiterTable.nachname }).from(mitarbeiterTable);
    const alleZ = await db.select().from(datenschutzZustimmungen);
    const dokumente = await db.select().from(datenschutzDokumente).where(eq(datenschutzDokumente.aktiv, true));
    return alleMa.map((ma) => ({
      mitarbeiterId: ma.id,
      name: `${ma.vorname} ${ma.nachname}`,
      zustimmungen: dokumente.map((d) => ({
        dokumentId: d.id, typ: d.typ, titel: d.titel,
        zugestimmt: alleZ.some((z) => z.mitarbeiterId === ma.id && z.dokumentId === d.id),
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
          datenschutzerklaerung: "Datenschutzerklärung", avv: "Auftragsverarbeitungsvertrag",
          einwilligung: "Einwilligung Datenverarbeitung", loeschkonzept: "Löschkonzept",
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
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.update(datenschutzDokumente).set({ aktiv: false });
      await db.insert(datenschutzDokumente).values({
        typ: input.typ, version: input.version, titel: input.titel, inhalt: input.inhalt, aktiv: true,
      });
      await writeAuditLog({ aktion: "vorlage_erstellt", dokumentTitel: input.titel, adminId: ctx.mitarbeiterId, adminName: "Admin", details: { version: input.version, typ: input.typ } });
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
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.update(datenschutzDokumente)
        .set({ titel: input.titel, inhalt: input.inhalt, version: input.version, aktiv: input.aktiv ?? true })
        .where(eq(datenschutzDokumente.id, input.id));
      await writeAuditLog({ aktion: "vorlage_bearbeitet", dokumentId: input.id, dokumentTitel: input.titel, adminId: ctx.mitarbeiterId, adminName: "Admin", details: { version: input.version } });
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
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const altRows = await db.select().from(datenschutzDokumente).where(eq(datenschutzDokumente.id, input.id)).limit(1);
      if (altRows.length === 0) throw new TRPCError({ code: "NOT_FOUND" });
      const alt = altRows[0];
      await db.update(datenschutzDokumente).set({ aktiv: false }).where(eq(datenschutzDokumente.id, input.id));
      await db.insert(datenschutzDokumente).values({
        typ: alt.typ, titel: input.titel, inhalt: input.inhalt, version: input.neueVersion, aktiv: true,
      });
      await writeAuditLog({ aktion: "neue_version", dokumentId: input.id, dokumentTitel: input.titel, adminId: ctx.mitarbeiterId, adminName: "Admin", details: { altVersion: alt.version, neueVersion: input.neueVersion } });

      // E-Mail-Benachrichtigung an alle aktiven Mitarbeiter
      try {
        const alleMa = await db
          .select({ id: mitarbeiterTable.id, vorname: mitarbeiterTable.vorname, nachname: mitarbeiterTable.nachname, email: mitarbeiterTable.email })
          .from(mitarbeiterTable)
          .where(eq(mitarbeiterTable.aktiv, 1));
        let gesendet = 0;
        for (const ma of alleMa) {
          if (!ma.email) continue;
          const result = await sendEmail({
            to: ma.email,
            subject: `⚠️ Neue DSGVO-Version: ${input.titel} (v${input.neueVersion}) – Zustimmung erforderlich`,
            html: buildDsgvoUpdateEmail({ vorname: ma.vorname, nachname: ma.nachname, titel: input.titel, version: input.neueVersion }),
          });
          if (result.success) gesendet++;
        }
        console.log(`[DSGVO] Neue Version ${input.neueVersion}: ${gesendet} E-Mails gesendet`);
      } catch (emailErr: any) {
        console.error("[DSGVO] E-Mail-Versand fehlgeschlagen:", emailErr.message);
      }
      return { success: true };
    }),

  /** Dokument deaktivieren (kein Hard-Delete, Audit-Trail bleibt erhalten) */
  deaktiviereDokument: portalProtected
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const rows = await db.select().from(datenschutzDokumente).where(eq(datenschutzDokumente.id, input.id)).limit(1);
      await db.update(datenschutzDokumente).set({ aktiv: false }).where(eq(datenschutzDokumente.id, input.id));
      await writeAuditLog({ aktion: "vorlage_deaktiviert", dokumentId: input.id, dokumentTitel: rows[0]?.titel, adminId: ctx.mitarbeiterId, adminName: "Admin" });
      return { success: true };
    }),

  /** Vorlagen auflisten – Alias für listAlleDokumente (Frontend-kompatibel) */
  listVorlagen: portalProtected.query(async () => {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(datenschutzDokumente).orderBy(desc(datenschutzDokumente.createdAt));
  }),

  /** Neue Vorlage erstellen (Admin) */
  createVorlage: portalProtected
    .input(z.object({
      titel: z.string().min(1),
      inhalt: z.string().min(1),
      version: z.string().default("1.0"),
      pflicht: z.boolean().default(true),
      typ: z.enum(["datenschutzerklaerung", "avv", "einwilligung", "loeschkonzept", "verarbeitungsverzeichnis"]).default("datenschutzerklaerung"),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.insert(datenschutzDokumente).values({
        typ: input.typ, titel: input.titel, inhalt: input.inhalt, version: input.version, aktiv: true,
      });
      await writeAuditLog({ aktion: "vorlage_erstellt", dokumentTitel: input.titel, adminId: ctx.mitarbeiterId, adminName: "Admin", details: { version: input.version, typ: input.typ, pflicht: input.pflicht } });
      return { success: true };
    }),

  /** Vorlage deaktivieren (soft-delete) */
  deleteVorlage: portalProtected
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const rows = await db.select().from(datenschutzDokumente).where(eq(datenschutzDokumente.id, input.id)).limit(1);
      await db.update(datenschutzDokumente).set({ aktiv: false }).where(eq(datenschutzDokumente.id, input.id));
      await writeAuditLog({ aktion: "vorlage_deaktiviert", dokumentId: input.id, dokumentTitel: rows[0]?.titel, adminId: ctx.mitarbeiterId, adminName: "Admin" });
      return { success: true };
    }),

  /** CSV-Export aller Zustimmungen (Admin) */
  csvExport: portalProtected.query(async () => {
    const db = await getDb();
    if (!db) return "";
    const alleZ = await db
      .select({
        mitarbeiterId: datenschutzZustimmungen.mitarbeiterId,
        vorname: mitarbeiterTable.vorname,
        nachname: mitarbeiterTable.nachname,
        email: mitarbeiterTable.email,
        dokumentId: datenschutzZustimmungen.dokumentId,
        dokumentVersion: datenschutzZustimmungen.dokumentVersion,
        zugestimmtAt: datenschutzZustimmungen.zugestimmtAt,
      })
      .from(datenschutzZustimmungen)
      .leftJoin(mitarbeiterTable, eq(datenschutzZustimmungen.mitarbeiterId, mitarbeiterTable.id))
      .orderBy(desc(datenschutzZustimmungen.zugestimmtAt));
    const dokumente = await db.select().from(datenschutzDokumente);
    const dokMap = new Map(dokumente.map((d) => [d.id, d]));
    const header = "Mitarbeiter-ID;Vorname;Nachname;E-Mail;Dokument-ID;Dokument-Titel;Version;Zugestimmt am\n";
    const rows = alleZ.map((r) => {
      const dok = dokMap.get(r.dokumentId);
      const datum = r.zugestimmtAt ? new Date(r.zugestimmtAt).toLocaleString("de-DE") : "";
      return [r.mitarbeiterId, r.vorname ?? "", r.nachname ?? "", r.email ?? "", r.dokumentId, dok?.titel ?? "", r.dokumentVersion ?? "", datum].join(";");
    }).join("\n");
    return header + rows;
  }),

  /** Erinnerungs-Push an alle MA ohne Zustimmung für ein Dokument (Admin) */
  zustimmungsErinnerung: portalProtected
    .input(z.object({ dokumentId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const dok = await db.select().from(datenschutzDokumente).where(eq(datenschutzDokumente.id, input.dokumentId)).limit(1);
      if (dok.length === 0) throw new TRPCError({ code: "NOT_FOUND" });
      const alleMa = await db
        .select({ id: mitarbeiterTable.id, vorname: mitarbeiterTable.vorname, nachname: mitarbeiterTable.nachname, email: mitarbeiterTable.email })
        .from(mitarbeiterTable)
        .where(eq(mitarbeiterTable.aktiv, 1));
      const alleZ = await db.select({ mitarbeiterId: datenschutzZustimmungen.mitarbeiterId })
        .from(datenschutzZustimmungen)
        .where(eq(datenschutzZustimmungen.dokumentId, input.dokumentId));
      const zugestimmteIds = new Set(alleZ.map((z) => z.mitarbeiterId));
      const ohneZustimmung = alleMa.filter((ma) => !zugestimmteIds.has(ma.id));
      let gesendet = 0;
      for (const ma of ohneZustimmung) {
        if (!ma.email) continue;
        await sendEmail({
          to: ma.email,
          subject: `⚠️ Erinnerung: Zustimmung zu "${dok[0].titel}" noch ausstehend`,
          html: buildDsgvoUpdateEmail({ vorname: ma.vorname, nachname: ma.nachname, titel: dok[0].titel, version: dok[0].version }),
        });
        gesendet++;
      }
      await writeAuditLog({ aktion: "erinnerung_gesendet", dokumentId: input.dokumentId, dokumentTitel: dok[0].titel, adminId: ctx.mitarbeiterId, adminName: "Admin", details: { gesendet, total: ohneZustimmung.length } });
      await notifyOwner({
        title: "DSGVO-Erinnerung versendet",
        content: `${gesendet} Mitarbeiter haben eine Erinnerung zu "${dok[0].titel}" erhalten.`,
      });
      return { success: true, gesendet, total: ohneZustimmung.length };
    }),

  /** Zustimmungs-Übersicht für ein Dokument (Admin) */
  getZustimmungsUebersicht: portalProtected
    .input(z.object({ dokumentId: z.number().int().positive() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const alle = await db
        .select({ id: mitarbeiterTable.id, vorname: mitarbeiterTable.vorname, nachname: mitarbeiterTable.nachname, rolle: mitarbeiterTable.rolle })
        .from(mitarbeiterTable)
        .where(eq(mitarbeiterTable.aktiv, 1));
      const zustimmungen = await db
        .select()
        .from(datenschutzZustimmungen)
        .where(eq(datenschutzZustimmungen.dokumentId, input.dokumentId));
      const zustMap = new Map<number, (typeof zustimmungen)[0]>();
      for (const z of zustimmungen) zustMap.set(z.mitarbeiterId, z);
      return alle.map((ma) => {
        const zust = zustMap.get(ma.id);
        return {
          mitarbeiterId: ma.id, vorname: ma.vorname, nachname: ma.nachname, rolle: ma.rolle,
          zugestimmt: !!zust, zugestimmtAt: zust?.zugestimmtAt ?? null, dokumentVersion: zust?.dokumentVersion ?? null,
        };
      });
    }),

  /** Audit-Log abrufen (Admin) */
  getAuditLog: portalProtected
    .input(z.object({ limit: z.number().int().min(1).max(200).default(100) }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      return db
        .select()
        .from(datenschutzAuditLog)
        .orderBy(desc(datenschutzAuditLog.createdAt))
        .limit(input?.limit ?? 100);
    }),

  /**
   * Heartbeat-Handler-Daten: Ablaufende Unterweisungen + fehlende Zustimmungen
   * (wird vom Heartbeat-Job aufgerufen, nicht direkt vom Frontend)
   */
  heartbeatCheck: portalProtected.query(async () => {
    const db = await getDb();
    if (!db) return { unterweisungen: [], zustimmungen: [] };

    const jetzt = new Date();
    const in30Tagen = new Date(jetzt.getTime() + 30 * 24 * 60 * 60 * 1000);

    // Ablaufende Unterweisungen (naechsteFaelligkeit ≤ heute+30 Tage)
    const ablaufendeUnterweisungen = await db
      .select({
        id: arbeitssicherheitUnterweisungen.id,
        mitarbeiterId: arbeitssicherheitUnterweisungen.mitarbeiterId,
        thema: arbeitssicherheitUnterweisungen.thema,
        naechsteFaelligkeit: arbeitssicherheitUnterweisungen.naechsteFaelligkeit,
        vorname: mitarbeiterTable.vorname,
        nachname: mitarbeiterTable.nachname,
        email: mitarbeiterTable.email,
      })
      .from(arbeitssicherheitUnterweisungen)
      .leftJoin(mitarbeiterTable, eq(arbeitssicherheitUnterweisungen.mitarbeiterId, mitarbeiterTable.id))
      .where(
        and(
          lte(arbeitssicherheitUnterweisungen.naechsteFaelligkeit, in30Tagen),
          eq(mitarbeiterTable.aktiv, 1)
        )
      );

    // Aktive Pflicht-Dokumente ohne Zustimmung
    const aktiveDokumente = await db.select().from(datenschutzDokumente).where(eq(datenschutzDokumente.aktiv, true));
    const alleZustimmungen = await db.select().from(datenschutzZustimmungen);
    const alleMa = await db
      .select({ id: mitarbeiterTable.id, vorname: mitarbeiterTable.vorname, nachname: mitarbeiterTable.nachname, email: mitarbeiterTable.email })
      .from(mitarbeiterTable)
      .where(eq(mitarbeiterTable.aktiv, 1));

    const fehlende: { mitarbeiterId: number; vorname: string; nachname: string; email: string | null; dokumentTitel: string }[] = [];
    for (const dok of aktiveDokumente) {
      for (const ma of alleMa) {
        const hatZustimmung = alleZustimmungen.some((z) => z.mitarbeiterId === ma.id && z.dokumentId === dok.id);
        if (!hatZustimmung) {
          fehlende.push({ mitarbeiterId: ma.id, vorname: ma.vorname, nachname: ma.nachname, email: ma.email ?? null, dokumentTitel: dok.titel });
        }
      }
    }

    return { unterweisungen: ablaufendeUnterweisungen, zustimmungen: fehlende };
  }),
});
