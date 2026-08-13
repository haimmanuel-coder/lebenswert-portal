import { beforeEach, describe, expect, it, vi } from "vitest";
import { besuchsberichte, einsaetze, fahrten, leistungen } from "../drizzle/schema";

const mocks = vi.hoisted(() => ({
  inserted: [] as Array<{ table: unknown; values: any }>,
  createdFahrten: [] as any[],
  einsatz: {
    id: 811,
    mitarbeiterId: 701,
    kundenId: 801,
    datum: new Date("2026-08-13T00:00:00.000Z"),
    status: "geplant",
    paragraph: "45b",
    paragraph2: null,
    dauerStunden: "1.50",
    stunden2: "0",
    anfahrtPauschale: 6,
  } as any,
}));

vi.mock("./db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./db")>();
  const db: any = {
    select: () => ({
      from: (table: unknown) => ({
        where: () => ({
          limit: async () => table === einsaetze ? [mocks.einsatz] : [],
        }),
      }),
    }),
    insert: (table: unknown) => ({
      values: async (values: any) => {
        mocks.inserted.push({ table, values });
        return { insertId: mocks.inserted.length };
      },
    }),
    update: () => ({ set: () => ({ where: async () => ({}) }) }),
  };
  return {
    ...actual,
    getDb: vi.fn(async () => db),
    getEinsatzById: vi.fn(async () => mocks.einsatz),
    updateEinsatzStatus: vi.fn(async () => undefined),
    getKundeById: vi.fn(async () => ({ id: 801, vorname: "Erika", nachname: "Muster", pflegegrad: 3, verbraucht45b: 0 })),
    getMitarbeiterById: vi.fn(async () => ({ id: 701, aktiv: true, rolle: "mitarbeiter", vorname: "Mia", nachname: "Beispiel", hatDienstwagen: false })),
    createAuditLog: vi.fn(async () => undefined),
    createNotification: vi.fn(async () => undefined),
    createFahrt: vi.fn(async (fahrt: any) => { mocks.createdFahrten.push(fahrt); }),
  };
});

import { appRouter } from "./routers";
import { signPortalToken, PORTAL_COOKIE } from "./portalAuth";

describe("Einsatzabschluss – automatische Dokumentübernahme", () => {
  beforeEach(() => {
    mocks.inserted.length = 0;
    mocks.createdFahrten.length = 0;
    mocks.einsatz.status = "geplant";
  });

  it("erzeugt beim Abschluss den Besuchsbericht, die Einsatzfahrt und den Leistungsmonat aus einem Datensatz", async () => {
    const token = await signPortalToken(701);
    const caller = appRouter.createCaller({
      req: { cookies: { [PORTAL_COOKIE]: token }, headers: {} },
      res: {} as any,
      user: null,
    } as any);

    await caller.einsaetze.updateStatus({
      id: 811,
      status: "abgeschlossen",
      bericht: "Kundin zum Arzt begleitet und Medikamente abgeholt.",
      gesundheit: "stabil",
      bemerkung: "Nächster Termin wie geplant.",
      tatsaechlicherStart: "2026-08-13T09:00:00.000Z",
      tatsaechlichesEnde: "2026-08-13T10:30:00.000Z",
      fahrtKilometer: 8.5,
      fahrtVonOrt: "Dienststelle",
      fahrtNachOrt: "Musterstraße 1, Musterstadt",
    });

    const bericht = mocks.inserted.find((eintrag) => eintrag.table === besuchsberichte)?.values;
    const leistungsmonat = mocks.inserted.find((eintrag) => eintrag.table === leistungen)?.values;
    expect(bericht).toMatchObject({
      einsatzId: 811,
      kundenId: 801,
      mitarbeiterId: 701,
      dauerMinuten: 90,
      pflegegradSnapshot: "3",
      fahrtKilometer: "8.5",
    });
    expect(mocks.createdFahrten[0]).toMatchObject({
      einsatzId: 811,
      kundenId: 801,
      kilometer: "8.5",
      monat: "2026-08",
    });
    expect(leistungsmonat).toMatchObject({
      mitarbeiterId: 701,
      kundenId: 801,
      monat: "2026-08",
      paragraph: "45b",
      stunden: "1.5",
    });
  });
});
