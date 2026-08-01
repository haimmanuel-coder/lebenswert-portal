/**
 * ════════════════════════════════════════════════════════════════════════════
 *  SICHERHEITSUNTERWEISUNGEN – Router
 * ════════════════════════════════════════════════════════════════════════════
 *
 * Procedures:
 *   list          – alle aktiven Unterweisungen mit Bestätigungsstatus des MA
 *   listAdmin     – alle Unterweisungen für Admin (inkl. Bestätigungsquote)
 *   bestaetigen   – MA bestätigt eine Unterweisung (mit Timestamp)
 *   create        – Admin erstellt neue Unterweisung
 *   update        – Admin bearbeitet Unterweisung
 *   deactivate    – Admin deaktiviert Unterweisung
 *   erinnerung    – Scheduled: monatliche Fälligkeitsprüfung
 */

import { z } from "zod";
import { sql } from "drizzle-orm";
import { router } from "../_core/trpc";
import { getDb } from "../db";
import { portalProtected, adminProcedure } from "../portalAuth";
import { createNotification } from "../db";

export const sicherheitsunterweisungRouter = router({

  // ── Alle aktiven Unterweisungen mit eigenem Bestätigungsstatus ────────────
  list: portalProtected.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];
    const rows = await db.execute(sql`
      SELECT
        su.id, su.titel, su.inhalt, su.kategorie, su.pflicht,
        su.version, su.aktiv, su.gueltigBis, su.created_at,
        sub.id AS bestaetigtId,
        sub.bestaetigt_at AS bestaetigtAm
      FROM sicherheitsunterweisungen su
      LEFT JOIN sicherheitsunterweisung_bestaetigung sub
        ON sub.unterweisungId = su.id AND sub.mitarbeiterId = ${ctx.mitarbeiterId}
      WHERE su.aktiv = 1
      ORDER BY su.pflicht DESC, su.kategorie ASC, su.titel ASC
    `);
    return (rows as any).rows ?? rows ?? [];
  }),

  // ── Admin: alle Unterweisungen mit Bestätigungsquote ─────────────────────
  listAdmin: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    const rows = await db.execute(sql`
      SELECT
        su.*,
        COUNT(DISTINCT sub.mitarbeiterId) AS anzahlBestaetigt,
        (SELECT COUNT(*) FROM mitarbeiter WHERE aktiv = 1) AS gesamtMitarbeiter
      FROM sicherheitsunterweisungen su
      LEFT JOIN sicherheitsunterweisung_bestaetigung sub ON sub.unterweisungId = su.id
      GROUP BY su.id
      ORDER BY su.aktiv DESC, su.pflicht DESC, su.created_at DESC
    `);
    return (rows as any).rows ?? rows ?? [];
  }),

  // ── Admin: Bestätigungsdetails pro Unterweisung ───────────────────────────
  bestaetigungsDetails: adminProcedure
    .input(z.object({ unterweisungId: z.number().int().positive() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const rows = await db.execute(sql`
        SELECT
          m.id AS mitarbeiterId, m.vorname, m.nachname, m.rolle,
          sub.bestaetigt_at AS bestaetigtAm, sub.version
        FROM mitarbeiter m
        LEFT JOIN sicherheitsunterweisung_bestaetigung sub
          ON sub.mitarbeiterId = m.id AND sub.unterweisungId = ${input.unterweisungId}
        WHERE m.aktiv = 1
        ORDER BY sub.bestaetigt_at IS NULL ASC, m.nachname ASC
      `);
      return (rows as any).rows ?? rows ?? [];
    }),

  // ── MA bestätigt eine Unterweisung ────────────────────────────────────────
  bestaetigen: portalProtected
    .input(z.object({
      unterweisungId: z.number().int().positive(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("DB nicht verfügbar");

      // Unterweisung laden um Version zu prüfen
      const unterweisungRows = await db.execute(sql`
        SELECT id, version, titel FROM sicherheitsunterweisungen
        WHERE id = ${input.unterweisungId} AND aktiv = 1
      `);
      const unterweisungen = (unterweisungRows as any).rows ?? unterweisungRows ?? [];
      if (unterweisungen.length === 0) throw new Error("Unterweisung nicht gefunden");
      const unterweisung = unterweisungen[0];

      // Bestätigung einfügen oder aktualisieren
      await db.execute(sql`
        INSERT INTO sicherheitsunterweisung_bestaetigung
          (unterweisungId, mitarbeiterId, bestaetigt_at, version)
        VALUES
          (${input.unterweisungId}, ${ctx.mitarbeiterId}, NOW(), ${unterweisung.version})
        ON DUPLICATE KEY UPDATE
          bestaetigt_at = NOW(),
          version = ${unterweisung.version}
      `);

      return { success: true, timestamp: new Date().toISOString() };
    }),

  // ── Admin: neue Unterweisung erstellen ────────────────────────────────────
  create: adminProcedure
    .input(z.object({
      titel: z.string().min(3).max(255),
      inhalt: z.string().min(10),
      kategorie: z.enum(["brandschutz", "erstehilfe", "hygiene", "arbeitsschutz", "datenschutz", "sonstiges"]),
      pflicht: z.boolean().default(true),
      version: z.string().default("1.0"),
      gueltigBis: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("DB nicht verfügbar");

      await db.execute(sql`
        INSERT INTO sicherheitsunterweisungen
          (titel, inhalt, kategorie, pflicht, version, gueltigBis, erstelltVonId)
        VALUES
          (${input.titel}, ${input.inhalt}, ${input.kategorie},
           ${input.pflicht ? 1 : 0}, ${input.version},
           ${input.gueltigBis ?? null}, ${ctx.mitarbeiterId})
      `);

      // Alle aktiven Mitarbeiter benachrichtigen
      try {
        const maRows = await db.execute(sql`SELECT id FROM mitarbeiter WHERE aktiv = 1`);
        const maIds: number[] = ((maRows as any).rows ?? maRows ?? []).map((r: any) => Number(r.id));
        for (const maId of maIds) {
          await createNotification({
            empfaengerId: maId,
            titel: `📋 Neue Sicherheitsunterweisung: ${input.titel}`,
            nachricht: `Eine neue ${input.pflicht ? "Pflicht-" : ""}Unterweisung wurde veröffentlicht. Bitte lesen und digital bestätigen.`,
            typ: "info",
          });
        }
      } catch { /* Benachrichtigungen sind nicht kritisch */ }

      return { success: true };
    }),

  // ── Admin: Unterweisung bearbeiten ────────────────────────────────────────
  update: adminProcedure
    .input(z.object({
      id: z.number().int().positive(),
      titel: z.string().min(3).max(255).optional(),
      inhalt: z.string().min(10).optional(),
      kategorie: z.enum(["brandschutz", "erstehilfe", "hygiene", "arbeitsschutz", "datenschutz", "sonstiges"]).optional(),
      pflicht: z.boolean().optional(),
      version: z.string().optional(),
      gueltigBis: z.string().nullable().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB nicht verfügbar");

      const updates: string[] = [];
      if (input.titel !== undefined) updates.push(`titel = '${input.titel.replace(/'/g, "''")}'`);
      if (input.inhalt !== undefined) updates.push(`inhalt = '${input.inhalt.replace(/'/g, "''")}'`);
      if (input.kategorie !== undefined) updates.push(`kategorie = '${input.kategorie}'`);
      if (input.pflicht !== undefined) updates.push(`pflicht = ${input.pflicht ? 1 : 0}`);
      if (input.version !== undefined) updates.push(`version = '${input.version}'`);
      if (input.gueltigBis !== undefined) updates.push(`gueltigBis = ${input.gueltigBis ? `'${input.gueltigBis}'` : "NULL"}`);

      if (updates.length === 0) return { success: true };

      await db.execute(sql`
        UPDATE sicherheitsunterweisungen SET ${sql.raw(updates.join(", "))} WHERE id = ${input.id}
      `);

      return { success: true };
    }),

  // ── Admin: Unterweisung deaktivieren ─────────────────────────────────────
  deactivate: adminProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB nicht verfügbar");
      await db.execute(sql`UPDATE sicherheitsunterweisungen SET aktiv = 0 WHERE id = ${input.id}`);
      return { success: true };
    }),

  // ── Offene Pflicht-Unterweisungen zählen (für Badge) ─────────────────────
  countOffen: portalProtected.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return { count: 0 };
    const rows = await db.execute(sql`
      SELECT COUNT(*) AS count
      FROM sicherheitsunterweisungen su
      WHERE su.aktiv = 1 AND su.pflicht = 1
        AND NOT EXISTS (
          SELECT 1 FROM sicherheitsunterweisung_bestaetigung sub
          WHERE sub.unterweisungId = su.id AND sub.mitarbeiterId = ${ctx.mitarbeiterId}
        )
    `);
    const r = ((rows as any).rows ?? rows ?? [])[0];
    return { count: Number(r?.count ?? 0) };
  }),
});
