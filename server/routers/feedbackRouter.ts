import { z } from "zod";
import { router } from "../_core/trpc";
import { portalProtected } from "../portalAuth";
import { getDb } from "../db";
import { sql } from "drizzle-orm";
import { notifyOwner } from "../_core/notification";

export const feedbackRouter = router({
  senden: portalProtected
    .input(z.object({
      kategorie: z.enum(["fehler", "verbesserung", "frage", "lob"]),
      nachricht: z.string().min(3).max(2000),
      seite: z.string().max(100).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("DB nicht verfügbar");

      // In DB speichern
      await db.execute(sql`
        INSERT INTO feedback (mitarbeiterId, kategorie, nachricht, seite, createdAt)
        VALUES (${ctx.mitarbeiterId}, ${input.kategorie}, ${input.nachricht}, ${input.seite ?? null}, NOW())
      `);

      // Admin benachrichtigen
      try {
        await notifyOwner({
          title: `Feedback: ${input.kategorie} von MA ${ctx.mitarbeiterId}`,
          content: `Seite: ${input.seite ?? "–"}\n\n${input.nachricht}`,
        });
      } catch { /* nicht kritisch */ }

      return { ok: true };
    }),

  liste: portalProtected
    .query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return [];
      // Admins sehen alles, MA nur eigenes
      const isAdmin = (ctx.portalMitarbeiter as any)?.rolle === "admin";
      const rows = isAdmin
        ? await db.execute(sql`
            SELECT f.*, CONCAT(m.vorname, ' ', m.nachname) AS absender
            FROM feedback f LEFT JOIN mitarbeiter m ON m.id = f.mitarbeiterId
            ORDER BY f.createdAt DESC LIMIT 100
          `)
        : await db.execute(sql`
            SELECT * FROM feedback WHERE mitarbeiterId = ${ctx.mitarbeiterId}
            ORDER BY createdAt DESC LIMIT 50
          `);
      return ((rows as any)[0] ?? rows) as any[];
    }),
});
