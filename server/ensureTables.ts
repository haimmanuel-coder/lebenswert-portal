/**
 * ════════════════════════════════════════════════════════════════════════════
 *  ENSURE TABLES – Zentrales Migrations-Absicherungs-Skript
 *  Wird beim Server-Start aufgerufen und erstellt alle 53 Tabellen per
 *  CREATE TABLE IF NOT EXISTS, falls sie in der DB fehlen.
 *  Schützt vor Datenverlust durch DB-Neustarts oder verlorene Migrationen.
 * ════════════════════════════════════════════════════════════════════════════
 */
import { getDb } from "./db";
import { sql } from "drizzle-orm";

const TABLE_DEFINITIONS: string[] = [
  // ── 1. users ──────────────────────────────────────────────────────────────
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

  // ── 2. mitarbeiter ────────────────────────────────────────────────────────
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
    \`geloeschtVon\` int,
    \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (\`id\`),
    UNIQUE KEY \`email\` (\`email\`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // ── 3. kostentraeger ──────────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS \`kostentraeger\` (
    \`id\` int NOT NULL AUTO_INCREMENT,
    \`name\` varchar(255) NOT NULL,
    \`kuerzel\` varchar(20),
    \`typ\` varchar(50),
    \`strasse\` varchar(200),
    \`plz\` varchar(10),
    \`ort\` varchar(100),
    \`email\` varchar(255),
    \`telefon\` varchar(50),
    \`aktiv\` tinyint(1) NOT NULL DEFAULT 1,
    \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (\`id\`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // ── 4. kunden ─────────────────────────────────────────────────────────────
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
    \`pflegegrad\` int DEFAULT 2,
    \`paragraph\` enum('45b','45a','39','privat') DEFAULT '45b',
    \`paragraphen\` text,
    \`kostentraegerTyp\` varchar(100),
    \`versicherungsnummer\` varchar(50),
    \`kostentraegerId\` int,
    \`beihilfeVorhanden\` tinyint(1) DEFAULT 0,
    \`beihilfePflegekasseProzent\` decimal(5,2),
    \`beihilfeProzent\` decimal(5,2),
    \`beihilfeVersicherung\` varchar(200),
    \`beihilfeBemerkungen\` text,
    \`budget37\` decimal(10,2) DEFAULT 0,
    \`verbraucht37\` decimal(10,2) DEFAULT 0,
    \`letzteAbrechnung37\` varchar(10),
    \`budget45b\` decimal(10,2) DEFAULT 0,
    \`verbraucht45b\` decimal(10,2) DEFAULT 0,
    \`letzteAbrechnung45b\` varchar(10),
    \`budget45a\` decimal(10,2) DEFAULT 0,
    \`verbraucht45a\` decimal(10,2) DEFAULT 0,
    \`letzteAbrechnung45a\` varchar(10),
    \`budget39\` decimal(10,2) DEFAULT 0,
    \`verbraucht39\` decimal(10,2) DEFAULT 0,
    \`letzteAbrechnung39\` varchar(10),
    \`vollmachtErteilt\` tinyint(1) DEFAULT 0,
    \`vollmachtDatum\` date,
    \`vollmachtSignatur\` text,
    \`wunschtag1\` enum('montag','dienstag','mittwoch','donnerstag','freitag','samstag'),
    \`wunschtag2\` enum('montag','dienstag','mittwoch','donnerstag','freitag','samstag'),
    \`umwidmungAktiv\` tinyint(1) DEFAULT 0,
    \`umwidmungBudgetMax\` decimal(10,2) DEFAULT 0,
    \`umwidmungVerbraucht\` decimal(10,2) DEFAULT 0,
    \`aktiv\` int NOT NULL DEFAULT 1,
    \`geloeschtAt\` timestamp NULL,
    \`geloeschtVon\` int,
    \`loeschgrund\` text,
    \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (\`id\`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // ── 5. kundenZuordnung ────────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS \`kundenZuordnung\` (
    \`id\` int NOT NULL AUTO_INCREMENT,
    \`mitarbeiterId\` int NOT NULL,
    \`kundenId\` int NOT NULL,
    \`prioritaet\` int NOT NULL DEFAULT 1,
    \`rolle\` enum('hauptbetreuer','vertretung') NOT NULL DEFAULT 'hauptbetreuer',
    \`zugeordnetVon\` int,
    \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (\`id\`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // ── 6. textbausteine ──────────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS \`textbausteine\` (
    \`id\` int NOT NULL AUTO_INCREMENT,
    \`titel\` varchar(200) NOT NULL,
    \`inhalt\` text NOT NULL,
    \`kategorie\` enum('bericht','gesundheit','aktivitaet','bemerkung','sonstiges') NOT NULL DEFAULT 'bericht',
    \`paragraph\` enum('45b','45a','39','alle') DEFAULT 'alle',
    \`aktiv\` int NOT NULL DEFAULT 1,
    \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (\`id\`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // ── 7. einsaetze ──────────────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS \`einsaetze\` (
    \`id\` int NOT NULL AUTO_INCREMENT,
    \`mitarbeiterId\` int NOT NULL,
    \`kundenId\` int NOT NULL,
    \`datum\` date NOT NULL,
    \`startzeit\` time,
    \`endzeit\` time,
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
    \`geloeschtVon\` int,
    \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (\`id\`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // ── 8. leistungen ─────────────────────────────────────────────────────────
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
    \`geloeschtVon\` int,
    \`updatedAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (\`id\`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // ── 9. fahrten ────────────────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS \`fahrten\` (
    \`id\` int NOT NULL AUTO_INCREMENT,
    \`mitarbeiterId\` int NOT NULL,
    \`kundenId\` int,
    \`datum\` date NOT NULL,
    \`vonOrt\` varchar(200) NOT NULL DEFAULT '',
    \`nachOrt\` varchar(200) NOT NULL DEFAULT '',
    \`kilometer\` decimal(6,1) NOT NULL DEFAULT 0,
    \`kilometerHin\` decimal(6,1),
    \`kilometerRueck\` decimal(6,1),
    \`typ\` enum('normal','sonder') NOT NULL DEFAULT 'normal',
    \`zweck\` varchar(255),
    \`verguetung\` decimal(7,2) DEFAULT 0,
    \`abrechnungsStatus\` enum('offen','eingereicht','erstattet') DEFAULT 'offen',
    \`monat\` varchar(7),
    \`einsatzId\` int,
    \`geloeschtAt\` timestamp NULL,
    \`geloeschtVon\` int,
    \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (\`id\`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // ── 10. ebriefLog ─────────────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS \`ebriefLog\` (
    \`id\` int NOT NULL AUTO_INCREMENT,
    \`mitarbeiterId\` int NOT NULL,
    \`kundenId\` int,
    \`kostentraegerId\` int,
    \`betreff\` varchar(300) NOT NULL,
    \`inhalt\` text,
    \`empfaenger\` varchar(320) NOT NULL,
    \`typ\` enum('leistungsnachweis','protokoll','kostenvoranschlag','sonstiges') NOT NULL DEFAULT 'sonstiges',
    \`versandart\` enum('email','ebrief','post') NOT NULL DEFAULT 'email',
    \`status\` enum('entwurf','versendet','fehler') NOT NULL DEFAULT 'entwurf',
    \`referenzId\` int,
    \`referenzTyp\` varchar(50),
    \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (\`id\`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // ── 11. auditLogs ─────────────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS \`auditLogs\` (
    \`id\` int NOT NULL AUTO_INCREMENT,
    \`mitarbeiterId\` int,
    \`action\` varchar(50) NOT NULL,
    \`ressource\` varchar(100),
    \`details\` text,
    \`status\` enum('success','failure','partial') NOT NULL DEFAULT 'success',
    \`ipAddress\` varchar(45),
    \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (\`id\`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // ── 12. monatsabschluesse ─────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS \`monatsabschluesse\` (
    \`id\` int NOT NULL AUTO_INCREMENT,
    \`monat\` varchar(7) NOT NULL,
    \`adminId\` int NOT NULL,
    \`gesamtStunden\` decimal(7,2) DEFAULT 0,
    \`gesamtEinsaetze\` int DEFAULT 0,
    \`gesamtKm\` decimal(8,1) DEFAULT 0,
    \`gesamtVerguetung\` decimal(10,2) DEFAULT 0,
    \`csvExport\` text,
    \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (\`id\`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // ── 13. passwordResets ────────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS \`passwordResets\` (
    \`id\` int NOT NULL AUTO_INCREMENT,
    \`mitarbeiterId\` int NOT NULL,
    \`token\` varchar(128) NOT NULL,
    \`expiresAt\` timestamp NOT NULL,
    \`used\` tinyint(1) NOT NULL DEFAULT 0,
    \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (\`id\`),
    UNIQUE KEY \`token\` (\`token\`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // ── 14. pushSubscriptions ─────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS \`pushSubscriptions\` (
    \`id\` int NOT NULL AUTO_INCREMENT,
    \`mitarbeiterId\` int NOT NULL,
    \`endpoint\` text NOT NULL,
    \`p256dh\` text,
    \`auth\` text,
    \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (\`id\`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // ── 15. urlaubsantraege ───────────────────────────────────────────────────
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

  // ── 16. krankmeldungen ────────────────────────────────────────────────────
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

  // ── 17. touren ────────────────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS \`touren\` (
    \`id\` int NOT NULL AUTO_INCREMENT,
    \`mitarbeiterId\` int NOT NULL,
    \`datum\` date NOT NULL,
    \`status\` enum('geplant','aktiv','abgeschlossen') NOT NULL DEFAULT 'geplant',
    \`startzeit\` time,
    \`endzeit\` time,
    \`notizen\` text,
    \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (\`id\`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // ── 18. tourEinsaetze ─────────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS \`tourEinsaetze\` (
    \`id\` int NOT NULL AUTO_INCREMENT,
    \`tourId\` int NOT NULL,
    \`einsatzId\` int NOT NULL,
    \`reihenfolge\` int NOT NULL DEFAULT 1,
    \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (\`id\`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // ── 19. notifications ─────────────────────────────────────────────────────
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

  // ── 20. refreshTokens ─────────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS \`refreshTokens\` (
    \`id\` int NOT NULL AUTO_INCREMENT,
    \`mitarbeiterId\` int NOT NULL,
    \`token\` varchar(500) NOT NULL,
    \`expiresAt\` timestamp NOT NULL,
    \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (\`id\`),
    UNIQUE KEY \`token\` (\`token\`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // ── 21. mitarbeiterDokumente ──────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS \`mitarbeiterDokumente\` (
    \`id\` int NOT NULL AUTO_INCREMENT,
    \`mitarbeiterId\` int NOT NULL,
    \`typ\` enum('zertifikat','arbeitsvertrag','krankmeldung','fuehrerschein','erstehilfe','sonstiges') NOT NULL,
    \`bezeichnung\` varchar(255) NOT NULL,
    \`dateiUrl\` text,
    \`dateiname\` varchar(255),
    \`ausstellungsdatum\` date,
    \`ablaufdatum\` date,
    \`notizen\` text,
    \`hochgeladenVon\` int,
    \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (\`id\`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // ── 22. vertretungen ──────────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS \`vertretungen\` (
    \`id\` int NOT NULL AUTO_INCREMENT,
    \`vertreterId\` int NOT NULL,
    \`vertretenId\` int NOT NULL,
    \`von\` date NOT NULL,
    \`bis\` date NOT NULL,
    \`grund\` varchar(255),
    \`freigegebenVon\` int,
    \`aktiv\` tinyint(1) NOT NULL DEFAULT 1,
    \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (\`id\`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // ── 23. budgetTransaktionen ───────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS \`budgetTransaktionen\` (
    \`id\` int NOT NULL AUTO_INCREMENT,
    \`kundenId\` int NOT NULL,
    \`leistungId\` int,
    \`mitarbeiterId\` int,
    \`typ\` enum('abbuchung','rueckerstattung','korrektur') NOT NULL,
    \`paragraph\` enum('45b','45a','39') NOT NULL,
    \`betrag\` decimal(10,2) NOT NULL,
    \`stunden\` decimal(5,2),
    \`monat\` varchar(7),
    \`beschreibung\` varchar(500),
    \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (\`id\`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // ── 24. neukundenPushBestaetigung ─────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS \`neukundenPushBestaetigung\` (
    \`id\` int NOT NULL AUTO_INCREMENT,
    \`kundenId\` int NOT NULL,
    \`mitarbeiterId\` int NOT NULL,
    \`bestaetigtAt\` timestamp NULL,
    \`eskalationsstufe\` int DEFAULT 0,
    \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (\`id\`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // ── 25. vertretungsUebernahmen ────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS \`vertretungsUebernahmen\` (
    \`id\` int NOT NULL AUTO_INCREMENT,
    \`urlaubsantragId\` int NOT NULL,
    \`kundenId\` int NOT NULL,
    \`vertreterId\` int NOT NULL,
    \`bestaetigtAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    \`vollzugriffBis\` timestamp NULL,
    \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (\`id\`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // ── 26. verfuegbarkeiten ──────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS \`verfuegbarkeiten\` (
    \`id\` int NOT NULL AUTO_INCREMENT,
    \`mitarbeiterId\` int NOT NULL,
    \`wochentag\` int NOT NULL,
    \`vonZeit\` time NOT NULL,
    \`bisZeit\` time NOT NULL,
    \`gueltigVon\` date,
    \`gueltigBis\` date,
    \`status\` enum('verfuegbar','nicht_verfuegbar','bevorzugt') NOT NULL DEFAULT 'verfuegbar',
    \`notiz\` text,
    \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    \`updatedAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (\`id\`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // ── 27. arbeitszeitKonten ─────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS \`arbeitszeitKonten\` (
    \`id\` int NOT NULL AUTO_INCREMENT,
    \`mitarbeiterId\` int NOT NULL,
    \`monat\` varchar(7) NOT NULL,
    \`geplanteStunden\` decimal(6,2) DEFAULT 0,
    \`geleisteteStunden\` decimal(6,2) DEFAULT 0,
    \`differenz\` decimal(6,2) DEFAULT 0,
    \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    \`updatedAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (\`id\`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // ── 28. terminRueckmeldungen ──────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS \`terminRueckmeldungen\` (
    \`id\` int NOT NULL AUTO_INCREMENT,
    \`einsatzId\` int NOT NULL,
    \`mitarbeiterId\` int NOT NULL,
    \`status\` enum('bestaetigt','abgelehnt','verspaetet') NOT NULL,
    \`nachricht\` text,
    \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (\`id\`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // ── 29. besuchsberichte ───────────────────────────────────────────────────
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

  // ── 30. integrationen ─────────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS \`integrationen\` (
    \`id\` int NOT NULL AUTO_INCREMENT,
    \`name\` varchar(100) NOT NULL,
    \`typ\` varchar(50) NOT NULL,
    \`konfiguration\` text,
    \`aktiv\` tinyint(1) NOT NULL DEFAULT 1,
    \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (\`id\`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // ── 31. integrationsLaeufe ────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS \`integrationsLaeufe\` (
    \`id\` int NOT NULL AUTO_INCREMENT,
    \`integrationId\` int NOT NULL,
    \`status\` enum('gestartet','erfolgreich','fehler') NOT NULL DEFAULT 'gestartet',
    \`details\` text,
    \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (\`id\`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // ── 32. datenschutzDokumente ──────────────────────────────────────────────
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

  // ── 33. einwilligungen ────────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS \`einwilligungen\` (
    \`id\` int NOT NULL AUTO_INCREMENT,
    \`mitarbeiterId\` int NOT NULL,
    \`typ\` varchar(100) NOT NULL,
    \`erteiltAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    \`widerrufenAt\` timestamp NULL,
    \`version\` varchar(50),
    PRIMARY KEY (\`id\`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // ── 34. loeschAnfragen ────────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS \`loeschAnfragen\` (
    \`id\` int NOT NULL AUTO_INCREMENT,
    \`mitarbeiterId\` int NOT NULL,
    \`grund\` text,
    \`status\` enum('offen','bearbeitet','abgelehnt') NOT NULL DEFAULT 'offen',
    \`bearbeitetVon\` int,
    \`bearbeitetAt\` timestamp NULL,
    \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (\`id\`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // ── 35. backupLaeufe ──────────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS \`backupLaeufe\` (
    \`id\` int NOT NULL AUTO_INCREMENT,
    \`typ\` varchar(50) NOT NULL,
    \`status\` enum('gestartet','erfolgreich','fehler') NOT NULL DEFAULT 'gestartet',
    \`dateiUrl\` varchar(500),
    \`groesseBytes\` int,
    \`details\` text,
    \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (\`id\`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // ── 36. prognoseSnapshots ─────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS \`prognoseSnapshots\` (
    \`id\` int NOT NULL AUTO_INCREMENT,
    \`monat\` varchar(7) NOT NULL,
    \`daten\` text,
    \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (\`id\`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // ── 37. analyseSnapshots ──────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS \`analyseSnapshots\` (
    \`id\` int NOT NULL AUTO_INCREMENT,
    \`monat\` varchar(7) NOT NULL,
    \`daten\` text,
    \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (\`id\`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // ── 38. backupProtokolle ──────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS \`backupProtokolle\` (
    \`id\` int NOT NULL AUTO_INCREMENT,
    \`backupLaufId\` int,
    \`nachricht\` text,
    \`level\` enum('info','warnung','fehler') NOT NULL DEFAULT 'info',
    \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (\`id\`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // ── 39. besuchsberichtDateien ─────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS \`besuchsberichtDateien\` (
    \`id\` int NOT NULL AUTO_INCREMENT,
    \`besuchsberichtId\` int NOT NULL,
    \`dateiUrl\` text NOT NULL,
    \`dateiname\` varchar(255),
    \`mimeType\` varchar(100),
    \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (\`id\`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // ── 40. datenschutzZustimmungen ───────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS \`datenschutzZustimmungen\` (
    \`id\` int NOT NULL AUTO_INCREMENT,
    \`mitarbeiterId\` int NOT NULL,
    \`dokumentId\` int NOT NULL,
    \`dokumentVersion\` varchar(50),
    \`zugestimmtAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    \`ipAdresse\` varchar(50),
    \`widerrufenAt\` timestamp NULL,
    PRIMARY KEY (\`id\`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // ── 41. einsatzAenderungen ────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS \`einsatzAenderungen\` (
    \`id\` int NOT NULL AUTO_INCREMENT,
    \`einsatzId\` int NOT NULL,
    \`mitarbeiterId\` int NOT NULL,
    \`typ\` varchar(50) NOT NULL,
    \`altWert\` text,
    \`neuWert\` text,
    \`begruendung\` text,
    \`status\` enum('ausstehend','genehmigt','abgelehnt') NOT NULL DEFAULT 'ausstehend',
    \`bearbeitetVon\` int,
    \`bearbeitetAt\` timestamp NULL,
    \`benachrichtigtAt\` timestamp NULL,
    \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (\`id\`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // ── 42. formularVorlagen ──────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS \`formularVorlagen\` (
    \`id\` int NOT NULL AUTO_INCREMENT,
    \`name\` varchar(200) NOT NULL,
    \`version\` varchar(20) NOT NULL,
    \`felder\` text NOT NULL,
    \`aktiv\` tinyint(1) NOT NULL DEFAULT 1,
    \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    \`updatedAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (\`id\`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // ── 43. mitarbeiterBerechtigungen ─────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS \`mitarbeiterBerechtigungen\` (
    \`id\` int NOT NULL AUTO_INCREMENT,
    \`mitarbeiterId\` int NOT NULL,
    \`modul\` varchar(100) NOT NULL,
    \`zugriff\` enum('erlaubt','verweigert') NOT NULL,
    \`gesetztVonId\` int,
    \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (\`id\`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // ── 44. mitarbeiterZweiFaktor ─────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS \`mitarbeiterZweiFaktor\` (
    \`id\` int NOT NULL AUTO_INCREMENT,
    \`mitarbeiterId\` int NOT NULL,
    \`twoFactorEnabled\` tinyint(1) NOT NULL DEFAULT 0,
    \`twoFactorSecret\` varchar(255),
    \`twoFactorActivatedAt\` timestamp NULL,
    \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    \`updatedAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (\`id\`),
    UNIQUE KEY \`mitarbeiterId\` (\`mitarbeiterId\`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // ── 45. zweiFaktorCodes ───────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS \`zweiFaktorCodes\` (
    \`id\` int NOT NULL AUTO_INCREMENT,
    \`mitarbeiterId\` int NOT NULL,
    \`codeHash\` varchar(255) NOT NULL,
    \`verwendet\` tinyint(1) NOT NULL DEFAULT 0,
    \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (\`id\`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // ── 46. roles ─────────────────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS \`roles\` (
    \`id\` int NOT NULL AUTO_INCREMENT,
    \`key\` varchar(50) NOT NULL,
    \`label\` varchar(100) NOT NULL,
    \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (\`id\`),
    UNIQUE KEY \`key\` (\`key\`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // ── 47. permissions ───────────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS \`permissions\` (
    \`id\` int NOT NULL AUTO_INCREMENT,
    \`key\` varchar(100) NOT NULL,
    \`description\` varchar(255),
    PRIMARY KEY (\`id\`),
    UNIQUE KEY \`key\` (\`key\`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // ── 48. role_permissions ──────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS \`role_permissions\` (
    \`role_id\` int NOT NULL,
    \`permission_id\` int NOT NULL,
    PRIMARY KEY (\`role_id\`, \`permission_id\`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // ── 49. employee_roles ────────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS \`employee_roles\` (
    \`employee_id\` int NOT NULL,
    \`role_id\` int NOT NULL,
    \`assigned_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    \`assigned_by\` int,
    PRIMARY KEY (\`employee_id\`, \`role_id\`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // ── 50. paragraphSaetze ───────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS \`paragraphSaetze\` (
    \`id\` int NOT NULL AUTO_INCREMENT,
    \`paragraph\` varchar(10) NOT NULL,
    \`stundensatz\` decimal(6,2) NOT NULL DEFAULT 16.00,
    \`anfahrtPauschale\` decimal(6,2) NOT NULL DEFAULT 6.00,
    \`gueltigAb\` date NOT NULL,
    \`aktiv\` tinyint(1) NOT NULL DEFAULT 1,
    \`geaendertVon\` int,
    \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    \`updatedAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (\`id\`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // ── 51. planungsWarnungen ─────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS \`planungsWarnungen\` (
    \`id\` int NOT NULL AUTO_INCREMENT,
    \`code\` varchar(60) NOT NULL,
    \`schwere\` enum('blockierend','warnung','hinweis') NOT NULL DEFAULT 'warnung',
    \`titel\` varchar(200) NOT NULL,
    \`nachricht\` text NOT NULL,
    \`mitarbeiterId\` int,
    \`kundenId\` int,
    \`einsatzId\` int,
    \`monat\` varchar(7),
    \`bestaetigtAt\` timestamp NULL,
    \`bestaetigtVon\` int,
    \`geloeschtAt\` timestamp NULL,
    \`geloeschtVon\` int,
    \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (\`id\`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // ── 52. jahresbudgets ─────────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS \`jahresbudgets\` (
    \`id\` int NOT NULL AUTO_INCREMENT,
    \`kundenId\` int NOT NULL,
    \`leistungsbereich\` enum('45b','39','45a','privat','sonstige') NOT NULL,
    \`jahresbudgetCent\` int NOT NULL DEFAULT 0,
    \`verbrauchtCent\` int NOT NULL DEFAULT 0,
    \`gueltigAb\` date NOT NULL,
    \`gueltigBis\` date NOT NULL,
    \`stundensatzCent\` int NOT NULL DEFAULT 3500,
    \`notizen\` text,
    \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    \`updatedAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (\`id\`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // ── 53. controllingSnapshots ──────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS \`controllingSnapshots\` (
    \`id\` int NOT NULL AUTO_INCREMENT,
    \`monat\` varchar(7) NOT NULL,
    \`kundenId\` int NOT NULL,
    \`mitarbeiterId\` int,
    \`leistungsbereich\` varchar(10) NOT NULL,
    \`jahresbudgetCent\` int NOT NULL DEFAULT 0,
    \`monatsbudgetCent\` int NOT NULL DEFAULT 0,
    \`geplanteMinuten\` int NOT NULL DEFAULT 0,
    \`tatsaechlicheMinuten\` int NOT NULL DEFAULT 0,
    \`verbrauchtCent\` int NOT NULL DEFAULT 0,
    \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (\`id\`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // ── Zusatz: Raw-SQL-Tabellen (nicht im Drizzle-Schema) ────────────────────
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

  `CREATE TABLE IF NOT EXISTS \`systemEinstellungen\` (
    \`id\` int NOT NULL AUTO_INCREMENT,
    \`schluessel\` varchar(100) NOT NULL,
    \`wert\` text,
    \`beschreibung\` varchar(255),
    \`updatedAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (\`id\`),
    UNIQUE KEY \`schluessel\` (\`schluessel\`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

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
    UNIQUE KEY \`rechnungsnummer\` (\`rechnungsnummer\`),
    PRIMARY KEY (\`id\`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

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

  // ── fuehrerschein_checks ──────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS \`fuehrerschein_checks\` (
    \`id\` int NOT NULL AUTO_INCREMENT,
    \`mitarbeiterId\` int NOT NULL,
    \`pruefDatum\` date NOT NULL,
    \`naechstePruefung\` date,
    \`status\` enum('gueltig','abgelaufen','ausstehend') NOT NULL DEFAULT 'ausstehend',
    \`fotoUrl\` text,
    \`fotoKey\` varchar(500),
    \`bemerkung\` text,
    \`geprueftVonId\` int,
    \`mitarbeiter_id\` int,
    \`foto_key\` varchar(500),
    \`foto_url\` text,
    \`pruef_datum\` date,
    \`naechstes_pruef_datum\` date,
    \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    \`updatedAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (\`id\`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // ── erste_hilfe_kurse ─────────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS \`erste_hilfe_kurse\` (
    \`id\` int NOT NULL AUTO_INCREMENT,
    \`mitarbeiterId\` int NOT NULL,
    \`kursName\` varchar(255) NOT NULL DEFAULT 'Erste-Hilfe-Kurs',
    \`kursAnbieter\` varchar(255),
    \`kursDatum\` date NOT NULL,
    \`ablaufDatum\` date,
    \`status\` enum('bestanden','angemeldet','abgelaufen') NOT NULL DEFAULT 'bestanden',
    \`fotoBase64\` text,
    \`fotoMimeType\` varchar(100),
    \`bemerkung\` text,
    \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    \`updatedAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (\`id\`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // ── gefaehrdungsbeurteilungen ─────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS \`gefaehrdungsbeurteilungen\` (
    \`id\` int NOT NULL AUTO_INCREMENT,
    \`titel\` varchar(255) NOT NULL,
    \`bereich\` enum('haushalt_senior','wegeunfall','ergonomie_physisch','psychisch','hygiene_infektion','sonstiges') NOT NULL,
    \`risikobeschreibung\` text NOT NULL,
    \`massnahmen\` text,
    \`verantwortlich\` varchar(255),
    \`status\` enum('offen','in_bearbeitung','erledigt') NOT NULL DEFAULT 'offen',
    \`risikoStufe\` enum('niedrig','mittel','hoch') NOT NULL DEFAULT 'mittel',
    \`naechstePruefung\` date,
    \`erstelltVon\` int,
    \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    \`updatedAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (\`id\`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // ── psa_ausgaben ──────────────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS \`psa_ausgaben\` (
    \`id\` int NOT NULL AUTO_INCREMENT,
    \`mitarbeiterId\` int NOT NULL,
    \`psaTyp\` enum('einmalhandschuhe','ffp2_maske','mund_nasen_schutz','schutzkittel','schutzbrille','desinfektionsmittel','sonstiges') NOT NULL,
    \`groesse\` varchar(20),
    \`menge\` int NOT NULL DEFAULT 1,
    \`ausgabeDatum\` date NOT NULL,
    \`rueckgabeDatum\` date,
    \`zustand\` enum('neu','gut','beschaedigt','zurueckgegeben') NOT NULL DEFAULT 'neu',
    \`notizen\` text,
    \`ausgegebenVon\` int,
    \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (\`id\`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // ── arbeitsmed_vorsorgen ──────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS \`arbeitsmed_vorsorgen\` (
    \`id\` int NOT NULL AUTO_INCREMENT,
    \`mitarbeiterId\` int NOT NULL,
    \`vorsorgeart\` enum('pflicht','angebot','wunsch') NOT NULL,
    \`anlass\` varchar(255) NOT NULL,
    \`faelligkeit\` date NOT NULL,
    \`durchgefuehrtAm\` date,
    \`arzt\` varchar(255),
    \`ergebnis\` enum('geeignet','bedingt_geeignet','nicht_geeignet','ausstehend') NOT NULL DEFAULT 'ausstehend',
    \`naechsteFaelligkeit\` date,
    \`notizen\` text,
    \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    \`updatedAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (\`id\`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // ── alleinarbeits_protokolle ──────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS \`alleinarbeits_protokolle\` (
    \`id\` int NOT NULL AUTO_INCREMENT,
    \`mitarbeiterId\` int NOT NULL,
    \`kundenId\` int,
    \`einsatzId\` int,
    \`checkInZeit\` timestamp NULL,
    \`checkOutZeit\` timestamp NULL,
    \`checkInStatus\` enum('eingecheckt','ausgecheckt','ueberfaellig','notfall') NOT NULL DEFAULT 'eingecheckt',
    \`notfallKontakt\` varchar(255),
    \`bemerkung\` text,
    \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (\`id\`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // ── arbeitssicherheit_unterweisungen ──────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS \`arbeitssicherheit_unterweisungen\` (
    \`id\` int NOT NULL AUTO_INCREMENT,
    \`mitarbeiterId\` int NOT NULL,
    \`thema\` enum('notfall_erste_hilfe','hygiene_desinfektion','ergonomie_heben_tragen','deeskalation_demenz','verkehrssicherheit','psa_verwendung','alleinarbeit_schutz','biostoff_infektionsschutz','sonstiges') NOT NULL,
    \`unterweisungsDatum\` date NOT NULL,
    \`naechsteFaelligkeit\` date,
    \`bestaetigt\` tinyint(1) NOT NULL DEFAULT 0,
    \`bestaetigtAm\` timestamp NULL,
    \`durchgefuehrtVon\` int,
    \`inhalt\` text,
    \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (\`id\`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // ── as_unterweisung_vorlagen ──────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS \`as_unterweisung_vorlagen\` (
    \`id\` int NOT NULL AUTO_INCREMENT,
    \`titel\` varchar(255) NOT NULL,
    \`thema\` enum('notfall_erste_hilfe','hygiene_desinfektion','ergonomie_heben_tragen','deeskalation_demenz','verkehrssicherheit','psa_verwendung','alleinarbeit_schutz','biostoff_infektionsschutz','sonstiges') NOT NULL,
    \`inhalt\` text NOT NULL,
    \`version\` varchar(20) NOT NULL DEFAULT '1.0',
    \`pflicht\` tinyint(1) NOT NULL DEFAULT 1,
    \`gueltigBis\` date,
    \`aktiv\` tinyint(1) NOT NULL DEFAULT 1,
    \`erstelltVon\` int,
    \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    \`updatedAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (\`id\`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // ── as_unterweisung_nachweise ─────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS \`as_unterweisung_nachweise\` (
    \`id\` int NOT NULL AUTO_INCREMENT,
    \`unterweisungId\` int NOT NULL,
    \`mitarbeiterId\` int NOT NULL,
    \`vorlagenId\` int,
    \`unterschriftKey\` varchar(500),
    \`unterschriftUrl\` varchar(500),
    \`pdfKey\` varchar(500),
    \`pdfUrl\` varchar(500),
    \`ipAdresse\` varchar(100),
    \`browserInfo\` varchar(500),
    \`bestaetigtAm\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    \`inhaltSnapshot\` text,
    \`titelSnapshot\` varchar(255),
    \`versionSnapshot\` varchar(20),
    \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (\`id\`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // ── datenschutz_audit_log ─────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS \`datenschutz_audit_log\` (
    \`id\` int NOT NULL AUTO_INCREMENT,
    \`aktion\` varchar(80) NOT NULL,
    \`dokumentId\` int,
    \`dokumentTitel\` varchar(255),
    \`adminId\` int,
    \`adminName\` varchar(255),
    \`details\` text,
    \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (\`id\`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // ── arbeitssicherheit_audit_log ───────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS \`arbeitssicherheit_audit_log\` (
    \`id\` int NOT NULL AUTO_INCREMENT,
    \`aktion\` varchar(100) NOT NULL,
    \`bereich\` enum('gefaehrdung','psa','vorsorge','alleinarbeit','unterweisung','allgemein') NOT NULL DEFAULT 'allgemein',
    \`referenzId\` int,
    \`adminId\` int,
    \`adminName\` varchar(200),
    \`details\` text,
    \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (\`id\`)
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

  console.log(`[ensureTables] Starte Tabellen-Absicherung (${TABLE_DEFINITIONS.length} Tabellen)...`);
  let ok = 0;
  let failed = 0;

  for (const ddl of TABLE_DEFINITIONS) {
    try {
      await db.execute(sql.raw(ddl));
      ok++;
    } catch (err: any) {
      const msg = String(err?.message ?? "");
      if (msg.includes("already exists")) {
        ok++;
      } else {
        console.error(`[ensureTables] Fehler:`, msg.substring(0, 120));
        failed++;
      }
    }
  }

  console.log(`[ensureTables] Abgeschlossen: ${ok} OK, ${failed} Fehler`);
}
