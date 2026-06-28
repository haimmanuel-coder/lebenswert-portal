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

// Kunden (Pflegebedürftige)
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
  kostentraeger: varchar("kostentraeger", { length: 200 }),
  versicherungsnummer: varchar("versicherungsnummer", { length: 50 }),
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
  aktiv: int("aktiv").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Kunde = typeof kunden.$inferSelect;
export type InsertKunde = typeof kunden.$inferInsert;

// Kunden-Zuordnung zu Mitarbeitern
export const kundenZuordnung = mysqlTable("kundenZuordnung", {
  id: int("id").autoincrement().primaryKey(),
  mitarbeiterId: int("mitarbeiterId").notNull(),
  kundenId: int("kundenId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type KundenZuordnung = typeof kundenZuordnung.$inferSelect;

// Einsätze
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
  unterschriftMitarbeiter: text("unterschriftMitarbeiter"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Einsatz = typeof einsaetze.$inferSelect;
export type InsertEinsatz = typeof einsaetze.$inferInsert;

// Leistungsnachweise
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
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Leistung = typeof leistungen.$inferSelect;
export type InsertLeistung = typeof leistungen.$inferInsert;

// Fahrtenbuch
export const fahrten = mysqlTable("fahrten", {
  id: int("id").autoincrement().primaryKey(),
  mitarbeiterId: int("mitarbeiterId").notNull(),
  kundenId: int("kundenId"),
  datum: date("datum").notNull(),
  vonOrt: varchar("vonOrt", { length: 200 }).notNull(),
  nachOrt: varchar("nachOrt", { length: 200 }).notNull(),
  kilometer: decimal("kilometer", { precision: 6, scale: 1 }).notNull(),
  typ: mysqlEnum("typ", ["normal", "sonder"]).default("normal").notNull(),
  zweck: varchar("zweck", { length: 255 }),
  verguetung: decimal("verguetung", { precision: 7, scale: 2 }).default("0"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Fahrt = typeof fahrten.$inferSelect;
export type InsertFahrt = typeof fahrten.$inferInsert;

// Audit-Log
export const auditLogs = mysqlTable("auditLogs", {
  id: int("id").autoincrement().primaryKey(),
  mitarbeiterId: int("mitarbeiterId"),
  action: varchar("action", { length: 50 }).notNull(), // LOGIN, LOGOUT, CREATE, UPDATE, DELETE, EXPORT, ADMIN
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
  monat: varchar("monat", { length: 7 }).notNull(), // YYYY-MM
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
