import bcrypt from "bcryptjs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const mocks = vi.hoisted(() => ({
  getMitarbeiterByEmail: vi.fn(),
  createAuditLog: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("./db", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./db")>()),
  getMitarbeiterByEmail: mocks.getMitarbeiterByEmail,
  createAuditLog: mocks.createAuditLog,
}));

import { appRouter } from "./routers";

const TEST_EMAIL = "aktive-personalakte@example.test";
const TEST_PASSWORT = "Sicheres!Testpasswort9";

function erstelleKontext() {
  const cookies: Array<{ name: string; value: string; optionen: Record<string, unknown> }> = [];
  const ctx = {
    user: null,
    req: { secure: true, headers: {}, cookies: {} },
    res: {
      cookie: (name: string, value: string, optionen: Record<string, unknown>) => cookies.push({ name, value, optionen }),
      clearCookie: vi.fn(),
    },
  } as unknown as TrpcContext;
  return { ctx, cookies };
}

beforeEach(async () => {
  vi.clearAllMocks();
  mocks.getMitarbeiterByEmail.mockResolvedValue({
    id: 987654,
    vorname: "Aktive",
    nachname: "Testperson",
    email: TEST_EMAIL,
    rolle: "mitarbeiter",
    aktiv: 1,
    zweiFaktorAktiv: 0,
    zweiFaktorSecret: null,
    passwortWechselErforderlich: 0,
    startPasswortErstelltAt: null,
    passwortHash: await bcrypt.hash(TEST_PASSWORT, 4),
  });
});

describe("portal.login – aktives Konto", () => {
  it("erzeugt für das richtige Passwort einen internen Sitzungscookie", async () => {
    const { ctx, cookies } = erstelleKontext();
    const ergebnis = await appRouter.createCaller(ctx).portal.login({ email: TEST_EMAIL, passwort: TEST_PASSWORT });

    expect(ergebnis).toMatchObject({ requiresTwoFactor: false, id: 987654, email: TEST_EMAIL, rolle: "mitarbeiter" });
    expect(ergebnis.token).toEqual(expect.any(String));
    expect(cookies).toHaveLength(1);
    expect(cookies[0]).toMatchObject({ name: "lb_portal_token", optionen: { httpOnly: true, secure: true, path: "/" } });
    expect(mocks.createAuditLog).toHaveBeenCalledWith(expect.objectContaining({ action: "LOGIN", status: "success" }));
  });

  it("verrät bei einem falschen Passwort keine Kontodetails", async () => {
    const { ctx, cookies } = erstelleKontext();
    await expect(
      appRouter.createCaller(ctx).portal.login({ email: TEST_EMAIL, passwort: "Falsches!Testpasswort9" }),
    ).rejects.toThrow("E-Mail oder Passwort ungültig.");

    expect(cookies).toHaveLength(0);
    expect(mocks.createAuditLog).toHaveBeenCalledWith(expect.objectContaining({ action: "LOGIN", status: "failure", details: "Passwortprüfung fehlgeschlagen" }));
  });
});
