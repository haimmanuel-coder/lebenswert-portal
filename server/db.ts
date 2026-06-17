import { and, eq, gte, lte, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, mitarbeiter, kunden, einsaetze, leistungen, fahrten } from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ── AUTH ──────────────────────────────────────────────
export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required");
  const db = await getDb();
  if (!db) return;
  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  const textFields = ["name", "email", "loginMethod"] as const;
  textFields.forEach((field) => {
    const value = user[field];
    if (value === undefined) return;
    const normalized = value ?? null;
    values[field] = normalized;
    updateSet[field] = normalized;
  });
  if (user.lastSignedIn !== undefined) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  }
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }
  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ── MITARBEITER ───────────────────────────────────────
export async function getMitarbeiterByEmail(email: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(mitarbeiter)
    .where(and(eq(mitarbeiter.email, email.toLowerCase()), eq(mitarbeiter.aktiv, 1)))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getMitarbeiterById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(mitarbeiter).where(eq(mitarbeiter.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ── KUNDEN ────────────────────────────────────────────
export async function getAllKunden() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(kunden).where(eq(kunden.aktiv, 1));
}

// ── EINSÄTZE ──────────────────────────────────────────
export async function getEinsaetzeByMitarbeiter(mitarbeiterId: number) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .select({
      id: einsaetze.id,
      mitarbeiterId: einsaetze.mitarbeiterId,
      kundenId: einsaetze.kundenId,
      datum: einsaetze.datum,
      startzeit: einsaetze.startzeit,
      dauerStunden: einsaetze.dauerStunden,
      paragraph: einsaetze.paragraph,
      status: einsaetze.status,
      bericht: einsaetze.bericht,
      gesundheit: einsaetze.gesundheit,
      bemerkung: einsaetze.bemerkung,
      createdAt: einsaetze.createdAt,
      kundeVorname: kunden.vorname,
      kundeNachname: kunden.nachname,
    })
    .from(einsaetze)
    .leftJoin(kunden, eq(einsaetze.kundenId, kunden.id))
    .where(eq(einsaetze.mitarbeiterId, mitarbeiterId))
    .orderBy(sql`${einsaetze.datum} DESC, ${einsaetze.startzeit} ASC`);
  return rows.map((r) => ({
    ...r,
    kundeName: `${r.kundeVorname ?? ""} ${r.kundeNachname ?? ""}`.trim(),
    dauerStunden: r.dauerStunden ? parseFloat(r.dauerStunden as unknown as string) : 0,
  }));
}

export async function createEinsatz(data: {
  mitarbeiterId: number;
  kundenId: number;
  datum: string;
  startzeit?: string;
  dauerStunden?: number;
  paragraph: "45b" | "45a" | "39";
}) {
  const db = await getDb();
  if (!db) throw new Error("DB nicht verfügbar");
  await db.insert(einsaetze).values({
    mitarbeiterId: data.mitarbeiterId,
    kundenId: data.kundenId,
    datum: data.datum as unknown as Date,
    startzeit: data.startzeit ?? null,
    dauerStunden: data.dauerStunden?.toString() as unknown as string,
    paragraph: data.paragraph,
    status: "geplant",
  });
}

export async function updateEinsatzStatus(
  id: number,
  mitarbeiterId: number,
  update: {
    status: "abgeschlossen" | "abgesagt";
    bericht?: string;
    gesundheit?: "gut" | "stabil" | "auffaellig" | "kritisch";
    bemerkung?: string;
    unterschriftMitarbeiter?: string;
  }
) {
  const db = await getDb();
  if (!db) throw new Error("DB nicht verfügbar");
  await db
    .update(einsaetze)
    .set({
      status: update.status,
      bericht: update.bericht ?? null,
      gesundheit: update.gesundheit ?? null,
      bemerkung: update.bemerkung ?? null,
      unterschriftMitarbeiter: update.unterschriftMitarbeiter ?? null,
    })
    .where(and(eq(einsaetze.id, id), eq(einsaetze.mitarbeiterId, mitarbeiterId)));
}

// ── LEISTUNGEN ────────────────────────────────────────
export async function getLeistungenByMitarbeiter(mitarbeiterId: number) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .select({
      id: leistungen.id,
      mitarbeiterId: leistungen.mitarbeiterId,
      kundenId: leistungen.kundenId,
      monat: leistungen.monat,
      paragraph: leistungen.paragraph,
      stunden: leistungen.stunden,
      anzahlEinsaetze: leistungen.anzahlEinsaetze,
      betrag: leistungen.betrag,
      status: leistungen.status,
      bemerkung: leistungen.bemerkung,
      createdAt: leistungen.createdAt,
      kundeVorname: kunden.vorname,
      kundeNachname: kunden.nachname,
    })
    .from(leistungen)
    .leftJoin(kunden, eq(leistungen.kundenId, kunden.id))
    .where(eq(leistungen.mitarbeiterId, mitarbeiterId))
    .orderBy(sql`${leistungen.monat} DESC`);
  return rows.map((r) => ({
    ...r,
    kundeName: `${r.kundeVorname ?? ""} ${r.kundeNachname ?? ""}`.trim(),
    stunden: r.stunden ? parseFloat(r.stunden as unknown as string) : 0,
    betrag: r.betrag ? parseFloat(r.betrag as unknown as string) : 0,
  }));
}

export async function createLeistung(data: {
  mitarbeiterId: number;
  kundenId: number;
  monat: string;
  paragraph: "45b" | "45a" | "39";
  stunden: number;
  anzahlEinsaetze: number;
  bemerkung?: string;
  unterschriftLeister?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("DB nicht verfügbar");
  const rate = data.paragraph === "39" ? 50 : 39;
  const betrag = data.stunden * rate + data.anzahlEinsaetze * 6;
  const leistungRow = {
    mitarbeiterId: data.mitarbeiterId,
    kundenId: data.kundenId,
    monat: data.monat,
    paragraph: data.paragraph,
    stunden: data.stunden.toString() as unknown as string,
    anzahlEinsaetze: data.anzahlEinsaetze,
    betrag: betrag.toString() as unknown as string,
    status: "offen" as const,
    bemerkung: data.bemerkung ?? null,
    unterschriftLeister: data.unterschriftLeister ?? null,
  };
  await db.insert(leistungen).values([leistungRow]);
}

// ── FAHRTEN ───────────────────────────────────────────
export async function getFahrtenByMitarbeiter(mitarbeiterId: number) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .select({
      id: fahrten.id,
      mitarbeiterId: fahrten.mitarbeiterId,
      kundenId: fahrten.kundenId,
      datum: fahrten.datum,
      vonOrt: fahrten.vonOrt,
      nachOrt: fahrten.nachOrt,
      kilometer: fahrten.kilometer,
      typ: fahrten.typ,
      zweck: fahrten.zweck,
      verguetung: fahrten.verguetung,
      createdAt: fahrten.createdAt,
      kundeVorname: kunden.vorname,
      kundeNachname: kunden.nachname,
    })
    .from(fahrten)
    .leftJoin(kunden, eq(fahrten.kundenId, kunden.id))
    .where(eq(fahrten.mitarbeiterId, mitarbeiterId))
    .orderBy(sql`${fahrten.datum} DESC`);
  return rows.map((r) => ({
    ...r,
    kundeName: r.kundeVorname ? `${r.kundeVorname} ${r.kundeNachname ?? ""}`.trim() : null,
    kilometer: r.kilometer ? parseFloat(r.kilometer as unknown as string) : 0,
    verguetung: r.verguetung ? parseFloat(r.verguetung as unknown as string) : 0,
  }));
}

export async function createFahrt(data: {
  mitarbeiterId: number;
  kundenId?: number | null;
  datum: string;
  vonOrt: string;
  nachOrt: string;
  kilometer: number;
  typ: "normal" | "sonder";
  zweck?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("DB nicht verfügbar");
  const rate = data.typ === "sonder" ? 0.35 : 0.3;
  const verguetung = data.kilometer * rate;
  const fahrtRow = {
    mitarbeiterId: data.mitarbeiterId,
    kundenId: data.kundenId ?? null,
    datum: data.datum as unknown as Date,
    vonOrt: data.vonOrt,
    nachOrt: data.nachOrt,
    kilometer: data.kilometer.toString() as unknown as string,
    typ: data.typ,
    zweck: data.zweck ?? null,
    verguetung: verguetung.toString() as unknown as string,
  };
  await db.insert(fahrten).values([fahrtRow]);
}
