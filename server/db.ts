import { and, eq, gte, lte, desc, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, mitarbeiter, kunden, einsaetze, leistungen, fahrten, auditLogs, kundenZuordnung, monatsabschluesse, passwordResets } from "../drizzle/schema";
import type { InsertMitarbeiter, InsertKunde, InsertEinsatz, InsertLeistung, InsertFahrt, InsertAuditLog } from "../drizzle/schema";
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

// ── USERS (Manus OAuth) ──────────────────────────────
export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) { console.warn("[Database] Cannot upsert user: database not available"); return; }
  try {
    const values: InsertUser = { openId: user.openId };
    const updateSet: Record<string, unknown> = {};
    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];
    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };
    textFields.forEach(assignNullable);
    if (user.lastSignedIn !== undefined) { values.lastSignedIn = user.lastSignedIn; updateSet.lastSignedIn = user.lastSignedIn; }
    if (user.role !== undefined) { values.role = user.role; updateSet.role = user.role; }
    else if (user.openId === ENV.ownerOpenId) { values.role = "admin"; updateSet.role = "admin"; }
    if (!values.lastSignedIn) values.lastSignedIn = new Date();
    if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();
    await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
  } catch (error) { console.error("[Database] Failed to upsert user:", error); throw error; }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ── MITARBEITER ──────────────────────────────────────
export async function getMitarbeiterByEmail(email: string) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(mitarbeiter).where(eq(mitarbeiter.email, email)).limit(1);
  return result[0] ?? null;
}

export async function getMitarbeiterById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(mitarbeiter).where(eq(mitarbeiter.id, id)).limit(1);
  return result[0] ?? null;
}

export async function getAllMitarbeiter() {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    id: mitarbeiter.id,
    vorname: mitarbeiter.vorname,
    nachname: mitarbeiter.nachname,
    email: mitarbeiter.email,
    rolle: mitarbeiter.rolle,
    aktiv: mitarbeiter.aktiv,
    telefon: mitarbeiter.telefon,
    mobil: mitarbeiter.mobil,
    strasse: mitarbeiter.strasse,
    plz: mitarbeiter.plz,
    ort: mitarbeiter.ort,
    geburtsdatum: mitarbeiter.geburtsdatum,
    eintrittsdatum: mitarbeiter.eintrittsdatum,
    position: mitarbeiter.position,
    beschaeftigungsart: mitarbeiter.beschaeftigungsart,
    zertifikatStatus: mitarbeiter.zertifikatStatus,
    zertifikatDatum: mitarbeiter.zertifikatDatum,
    zertifikatAblauf: mitarbeiter.zertifikatAblauf,
    zertifikatBemerkung: mitarbeiter.zertifikatBemerkung,
    arbeitsvertragUrl: mitarbeiter.arbeitsvertragUrl,
    arbeitsvertragDatum: mitarbeiter.arbeitsvertragDatum,
    arbeitsvertragDateiname: mitarbeiter.arbeitsvertragDateiname,
    notizen: mitarbeiter.notizen,
    createdAt: mitarbeiter.createdAt,
  }).from(mitarbeiter).orderBy(mitarbeiter.nachname);
}

export async function createMitarbeiter(data: InsertMitarbeiter) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.insert(mitarbeiter).values(data);
}

export async function updateMitarbeiter(id: number, data: Partial<InsertMitarbeiter>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(mitarbeiter).set(data).where(eq(mitarbeiter.id, id));
}

// ── KUNDEN ───────────────────────────────────────────
export async function getAllKunden() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(kunden).where(eq(kunden.aktiv, 1)).orderBy(kunden.nachname);
}

export async function getKundeById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(kunden).where(eq(kunden.id, id)).limit(1);
  return result[0] ?? null;
}

export async function createKunde(data: InsertKunde) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.insert(kunden).values(data);
}

export async function updateKunde(id: number, data: Partial<InsertKunde>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(kunden).set(data).where(eq(kunden.id, id));
}

// ── KUNDEN-ZUORDNUNG ─────────────────────────────────
export async function getKundenByMitarbeiter(mitarbeiterId: number) {
  const db = await getDb();
  if (!db) return [];
  const zuordnungen = await db.select({ kundenId: kundenZuordnung.kundenId })
    .from(kundenZuordnung).where(eq(kundenZuordnung.mitarbeiterId, mitarbeiterId));
  if (zuordnungen.length === 0) return [];
  const ids = zuordnungen.map((z) => z.kundenId);
  return db.select().from(kunden).where(and(eq(kunden.aktiv, 1), sql`${kunden.id} IN (${ids.join(",")})`));
}

export async function setKundenZuordnung(mitarbeiterId: number, kundenIds: number[]) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(kundenZuordnung).where(eq(kundenZuordnung.mitarbeiterId, mitarbeiterId));
  if (kundenIds.length > 0) {
    await db.insert(kundenZuordnung).values(kundenIds.map((kundenId) => ({ mitarbeiterId, kundenId })));
  }
}

export async function getZuordnungenForMitarbeiter(mitarbeiterId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select({ kundenId: kundenZuordnung.kundenId }).from(kundenZuordnung).where(eq(kundenZuordnung.mitarbeiterId, mitarbeiterId));
}

// ── EINSÄTZE ─────────────────────────────────────────
export async function getEinsaetzeByMitarbeiter(mitarbeiterId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(einsaetze).where(eq(einsaetze.mitarbeiterId, mitarbeiterId)).orderBy(desc(einsaetze.datum));
}

export async function getAllEinsaetze() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(einsaetze).orderBy(desc(einsaetze.datum));
}

export async function getEinsaetzeByKunde(kundenId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(einsaetze).where(eq(einsaetze.kundenId, kundenId)).orderBy(desc(einsaetze.datum));
}

export async function createEinsatz(data: InsertEinsatz & { mitarbeiterId: number }) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.insert(einsaetze).values({
    mitarbeiterId: data.mitarbeiterId,
    kundenId: data.kundenId,
    datum: new Date(data.datum as unknown as string),
    startzeit: data.startzeit as string | undefined,
    dauerStunden: data.dauerStunden != null ? String(data.dauerStunden) : undefined,
    paragraph: data.paragraph,
    status: "geplant",
  });
}

export async function updateEinsatzStatus(
  id: number,
  mitarbeiterId: number,
  data: { status: "abgeschlossen" | "abgesagt"; bericht?: string; gesundheit?: "gut" | "stabil" | "auffaellig" | "kritisch"; bemerkung?: string; unterschriftMitarbeiter?: string }
) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  // Einsatz aktualisieren
  await db.update(einsaetze).set({ ...data }).where(and(eq(einsaetze.id, id), eq(einsaetze.mitarbeiterId, mitarbeiterId)));
  // Bei Abschluss: Budget des Kunden automatisch aktualisieren
  if (data.status === "abgeschlossen") {
    const result = await db.select().from(einsaetze).where(eq(einsaetze.id, id)).limit(1);
    const einsatz = result[0];
    if (einsatz && einsatz.kundenId && einsatz.dauerStunden) {
      const stunden = parseFloat(String(einsatz.dauerStunden));
      const stundensatz = 28; // €/Stunde Standardsatz
      const betrag = stunden * stundensatz;
      const paragraph = einsatz.paragraph;
      const kundeResult = await db.select().from(kunden).where(eq(kunden.id, einsatz.kundenId)).limit(1);
      const kunde = kundeResult[0];
      if (kunde) {
        if (paragraph === "45b") {
          const neu = parseFloat(String(kunde.verbraucht45b ?? 0)) + betrag;
          await db.update(kunden).set({ verbraucht45b: String(Math.round(neu * 100) / 100) }).where(eq(kunden.id, einsatz.kundenId));
        } else if (paragraph === "45a") {
          const neu = parseFloat(String(kunde.verbraucht45a ?? 0)) + betrag;
          await db.update(kunden).set({ verbraucht45a: String(Math.round(neu * 100) / 100) }).where(eq(kunden.id, einsatz.kundenId));
        } else if (paragraph === "39") {
          const neu = parseFloat(String(kunde.verbraucht39 ?? 0)) + betrag;
          await db.update(kunden).set({ verbraucht39: String(Math.round(neu * 100) / 100) }).where(eq(kunden.id, einsatz.kundenId));
        }
      }
    }
  }
}

// Budget eines Kunden manuell aktualisieren (Admin)
export async function updateKundeBudget(
  id: number,
  data: {
    budget45b?: string; verbraucht45b?: string; letzteAbrechnung45b?: string;
    budget45a?: string; verbraucht45a?: string; letzteAbrechnung45a?: string;
    budget39?: string; verbraucht39?: string; letzteAbrechnung39?: string;
  }
) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(kunden).set(data).where(eq(kunden.id, id));
}

// Kunden mit kritischem Budget (< 10% verfügbar in mind. einem Paragraph)
export async function getKundenMitBudgetWarnung() {
  const db = await getDb();
  if (!db) return [];
  const alle = await db.select().from(kunden).where(eq(kunden.aktiv, 1));
  return alle.filter(k => {
    const b45b = parseFloat(String(k.budget45b ?? 0));
    const v45b = parseFloat(String(k.verbraucht45b ?? 0));
    const b45a = parseFloat(String(k.budget45a ?? 0));
    const v45a = parseFloat(String(k.verbraucht45a ?? 0));
    const b39 = parseFloat(String(k.budget39 ?? 0));
    const v39 = parseFloat(String(k.verbraucht39 ?? 0));
    const kritisch45b = b45b > 0 && (b45b - v45b) / b45b < 0.10;
    const kritisch45a = b45a > 0 && (b45a - v45a) / b45a < 0.10;
    const kritisch39 = b39 > 0 && (b39 - v39) / b39 < 0.10;
    return kritisch45b || kritisch45a || kritisch39;
  });
}

// ── LEISTUNGEN ───────────────────────────────────────
export async function getLeistungenByMitarbeiter(mitarbeiterId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(leistungen).where(eq(leistungen.mitarbeiterId, mitarbeiterId)).orderBy(desc(leistungen.createdAt));
}

export async function getAllLeistungen() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(leistungen).orderBy(desc(leistungen.createdAt));
}

export async function getLeistungenByKunde(kundenId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(leistungen).where(eq(leistungen.kundenId, kundenId)).orderBy(desc(leistungen.createdAt));
}

export async function createLeistung(data: InsertLeistung & { mitarbeiterId: number }) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const rate = data.paragraph === "39" ? 1612 : data.paragraph === "45a" ? 0 : 125;
  const betrag = (parseFloat(String(data.stunden ?? 0)) * rate).toFixed(2);
  await db.insert(leistungen).values({
    mitarbeiterId: data.mitarbeiterId,
    kundenId: data.kundenId,
    monat: data.monat as string,
    paragraph: data.paragraph as "45b" | "45a" | "39",
    stunden: String(data.stunden ?? 0),
    anzahlEinsaetze: data.anzahlEinsaetze ?? 1,
    betrag,
    status: "offen",
    bemerkung: data.bemerkung,
    unterschriftLeister: data.unterschriftLeister,
  });
}

// ── FAHRTEN ──────────────────────────────────────────
export async function getFahrtenByMitarbeiter(mitarbeiterId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(fahrten).where(eq(fahrten.mitarbeiterId, mitarbeiterId)).orderBy(desc(fahrten.datum));
}

export async function getAllFahrten() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(fahrten).orderBy(desc(fahrten.datum));
}

export async function getFahrtenByKunde(kundenId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(fahrten).where(eq(fahrten.kundenId, kundenId)).orderBy(desc(fahrten.datum));
}

export async function createFahrt(data: InsertFahrt & { mitarbeiterId: number }) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const rate = data.typ === "sonder" ? 0.35 : 0.30;
  const verguetung = (parseFloat(String(data.kilometer)) * rate).toFixed(2);
  await db.insert(fahrten).values({
    mitarbeiterId: data.mitarbeiterId,
    kundenId: data.kundenId ?? null,
    datum: new Date(data.datum as unknown as string),
    vonOrt: data.vonOrt,
    nachOrt: data.nachOrt,
    kilometer: String(data.kilometer),
    typ: data.typ,
    zweck: data.zweck,
    verguetung,
  });
}

// ── AUDIT-LOG ─────────────────────────────────────────
export async function createAuditLog(data: InsertAuditLog) {
  const db = await getDb();
  if (!db) return;
  try {
    await db.insert(auditLogs).values(data);
  } catch (e) {
    console.warn("[AuditLog] Failed to write:", e);
  }
}

export async function getAuditLogs(limit = 200) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(limit);
}

// ── MONATSABSCHLUSS ───────────────────────────────────
export async function getMonatsabschluesse() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(monatsabschluesse).orderBy(desc(monatsabschluesse.monat));
}

export async function createMonatsabschluss(data: {
  monat: string;
  adminId: number;
  gesamtStunden: number;
  gesamtEinsaetze: number;
  gesamtKm: number;
  gesamtVerguetung: number;
  csvExport: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.insert(monatsabschluesse).values({
    monat: data.monat,
    adminId: data.adminId,
    gesamtStunden: String(data.gesamtStunden),
    gesamtEinsaetze: data.gesamtEinsaetze,
    gesamtKm: String(data.gesamtKm),
    gesamtVerguetung: String(data.gesamtVerguetung),
    csvExport: data.csvExport,
  });
}

// ── STATISTIKEN (für Admin-Dashboard) ─────────────────
export async function getMonatsStatistik(monat: string) {
  const db = await getDb();
  if (!db) return { einsaetze: 0, stunden: 0, km: 0, verguetung: 0, leistungen: 0 };
  const [eis, leis, fahr] = await Promise.all([
    db.select().from(einsaetze).where(sql`DATE_FORMAT(${einsaetze.datum}, '%Y-%m') = ${monat}`),
    db.select().from(leistungen).where(eq(leistungen.monat, monat)),
    db.select().from(fahrten).where(sql`DATE_FORMAT(${fahrten.datum}, '%Y-%m') = ${monat}`),
  ]);
  return {
    einsaetze: eis.length,
    stunden: eis.reduce((s, e) => s + parseFloat(String(e.dauerStunden ?? 0)), 0),
    km: fahr.reduce((s, f) => s + parseFloat(String(f.kilometer ?? 0)), 0),
    verguetung: fahr.reduce((s, f) => s + parseFloat(String(f.verguetung ?? 0)), 0),
    leistungen: leis.length,
  };
}

// ── PASSWORD RESET ────────────────────────────────────
export async function createPasswordResetToken(mitarbeiterId: number, token: string): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  // Alte ungenutzte Tokens für diesen Mitarbeiter löschen
  await db.delete(passwordResets).where(
    and(eq(passwordResets.mitarbeiterId, mitarbeiterId), eq(passwordResets.used, false))
  );
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 Stunde gültig
  await db.insert(passwordResets).values({ mitarbeiterId, token, expiresAt, used: false });
}

export async function getValidPasswordResetToken(token: string) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(passwordResets).where(
    and(
      eq(passwordResets.token, token),
      eq(passwordResets.used, false),
      gte(passwordResets.expiresAt, new Date())
    )
  ).limit(1);
  return result[0] ?? null;
}

export async function markPasswordResetTokenUsed(token: string): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(passwordResets).set({ used: true }).where(eq(passwordResets.token, token));
}

export async function updateMitarbeiterPasswort(mitarbeiterId: number, passwortHash: string): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(mitarbeiter).set({ passwortHash }).where(eq(mitarbeiter.id, mitarbeiterId));
}
