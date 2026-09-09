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
    stunden1: "1.50",
    stunden2: "0",
    anfahrtPauschale: 6,
  } as any,
}));

vi.mock("./webpush", () => ({
  VAPID_PUBLIC: "",
  sendBudgetWarnungPush: vi.fn(async () => false),
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
    updateEinsatzStatus: vi.fn(async (_id: number, _mitarbeiterId: number, daten: any) => {
      mocks.einsatz.status = daten.status ?? mocks.einsatz.status;
    }),
    getKundeById: vi.fn(async () => ({ id: 801, vorname: "Erika", nachname: "Muster", pflegegrad: 3, verbraucht45b: 0 })),
    getMitarbeiterById: vi.fn(async () => ({ id: 701, aktiv: true, rolle: "mitarbeiter", vorname: "Mia", nachname: "Beispiel", hatDienstwagen: false })),
    createAuditLog: vi.fn(async () => undefined),
    createNotification: vi.fn(async () => undefined),
    createFahrt: vi.fn(async (fahrt: any) => { mocks.createdFahrten.push(fahrt); }),
    updateKundeBudget: vi.fn(async () => undefined),
  };
});

import { appRouter } from "./routers";
import { signPortalToken, PORTAL_COOKIE } from "./portalAuth";

describe("Einsatzabschluss – automatische Dokumentübernahme", () => {
  beforeEach(() => {
    mocks.inserted.length = 0;
    mocks.createdFahrten.length = 0;
    mocks.einsatz.status = "geplant";
    mocks.einsatz.paragraph = "45b";
    mocks.einsatz.paragraph2 = null;
    mocks.einsatz.dauerStunden = "1.50";
    mocks.einsatz.stunden1 = "1.50";
    mocks.einsatz.stunden2 = "0";
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
      betrag: "60",
    });
  });

  it("übernimmt einen gesplitteten Einsatz mit den exakten Stundenanteilen in getrennte Leistungsnachweise", async () => {
    mocks.einsatz.paragraph = "39";
    mocks.einsatz.paragraph2 = "45b";
    mocks.einsatz.dauerStunden = "2.50";
    mocks.einsatz.stunden1 = "2.00";
    mocks.einsatz.stunden2 = "0.50";
    const token = await signPortalToken(701);
    const caller = appRouter.createCaller({
      req: { cookies: { [PORTAL_COOKIE]: token }, headers: {} },
      res: {} as any,
      user: null,
    } as any);

    await caller.einsaetze.updateStatus({
      id: 811,
      status: "abgeschlossen",
      bericht: "Gesplitteter Einsatz dokumentiert.",
      tatsaechlicherStart: "2026-08-13T09:00:00.000Z",
      tatsaechlichesEnde: "2026-08-13T11:30:00.000Z",
    });

    const leistungsmonate = mocks.inserted
      .filter((eintrag) => eintrag.table === leistungen)
      .map((eintrag) => eintrag.values);
    expect(leistungsmonate).toHaveLength(2);
    expect(leistungsmonate).toEqual(expect.arrayContaining([
      expect.objectContaining({ paragraph: "39", stunden: "2", betrag: "98" }),
      expect.objectContaining({ paragraph: "45b", stunden: "0.5", betrag: "18" }),
    ]));
    expect(leistungsmonate.reduce((summe, leistung) => summe + Number(leistung.stunden), 0)).toBe(2.5);
  });
});
