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
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Mitarbeiter = typeof mitarbeiter.$inferSelect;
export type InsertMitarbeiter = typeof mitarbeiter.$inferInsert;

// Kunden (Pflegebedürftige)
export const kunden = mysqlTable("kunden", {
  id: int("id").autoincrement().primaryKey(),
  vorname: varchar("vorname", { length: 100 }).notNull(),
  nachname: varchar("nachname", { length: 100 }).notNull(),
  adresse: text("adresse"),
  telefon: varchar("telefon", { length: 50 }),
  aktiv: int("aktiv").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Kunde = typeof kunden.$inferSelect;
export type InsertKunde = typeof kunden.$inferInsert;

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
