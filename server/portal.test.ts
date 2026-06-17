import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function makeCtx(overrides: Partial<TrpcContext> = {}): TrpcContext {
  const cleared: string[] = [];
  const set: Array<{ name: string; value: string }> = [];
  return {
    user: null,
    req: {
      protocol: "https",
      headers: {},
      cookies: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: (name: string) => cleared.push(name),
      cookie: (name: string, value: string) => set.push({ name, value }),
    } as unknown as TrpcContext["res"],
    ...overrides,
  };
}

// ── portal.me ────────────────────────────────────────
describe("portal.me", () => {
  it("returns null when no cookie is present", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.portal.me();
    expect(result).toBeNull();
  });
});

// ── portal.logout ─────────────────────────────────────
describe("portal.logout", () => {
  it("clears the portal cookie and returns success", async () => {
    const cleared: string[] = [];
    const ctx = makeCtx({
      res: {
        clearCookie: (name: string) => cleared.push(name),
        cookie: () => {},
      } as unknown as TrpcContext["res"],
    });
    const caller = appRouter.createCaller(ctx);
    const result = await caller.portal.logout();
    expect(result.success).toBe(true);
    expect(cleared).toContain("lb_portal_token");
  });
});

// ── portal.login – validation ─────────────────────────
describe("portal.login – validation", () => {
  it("throws on invalid email format", async () => {
    const caller = appRouter.createCaller(makeCtx());
    await expect(
      caller.portal.login({ email: "not-an-email", passwort: "password" })
    ).rejects.toThrow();
  });

  it("throws on empty password", async () => {
    const caller = appRouter.createCaller(makeCtx());
    await expect(
      caller.portal.login({ email: "test@test.de", passwort: "" })
    ).rejects.toThrow();
  });

  it("throws on unknown email", async () => {
    const caller = appRouter.createCaller(makeCtx());
    await expect(
      caller.portal.login({ email: "unknown@example.de", passwort: "password" })
    ).rejects.toThrow("E-Mail oder Passwort ungültig.");
  });
});

// ── auth.logout ───────────────────────────────────────
describe("auth.logout", () => {
  it("clears the session cookie and reports success", async () => {
    const cleared: Array<{ name: string; opts: Record<string, unknown> }> = [];
    const ctx = makeCtx({
      res: {
        clearCookie: (name: string, opts: Record<string, unknown>) =>
          cleared.push({ name, opts }),
        cookie: () => {},
      } as unknown as TrpcContext["res"],
    });
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.logout();
    expect(result.success).toBe(true);
    expect(cleared.length).toBeGreaterThan(0);
  });
});

// ── einsaetze – protected route ───────────────────────
describe("einsaetze – protected", () => {
  it("throws when not authenticated", async () => {
    const caller = appRouter.createCaller(makeCtx());
    await expect(caller.einsaetze.list()).rejects.toThrow("Nicht angemeldet");
  });

  it("create throws on invalid paragraph", async () => {
    const caller = appRouter.createCaller(makeCtx());
    await expect(
      caller.einsaetze.create({
        kundenId: 1,
        datum: "2025-01-01",
        paragraph: "99" as "45b",
      })
    ).rejects.toThrow();
  });

  it("create throws on invalid date format", async () => {
    const caller = appRouter.createCaller(makeCtx());
    await expect(
      caller.einsaetze.create({
        kundenId: 1,
        datum: "01.01.2025",
        paragraph: "45b",
      })
    ).rejects.toThrow();
  });
});

// ── leistungen – protected route ──────────────────────
describe("leistungen – protected", () => {
  it("throws when not authenticated", async () => {
    const caller = appRouter.createCaller(makeCtx());
    await expect(caller.leistungen.list()).rejects.toThrow("Nicht angemeldet");
  });

  it("create throws on invalid monat format", async () => {
    const caller = appRouter.createCaller(makeCtx());
    await expect(
      caller.leistungen.create({
        kundenId: 1,
        monat: "01-2025",
        paragraph: "45b",
        stunden: 8,
        anzahlEinsaetze: 4,
      })
    ).rejects.toThrow();
  });
});

// ── fahrten – protected route ─────────────────────────
describe("fahrten – protected", () => {
  it("throws when not authenticated", async () => {
    const caller = appRouter.createCaller(makeCtx());
    await expect(caller.fahrten.list()).rejects.toThrow("Nicht angemeldet");
  });

  it("create throws on negative km", async () => {
    const caller = appRouter.createCaller(makeCtx());
    await expect(
      caller.fahrten.create({
        datum: "2025-01-01",
        vonOrt: "A",
        nachOrt: "B",
        kilometer: -5,
        typ: "normal",
      })
    ).rejects.toThrow();
  });

  it("create throws on empty vonOrt", async () => {
    const caller = appRouter.createCaller(makeCtx());
    await expect(
      caller.fahrten.create({
        datum: "2025-01-01",
        vonOrt: "",
        nachOrt: "B",
        kilometer: 10,
        typ: "normal",
      })
    ).rejects.toThrow();
  });
});
