import { z } from "zod";
import { notifyOwner } from "./notification";
import { adminProcedure as systemAdminProcedure, publicProcedure, router } from "./trpc";
import { portalProtected } from "../portalAuth";
import { getDb } from "../db";
import { notifications } from "../../drizzle/schema";
import { eq, desc } from "drizzle-orm";

export const systemRouter = router({
  health: publicProcedure
    .input(
      z.object({
        timestamp: z.number().min(0, "timestamp cannot be negative"),
      })
    )
    .query(() => ({
      ok: true,
    })),

  /**
   * getMitteilungen – gibt die ungelesenen Mitteilungen des eingeloggten Mitarbeiters zurück.
   * Wird vom Dashboard (A5) beim Laden abgerufen.
   */
  getMitteilungen: portalProtected
    .input(
      z.object({
        limit: z.number().min(1).max(50).default(20).optional(),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      try {
        const limit = input?.limit ?? 20;
        const db = await getDb();
        if (!db) return [];
        const rows = await db
          .select()
          .from(notifications)
          .where(eq(notifications.empfaengerId, ctx.mitarbeiterId))
          .orderBy(desc(notifications.createdAt))
          .limit(limit);
        return rows;
      } catch {
        // Tabelle existiert möglicherweise noch nicht – leeres Array zurückgeben
        return [];
      }
    }),

  notifyOwner: systemAdminProcedure
    .input(
      z.object({
        title: z.string().min(1, "title is required"),
        content: z.string().min(1, "content is required"),
      })
    )
    .mutation(async ({ input }) => {
      const delivered = await notifyOwner(input);
      return {
        success: delivered,
      } as const;
    }),
});
