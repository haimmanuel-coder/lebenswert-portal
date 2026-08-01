/**
 * ════════════════════════════════════════════════════════════════════════════
 *  ENSURE TABLES – Zentrales Migrations-Absicherungs-Skript
 *  Wird beim Server-Start aufgerufen und erstellt alle Tabellen per
 *  CREATE TABLE IF NOT EXISTS, falls sie in der DB fehlen.
 *  Schützt vor Datenverlust durch DB-Neustarts oder verlorene Migrationen.
 * ════════════════════════════════════════════════════════════════════════════
 */
import { getDb } from "./db";
import { sql } from "drizzle-orm";

const TABLE_DEFINITIONS: string[] = [
  // ── Kern-Tabellen ──────────────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS \`users\` (
    \`id\` int NOT NULL AUTO_INCREMENT,
    \`openId\` varchar(255) NOT NULL,
    \`name\` varchar(255),
    \`email\` varchar(255),
    \`role\` enum('admin','user') NOT NULL DEFAULT 'user',
    \`loginMethod\` varchar(50),
    \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (\`id\`),
    UNIQUE KEY \`openId\` (\`openId\`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS \`mitarbeiter\` (
    \`id\` int NOT NULL AUTO_INCREMENT,
    \`vorname\` varchar(100) NOT NULL,
    \`nachname\` varchar(100) NOT NULL,
    \`email\` varchar(255) NOT NULL,
    \`passwortHash\` varchar(255),
    \`rolle\` enum('mitarbeiter','teamleitung','buchhaltung','admin') NOT NULL DEFAULT 'mitarbeiter',
    \`aktiv\` tinyint(1) NOT NULL DEFAULT 1,
    \`telefon\` varchar(50),
    \`mobil\` varchar(50),
    \`strasse\` varchar(200),
    \`plz\` varchar(10),
    \`ort\` varchar(100),
    \`beschaeftigungsart\` enum('minijob','teilzeit','vollzeit') DEFAULT 'minijob',
    \`position\` varchar(100),
    \`eintrittsdatum\` date,
    \`zertifikatStatus\` enum('erhalten','angemeldet','nicht_angemeldet') DEFAULT 'nicht_angemeldet',
    \`arbeitsvertragUrl\` varchar(500),
    \`arbeitsvertragDatum\` date,
    \`berechtigungen\` text,
    \`geloeschtAt\` timestamp NULL,
    \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (\`id\`),
    UNIQUE KEY \`email\` (\`email\`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS \`kunden\` (
    \`id\` int NOT NULL AUTO_INCREMENT,
    \`vorname\` varchar(100) NOT NULL,
    \`nachname\` varchar(100) NOT NULL,
    \`strasse\` varchar(200),
    \`plz\` varchar(10),
    \`ort\` varchar(100),
    \`telefon\` varchar(50),
    \`mobil\` varchar(50),
    \`geburtsdatum\` date,
    \`pflegegrad\` int DEFAULT 0,
    \`paragraph\` varchar(10),
    \`versicherungsnummer\` varchar(50),
    \`kostentraegerId\` int,
    \`budget45b\` decimal(10,2) DEFAULT 0,
    \`budget45a\` decimal(10,2) DEFAULT 0,
    \`budget39\` decimal(10,2) DEFAULT 0,
    \`verbraucht45b\` decimal(10,2) DEFAULT 0,
    \`verbraucht45a\` decimal(10,2) DEFAULT 0,
    \`verbraucht39\` decimal(10,2) DEFAULT 0,
    \`letzteAbrechnung45b\` date,
    \`letzteAbrechnung45a\` date,
    \`letzteAbrechnung39\` date,
    \`umwidmungAktiv\` tinyint(1) DEFAULT 0,
    \`umwidmungBudgetMax\` decimal(10,2) DEFAULT 0,
    \`umwidmungVerbraucht\` decimal(10,2) DEFAULT 0,
    \`aktiv\` tinyint(1) NOT NULL DEFAULT 1,
    \`geloeschtAt\` timestamp NULL,
    \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (\`id\`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS \`einsaetze\` (
    \`id\` int NOT NULL AUTO_INCREMENT,
    \`mitarbeiterId\` int NOT NULL,
    \`kundenId\` int NOT NULL,
    \`datum\` date NOT NULL,
    \`startzeit\` varchar(10),
    \`endzeit\` varchar(10),
    \`dauerStunden\` decimal(4,2) DEFAULT 0,
    \`paragraph\` varchar(10),
    \`paragraph2\` varchar(10),
    \`stunden2\` decimal(4,2) DEFAULT 0,
    \`lohnkosten\` decimal(10,2) DEFAULT 0,
    \`notizen\` text,
    \`status\` enum('geplant','unterwegs','abgeschlossen','verpasst') NOT NULL DEFAULT 'geplant',
    \`anfahrtPauschale\` tinyint(1) DEFAULT 0,
    \`unterschriftFreigabeStatus\` enum('ausstehend','freigegeben','abgelehnt') DEFAULT 'ausstehend',
    \`geloeschtAt\` timestamp NULL,
    \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (\`id\`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS \`notifications\` (
    \`id\` int NOT NULL AUTO_INCREMENT,
    \`empfaengerId\` int NOT NULL,
    \`titel\` varchar(200) NOT NULL,
    \`nachricht\` text NOT NULL,
    \`typ\` enum('info','warnung','erfolg','fehler') NOT NULL DEFAULT 'info',
    \`gelesen\` tinyint(1) NOT NULL DEFAULT 0,
    \`linkUrl\` varchar(500),
    \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (\`id\`),
    KEY \`idx_notifications_empfaenger\` (\`empfaengerId\`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS \`datenschutzDokumente\` (
    \`id\` int NOT NULL AUTO_INCREMENT,
    \`typ\` varchar(100) NOT NULL DEFAULT 'datenschutzerklaerung',
    \`titel\` varchar(255) NOT NULL,
    \`version\` varchar(50) NOT NULL DEFAULT '1.0',
    \`inhalt\` text NOT NULL,
    \`dateiUrl\` varchar(500),
    \`aktiv\` tinyint(1) NOT NULL DEFAULT 1,
    \`gueltigAb\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (\`id\`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS \`datenschutzZustimmungen\` (
    \`id\` int NOT NULL AUTO_INCREMENT,
    \`mitarbeiterId\` int NOT NULL,
    \`dokumentId\` int NOT NULL,
    \`typ\` varchar(100) NOT NULL,
    \`zugestimmtAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    \`ipAdresse\` varchar(50),
    \`widerrufenAt\` timestamp NULL,
    PRIMARY KEY (\`id\`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS \`auditLogs\` (
    \`id\` int NOT NULL AUTO_INCREMENT,
    \`mitarbeiterId\` int,
    \`action\` varchar(100) NOT NULL,
    \`ressource\` varchar(100),
    \`details\` text,
    \`status\` enum('success','error','warning') DEFAULT 'success',
    \`ipAdresse\` varchar(50),
    \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (\`id\`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // ── Fahrtennachweise ───────────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS \`fahrtenAbrechnungen\` (
    \`id\` int NOT NULL AUTO_INCREMENT,
    \`zeitraumVon\` date NOT NULL,
    \`zeitraumBis\` date NOT NULL,
    \`label\` varchar(100) NOT NULL,
    \`status\` enum('offen','freigegeben','versendet') NOT NULL DEFAULT 'offen',
    \`anzahlFahrten\` int DEFAULT 0,
    \`gesamtKm\` decimal(10,2) DEFAULT 0,
    \`gesamtEuro\` decimal(10,2) DEFAULT 0,
    \`freigegebenVon\` int,
    \`freigegebenAt\` timestamp NULL,
    \`versendetAt\` timestamp NULL,
    \`empfaengerEmail\` varchar(255),
    \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (\`id\`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // ── System-Einstellungen ───────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS \`systemEinstellungen\` (
    \`id\` int NOT NULL AUTO_INCREMENT,
    \`schluessel\` varchar(100) NOT NULL,
    \`wert\` text,
    \`beschreibung\` varchar(255),
    \`updatedAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (\`id\`),
    UNIQUE KEY \`schluessel\` (\`schluessel\`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // ── Privatrechnung-Modul ───────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS \`sonderfahrten\` (
    \`id\` int NOT NULL AUTO_INCREMENT,
    \`einsatzId\` int,
    \`mitarbeiterId\` int NOT NULL,
    \`kundenId\` int NOT NULL,
    \`datum\` date NOT NULL,
    \`startAdresse\` varchar(255),
    \`zielAdresse\` varchar(255),
    \`kilometer\` decimal(8,2) DEFAULT 0,
    \`beschreibung\` text,
    \`monat\` varchar(7) NOT NULL,
    \`abgerechnet\` tinyint(1) DEFAULT 0,
    \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (\`id\`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS \`rechnungspositionen\` (
    \`id\` int NOT NULL AUTO_INCREMENT,
    \`kundenId\` int NOT NULL,
    \`mitarbeiterId\` int,
    \`einsatzId\` int,
    \`monat\` varchar(7) NOT NULL,
    \`kategorie\` varchar(100),
    \`beschreibung\` text,
    \`menge\` decimal(8,2) DEFAULT 1,
    \`einzelpreis\` decimal(10,2) DEFAULT 0,
    \`bemerkung\` text,
    \`abgerechnet\` tinyint(1) DEFAULT 0,
    \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (\`id\`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS \`privatrechnungen\` (
    \`id\` int NOT NULL AUTO_INCREMENT,
    \`rechnungsnummer\` varchar(50) NOT NULL,
    \`kundenId\` int NOT NULL,
    \`monat\` varchar(7) NOT NULL,
    \`gesamtbetrag\` decimal(10,2) DEFAULT 0,
    \`status\` enum('entwurf','versendet','bezahlt','storniert') NOT NULL DEFAULT 'entwurf',
    \`erstelltVon\` int,
    \`pdfUrl\` varchar(500),
    \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (\`id\`),
    UNIQUE KEY \`rechnungsnummer\` (\`rechnungsnummer\`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // ── Import-Modul ───────────────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS \`importprotokolle\` (
    \`id\` int NOT NULL AUTO_INCREMENT,
    \`dateiname\` varchar(255),
    \`importiertVon\` int,
    \`anzahlNeu\` int DEFAULT 0,
    \`anzahlAktualisiert\` int DEFAULT 0,
    \`anzahlFehler\` int DEFAULT 0,
    \`fehlerDetails\` text,
    \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (\`id\`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS \`aenderungsprotokoll\` (
    \`id\` int NOT NULL AUTO_INCREMENT,
    \`tabelle\` varchar(100) NOT NULL,
    \`datensatzId\` int,
    \`feld\` varchar(100),
    \`alterWert\` text,
    \`neuerWert\` text,
    \`geaendertVon\` int,
    \`importquelle\` varchar(100),
    \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (\`id\`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // ── Weitere Kern-Tabellen ──────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS \`fahrten\` (
    \`id\` int NOT NULL AUTO_INCREMENT,
    \`mitarbeiterId\` int NOT NULL,
    \`kundenId\` int,
    \`datum\` date NOT NULL,
    \`typ\` varchar(50),
    \`vonAdresse\` varchar(255),
    \`nachAdresse\` varchar(255),
    \`kilometer\` decimal(8,2) DEFAULT 0,
    \`zweck\` text,
    \`verguetung\` decimal(10,2) DEFAULT 0,
    \`geloeschtAt\` timestamp NULL,
    \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (\`id\`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS \`leistungen\` (
    \`id\` int NOT NULL AUTO_INCREMENT,
    \`mitarbeiterId\` int NOT NULL,
    \`kundenId\` int NOT NULL,
    \`einsatzId\` int,
    \`monat\` varchar(7) NOT NULL,
    \`paragraph\` varchar(10),
    \`stunden\` decimal(8,2) DEFAULT 0,
    \`anzahl\` int DEFAULT 1,
    \`betrag\` decimal(10,2) DEFAULT 0,
    \`status\` enum('entwurf','eingereicht','freigegeben','abgelehnt') NOT NULL DEFAULT 'entwurf',
    \`unterschriftMitarbeiter\` text,
    \`unterschriftKunde\` text,
    \`pdfUrl\` varchar(500),
    \`geloeschtAt\` timestamp NULL,
    \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (\`id\`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS \`urlaubsantraege\` (
    \`id\` int NOT NULL AUTO_INCREMENT,
    \`mitarbeiterId\` int NOT NULL,
    \`von\` date NOT NULL,
    \`bis\` date NOT NULL,
    \`tage\` int DEFAULT 1,
    \`status\` enum('beantragt','genehmigt','abgelehnt','storniert') NOT NULL DEFAULT 'beantragt',
    \`notizen\` text,
    \`geloeschtAt\` timestamp NULL,
    \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (\`id\`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS \`krankmeldungen\` (
    \`id\` int NOT NULL AUTO_INCREMENT,
    \`mitarbeiterId\` int NOT NULL,
    \`von\` date NOT NULL,
    \`bis\` date,
    \`tage\` int DEFAULT 1,
    \`notizen\` text,
    \`auAttest\` tinyint(1) DEFAULT 0,
    \`geloeschtAt\` timestamp NULL,
    \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (\`id\`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS \`refreshTokens\` (
    \`id\` int NOT NULL AUTO_INCREMENT,
    \`mitarbeiterId\` int NOT NULL,
    \`token\` varchar(500) NOT NULL,
    \`expiresAt\` timestamp NOT NULL,
    \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (\`id\`),
    UNIQUE KEY \`token\` (\`token\`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS \`besuchsberichte\` (
    \`id\` int NOT NULL AUTO_INCREMENT,
    \`einsatzId\` int NOT NULL,
    \`mitarbeiterId\` int NOT NULL,
    \`kundenId\` int NOT NULL,
    \`datum\` date NOT NULL,
    \`inhalt\` text,
    \`gesundheitsstatus\` varchar(50),
    \`fotoUrl\` varchar(500),
    \`unterschriftMitarbeiter\` text,
    \`unterschriftKunde\` text,
    \`status\` enum('entwurf','eingereicht','freigegeben') NOT NULL DEFAULT 'entwurf',
    \`pdfUrl\` varchar(500),
    \`geloeschtAt\` timestamp NULL,
    \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (\`id\`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS \`jahresbudgets\` (
    \`id\` int NOT NULL AUTO_INCREMENT,
    \`kundenId\` int NOT NULL,
    \`jahr\` int NOT NULL,
    \`budget45b\` decimal(10,2) DEFAULT 0,
    \`budget45a\` decimal(10,2) DEFAULT 0,
    \`budget39\` decimal(10,2) DEFAULT 0,
    \`notizen\` text,
    \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (\`id\`),
    UNIQUE KEY \`kundenId_jahr\` (\`kundenId\`, \`jahr\`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
];

let ensureTablesRan = false;

/**
 * Führt alle CREATE TABLE IF NOT EXISTS Statements aus.
 * Wird beim Server-Start einmalig aufgerufen.
 */
export async function ensureTables(): Promise<void> {
  if (ensureTablesRan) return;
  ensureTablesRan = true;

  const db = await getDb();
  if (!db) {
    console.warn("[ensureTables] Datenbank nicht verfügbar – überspringe Migration");
    return;
  }

  console.log("[ensureTables] Starte Tabellen-Absicherung...");
  let ok = 0;
  let failed = 0;

  for (const ddl of TABLE_DEFINITIONS) {
    try {
      await db.execute(sql.raw(ddl));
      ok++;
    } catch (err: any) {
      // Ignoriere "already exists" Fehler, logge echte Fehler
      if (!String(err?.message ?? "").includes("already exists")) {
        console.error(`[ensureTables] Fehler bei Migration:`, err?.message ?? err);
        failed++;
      } else {
        ok++;
      }
    }
  }

  console.log(`[ensureTables] Abgeschlossen: ${ok} OK, ${failed} Fehler`);
}
