import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  decimal,
  date,
  time,
  boolean,
} from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// Mitarbeiter (Pflegekräfte)
export const mitarbeiter = mysqlTable("mitarbeiter", {
  id: int("id").autoincrement().primaryKey(),
  vorname: varchar("vorname", { length: 100 }).notNull(),
  nachname: varchar("nachname", { length: 100 }).notNull(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  passwortHash: varchar("passwortHash", { length: 255 }).notNull(),
  rolle: mysqlEnum("rolle", ["mitarbeiter", "admin"]).default("mitarbeiter").notNull(),
  aktiv: int("aktiv").default(1).notNull(),
  // Stammdaten
  telefon: varchar("telefon", { length: 50 }),
  mobil: varchar("mobil", { length: 50 }),
  strasse: varchar("strasse", { length: 200 }),
  plz: varchar("plz", { length: 10 }),
  ort: varchar("ort", { length: 100 }),
  geburtsdatum: date("geburtsdatum"),
  eintrittsdatum: date("eintrittsdatum"),
  // Position & Beschäftigungsart
  position: varchar("position", { length: 100 }),
  beschaeftigungsart: mysqlEnum("beschaeftigungsart", ["minijob", "teilzeit", "vollzeit"]).default("minijob"),
  // Zertifikate & Schulungen
  zertifikatStatus: mysqlEnum("zertifikatStatus", ["erhalten", "angemeldet", "nicht_angemeldet"]).default("nicht_angemeldet"),
  zertifikatDatum: date("zertifikatDatum"),
  zertifikatAblauf: date("zertifikatAblauf"),
  zertifikatBemerkung: text("zertifikatBemerkung"),
  // Arbeitsvertrag
  arbeitsvertragUrl: text("arbeitsvertragUrl"),
  arbeitsvertragDatum: date("arbeitsvertragDatum"),
  arbeitsvertragDateiname: varchar("arbeitsvertragDateiname", { length: 255 }),
  // Notizen
  notizen: text("notizen"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Mitarbeiter = typeof mitarbeiter.$inferSelect;
export type InsertMitarbeiter = typeof mitarbeiter.$inferInsert;

// ── MODUL 1: KOSTENTRÄGER-SYSTEM ─────────────────────────────────
export const kostentraeger = mysqlTable("kostentraeger", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  ikNummer: varchar("ikNummer", { length: 20 }),
  typ: mysqlEnum("typ", ["pflegekasse", "krankenkasse", "beihilfe", "privat", "sonstige"]).default("pflegekasse").notNull(),
  strasse: varchar("strasse", { length: 200 }),
  plz: varchar("plz", { length: 10 }),
  ort: varchar("ort", { length: 100 }),
  telefon: varchar("telefon", { length: 50 }),
  email: varchar("email", { length: 320 }),
  fax: varchar("fax", { length: 50 }),
  abrechnungsart: mysqlEnum("abrechnungsart", ["dta", "email", "ebrief", "post", "manuell"]).default("email"),
  abrechnungsstelleId: int("abrechnungsstelleId"),
  notizen: text("notizen"),
  aktiv: int("aktiv").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Kostentraeger = typeof kostentraeger.$inferSelect;
export type InsertKostentraeger = typeof kostentraeger.$inferInsert;

// Kunden (Pflegebedürftige) – erweitert mit Kostenträger-Verknüpfung
export const kunden = mysqlTable("kunden", {
  id: int("id").autoincrement().primaryKey(),
  vorname: varchar("vorname", { length: 100 }).notNull(),
  nachname: varchar("nachname", { length: 100 }).notNull(),
  geburtsdatum: date("geburtsdatum"),
  strasse: varchar("strasse", { length: 200 }),
  plz: varchar("plz", { length: 10 }),
  ort: varchar("ort", { length: 100 }),
  telefon: varchar("telefon", { length: 50 }),
  mobil: varchar("mobil", { length: 50 }),
  email: varchar("email", { length: 320 }),
  // Kostenträger-Verknüpfung (Modul 1)
  kostentraegerId: int("kostentraegerId"),
  kostentraeger: varchar("kostentraeger", { length: 200 }), // Freitext-Fallback
  versicherungsnummer: varchar("versicherungsnummer", { length: 50 }),
  // Pflegegrad & Paragraph (Modul 2)
  pflegegrad: int("pflegegrad").default(2),
  paragraph: mysqlEnum("paragraph", ["45b", "45a", "39", "privat"]).default("45b"),
  // Budget §45b SGB XI
  budget45b: decimal("budget45b", { precision: 10, scale: 2 }).default("0"),
  verbraucht45b: decimal("verbraucht45b", { precision: 10, scale: 2 }).default("0"),
  letzteAbrechnung45b: varchar("letzteAbrechnung45b", { length: 10 }),
  // Budget §45a SGB XI
  budget45a: decimal("budget45a", { precision: 10, scale: 2 }).default("0"),
  verbraucht45a: decimal("verbraucht45a", { precision: 10, scale: 2 }).default("0"),
  letzteAbrechnung45a: varchar("letzteAbrechnung45a", { length: 10 }),
  // Budget §39 SGB XI
  budget39: decimal("budget39", { precision: 10, scale: 2 }).default("0"),
  verbraucht39: decimal("verbraucht39", { precision: 10, scale: 2 }).default("0"),
  letzteAbrechnung39: varchar("letzteAbrechnung39", { length: 10 }),
  // Dauervollmacht (Modul 2)
  vollmachtErteilt: boolean("vollmachtErteilt").default(false),
  vollmachtDatum: date("vollmachtDatum"),
  vollmachtSignatur: text("vollmachtSignatur"),
  aktiv: int("aktiv").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Kunde = typeof kunden.$inferSelect;
export type InsertKunde = typeof kunden.$inferInsert;

// Kunden-Zuordnung zu Mitarbeitern (max. 3 Mitarbeiter pro Kunde)
// Relationales Design: Ein Kunde kann bis zu 3 Mitarbeitern manuell zugeordnet werden.
// Die Spalte 'prioritaet' (1–3) bestimmt die Reihenfolge (1 = Hauptbetreuer).
// Die Spalte 'rolle' unterscheidet Haupt- und Vertretungsbetreuer.
// Eindeutiger Composite-Index auf (kundenId, mitarbeiterId) verhindert Doppelzuordnungen.
export const kundenZuordnung = mysqlTable("kundenZuordnung", {
  id: int("id").autoincrement().primaryKey(),
  mitarbeiterId: int("mitarbeiterId").notNull(),
  kundenId: int("kundenId").notNull(),
  // Priorität 1 = Hauptbetreuer, 2 = erster Vertreter, 3 = zweiter Vertreter
  prioritaet: int("prioritaet").default(1).notNull(),
  // Rolle zur semantischen Unterscheidung
  rolle: mysqlEnum("rolle", ["hauptbetreuer", "vertretung"]).default("hauptbetreuer").notNull(),
  // Wer hat diese Zuordnung angelegt (immer Admin)
  zugeordnetVon: int("zugeordnetVon"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type KundenZuordnung = typeof kundenZuordnung.$inferSelect;
export type InsertKundenZuordnung = typeof kundenZuordnung.$inferInsert;

// ── MODUL 3: TEXTBAUSTEINE ────────────────────────────────────────
export const textbausteine = mysqlTable("textbausteine", {
  id: int("id").autoincrement().primaryKey(),
  titel: varchar("titel", { length: 200 }).notNull(),
  inhalt: text("inhalt").notNull(),
  kategorie: mysqlEnum("kategorie", ["bericht", "gesundheit", "aktivitaet", "bemerkung", "sonstiges"]).default("bericht").notNull(),
  paragraph: mysqlEnum("paragraph", ["45b", "45a", "39", "alle"]).default("alle"),
  aktiv: int("aktiv").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Textbaustein = typeof textbausteine.$inferSelect;
export type InsertTextbaustein = typeof textbausteine.$inferInsert;

// Einsätze – erweitert mit Kunden-Unterschrift (Modul 3)
export const einsaetze = mysqlTable("einsaetze", {
  id: int("id").autoincrement().primaryKey(),
  mitarbeiterId: int("mitarbeiterId").notNull(),
  kundenId: int("kundenId").notNull(),
  datum: date("datum").notNull(),
  startzeit: time("startzeit"),
  dauerStunden: decimal("dauerStunden", { precision: 4, scale: 2 }),
  paragraph: mysqlEnum("paragraph", ["45b", "45a", "39"]).default("45b").notNull(),
  status: mysqlEnum("status", ["geplant", "abgeschlossen", "abgesagt"]).default("geplant").notNull(),
  bericht: text("bericht"),
  gesundheit: mysqlEnum("gesundheit", ["gut", "stabil", "auffaellig", "kritisch"]),
  bemerkung: text("bemerkung"),
  // Unterschriften (Modul 3)
  unterschriftMitarbeiter: text("unterschriftMitarbeiter"),
  unterschriftKunde: text("unterschriftKunde"),
  // Textbaustein-Referenz (Modul 3)
  textbausteinIds: text("textbausteinIds"), // JSON-Array der verwendeten Bausteine
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Einsatz = typeof einsaetze.$inferSelect;
export type InsertEinsatz = typeof einsaetze.$inferInsert;

// Leistungsnachweise – erweitert mit Kunden-Unterschrift (Modul 3)
export const leistungen = mysqlTable("leistungen", {
  id: int("id").autoincrement().primaryKey(),
  mitarbeiterId: int("mitarbeiterId").notNull(),
  kundenId: int("kundenId").notNull(),
  monat: varchar("monat", { length: 7 }).notNull(), // YYYY-MM
  paragraph: mysqlEnum("paragraph", ["45b", "45a", "39"]).default("45b").notNull(),
  stunden: decimal("stunden", { precision: 5, scale: 2 }).default("0"),
  anzahlEinsaetze: int("anzahlEinsaetze").default(1),
  betrag: decimal("betrag", { precision: 8, scale: 2 }).default("0"),
  status: mysqlEnum("status", ["offen", "pruefung", "freigegeben", "versendet"]).default("offen").notNull(),
  bemerkung: text("bemerkung"),
  unterschriftLeister: text("unterschriftLeister"),
  unterschriftKunde: text("unterschriftKunde"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Leistung = typeof leistungen.$inferSelect;
export type InsertLeistung = typeof leistungen.$inferInsert;

// ── MODUL 4: FAHRTKOSTEN-ABRECHNUNG ──────────────────────────────
export const fahrten = mysqlTable("fahrten", {
  id: int("id").autoincrement().primaryKey(),
  mitarbeiterId: int("mitarbeiterId").notNull(),
  kundenId: int("kundenId"),
  datum: date("datum").notNull(),
  vonOrt: varchar("vonOrt", { length: 200 }).notNull(),
  nachOrt: varchar("nachOrt", { length: 200 }).notNull(),
  kilometer: decimal("kilometer", { precision: 6, scale: 1 }).notNull(),
  // Automatisch berechnete Felder (Modul 4)
  kilometerHin: decimal("kilometerHin", { precision: 6, scale: 1 }),
  kilometerRueck: decimal("kilometerRueck", { precision: 6, scale: 1 }),
  typ: mysqlEnum("typ", ["normal", "sonder"]).default("normal").notNull(),
  zweck: varchar("zweck", { length: 255 }),
  verguetung: decimal("verguetung", { precision: 7, scale: 2 }).default("0"),
  // Abrechnungsstatus (Modul 4)
  abrechnungsStatus: mysqlEnum("abrechnungsStatus", ["offen", "eingereicht", "erstattet"]).default("offen"),
  monat: varchar("monat", { length: 7 }), // YYYY-MM für Monatsabrechnung
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Fahrt = typeof fahrten.$inferSelect;
export type InsertFahrt = typeof fahrten.$inferInsert;

// ── MODUL 5: E-BRIEF LOG ──────────────────────────────────────────
export const ebriefLog = mysqlTable("ebriefLog", {
  id: int("id").autoincrement().primaryKey(),
  mitarbeiterId: int("mitarbeiterId").notNull(),
  kundenId: int("kundenId"),
  kostentraegerId: int("kostentraegerId"),
  betreff: varchar("betreff", { length: 300 }).notNull(),
  inhalt: text("inhalt"),
  empfaenger: varchar("empfaenger", { length: 320 }).notNull(),
  typ: mysqlEnum("typ", ["leistungsnachweis", "protokoll", "kostenvoranschlag", "sonstiges"]).default("sonstiges").notNull(),
  versandart: mysqlEnum("versandart", ["email", "ebrief", "post"]).default("email").notNull(),
  status: mysqlEnum("status", ["entwurf", "versendet", "fehler"]).default("entwurf").notNull(),
  referenzId: int("referenzId"), // ID des Leistungsnachweises / Einsatzes
  referenzTyp: varchar("referenzTyp", { length: 50 }), // "leistung" | "einsatz"
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type EbriefLog = typeof ebriefLog.$inferSelect;
export type InsertEbriefLog = typeof ebriefLog.$inferInsert;

// Audit-Log
export const auditLogs = mysqlTable("auditLogs", {
  id: int("id").autoincrement().primaryKey(),
  mitarbeiterId: int("mitarbeiterId"),
  action: varchar("action", { length: 50 }).notNull(),
  ressource: varchar("ressource", { length: 100 }),
  details: text("details"),
  status: mysqlEnum("status", ["success", "failure", "partial"]).default("success").notNull(),
  ipAddress: varchar("ipAddress", { length: 45 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = typeof auditLogs.$inferInsert;

// Monatsabschlüsse
export const monatsabschluesse = mysqlTable("monatsabschluesse", {
  id: int("id").autoincrement().primaryKey(),
  monat: varchar("monat", { length: 7 }).notNull(),
  adminId: int("adminId").notNull(),
  gesamtStunden: decimal("gesamtStunden", { precision: 7, scale: 2 }).default("0"),
  gesamtEinsaetze: int("gesamtEinsaetze").default(0),
  gesamtKm: decimal("gesamtKm", { precision: 8, scale: 1 }).default("0"),
  gesamtVerguetung: decimal("gesamtVerguetung", { precision: 10, scale: 2 }).default("0"),
  csvExport: text("csvExport"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Monatsabschluss = typeof monatsabschluesse.$inferSelect;

// Passwort-Reset-Tokens
export const passwordResets = mysqlTable("passwordResets", {
  id: int("id").autoincrement().primaryKey(),
  mitarbeiterId: int("mitarbeiterId").notNull(),
  token: varchar("token", { length: 128 }).notNull().unique(),
  expiresAt: timestamp("expiresAt").notNull(),
  used: boolean("used").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PasswordReset = typeof passwordResets.$inferSelect;
export type InsertPasswordReset = typeof passwordResets.$inferInsert;



// Push-Benachrichtigungen – Web Push Subscriptions
export const pushSubscriptions = mysqlTable("pushSubscriptions", {
  id: int("id").autoincrement().primaryKey(),
  mitarbeiterId: int("mitarbeiterId").notNull(),
  endpoint: text("endpoint").notNull(),
  p256dh: text("p256dh").notNull(),
  auth: varchar("auth", { length: 256 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type PushSubscription = typeof pushSubscriptions.$inferSelect;
export type InsertPushSubscription = typeof pushSubscriptions.$inferInsert;

// ── MODUL 15: URLAUBSVERWALTUNG ───────────────────────────────────
export const urlaubsantraege = mysqlTable("urlaubsantraege", {
  id: int("id").autoincrement().primaryKey(),
  mitarbeiterId: int("mitarbeiterId").notNull(),
  von: date("von").notNull(),
  bis: date("bis").notNull(),
  tage: int("tage").notNull(),
  notizen: text("notizen"),
  status: mysqlEnum("status", ["beantragt", "genehmigt", "abgelehnt"]).default("beantragt").notNull(),
  adminNotiz: text("adminNotiz"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type Urlaubsantrag = typeof urlaubsantraege.$inferSelect;
export type InsertUrlaubsantrag = typeof urlaubsantraege.$inferInsert;

// ── MODUL 15: KRANKMELDUNGEN ──────────────────────────────────────
export const krankmeldungen = mysqlTable("krankmeldungen", {
  id: int("id").autoincrement().primaryKey(),
  mitarbeiterId: int("mitarbeiterId").notNull(),
  von: date("von").notNull(),
  bis: date("bis"),
  tage: int("tage"),
  notizen: text("notizen"),
  auAttest: boolean("auAttest").default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type Krankmeldung = typeof krankmeldungen.$inferSelect;
export type InsertKrankmeldung = typeof krankmeldungen.$inferInsert;

// ── MODUL 15: TOURENPLANUNG ───────────────────────────────────────
// Touren – Vorausplanung bis 14 Tage (2 Wochen) in die Zukunft
// Das Feld 'planungsHorizont' dokumentiert den erlaubten Vorlauf in Tagen.
// Die Validierung im Backend (tourenRouter.create) prüft, dass das Datum
// maximal 14 Tage in der Zukunft liegt.
export const touren = mysqlTable("touren", {
  id: int("id").autoincrement().primaryKey(),
  mitarbeiterId: int("mitarbeiterId").notNull(),
  datum: date("datum").notNull(),
  status: mysqlEnum("status", ["geplant", "aktiv", "abgeschlossen"]).default("geplant").notNull(),
  notizen: text("notizen"),
  // Titel/Bezeichnung der Tour (optional, für Übersicht)
  titel: varchar("titel", { length: 200 }),
  // Geplante Startzeit
  startzeit: time("startzeit"),
  // Geplante Endzeit
  endzeit: time("endzeit"),
  // Wer hat die Tour angelegt
  angelegtVon: int("angelegtVon"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type Tour = typeof touren.$inferSelect;
export type InsertTour = typeof touren.$inferInsert;

export const tourEinsaetze = mysqlTable("tourEinsaetze", {
  id: int("id").autoincrement().primaryKey(),
  tourId: int("tourId").notNull(),
  einsatzId: int("einsatzId").notNull(),
  reihenfolge: int("reihenfolge").default(0).notNull(),
});
export type TourEinsatz = typeof tourEinsaetze.$inferSelect;

// ── MODUL 15: IN-APP-BENACHRICHTIGUNGEN ───────────────────────────
export const notifications = mysqlTable("notifications", {
  id: int("id").autoincrement().primaryKey(),
  empfaengerId: int("empfaengerId").notNull(), // mitarbeiterId
  titel: varchar("titel", { length: 200 }).notNull(),
  nachricht: text("nachricht").notNull(),
  typ: mysqlEnum("typ", ["info", "warnung", "erfolg", "fehler"]).default("info").notNull(),
  gelesen: boolean("gelesen").default(false).notNull(),
  linkUrl: varchar("linkUrl", { length: 500 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;

// ── MODUL 15: REFRESH TOKENS ──────────────────────────────────────
export const refreshTokens = mysqlTable("refreshTokens", {
  id: int("id").autoincrement().primaryKey(),
  mitarbeiterId: int("mitarbeiterId").notNull(),
  token: varchar("token", { length: 128 }).notNull().unique(),
  expiresAt: timestamp("expiresAt").notNull(),
  used: boolean("used").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type RefreshToken = typeof refreshTokens.$inferSelect;
export type InsertRefreshToken = typeof refreshTokens.$inferInsert;

// ── MODUL 16: MITARBEITER-DOKUMENTE ──────────────────────────────
export const mitarbeiterDokumente = mysqlTable("mitarbeiterDokumente", {
  id: int("id").autoincrement().primaryKey(),
  mitarbeiterId: int("mitarbeiterId").notNull(),
  typ: mysqlEnum("typ", ["zertifikat", "arbeitsvertrag", "krankmeldung", "fuehrerschein", "erstehilfe", "sonstiges"]).notNull(),
  bezeichnung: varchar("bezeichnung", { length: 255 }).notNull(),
  dateiUrl: text("dateiUrl"),
  dateiname: varchar("dateiname", { length: 255 }),
  ausstellungsdatum: date("ausstellungsdatum"),
  ablaufdatum: date("ablaufdatum"),
  notizen: text("notizen"),
  hochgeladenVon: int("hochgeladenVon"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type MitarbeiterDokument = typeof mitarbeiterDokumente.$inferSelect;
export type InsertMitarbeiterDokument = typeof mitarbeiterDokumente.$inferInsert;

// ── MODUL 16: VERTRETUNGSZUGANG ───────────────────────────────────
export const vertretungen = mysqlTable("vertretungen", {
  id: int("id").autoincrement().primaryKey(),
  vertreterId: int("vertreterId").notNull(),
  vertretenId: int("vertretenId").notNull(),
  von: date("von").notNull(),
  bis: date("bis").notNull(),
  grund: varchar("grund", { length: 255 }),
  freigegebenVon: int("freigegebenVon"),
  aktiv: boolean("aktiv").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type Vertretung = typeof vertretungen.$inferSelect;
export type InsertVertretung = typeof vertretungen.$inferInsert;

// ── MODUL: BUDGET-TRANSAKTIONEN (Historien-Ansicht) ──────────────────────────
export const budgetTransaktionen = mysqlTable("budgetTransaktionen", {
  id: int("id").autoincrement().primaryKey(),
  kundenId: int("kundenId").notNull(),
  leistungId: int("leistungId"),               // Verknüpfung zum Leistungsnachweis (null bei manuellen Korrekturen)
  mitarbeiterId: int("mitarbeiterId"),          // Wer hat die Leistung erbracht
  typ: mysqlEnum("typ", ["abbuchung", "rueckerstattung", "korrektur"]).notNull(),
  paragraph: mysqlEnum("paragraph", ["45b", "45a", "39"]).notNull(),
  betrag: decimal("betrag", { precision: 10, scale: 2 }).notNull(),   // immer positiv, typ bestimmt Richtung
  stunden: decimal("stunden", { precision: 5, scale: 2 }),
  monat: varchar("monat", { length: 7 }),       // YYYY-MM des Leistungsmonats
  beschreibung: varchar("beschreibung", { length: 500 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type BudgetTransaktion = typeof budgetTransaktionen.$inferSelect;
export type InsertBudgetTransaktion = typeof budgetTransaktionen.$inferInsert;
