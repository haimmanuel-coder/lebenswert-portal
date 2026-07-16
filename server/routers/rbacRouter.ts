import { z } from "zod";
import { router } from "../_core/trpc";
import { portalProtected, adminProcedure } from "../portalAuth";
import { getDb } from "../db";
import { roles, permissions, rolePermissions, employeeRoles, mitarbeiter } from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";

export const rbacRouter = router({
  // Rollen abrufen
  listRoles: portalProtected.query(async () => {
    const db = await getDb();
    if (!db) throw new Error("DB nicht verfügbar");
    return db.select().from(roles);
  }),

  // Berechtigungen abrufen
  listPermissions: portalProtected.query(async () => {
    const db = await getDb();
    if (!db) throw new Error("DB nicht verfügbar");
    return db.select().from(permissions);
  }),

  // Berechtigungen einer Rolle
  getRolePermissions: portalProtected
    .input(z.object({ roleId: z.number() }))
    .query(async ({ input }: { input: { roleId: number } }) => {
      const db = await getDb();
      if (!db) throw new Error("DB nicht verfügbar");
      const rows = await db
        .select({ permission: permissions })
        .from(rolePermissions)
        .innerJoin(permissions, eq(permissions.id, rolePermissions.permissionId))
        .where(eq(rolePermissions.roleId, input.roleId));
      return rows.map((r: any) => r.permission);
    }),

  // Rollen eines Mitarbeiters
  getEmployeeRoles: portalProtected
    .input(z.object({ employeeId: z.number() }))
    .query(async ({ input }: { input: { employeeId: number } }) => {
      const db = await getDb();
      if (!db) throw new Error("DB nicht verfügbar");
      const rows = await db
        .select({ role: roles, assignedAt: employeeRoles.assignedAt })
        .from(employeeRoles)
        .innerJoin(roles, eq(roles.id, employeeRoles.roleId))
        .where(eq(employeeRoles.employeeId, input.employeeId));
      return rows;
    }),

  // Alle Berechtigungen eines Mitarbeiters (Live-DB-Check)
  getEmployeePermissions: portalProtected
    .input(z.object({ employeeId: z.number() }))
    .query(async ({ input }: { input: { employeeId: number } }) => {
      const db = await getDb();
      if (!db) throw new Error("DB nicht verfügbar");
      const rows = await db
        .select({ key: permissions.key, description: permissions.description })
        .from(employeeRoles)
        .innerJoin(rolePermissions, eq(rolePermissions.roleId, employeeRoles.roleId))
        .innerJoin(permissions, eq(permissions.id, rolePermissions.permissionId))
        .where(eq(employeeRoles.employeeId, input.employeeId));
      const seen = new Set<string>();
      return rows.filter((r: any) => { if (seen.has(r.key)) return false; seen.add(r.key); return true; });
    }),

  // Rolle zuweisen (Admin only)
  assignRole: adminProcedure
    .input(z.object({ employeeId: z.number(), roleKey: z.string() }))
    .mutation(async ({ input, ctx }: { input: { employeeId: number; roleKey: string }; ctx: any }) => {
      const db = await getDb();
      if (!db) throw new Error("DB nicht verfügbar");
      const [role] = await db.select().from(roles).where(eq(roles.key, input.roleKey));
      if (!role) throw new Error(`Rolle '${input.roleKey}' nicht gefunden`);
      try {
        await db.insert(employeeRoles).values({
          employeeId: input.employeeId,
          roleId: role.id,
          assignedBy: ctx.adminId,
        });
      } catch (_e) { /* Duplikat – ignorieren */ }
      return { success: true };
    }),

  // Rolle entziehen (Admin only)
  removeRole: adminProcedure
    .input(z.object({ employeeId: z.number(), roleKey: z.string() }))
    .mutation(async ({ input }: { input: { employeeId: number; roleKey: string } }) => {
      const db = await getDb();
      if (!db) throw new Error("DB nicht verfügbar");
      const [role] = await db.select().from(roles).where(eq(roles.key, input.roleKey));
      if (!role) throw new Error(`Rolle '${input.roleKey}' nicht gefunden`);
      await db.delete(employeeRoles).where(
        and(eq(employeeRoles.employeeId, input.employeeId), eq(employeeRoles.roleId, role.id))
      );
      return { success: true };
    }),

  // employment_type aktualisieren (Admin only)
  updateEmploymentType: adminProcedure
    .input(z.object({
      employeeId: z.number(),
      employmentType: z.enum(["minijob", "teilzeit", "vollzeit"]).nullable(),
    }))
    .mutation(async ({ input }: { input: { employeeId: number; employmentType: "minijob" | "teilzeit" | "vollzeit" | null } }) => {
      const db = await getDb();
      if (!db) throw new Error("DB nicht verfügbar");
      await db.update(mitarbeiter)
        .set({ employmentType: input.employmentType } as any)
        .where(eq(mitarbeiter.id, input.employeeId));
      return { success: true };
    }),
});
