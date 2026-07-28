import { and, eq, gte, lte, desc, sql, like, or, isNull } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, mitarbeiter, kunden, einsaetze, leistungen, fahrten, auditLogs, kundenZuordnung, monatsabschluesse, passwordResets, kostentraeger, textbausteine, ebriefLog, pushSubscriptions, urlaubsantraege, krankmeldungen, touren, tourEinsaetze, notifications, refreshTokens, budgetTransaktionen, neukundenPushBestaetigung, vertretungsUebernahmen } from "../drizzle/schema";
import type { InsertMitarbeiter, InsertKunde, InsertEinsatz, InsertLeistung, InsertFahrt, InsertAuditLog, InsertKostentraeger, InsertTextbaustein, InsertEbriefLog, InsertPushSubscription, InsertUrlaubsantrag, InsertKrankmeldung, InsertTour, InsertNotification, InsertRefreshToken } from "../drizzle/schema";
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
  try {
    const result = await db.select().from(mitarbeiter).where(eq(mitarbeiter.email, email)).limit(1);
    return result[0] ?? null;
  } catch {
    return null;
  }
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

export async function createKunde(data: InsertKunde): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(kunden).values(data);
  return (result as any)[0]?.insertId ?? 0;
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

// ── MEHRFACH-ZUORDNUNG (max. 3 Mitarbeiter pro Kunde) ─────────────

/** Gibt alle Mitarbeiter-Zuordnungen für einen Kunden zurück (max. 3). */
export async function getZuordnungenForKunde(kundenId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(kundenZuordnung)
    .where(eq(kundenZuordnung.kundenId, kundenId))
    .orderBy(kundenZuordnung.prioritaet);
}

/**
 * Setzt die Mitarbeiter-Zuordnung für einen Kunden (Admin-only).
 * Maximal 3 Mitarbeiter erlaubt. Wirft einen Fehler bei Überschreitung.
 */
export async function setZuordnungenForKunde(
  kundenId: number,
  zuordnungen: Array<{ mitarbeiterId: number; prioritaet: number; rolle: 'hauptbetreuer' | 'vertretung' }>,
  zugeordnetVon: number
) {
  if (zuordnungen.length > 3) throw new Error('Maximal 3 Mitarbeiter pro Kunde erlaubt.');
  const db = await getDb();
  if (!db) throw new Error('DB not available');
  // Bestehende Zuordnungen für diesen Kunden löschen
  await db.delete(kundenZuordnung).where(eq(kundenZuordnung.kundenId, kundenId));
  if (zuordnungen.length > 0) {
    await db.insert(kundenZuordnung).values(
      zuordnungen.map(z => ({ kundenId, mitarbeiterId: z.mitarbeiterId, prioritaet: z.prioritaet, rolle: z.rolle, zugeordnetVon }))
    );
  }
}

/** Prüft ob ein Mitarbeiter einem Kunden zugeordnet ist. */
export async function isMitarbeiterZugeordnet(mitarbeiterId: number, kundenId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const rows = await db.select({ id: kundenZuordnung.id })
    .from(kundenZuordnung)
    .where(and(eq(kundenZuordnung.mitarbeiterId, mitarbeiterId), eq(kundenZuordnung.kundenId, kundenId)))
    .limit(1);
  return rows.length > 0;
}

// ── EINSÄTZE ─────────────────────────────────────────
export async function getEinsaetzeByMitarbeiter(mitarbeiterId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(einsaetze)
    .where(and(eq(einsaetze.mitarbeiterId, mitarbeiterId), isNull(einsaetze.geloeschtAt)))
    .orderBy(desc(einsaetze.datum));
}

export async function getAllEinsaetze() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(einsaetze).where(isNull(einsaetze.geloeschtAt)).orderBy(desc(einsaetze.datum));
}

export async function getEinsaetzeByKunde(kundenId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(einsaetze)
    .where(and(eq(einsaetze.kundenId, kundenId), isNull(einsaetze.geloeschtAt)))
    .orderBy(desc(einsaetze.datum));
}

export async function getEinsaetzeWithKunden(mitarbeiterId?: number) {
  const db = await getDb();
  if (!db) return [];
  const query = db
    .select({
      id: einsaetze.id,
      mitarbeiterId: einsaetze.mitarbeiterId,
      kundenId: einsaetze.kundenId,
      datum: einsaetze.datum,
      startzeit: einsaetze.startzeit,
      dauerStunden: einsaetze.dauerStunden,
      endzeit: einsaetze.endzeit,
      paragraph: einsaetze.paragraph,
      paragraph2: einsaetze.paragraph2,
      stunden2: einsaetze.stunden2,
      lohnkosten: einsaetze.lohnkosten,
      notizen: einsaetze.notizen,
      status: einsaetze.status,
      anfahrtPauschale: (einsaetze as any).anfahrtPauschale,
      createdAt: einsaetze.createdAt,
      kundeVorname: kunden.vorname,
      kundeNachname: kunden.nachname,
      kundeStrasse: kunden.strasse,
      kundePlz: kunden.plz,
      kundeOrt: kunden.ort,
    })
    .from(einsaetze)
    .leftJoin(kunden, eq(einsaetze.kundenId, kunden.id));
  if (mitarbeiterId) {
    return query
      .where(and(eq(einsaetze.mitarbeiterId, mitarbeiterId), isNull(einsaetze.geloeschtAt)))
      .orderBy(desc(einsaetze.datum));
  }
  return query.where(isNull(einsaetze.geloeschtAt)).orderBy(desc(einsaetze.datum));
}

export async function createEinsatz(data: InsertEinsatz & { mitarbeiterId: number }) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(einsaetze).values({
    mitarbeiterId: data.mitarbeiterId,
    kundenId: data.kundenId,
    datum: new Date(data.datum as unknown as string),
    startzeit: data.startzeit as string | undefined,
    dauerStunden: data.dauerStunden != null ? String(data.dauerStunden) : undefined,
    paragraph: data.paragraph,
    status: "geplant",
  });
  return Number(result[0].insertId);
}

export async function updateEinsatzStatus(
  id: number,
  mitarbeiterId: number,
  data: {
    status: "abgeschlossen" | "abgesagt";
    bericht?: string;
    gesundheit?: "gut" | "stabil" | "auffaellig" | "kritisch";
    bemerkung?: string;
    unterschriftMitarbeiter?: string;
    unterschriftKunde?: string;
    textbausteinIds?: string;
  }
) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(einsaetze).set({ ...data }).where(and(eq(einsaetze.id, id), eq(einsaetze.mitarbeiterId, mitarbeiterId)));
  if (data.status === "abgeschlossen") {
    const result = await db.select().from(einsaetze).where(eq(einsaetze.id, id)).limit(1);
    const einsatz = result[0];
    if (einsatz && einsatz.kundenId && einsatz.dauerStunden) {
      const stunden = parseFloat(String(einsatz.dauerStunden));
      const stundensatz = 28;
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
  return db.select().from(leistungen)
    .where(and(eq(leistungen.mitarbeiterId, mitarbeiterId), isNull(leistungen.geloeschtAt)))
    .orderBy(desc(leistungen.createdAt));
}

export async function getAllLeistungen() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(leistungen).where(isNull(leistungen.geloeschtAt)).orderBy(desc(leistungen.createdAt));
}

export async function getLeistungenByKunde(kundenId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(leistungen)
    .where(and(eq(leistungen.kundenId, kundenId), isNull(leistungen.geloeschtAt)))
    .orderBy(desc(leistungen.createdAt));
}

/**
 * Hilfsfunktion: Kunden-Budget anpassen + Transaktion loggen.
 * betragDelta > 0 = Abbuchung, < 0 = Rückerstattung
 */
export async function adjustKundeVerbraucht(
  kundenId: number,
  paragraph: "45b" | "45a" | "39",
  betragDelta: number,
  opts?: { leistungId?: number; mitarbeiterId?: number; stunden?: number; monat?: string; beschreibung?: string }
) {
  const db = await getDb();
  if (!db) return;
  const kundeResult = await db.select().from(kunden).where(eq(kunden.id, kundenId)).limit(1);
  const kunde = kundeResult[0];
  if (!kunde) return;
  if (paragraph === "45b") {
    const neu = Math.max(0, parseFloat(String(kunde.verbraucht45b ?? 0)) + betragDelta);
    await db.update(kunden).set({ verbraucht45b: String(Math.round(neu * 100) / 100) }).where(eq(kunden.id, kundenId));
  } else if (paragraph === "45a") {
    const neu = Math.max(0, parseFloat(String(kunde.verbraucht45a ?? 0)) + betragDelta);
    await db.update(kunden).set({ verbraucht45a: String(Math.round(neu * 100) / 100) }).where(eq(kunden.id, kundenId));
  } else if (paragraph === "39") {
    const neu = Math.max(0, parseFloat(String(kunde.verbraucht39 ?? 0)) + betragDelta);
    await db.update(kunden).set({ verbraucht39: String(Math.round(neu * 100) / 100) }).where(eq(kunden.id, kundenId));
  }
  // ── Transaktion in Budget-Historie loggen ──
  const typ = betragDelta >= 0 ? 'abbuchung' : 'rueckerstattung';
  await db.insert(budgetTransaktionen).values({
    kundenId,
    leistungId: opts?.leistungId ?? null,
    mitarbeiterId: opts?.mitarbeiterId ?? null,
    typ,
    paragraph,
    betrag: String(Math.abs(Math.round(betragDelta * 100) / 100)),
    stunden: opts?.stunden != null ? String(opts.stunden) : null,
    monat: opts?.monat ?? null,
    beschreibung: opts?.beschreibung ?? null,
  });
}

/** Alle Budget-Transaktionen für einen Kunden (neueste zuerst). */
export async function getBudgetHistorie(kundenId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    id: budgetTransaktionen.id,
    typ: budgetTransaktionen.typ,
    paragraph: budgetTransaktionen.paragraph,
    betrag: budgetTransaktionen.betrag,
    stunden: budgetTransaktionen.stunden,
    monat: budgetTransaktionen.monat,
    beschreibung: budgetTransaktionen.beschreibung,
    createdAt: budgetTransaktionen.createdAt,
    leistungId: budgetTransaktionen.leistungId,
    mitarbeiterId: budgetTransaktionen.mitarbeiterId,
    mitarbeiterVorname: mitarbeiter.vorname,
    mitarbeiterNachname: mitarbeiter.nachname,
  })
  .from(budgetTransaktionen)
  .leftJoin(mitarbeiter, eq(budgetTransaktionen.mitarbeiterId, mitarbeiter.id))
  .where(eq(budgetTransaktionen.kundenId, kundenId))
  .orderBy(desc(budgetTransaktionen.createdAt));
}

export async function createLeistung(data: InsertLeistung & { mitarbeiterId: number }) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  // Stundensatz je Paragraph: §45b = 125 €/h, §39 = 1612 €/Monat (pauschal), §45a = 0
  const rate = data.paragraph === "39" ? 1612 : data.paragraph === "45a" ? 0 : 125;
  const stunden = parseFloat(String(data.stunden ?? 0));
  const betrag = (stunden * rate).toFixed(2);
  await db.insert(leistungen).values({
    mitarbeiterId: data.mitarbeiterId,
    kundenId: data.kundenId,
    monat: data.monat as string,
    paragraph: data.paragraph as "45b" | "45a" | "39",
    stunden: String(stunden),
    anzahlEinsaetze: data.anzahlEinsaetze ?? 1,
    betrag,
    status: "offen",
    bemerkung: data.bemerkung,
    unterschriftLeister: data.unterschriftLeister,
    unterschriftKunde: (data as any).unterschriftKunde,
  });
  // ── AUTOMATISCHE BUDGET-ABRECHNUNG: Betrag sofort vom Kunden-Budget abziehen + in Historie loggen ──
  if (data.kundenId && parseFloat(betrag) > 0) {
    // leistungId aus dem Insert-Ergebnis lesen
    const inserted = await db.select({ id: leistungen.id }).from(leistungen)
      .where(and(eq(leistungen.kundenId, data.kundenId), eq(leistungen.mitarbeiterId, data.mitarbeiterId)))
      .orderBy(desc(leistungen.createdAt)).limit(1);
    const leistungId = inserted[0]?.id;
    await adjustKundeVerbraucht(
      data.kundenId,
      data.paragraph as "45b" | "45a" | "39",
      parseFloat(betrag),
      {
        leistungId,
        mitarbeiterId: data.mitarbeiterId,
        stunden,
        monat: data.monat as string,
        beschreibung: `Leistungsnachweis ${data.monat} – ${stunden}h §${data.paragraph}`,
      }
    );
  }
}

export async function deleteLeistung(id: number) {
  const db = await getDb();
  if (!db) return;
  // ── BUDGET-RÜCKBUCHUNG: Betrag vor dem Löschen zurückbuchen + in Historie loggen ──
  const rows = await db.select().from(leistungen).where(eq(leistungen.id, id)).limit(1);
  const leistung = rows[0];
  if (leistung && leistung.kundenId && leistung.betrag) {
    const betrag = parseFloat(String(leistung.betrag));
    if (betrag > 0) {
      await adjustKundeVerbraucht(
        leistung.kundenId,
        leistung.paragraph as "45b" | "45a" | "39",
        -betrag,
        {
          leistungId: id,
          mitarbeiterId: leistung.mitarbeiterId ?? undefined,
          stunden: leistung.stunden ? parseFloat(String(leistung.stunden)) : undefined,
          monat: leistung.monat ?? undefined,
          beschreibung: `Rückerstattung: Leistungsnachweis ${leistung.monat} gelöscht`,
        }
      );
    }
  }
  await db.delete(leistungen).where(eq(leistungen.id, id));
}

export async function updateLeistungStatus(id: number, status: "offen" | "pruefung" | "freigegeben" | "versendet") {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(leistungen).set({ status }).where(eq(leistungen.id, id));
}

// ── FAHRTEN ──────────────────────────────────────────
export async function getFahrtenByMitarbeiter(mitarbeiterId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(fahrten)
    .where(and(eq(fahrten.mitarbeiterId, mitarbeiterId), isNull(fahrten.geloeschtAt)))
    .orderBy(desc(fahrten.datum));
}

export async function getAllFahrten() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(fahrten).where(isNull(fahrten.geloeschtAt)).orderBy(desc(fahrten.datum));
}

export async function getFahrtenByKunde(kundenId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(fahrten)
    .where(and(eq(fahrten.kundenId, kundenId), isNull(fahrten.geloeschtAt)))
    .orderBy(desc(fahrten.datum));
}

export async function getFahrtenByMonat(monat: string) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(fahrten)
    .where(and(eq(fahrten.monat, monat), isNull(fahrten.geloeschtAt)))
    .orderBy(desc(fahrten.datum));
}

export async function createFahrt(data: InsertFahrt & { mitarbeiterId: number }) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const rate = data.typ === "sonder" ? 0.35 : 0.30;
  const verguetung = (parseFloat(String(data.kilometer)) * rate).toFixed(2);
  const monat = (data.datum as unknown as string).slice(0, 7);
  await db.insert(fahrten).values({
    mitarbeiterId: data.mitarbeiterId,
    kundenId: data.kundenId ?? null,
    datum: new Date(data.datum as unknown as string),
    vonOrt: data.vonOrt,
    nachOrt: data.nachOrt,
    kilometer: String(data.kilometer),
    kilometerHin: (data as any).kilometerHin ? String((data as any).kilometerHin) : null,
    kilometerRueck: (data as any).kilometerRueck ? String((data as any).kilometerRueck) : null,
    typ: data.typ,
    zweck: data.zweck,
    verguetung,
    abrechnungsStatus: "offen",
    monat,
  });
}

export async function updateFahrtStatus(id: number, status: "offen" | "eingereicht" | "erstattet") {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(fahrten).set({ abrechnungsStatus: status }).where(eq(fahrten.id, id));
}

export async function deleteFahrt(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(fahrten).where(eq(fahrten.id, id));
}

// ── MODUL 1: KOSTENTRÄGER ────────────────────────────
export async function getAllKostentraeger() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(kostentraeger).where(eq(kostentraeger.aktiv, 1)).orderBy(kostentraeger.name);
}

export async function getKostentraegerById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(kostentraeger).where(eq(kostentraeger.id, id)).limit(1);
  return result[0] ?? null;
}

export async function searchKostentraeger(query: string) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(kostentraeger).where(
    and(
      eq(kostentraeger.aktiv, 1),
      or(
        like(kostentraeger.name, `%${query}%`),
        like(kostentraeger.ikNummer, `%${query}%`),
        like(kostentraeger.ort, `%${query}%`)
      )
    )
  ).orderBy(kostentraeger.name).limit(20);
}

export async function createKostentraeger(data: InsertKostentraeger) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.insert(kostentraeger).values(data);
}

export async function updateKostentraeger(id: number, data: Partial<InsertKostentraeger>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(kostentraeger).set(data).where(eq(kostentraeger.id, id));
}

// ── MODUL 3: TEXTBAUSTEINE ───────────────────────────
export async function getAllTextbausteine(paragraph?: string, kategorie?: string) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(textbausteine.aktiv, 1)];
  if (paragraph) conditions.push(eq(textbausteine.paragraph, paragraph as any));
  if (kategorie) conditions.push(eq(textbausteine.kategorie, kategorie as any));
  return db.select().from(textbausteine).where(and(...conditions)).orderBy(textbausteine.kategorie, textbausteine.titel);
}

export async function getTextbausteinById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(textbausteine).where(eq(textbausteine.id, id)).limit(1);
  return result[0] ?? null;
}

export async function createTextbaustein(data: InsertTextbaustein) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.insert(textbausteine).values(data);
}

export async function updateTextbaustein(id: number, data: Partial<InsertTextbaustein>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(textbausteine).set(data).where(eq(textbausteine.id, id));
}

export async function deleteTextbaustein(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(textbausteine).set({ aktiv: 0 }).where(eq(textbausteine.id, id));
}

// ── MODUL 5: E-BRIEF LOG ─────────────────────────────
export async function createEbriefLog(data: InsertEbriefLog) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.insert(ebriefLog).values(data);
}

export async function getEbriefLog(limit = 100) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(ebriefLog).orderBy(desc(ebriefLog.createdAt)).limit(limit);
}

export async function getEbriefLogByKunde(kundenId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(ebriefLog).where(eq(ebriefLog.kundenId, kundenId)).orderBy(desc(ebriefLog.createdAt));
}

// Aliases für Kompatibilität
export const createEBriefLog = createEbriefLog;
export const getEBriefLogs = getEbriefLog;

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
  await db.delete(passwordResets).where(
    and(eq(passwordResets.mitarbeiterId, mitarbeiterId), eq(passwordResets.used, false))
  );
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
  await db.insert(passwordResets).values({ mitarbeiterId, token, expiresAt, used: false });
}

export async function getValidPasswordResetToken(token: string) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(passwordResets).where(
    and(eq(passwordResets.token, token), eq(passwordResets.used, false), gte(passwordResets.expiresAt, new Date()))
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


// ── PFLEGEGRAD-BUDGET-TABELLE ─────────────────────────
// Gesetzliche Jahresbudgets nach SGB XI (Stand 2024)
export function getPflegegradBudgets(pflegegrad: number) {
  const budgets: Record<number, { b45b: number; b45a: number; b39: number; label: string }> = {
    1: { b45b: 125,   b45a: 0,    b39: 0,    label: "Pflegegrad 1" },
    2: { b45b: 689,   b45a: 0,    b39: 1612, label: "Pflegegrad 2" },
    3: { b45b: 689,   b45a: 0,    b39: 1995, label: "Pflegegrad 3" },
    4: { b45b: 689,   b45a: 0,    b39: 1612, label: "Pflegegrad 4" },
    5: { b45b: 689,   b45a: 0,    b39: 1995, label: "Pflegegrad 5" },
  };
  return budgets[pflegegrad] ?? budgets[2];
}

// ── EXPORT: Alle Leistungsnachweise eines Monats ──────
export async function getLeistungenFuerExport(monat: string, mitarbeiterId?: number) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [sql`${leistungen.monat} = ${monat}`];
  if (mitarbeiterId) conditions.push(eq(leistungen.mitarbeiterId, mitarbeiterId));
  return db.select().from(leistungen).where(and(...conditions)).orderBy(leistungen.createdAt);
}

export async function getFahrtenFuerExport(monat: string, mitarbeiterId?: number) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [sql`DATE_FORMAT(${fahrten.datum}, '%Y-%m') = ${monat}`];
  if (mitarbeiterId) conditions.push(eq(fahrten.mitarbeiterId, mitarbeiterId));
  return db.select().from(fahrten).where(and(...conditions)).orderBy(fahrten.datum);
}

// ── PUSH-SUBSCRIPTIONS ────────────────────────────────
export async function savePushSubscription(data: InsertPushSubscription) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  // Vorhandene Subscription für diesen Mitarbeiter+Endpoint ersetzen
  await db.delete(pushSubscriptions)
    .where(and(
      eq(pushSubscriptions.mitarbeiterId, data.mitarbeiterId),
      eq(pushSubscriptions.endpoint, data.endpoint)
    ));
  await db.insert(pushSubscriptions).values(data);
}

export async function deletePushSubscription(mitarbeiterId: number, endpoint: string) {
  const db = await getDb();
  if (!db) return;
  await db.delete(pushSubscriptions)
    .where(and(
      eq(pushSubscriptions.mitarbeiterId, mitarbeiterId),
      eq(pushSubscriptions.endpoint, endpoint)
    ));
}

export async function getAllPushSubscriptions() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(pushSubscriptions);
}

export async function getPushSubscriptionsByMitarbeiter(mitarbeiterId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(pushSubscriptions).where(eq(pushSubscriptions.mitarbeiterId, mitarbeiterId));
}

// ── FÜHRERSCHEIN-CHECKS ───────────────────────────────
export async function getFuehrerscheinChecks(mitarbeiterId?: number) {
  const db = await getDb();
  if (!db) return [];
  if (mitarbeiterId) {
    const r = await db.execute(sql`SELECT * FROM fuehrerschein_checks WHERE mitarbeiter_id = ${mitarbeiterId} ORDER BY pruef_datum DESC`);
    return (r as any)[0] as any[];
  }
  const r = await db.execute(sql`SELECT * FROM fuehrerschein_checks ORDER BY naechstes_pruef_datum ASC`);
  return (r as any)[0] as any[];
}

export async function createFuehrerscheinCheck(data: {
  mitarbeiterId: number;
  fotoKey?: string;
  fotoUrl?: string;
  pruefDatum: string;
  naechstesPruefDatum: string;
  status: 'gueltig' | 'faellig' | 'ueberfaellig';
  bemerkung?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.execute(sql`
    INSERT INTO fuehrerschein_checks (mitarbeiter_id, foto_key, foto_url, pruef_datum, naechstes_pruef_datum, status, bemerkung)
    VALUES (${data.mitarbeiterId}, ${data.fotoKey ?? null}, ${data.fotoUrl ?? null}, ${data.pruefDatum}, ${data.naechstesPruefDatum}, ${data.status}, ${data.bemerkung ?? null})
  `);
  return result;
}

export async function updateFuehrerscheinStatus(id: number, status: 'gueltig' | 'faellig' | 'ueberfaellig') {
  const db = await getDb();
  if (!db) return;
  await db.execute(sql`UPDATE fuehrerschein_checks SET status = ${status} WHERE id = ${id}`);
}

// ── NEUKUNDENAUFNAHMEN ────────────────────────────────
export async function getAllNeukundenaufnahmen() {
  const db = await getDb();
  if (!db) return [];
  const r = await db.execute(sql`SELECT * FROM neukundenaufnahmen ORDER BY created_at DESC`);
  return (r as any)[0] as any[];
}

export async function createNeukundenaufnahme(data: {
  vorname: string;
  nachname: string;
  geburtsdatum?: string;
  strasse?: string;
  plz?: string;
  ort?: string;
  telefon?: string;
  email?: string;
  pflegegrad?: number;
  kostentraeger?: string;
  versicherungsnummer?: string;
  paragraph?: string;
  vollmachtUnterschrift?: string;
  kundenUnterschrift?: string;
  notizen?: string;
  erstelltVon?: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.execute(sql`
    INSERT INTO neukundenaufnahmen
      (vorname, nachname, geburtsdatum, strasse, plz, ort, telefon, email, pflegegrad, kostentraeger, versicherungsnummer, paragraph, vollmacht_unterschrift, kunden_unterschrift, notizen, erstellt_von)
    VALUES
      (${data.vorname}, ${data.nachname}, ${data.geburtsdatum ?? null}, ${data.strasse ?? null}, ${data.plz ?? null}, ${data.ort ?? null},
       ${data.telefon ?? null}, ${data.email ?? null}, ${data.pflegegrad ?? null}, ${data.kostentraeger ?? null}, ${data.versicherungsnummer ?? null},
       ${data.paragraph ?? '45b'}, ${data.vollmachtUnterschrift ?? null}, ${data.kundenUnterschrift ?? null}, ${data.notizen ?? null}, ${data.erstelltVon ?? null})
  `);
  return result;
}

export async function updateNeukundenaufnahmeStatus(id: number, status: 'aufgenommen' | 'in_bearbeitung' | 'abgeschlossen') {
  const db = await getDb();
  if (!db) return;
  await db.execute(sql`UPDATE neukundenaufnahmen SET status = ${status} WHERE id = ${id}`);
}

// ── KASSENANFRAGEN ────────────────────────────────────────────────
export async function getAllKassenanfragen(mitarbeiterId?: number) {
  const db = await getDb();
  if (!db) return [];
  if (mitarbeiterId) {
    const rows = await db.execute(sql`
      SELECT ka.*, 
        k.vorname, k.nachname, k.versicherungsnummer, k.pflegegrad,
        kt.name as kasseName, kt.ikNummer,
        m.vorname as mitarbeiterVorname, m.nachname as mitarbeiterNachname
      FROM kassenanfragen ka
      LEFT JOIN kunden k ON ka.kundenId = k.id
      LEFT JOIN kostentraeger kt ON ka.kostentraegerId = kt.id
      LEFT JOIN mitarbeiter m ON ka.mitarbeiterId = m.id
      WHERE ka.mitarbeiterId = ${mitarbeiterId}
      ORDER BY ka.createdAt DESC
    `);
    return (rows as any)[0] as any[];
  }
  const rows = await db.execute(sql`
    SELECT ka.*, 
      k.vorname, k.nachname, k.versicherungsnummer, k.pflegegrad,
      kt.name as kasseName, kt.ikNummer,
      m.vorname as mitarbeiterVorname, m.nachname as mitarbeiterNachname
    FROM kassenanfragen ka
    LEFT JOIN kunden k ON ka.kundenId = k.id
    LEFT JOIN kostentraeger kt ON ka.kostentraegerId = kt.id
    LEFT JOIN mitarbeiter m ON ka.mitarbeiterId = m.id
    ORDER BY ka.createdAt DESC
  `);
  return (rows as any)[0] as any[];
}

export async function getKassenanfragenByKunde(kundenId: number) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.execute(sql`
    SELECT ka.*, 
      kt.name as kasseName, kt.ikNummer,
      m.vorname as mitarbeiterVorname, m.nachname as mitarbeiterNachname
    FROM kassenanfragen ka
    LEFT JOIN kostentraeger kt ON ka.kostentraegerId = kt.id
    LEFT JOIN mitarbeiter m ON ka.mitarbeiterId = m.id
    WHERE ka.kundenId = ${kundenId}
    ORDER BY ka.createdAt DESC
  `);
  return (rows as any)[0] as any[];
}

export async function createKassenanfrage(data: {
  mitarbeiterId: number;
  kundenId: number;
  kostentraegerId?: number;
  anfrageTyp: string;
  vollmachtText?: string;
  unterschriftKunde?: string;
  unterschriftMitarbeiter?: string;
  notizen?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.execute(sql`
    INSERT INTO kassenanfragen
      (mitarbeiterId, kundenId, kostentraegerId, anfrageTyp, vollmachtText, unterschriftKunde, unterschriftMitarbeiter, notizen, status)
    VALUES
      (${data.mitarbeiterId}, ${data.kundenId}, ${data.kostentraegerId ?? null}, ${data.anfrageTyp},
       ${data.vollmachtText ?? null}, ${data.unterschriftKunde ?? null}, ${data.unterschriftMitarbeiter ?? null},
       ${data.notizen ?? null}, 'offen')
  `);
  return result;
}

export async function updateKassenanfrageStatus(id: number, status: 'offen' | 'gesendet' | 'beantwortet' | 'abgelehnt', antwort?: string) {
  const db = await getDb();
  if (!db) return;
  if (antwort) {
    await db.execute(sql`UPDATE kassenanfragen SET status = ${status}, antwort = ${antwort}, antwortDatum = NOW() WHERE id = ${id}`);
  } else {
    await db.execute(sql`UPDATE kassenanfragen SET status = ${status} WHERE id = ${id}`);
  }
}

// ── URLAUBSVERWALTUNG ──────────────────────────────────────────────────
export async function getAllUrlaubsantraege() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(urlaubsantraege).where(isNull(urlaubsantraege.geloeschtAt)).orderBy(desc(urlaubsantraege.createdAt));
}

export async function getUrlaubsantraegeByMitarbeiter(mitarbeiterId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(urlaubsantraege)
    .where(and(eq(urlaubsantraege.mitarbeiterId, mitarbeiterId), isNull(urlaubsantraege.geloeschtAt)))
    .orderBy(desc(urlaubsantraege.createdAt));
}

export async function createUrlaubsantrag(data: InsertUrlaubsantrag) {
  const db = await getDb();
  if (!db) throw new Error('DB not available');
  await db.insert(urlaubsantraege).values(data);
}

export async function updateUrlaubsantragStatus(
  id: number,
  status: 'beantragt' | 'genehmigt' | 'abgelehnt',
  adminNotiz?: string
) {
  const db = await getDb();
  if (!db) return;
  await db.update(urlaubsantraege)
    .set({ status, adminNotiz: adminNotiz ?? null })
    .where(eq(urlaubsantraege.id, id));
}

export async function deleteUrlaubsantrag(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(urlaubsantraege).where(eq(urlaubsantraege.id, id));
}

// ── KRANKMELDUNGEN ───────────────────────────────────────────────────────
export async function getAllKrankmeldungen() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(krankmeldungen).where(isNull(krankmeldungen.geloeschtAt)).orderBy(desc(krankmeldungen.createdAt));
}

export async function getKrankmeldungenByMitarbeiter(mitarbeiterId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(krankmeldungen)
    .where(and(eq(krankmeldungen.mitarbeiterId, mitarbeiterId), isNull(krankmeldungen.geloeschtAt)))
    .orderBy(desc(krankmeldungen.createdAt));
}

export async function createKrankmeldung(data: InsertKrankmeldung) {
  const db = await getDb();
  if (!db) throw new Error('DB not available');
  await db.insert(krankmeldungen).values(data);
}

export async function deleteKrankmeldung(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(krankmeldungen).where(eq(krankmeldungen.id, id));
}

// ── TOURENPLANUNG ──────────────────────────────────────────────────────────
const tourMitMitarbeiterAuswahl = {
  id: touren.id,
  mitarbeiterId: touren.mitarbeiterId,
  datum: touren.datum,
  status: touren.status,
  notizen: touren.notizen,
  titel: touren.titel,
  startzeit: touren.startzeit,
  endzeit: touren.endzeit,
  angelegtVon: touren.angelegtVon,
  createdAt: touren.createdAt,
  updatedAt: touren.updatedAt,
  mitarbeiterVorname: mitarbeiter.vorname,
  mitarbeiterNachname: mitarbeiter.nachname,
};

export async function getAllTouren() {
  const db = await getDb();
  if (!db) return [];
  return db.select(tourMitMitarbeiterAuswahl)
    .from(touren)
    .leftJoin(mitarbeiter, eq(touren.mitarbeiterId, mitarbeiter.id))
    .where(isNull(touren.geloeschtAt))
    .orderBy(desc(touren.datum));
}

export async function getTourenByMitarbeiter(mitarbeiterId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select(tourMitMitarbeiterAuswahl)
    .from(touren)
    .leftJoin(mitarbeiter, eq(touren.mitarbeiterId, mitarbeiter.id))
    .where(and(eq(touren.mitarbeiterId, mitarbeiterId), isNull(touren.geloeschtAt)))
    .orderBy(desc(touren.datum));
}

export async function getTourenByDatum(datum: string) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(touren).where(and(sql`DATE(${touren.datum}) = ${datum}`, isNull(touren.geloeschtAt)));
}

export async function createTour(data: InsertTour) {
  const db = await getDb();
  if (!db) throw new Error('DB not available');
  const result = await db.insert(touren).values(data);
  return Number(result[0].insertId);
}

export async function updateTourStatus(id: number, status: 'geplant' | 'aktiv' | 'abgeschlossen') {
  const db = await getDb();
  if (!db) return;
  await db.update(touren).set({ status }).where(eq(touren.id, id));
}

export async function getTourEinsaetze(tourId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    id: tourEinsaetze.id,
    tourId: tourEinsaetze.tourId,
    einsatzId: tourEinsaetze.einsatzId,
    reihenfolge: tourEinsaetze.reihenfolge,
    kundenId: einsaetze.kundenId,
    datum: einsaetze.datum,
    startzeit: einsaetze.startzeit,
    kundenVorname: kunden.vorname,
    kundenNachname: kunden.nachname,
    strasse: kunden.strasse,
    plz: kunden.plz,
    ort: kunden.ort,
  }).from(tourEinsaetze)
    .innerJoin(einsaetze, eq(tourEinsaetze.einsatzId, einsaetze.id))
    .innerJoin(kunden, eq(einsaetze.kundenId, kunden.id))
    .where(eq(tourEinsaetze.tourId, tourId))
    .orderBy(tourEinsaetze.reihenfolge);
}

export async function addEinsatzToTour(tourId: number, einsatzId: number, reihenfolge: number) {
  const db = await getDb();
  if (!db) throw new Error('DB not available');
  await db.insert(tourEinsaetze).values({ tourId, einsatzId, reihenfolge });
}

export async function removeEinsatzFromTour(tourId: number, einsatzId: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(tourEinsaetze)
    .where(and(eq(tourEinsaetze.tourId, tourId), eq(tourEinsaetze.einsatzId, einsatzId)));
}

export async function updateTourReihenfolge(tourId: number, geordneteZuordnungsIds: number[]) {
  const db = await getDb();
  if (!db) throw new Error('DB not available');
  await db.transaction(async tx => {
    for (let index = 0; index < geordneteZuordnungsIds.length; index += 1) {
      const id = geordneteZuordnungsIds[index];
      await tx.update(tourEinsaetze)
        .set({ reihenfolge: index })
        .where(and(eq(tourEinsaetze.id, id), eq(tourEinsaetze.tourId, tourId)));
    }
  });
}

// ── IN-APP-BENACHRICHTIGUNGEN ─────────────────────────────────────────────
export async function getNotificationsByMitarbeiter(mitarbeiterId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(notifications)
    .where(eq(notifications.empfaengerId, mitarbeiterId))
    .orderBy(desc(notifications.createdAt))
    .limit(50);
}

export async function getUnreadNotificationCount(mitarbeiterId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.select({ count: sql<number>`COUNT(*)` })
    .from(notifications)
    .where(and(eq(notifications.empfaengerId, mitarbeiterId), eq(notifications.gelesen, false)));
  return Number(result[0]?.count ?? 0);
}

export async function createNotification(data: InsertNotification) {
  const db = await getDb();
  if (!db) return;
  await db.insert(notifications).values(data);
}

export async function markNotificationRead(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(notifications).set({ gelesen: true }).where(eq(notifications.id, id));
}

export async function markAllNotificationsRead(mitarbeiterId: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(notifications)
    .set({ gelesen: true })
    .where(eq(notifications.empfaengerId, mitarbeiterId));
}

// ── REFRESH TOKENS ────────────────────────────────────────────────────────────
export async function createRefreshToken(data: InsertRefreshToken) {
  const db = await getDb();
  if (!db) throw new Error('DB not available');
  await db.insert(refreshTokens).values(data);
}

export async function getValidRefreshToken(token: string) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(refreshTokens)
    .where(and(
      eq(refreshTokens.token, token),
      eq(refreshTokens.used, false),
      gte(refreshTokens.expiresAt, new Date())
    ))
    .limit(1);
  return result[0] ?? null;
}

export async function invalidateRefreshToken(token: string) {
  const db = await getDb();
  if (!db) return;
  await db.update(refreshTokens).set({ used: true }).where(eq(refreshTokens.token, token));
}

export async function invalidateAllRefreshTokensForMitarbeiter(mitarbeiterId: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(refreshTokens).set({ used: true }).where(eq(refreshTokens.mitarbeiterId, mitarbeiterId));
}

// ── EINSATZ-KONFLIKTPRÜFUNG (Doppelbelegung) ───────────────────────────────
export async function checkDoppelbelegung(params: {
  datum: string;
  startzeit: string;
  dauerStunden: number;
  mitarbeiterId: number;
  kundenId: number;
  excludeId?: number;
}): Promise<{ mitarbeiterKonflikt: boolean; kundenKonflikt: boolean }> {
  const db = await getDb();
  if (!db) return { mitarbeiterKonflikt: false, kundenKonflikt: false };

  // Berechne Endzeit in Minuten
  const [h, m] = params.startzeit.split(':').map(Number);
  const startMin = h * 60 + m;
  const endMin = startMin + Math.round(params.dauerStunden * 60);
  const endzeit = `${String(Math.floor(endMin / 60)).padStart(2, '0')}:${String(endMin % 60).padStart(2, '0')}`;

  // Alle Einsätze am selben Datum laden
  const vorhandene = await db.select().from(einsaetze)
    .where(and(
      sql`DATE(${einsaetze.datum}) = ${params.datum}`,
      sql`${einsaetze.status} != 'abgesagt'`
    ));

  const filtered = vorhandene.filter(e => e.id !== params.excludeId);

  let mitarbeiterKonflikt = false;
  let kundenKonflikt = false;

  for (const e of filtered) {
    if (!e.startzeit || !e.dauerStunden) continue;
    const [eh, em] = String(e.startzeit).split(':').map(Number);
    const eStartMin = eh * 60 + em;
    const eEndMin = eStartMin + Math.round(Number(e.dauerStunden) * 60);

    const overlap = startMin < eEndMin && endMin > eStartMin;
    if (!overlap) continue;

    if (e.mitarbeiterId === params.mitarbeiterId) mitarbeiterKonflikt = true;
    if (e.kundenId === params.kundenId) kundenKonflikt = true;
  }

  return { mitarbeiterKonflikt, kundenKonflikt };
}

// ── P1: NEUKUNDEN-PUSH-BESTÄTIGUNGEN ─────────────────────────────────────────

/** Erstellt Bestätigungs-Einträge für alle aktiven Mitarbeiter beim Neukunden-Anlegen */
export async function createNeukundenPushEintraege(kundenId: number) {
  const db = await getDb();
  if (!db) return;
  const alleMa = await db.select({ id: mitarbeiter.id }).from(mitarbeiter).where(eq(mitarbeiter.aktiv, 1));
  if (alleMa.length === 0) return;
  await db.insert(neukundenPushBestaetigung).values(
    alleMa.map(ma => ({ kundenId, mitarbeiterId: ma.id }))
  );
}

/** Gibt alle unbestätigten Neukunden-Push-Einträge für einen Mitarbeiter zurück */
export async function getOffeneNeukundenPushFuerMitarbeiter(mitarbeiterId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    id: neukundenPushBestaetigung.id,
    kundenId: neukundenPushBestaetigung.kundenId,
    eskalationsstufe: neukundenPushBestaetigung.eskalationsstufe,
    createdAt: neukundenPushBestaetigung.createdAt,
  })
    .from(neukundenPushBestaetigung)
    .where(and(
      eq(neukundenPushBestaetigung.mitarbeiterId, mitarbeiterId),
      sql`${neukundenPushBestaetigung.bestaetigtAt} IS NULL`
    ))
    .orderBy(desc(neukundenPushBestaetigung.createdAt));
}

/** Bestätigt einen Neukunden-Push-Eintrag */
export async function bestaetigeNeukundenPush(id: number, mitarbeiterId: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(neukundenPushBestaetigung)
    .set({ bestaetigtAt: new Date() })
    .where(and(
      eq(neukundenPushBestaetigung.id, id),
      eq(neukundenPushBestaetigung.mitarbeiterId, mitarbeiterId)
    ));
}

/** Gibt alle unbestätigten Einträge zurück (für Admin-Eskalations-Übersicht) */
export async function getAlleOffenenNeukundenPush() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(neukundenPushBestaetigung)
    .where(sql`${neukundenPushBestaetigung.bestaetigtAt} IS NULL`)
    .orderBy(desc(neukundenPushBestaetigung.createdAt));
}

// ── P2: DSGVO-VERTRETUNGS-ÜBERNAHMEN ─────────────────────────────────────────

/** Erstellt eine Vertretungs-Übernahme (Mitarbeiter übernimmt Kunden während Urlaub) */
export async function createVertretungsUebernahme(data: {
  urlaubsantragId: number;
  kundenId: number;
  vertreterId: number;
  vollzugriffBis: Date;
}) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.insert(vertretungsUebernahmen).values(data);
}

/** Prüft ob ein Mitarbeiter Vollzugriff auf einen Kunden hat (via Vertretung) */
export async function hatVertretungsVollzugriff(vertreterId: number, kundenId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const jetzt = new Date();
  const rows = await db.select({ id: vertretungsUebernahmen.id })
    .from(vertretungsUebernahmen)
    .where(and(
      eq(vertretungsUebernahmen.vertreterId, vertreterId),
      eq(vertretungsUebernahmen.kundenId, kundenId),
      sql`${vertretungsUebernahmen.vollzugriffBis} > ${jetzt}`
    ))
    .limit(1);
  return rows.length > 0;
}

/** Gibt alle aktiven Vertretungs-Übernahmen eines Mitarbeiters zurück */
export async function getAktiveVertretungenFuerMitarbeiter(vertreterId: number) {
  const db = await getDb();
  if (!db) return [];
  const jetzt = new Date();
  return db.select().from(vertretungsUebernahmen)
    .where(and(
      eq(vertretungsUebernahmen.vertreterId, vertreterId),
      sql`${vertretungsUebernahmen.vollzugriffBis} > ${jetzt}`
    ));
}

/** Gibt alle Kunden zurück, die während eines Urlaubs vertreten werden müssen (DSGVO-Mindestdaten) */
export async function getVertretungsKundenFuerUrlaub(urlaubsantragId: number) {
  const db = await getDb();
  if (!db) return [];
  // Kunden des Mitarbeiters laden (nur Mindestdaten für DSGVO-Push)
  const urlaubRows = await db.select().from(urlaubsantraege).where(eq(urlaubsantraege.id, urlaubsantragId)).limit(1);
  if (!urlaubRows[0]) return [];
  const urlaub = urlaubRows[0];
  const zuordnungen = await db.select({ kundenId: kundenZuordnung.kundenId })
    .from(kundenZuordnung)
    .where(eq(kundenZuordnung.mitarbeiterId, urlaub.mitarbeiterId));
  if (zuordnungen.length === 0) return [];
  const ids = zuordnungen.map(z => z.kundenId);
  // Nur Mindestdaten zurückgeben (DSGVO-konform)
  return db.select({
    id: kunden.id,
    vorname: kunden.vorname,
    nachname: kunden.nachname,
    geburtsdatum: kunden.geburtsdatum,
    strasse: kunden.strasse,
    plz: kunden.plz,
    ort: kunden.ort,
    pflegegrad: kunden.pflegegrad,
  }).from(kunden).where(sql`${kunden.id} IN (${ids.join(",")})`);
}

// ── P3: MINDESTZEIT-ESKALATION ────────────────────────────────────────────────

/** Zählt wie oft ein Mitarbeiter die Mindestbetreuungszeit unterschritten hat (letzte 30 Tage) */
export async function getUnterschreitungsZaehler(mitarbeiterId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const vor30Tagen = new Date();
  vor30Tagen.setDate(vor30Tagen.getDate() - 30);
  const rows = await db.select({ id: einsaetze.id })
    .from(einsaetze)
    .where(and(
      eq(einsaetze.mitarbeiterId, mitarbeiterId),
      eq(einsaetze.unterschreitungEskaliert, true),
      gte(einsaetze.datum, vor30Tagen)
    ));
  return rows.length;
}

// ── P1: NEUKUNDEN-PUSH ESKALATION ─────────────────────────────────────────────

/** Gibt alle unbestätigten Einträge zurück, die älter als `minAgeMs` Millisekunden sind */
export async function getStaleNeukundenPush(minAgeMs: number) {
  const db = await getDb();
  if (!db) return [];
  const grenze = new Date(Date.now() - minAgeMs);
  return db.select().from(neukundenPushBestaetigung)
    .where(and(
      sql`${neukundenPushBestaetigung.bestaetigtAt} IS NULL`,
      sql`${neukundenPushBestaetigung.createdAt} < ${grenze}`
    ));
}

/** Erhöht die Eskalationsstufe eines Neukunden-Push-Eintrags */
export async function eskaliereNeukundenPush(id: number, stufe: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(neukundenPushBestaetigung)
    .set({ eskalationsstufe: stufe })
    .where(eq(neukundenPushBestaetigung.id, id));
}

// ── P2: VERTRETUNGS-BEREINIGUNG ───────────────────────────────────────────────

/** Gibt alle abgelaufenen Vertretungs-Übernahmen zurück (vollzugriffBis < jetzt) */
export async function getAbgelaufeneVertretungen() {
  const db = await getDb();
  if (!db) return [];
  const jetzt = new Date();
  return db.select().from(vertretungsUebernahmen)
    .where(sql`${vertretungsUebernahmen.vollzugriffBis} < ${jetzt}`);
}

/** Deaktiviert eine Vertretungs-Übernahme (setzt vollzugriffBis auf jetzt) */
export async function deaktiviereVertretung(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(vertretungsUebernahmen)
    .set({ vollzugriffBis: new Date() })
    .where(eq(vertretungsUebernahmen.id, id));
}
