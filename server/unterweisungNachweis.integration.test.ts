import { describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { appRouter } from "./routers";
import { getDb } from "./db";
import { mitarbeiter } from "../drizzle/schema";
import { signPortalToken } from "./portalAuth";
import type { TrpcContext } from "./_core/context";

describe("Unterweisungsnachweise – lesender Integrationscheck", () => {
  it("liefert einem aktiven Admin Vorlagen und die Nachweisübersicht", async () => {
    const db = await getDb();
    if (!db) return;
    const admins = await db.select().from(mitarbeiter)
      .where(eq(mitarbeiter.rolle, "admin"))
      .limit(1);
    if (!admins[0]) return;

    const token = await signPortalToken(admins[0].id);
    const ctx = {
      user: null,
      req: { protocol: "https", headers: { authorization: `Bearer ${token}` }, cookies: {} },
      res: { clearCookie: () => {}, cookie: () => {} },
    } as unknown as TrpcContext;
    const caller = appRouter.createCaller(ctx);

    const [vorlagen, nachweise] = await Promise.all([
      caller.unterweisungNachweis.vorlagen.listAlle(),
      caller.arbeitssicherheit.unterweisung.listAll(),
    ]);

    expect(Array.isArray(vorlagen)).toBe(true);
    expect(Array.isArray(nachweise)).toBe(true);
  });
});
