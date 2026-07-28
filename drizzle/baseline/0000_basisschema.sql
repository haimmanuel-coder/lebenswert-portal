-- ═══════════════════════════════════════════════════════════════════════════
--  BASISSCHEMA – vollständiger Stand aller Tabellen
-- ═══════════════════════════════════════════════════════════════════════════
--
--  WOFÜR IST DIESE DATEI?
--
--  Das nummerierte Migrationsverzeichnis (drizzle/000*.sql) ist unvollständig:
--  ein Großteil der Tabellen wurde historisch per "drizzle-kit push" direkt
--  aus dem Schema erzeugt, ohne dass eine Migrationsdatei entstanden ist.
--  Eine neu aufgesetzte Datenbank ließ sich daraus nicht herstellen.
--
--  Diese Datei schließt die Lücke: Sie enthält ALLE Tabellen des aktuellen
--  Drizzle-Schemas (drizzle/schema.ts) und wurde mit
--
--      npx drizzle-kit export --sql
--
--  unmittelbar aus dem Schema erzeugt – nicht von Hand gepflegt.
--
--  WANN VERWENDEN?
--
--    • Neue Datenbank aufsetzen (Test-, Entwicklungs- oder Notfallumgebung)
--    • Prüfen, ob die Produktionsdatenbank vom Schema abweicht
--
--  WANN NICHT VERWENDEN?
--
--    Nicht als reguläre Migration einreihen. Die bestehende
--    Produktionsdatenbank besitzt diese Tabellen bereits; die Datei ist kein
--    Ersatz für die nummerierten Migrationen, sondern deren Ergänzung.
--
--  SICHERHEIT
--
--    Alle Anweisungen verwenden CREATE TABLE IF NOT EXISTS. Die Datei kann
--    daher auch gegen eine bestehende Datenbank ausgeführt werden, ohne
--    vorhandene Tabellen oder Daten zu verändern. Es wird nichts gelöscht,
--    geändert oder überschrieben.
--
--  ANWENDUNG (neue Datenbank)
--
--      mysql "$DATABASE_URL" < drizzle/baseline/0000_basisschema.sql
--      mysql "$DATABASE_URL" < drizzle/0007_einsatzplanung.sql
--
--    Der zweite Schritt ergänzt die Spalten der Einsatzplanung sowie die
--    drei Tabellen, die ausschließlich per SQL angesprochen werden
--    (kassenanfragen, neukundenaufnahmen, fuehrerschein_checks) und deshalb
--    nicht im Drizzle-Schema stehen.
--
--  Erzeugt am 28.07.2026 · 51 Tabellen · gegengeprüft gegen eine leere und
--  eine bereits befüllte Datenbank.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS `analyseSnapshots` (
	`id` int AUTO_INCREMENT NOT NULL,
	`monat` varchar(7) NOT NULL,
	`typ` varchar(50) NOT NULL,
	`daten` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `analyseSnapshots_id` PRIMARY KEY(`id`)
);

CREATE TABLE IF NOT EXISTS `arbeitszeitKonten` (
	`id` int AUTO_INCREMENT NOT NULL,
	`mitarbeiterId` int NOT NULL,
	`monat` varchar(7) NOT NULL,
	`sollStunden` decimal(7,2) NOT NULL DEFAULT '0',
	`istStunden` decimal(7,2) NOT NULL DEFAULT '0',
	`ueberstunden` decimal(7,2) NOT NULL DEFAULT '0',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `arbeitszeitKonten_id` PRIMARY KEY(`id`)
);

CREATE TABLE IF NOT EXISTS `auditLogs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`mitarbeiterId` int,
	`action` varchar(50) NOT NULL,
	`ressource` varchar(100),
	`details` text,
	`status` enum('success','failure','partial') NOT NULL DEFAULT 'success',
	`ipAddress` varchar(45),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `auditLogs_id` PRIMARY KEY(`id`)
);

CREATE TABLE IF NOT EXISTS `backupLaeufe` (
	`id` int AUTO_INCREMENT NOT NULL,
	`typ` enum('datenbank','dokumente','vollbackup') NOT NULL,
	`status` enum('gestartet','erfolg','fehler') NOT NULL DEFAULT 'gestartet',
	`speicherort` varchar(255),
	`pruefsumme` varchar(128),
	`meldung` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`beendetAt` timestamp,
	CONSTRAINT `backupLaeufe_id` PRIMARY KEY(`id`)
);

CREATE TABLE IF NOT EXISTS `backupProtokolle` (
	`id` int AUTO_INCREMENT NOT NULL,
	`typ` varchar(50) NOT NULL DEFAULT 'auto',
	`status` enum('erfolgreich','fehlgeschlagen','laufend') NOT NULL,
	`fehlerMeldung` text,
	`datenbankGroesse` varchar(50),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `backupProtokolle_id` PRIMARY KEY(`id`)
);

CREATE TABLE IF NOT EXISTS `besuchsberichtDateien` (
	`id` int AUTO_INCREMENT NOT NULL,
	`berichtId` int NOT NULL,
	`dateiKey` varchar(500) NOT NULL,
	`dateiUrl` text NOT NULL,
	`dateiname` varchar(255),
	`mimeType` varchar(100),
	`groesse` int,
	`kategorie` enum('foto','dokument','unterschrift','sonstiges') DEFAULT 'foto',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `besuchsberichtDateien_id` PRIMARY KEY(`id`)
);

CREATE TABLE IF NOT EXISTS `besuchsberichte` (
	`id` int AUTO_INCREMENT NOT NULL,
	`einsatzId` int,
	`kundenId` int NOT NULL,
	`mitarbeiterId` int NOT NULL,
	`datum` date NOT NULL,
	`dauerMinuten` int,
	`taetigkeiten` text NOT NULL,
	`beobachtungen` text,
	`besonderheiten` text,
	`naechsteSchritte` text,
	`kiVorschlag` text,
	`anhangUrls` text,
	`status` enum('entwurf','eingereicht','freigegeben','korrektur') NOT NULL DEFAULT 'entwurf',
	`freigegebenVon` int,
	`freigegebenAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `besuchsberichte_id` PRIMARY KEY(`id`)
);

CREATE TABLE IF NOT EXISTS `budgetTransaktionen` (
	`id` int AUTO_INCREMENT NOT NULL,
	`kundenId` int NOT NULL,
	`leistungId` int,
	`mitarbeiterId` int,
	`typ` enum('abbuchung','rueckerstattung','korrektur') NOT NULL,
	`paragraph` enum('45b','45a','39') NOT NULL,
	`betrag` decimal(10,2) NOT NULL,
	`stunden` decimal(5,2),
	`monat` varchar(7),
	`beschreibung` varchar(500),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `budgetTransaktionen_id` PRIMARY KEY(`id`)
);

CREATE TABLE IF NOT EXISTS `datenschutzDokumente` (
	`id` int AUTO_INCREMENT NOT NULL,
	`typ` enum('datenschutzerklaerung','avv','einwilligung','loeschkonzept','verarbeitungsverzeichnis') NOT NULL,
	`titel` varchar(255) NOT NULL,
	`version` varchar(40) NOT NULL,
	`inhalt` text,
	`dateiUrl` text,
	`aktiv` boolean NOT NULL DEFAULT true,
	`gueltigAb` date,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `datenschutzDokumente_id` PRIMARY KEY(`id`)
);

CREATE TABLE IF NOT EXISTS `datenschutzZustimmungen` (
	`id` int AUTO_INCREMENT NOT NULL,
	`mitarbeiterId` int NOT NULL,
	`dokumentId` int NOT NULL,
	`dokumentVersion` varchar(20) NOT NULL,
	`ipHash` varchar(64),
	`zugestimmtAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `datenschutzZustimmungen_id` PRIMARY KEY(`id`)
);

CREATE TABLE IF NOT EXISTS `ebriefLog` (
	`id` int AUTO_INCREMENT NOT NULL,
	`mitarbeiterId` int NOT NULL,
	`kundenId` int,
	`kostentraegerId` int,
	`betreff` varchar(300) NOT NULL,
	`inhalt` text,
	`empfaenger` varchar(320) NOT NULL,
	`typ` enum('leistungsnachweis','protokoll','kostenvoranschlag','sonstiges') NOT NULL DEFAULT 'sonstiges',
	`versandart` enum('email','ebrief','post') NOT NULL DEFAULT 'email',
	`status` enum('entwurf','versendet','fehler') NOT NULL DEFAULT 'entwurf',
	`referenzId` int,
	`referenzTyp` varchar(50),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `ebriefLog_id` PRIMARY KEY(`id`)
);

CREATE TABLE IF NOT EXISTS `einsaetze` (
	`id` int AUTO_INCREMENT NOT NULL,
	`mitarbeiterId` int NOT NULL,
	`kundenId` int NOT NULL,
	`datum` date NOT NULL,
	`startzeit` time,
	`dauerStunden` decimal(4,2),
	`paragraph` enum('45b','45a','39') NOT NULL DEFAULT '45b',
	`status` enum('geplant','bestaetigt','aenderung_angefragt','abgeschlossen','abgesagt') NOT NULL DEFAULT 'geplant',
	`bestaetigtAt` timestamp,
	`absagegrund` text,
	`aenderungswunsch` text,
	`tatsaechlicherStart` timestamp,
	`tatsaechlichesEnde` timestamp,
	`bericht` text,
	`gesundheit` enum('gut','stabil','auffaellig','kritisch'),
	`bemerkung` text,
	`unterschriftMitarbeiter` text,
	`unterschriftKunde` text,
	`unterschriftErsatzTyp` enum('keine','vollmacht','mitarbeiter_vermerk') DEFAULT 'keine',
	`unterschriftErsatzName` varchar(200),
	`unterschriftBegruendung` text,
	`unterschriftFreigabeStatus` enum('nicht_erforderlich','ausstehend','freigegeben') DEFAULT 'nicht_erforderlich',
	`unterschriftFreigegebenVon` int,
	`unterschriftFreigegebenAm` timestamp,
	`textbausteinIds` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`anfahrtPauschale` decimal(5,2) DEFAULT '6.00',
	`unterschreitungEskaliert` boolean DEFAULT false,
	`endzeit` time,
	`paragraph2` enum('45b','45a','39'),
	`stunden1` decimal(5,2),
	`stunden2` decimal(5,2),
	`kosten1` decimal(8,2),
	`kosten2` decimal(8,2),
	`lohnkosten` decimal(8,2),
	`budgetGebucht` boolean DEFAULT false,
	`notizen` text,
	`geplantVon` int,
	`geloeschtAt` timestamp,
	`geloeschtVon` int,
	`loeschgrund` text,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `einsaetze_id` PRIMARY KEY(`id`)
);

CREATE TABLE IF NOT EXISTS `einsatzAenderungen` (
	`id` int AUTO_INCREMENT NOT NULL,
	`einsatzId` int,
	`aenderungstyp` enum('erstellt','geaendert','abgesagt','verschoben','bestaetigt','abgelehnt') NOT NULL,
	`aenderungsgrund` text,
	`alteDaten` text,
	`neueDaten` text,
	`geaendertVonId` int,
	`benachrichtigtAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `einsatzAenderungen_id` PRIMARY KEY(`id`)
);

CREATE TABLE IF NOT EXISTS `einwilligungen` (
	`id` int AUTO_INCREMENT NOT NULL,
	`personTyp` enum('mitarbeiter','kunde') NOT NULL,
	`personId` int NOT NULL,
	`zweck` enum('datev','optadata','pflegekasse','email','ki','allgemein') NOT NULL,
	`erteilt` boolean NOT NULL,
	`dokumentVersion` varchar(40),
	`ipAddress` varchar(45),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`widerrufenAt` timestamp,
	CONSTRAINT `einwilligungen_id` PRIMARY KEY(`id`)
);

CREATE TABLE IF NOT EXISTS `employee_roles` (
	`employee_id` int NOT NULL,
	`role_id` int NOT NULL,
	`assigned_at` timestamp NOT NULL DEFAULT (now()),
	`assigned_by` int
);

CREATE TABLE IF NOT EXISTS `fahrten` (
	`id` int AUTO_INCREMENT NOT NULL,
	`mitarbeiterId` int NOT NULL,
	`kundenId` int,
	`datum` date NOT NULL,
	`vonOrt` varchar(200) NOT NULL,
	`nachOrt` varchar(200) NOT NULL,
	`kilometer` decimal(6,1) NOT NULL,
	`kilometerHin` decimal(6,1),
	`kilometerRueck` decimal(6,1),
	`typ` enum('normal','sonder') NOT NULL DEFAULT 'normal',
	`zweck` varchar(255),
	`verguetung` decimal(7,2) DEFAULT '0',
	`abrechnungsStatus` enum('offen','eingereicht','erstattet') DEFAULT 'offen',
	`monat` varchar(7),
	`einsatzId` int,
	`geloeschtAt` timestamp,
	`geloeschtVon` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `fahrten_id` PRIMARY KEY(`id`)
);

CREATE TABLE IF NOT EXISTS `formularVorlagen` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(200) NOT NULL,
	`version` varchar(20) NOT NULL,
	`felder` text NOT NULL,
	`aktiv` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `formularVorlagen_id` PRIMARY KEY(`id`)
);

CREATE TABLE IF NOT EXISTS `integrationen` (
	`id` int AUTO_INCREMENT NOT NULL,
	`anbieter` enum('datev','optadata','pflegekassen','gehaltsprogramm','email','ebrief','redis','maps','ki') NOT NULL,
	`bezeichnung` varchar(200) NOT NULL,
	`status` enum('nicht_eingerichtet','testmodus','aktiv','fehler','pausiert') NOT NULL DEFAULT 'nicht_eingerichtet',
	`basisUrl` text,
	`verschluesselteZugangsdaten` text,
	`zugangHinweis` varchar(100),
	`konfiguration` text,
	`letzterTestAt` timestamp,
	`letzterTestStatus` enum('erfolg','fehler'),
	`letzterFehler` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `integrationen_id` PRIMARY KEY(`id`)
);

CREATE TABLE IF NOT EXISTS `integrationsLaeufe` (
	`id` int AUTO_INCREMENT NOT NULL,
	`integrationId` int NOT NULL,
	`gestartetVon` int,
	`typ` enum('test','export','import','synchronisation','backup') NOT NULL,
	`status` enum('gestartet','erfolg','fehler','teilweise') NOT NULL DEFAULT 'gestartet',
	`anzahlDatensaetze` int DEFAULT 0,
	`meldung` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`beendetAt` timestamp,
	CONSTRAINT `integrationsLaeufe_id` PRIMARY KEY(`id`)
);

CREATE TABLE IF NOT EXISTS `kostentraeger` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(200) NOT NULL,
	`ikNummer` varchar(20),
	`typ` enum('pflegekasse','krankenkasse','beihilfe','privat','sonstige') NOT NULL DEFAULT 'pflegekasse',
	`strasse` varchar(200),
	`plz` varchar(10),
	`ort` varchar(100),
	`telefon` varchar(50),
	`email` varchar(320),
	`fax` varchar(50),
	`abrechnungsart` enum('dta','email','ebrief','post','manuell') DEFAULT 'email',
	`abrechnungsstelleId` int,
	`notizen` text,
	`aktiv` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `kostentraeger_id` PRIMARY KEY(`id`)
);

CREATE TABLE IF NOT EXISTS `krankmeldungen` (
	`id` int AUTO_INCREMENT NOT NULL,
	`mitarbeiterId` int NOT NULL,
	`von` date NOT NULL,
	`bis` date,
	`tage` int,
	`notizen` text,
	`auAttest` boolean DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`geloeschtAt` timestamp,
	`geloeschtVon` int,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `krankmeldungen_id` PRIMARY KEY(`id`)
);

CREATE TABLE IF NOT EXISTS `kunden` (
	`id` int AUTO_INCREMENT NOT NULL,
	`vorname` varchar(100) NOT NULL,
	`nachname` varchar(100) NOT NULL,
	`geburtsdatum` date,
	`strasse` varchar(200),
	`plz` varchar(10),
	`ort` varchar(100),
	`telefon` varchar(50),
	`mobil` varchar(50),
	`email` varchar(320),
	`kostentraegerId` int,
	`kostentraeger` varchar(200),
	`versicherungsnummer` varchar(50),
	`pflegegrad` int DEFAULT 2,
	`paragraph` enum('45b','45a','39','privat') DEFAULT '45b',
	`budget45b` decimal(10,2) DEFAULT '0',
	`verbraucht45b` decimal(10,2) DEFAULT '0',
	`letzteAbrechnung45b` varchar(10),
	`budget45a` decimal(10,2) DEFAULT '0',
	`verbraucht45a` decimal(10,2) DEFAULT '0',
	`letzteAbrechnung45a` varchar(10),
	`budget39` decimal(10,2) DEFAULT '0',
	`verbraucht39` decimal(10,2) DEFAULT '0',
	`letzteAbrechnung39` varchar(10),
	`vollmachtErteilt` boolean DEFAULT false,
	`vollmachtDatum` date,
	`vollmachtSignatur` text,
	`wunschtag1` enum('montag','dienstag','mittwoch','donnerstag','freitag','samstag'),
	`wunschtag2` enum('montag','dienstag','mittwoch','donnerstag','freitag','samstag'),
	`aktiv` int NOT NULL DEFAULT 1,
	`geloeschtAt` timestamp,
	`geloeschtVon` int,
	`loeschgrund` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `kunden_id` PRIMARY KEY(`id`)
);

CREATE TABLE IF NOT EXISTS `kundenZuordnung` (
	`id` int AUTO_INCREMENT NOT NULL,
	`mitarbeiterId` int NOT NULL,
	`kundenId` int NOT NULL,
	`prioritaet` int NOT NULL DEFAULT 1,
	`rolle` enum('hauptbetreuer','vertretung') NOT NULL DEFAULT 'hauptbetreuer',
	`zugeordnetVon` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `kundenZuordnung_id` PRIMARY KEY(`id`)
);

CREATE TABLE IF NOT EXISTS `leistungen` (
	`id` int AUTO_INCREMENT NOT NULL,
	`mitarbeiterId` int NOT NULL,
	`kundenId` int NOT NULL,
	`monat` varchar(7) NOT NULL,
	`paragraph` enum('45b','45a','39') NOT NULL DEFAULT '45b',
	`stunden` decimal(5,2) DEFAULT '0',
	`anzahlEinsaetze` int DEFAULT 1,
	`betrag` decimal(8,2) DEFAULT '0',
	`status` enum('offen','pruefung','freigegeben','versendet') NOT NULL DEFAULT 'offen',
	`bemerkung` text,
	`unterschriftLeister` text,
	`unterschriftKunde` text,
	`unterschriftErsatzTyp` enum('keine','vollmacht','mitarbeiter_vermerk') DEFAULT 'keine',
	`unterschriftErsatzName` varchar(200),
	`unterschriftBegruendung` text,
	`unterschriftFreigabeStatus` enum('nicht_erforderlich','ausstehend','freigegeben') DEFAULT 'nicht_erforderlich',
	`unterschriftFreigegebenVon` int,
	`unterschriftFreigegebenAm` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`geloeschtAt` timestamp,
	`geloeschtVon` int,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `leistungen_id` PRIMARY KEY(`id`)
);

CREATE TABLE IF NOT EXISTS `loeschAnfragen` (
	`id` int AUTO_INCREMENT NOT NULL,
	`personTyp` enum('mitarbeiter','kunde') NOT NULL,
	`personId` int NOT NULL,
	`grund` text,
	`status` enum('angefragt','geprueft','gesperrt','anonymisiert','abgelehnt') NOT NULL DEFAULT 'angefragt',
	`bearbeitetVon` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `loeschAnfragen_id` PRIMARY KEY(`id`)
);

CREATE TABLE IF NOT EXISTS `mitarbeiter` (
	`id` int AUTO_INCREMENT NOT NULL,
	`vorname` varchar(100) NOT NULL,
	`nachname` varchar(100) NOT NULL,
	`email` varchar(320) NOT NULL,
	`passwortHash` varchar(255) NOT NULL,
	`rolle` enum('mitarbeiter','teamleitung','buchhaltung','admin') NOT NULL DEFAULT 'mitarbeiter',
	`berechtigungen` text,
	`zweiFaktorAktiv` boolean NOT NULL DEFAULT false,
	`zweiFaktorSecret` varchar(255),
	`zweiFaktorBestaetigtAt` timestamp,
	`datevEinwilligung` boolean NOT NULL DEFAULT false,
	`datevEinwilligungAt` timestamp,
	`aktiv` int NOT NULL DEFAULT 1,
	`telefon` varchar(50),
	`mobil` varchar(50),
	`strasse` varchar(200),
	`plz` varchar(10),
	`ort` varchar(100),
	`geburtsdatum` date,
	`eintrittsdatum` date,
	`position` varchar(100),
	`beschaeftigungsart` enum('minijob','teilzeit','vollzeit') DEFAULT 'minijob',
	`zertifikatStatus` enum('erhalten','angemeldet','nicht_angemeldet') DEFAULT 'nicht_angemeldet',
	`zertifikatDatum` date,
	`zertifikatAblauf` date,
	`zertifikatBemerkung` text,
	`arbeitsvertragUrl` text,
	`arbeitsvertragDatum` date,
	`arbeitsvertragDateiname` varchar(255),
	`notizen` text,
	`hatDienstwagen` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `mitarbeiter_id` PRIMARY KEY(`id`),
	CONSTRAINT `mitarbeiter_email_unique` UNIQUE(`email`)
);

CREATE TABLE IF NOT EXISTS `mitarbeiterBerechtigungen` (
	`id` int AUTO_INCREMENT NOT NULL,
	`mitarbeiterId` int NOT NULL,
	`modul` varchar(100) NOT NULL,
	`zugriff` enum('erlaubt','verweigert') NOT NULL,
	`gesetztVonId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `mitarbeiterBerechtigungen_id` PRIMARY KEY(`id`)
);

CREATE TABLE IF NOT EXISTS `mitarbeiterDokumente` (
	`id` int AUTO_INCREMENT NOT NULL,
	`mitarbeiterId` int NOT NULL,
	`typ` enum('zertifikat','arbeitsvertrag','krankmeldung','fuehrerschein','erstehilfe','sonstiges') NOT NULL,
	`bezeichnung` varchar(255) NOT NULL,
	`dateiUrl` text,
	`dateiname` varchar(255),
	`ausstellungsdatum` date,
	`ablaufdatum` date,
	`notizen` text,
	`hochgeladenVon` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `mitarbeiterDokumente_id` PRIMARY KEY(`id`)
);

CREATE TABLE IF NOT EXISTS `mitarbeiterZweiFaktor` (
	`id` int AUTO_INCREMENT NOT NULL,
	`mitarbeiterId` int NOT NULL,
	`twoFactorEnabled` boolean NOT NULL DEFAULT false,
	`twoFactorSecret` varchar(255),
	`twoFactorActivatedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `mitarbeiterZweiFaktor_id` PRIMARY KEY(`id`),
	CONSTRAINT `mitarbeiterZweiFaktor_mitarbeiterId_unique` UNIQUE(`mitarbeiterId`)
);

CREATE TABLE IF NOT EXISTS `monatsabschluesse` (
	`id` int AUTO_INCREMENT NOT NULL,
	`monat` varchar(7) NOT NULL,
	`adminId` int NOT NULL,
	`gesamtStunden` decimal(7,2) DEFAULT '0',
	`gesamtEinsaetze` int DEFAULT 0,
	`gesamtKm` decimal(8,1) DEFAULT '0',
	`gesamtVerguetung` decimal(10,2) DEFAULT '0',
	`csvExport` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `monatsabschluesse_id` PRIMARY KEY(`id`)
);

CREATE TABLE IF NOT EXISTS `neukundenPushBestaetigung` (
	`id` int AUTO_INCREMENT NOT NULL,
	`kundenId` int NOT NULL,
	`mitarbeiterId` int NOT NULL,
	`bestaetigtAt` timestamp,
	`eskalationsstufe` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `neukundenPushBestaetigung_id` PRIMARY KEY(`id`)
);

CREATE TABLE IF NOT EXISTS `notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`empfaengerId` int NOT NULL,
	`titel` varchar(200) NOT NULL,
	`nachricht` text NOT NULL,
	`typ` enum('info','warnung','erfolg','fehler') NOT NULL DEFAULT 'info',
	`gelesen` boolean NOT NULL DEFAULT false,
	`linkUrl` varchar(500),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`)
);

CREATE TABLE IF NOT EXISTS `paragraphSaetze` (
	`id` int AUTO_INCREMENT NOT NULL,
	`paragraph` enum('45b','45a','39') NOT NULL,
	`satzProStunde` decimal(6,2) NOT NULL,
	`lohnProStunde` decimal(6,2) NOT NULL DEFAULT '16.00',
	`anfahrtPauschale` decimal(6,2) NOT NULL DEFAULT '6.00',
	`gueltigAb` date NOT NULL,
	`aktiv` boolean NOT NULL DEFAULT true,
	`geaendertVon` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `paragraphSaetze_id` PRIMARY KEY(`id`)
);

CREATE TABLE IF NOT EXISTS `passwordResets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`mitarbeiterId` int NOT NULL,
	`token` varchar(128) NOT NULL,
	`expiresAt` timestamp NOT NULL,
	`used` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `passwordResets_id` PRIMARY KEY(`id`),
	CONSTRAINT `passwordResets_token_unique` UNIQUE(`token`)
);

CREATE TABLE IF NOT EXISTS `permissions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`key` varchar(100) NOT NULL,
	`description` varchar(255),
	CONSTRAINT `permissions_id` PRIMARY KEY(`id`),
	CONSTRAINT `permissions_key_unique` UNIQUE(`key`)
);

CREATE TABLE IF NOT EXISTS `planungsWarnungen` (
	`id` int AUTO_INCREMENT NOT NULL,
	`code` varchar(60) NOT NULL,
	`schwere` enum('blockierend','warnung','hinweis') NOT NULL DEFAULT 'warnung',
	`titel` varchar(200) NOT NULL,
	`nachricht` text NOT NULL,
	`mitarbeiterId` int,
	`kundenId` int,
	`einsatzId` int,
	`monat` varchar(7),
	`bestaetigtAt` timestamp,
	`bestaetigtVon` int,
	`geloeschtAt` timestamp,
	`geloeschtVon` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `planungsWarnungen_id` PRIMARY KEY(`id`)
);

CREATE TABLE IF NOT EXISTS `prognoseSnapshots` (
	`id` int AUTO_INCREMENT NOT NULL,
	`monat` varchar(7) NOT NULL,
	`typ` enum('budget','personal','auslastung','umsatz') NOT NULL,
	`prognoseWert` decimal(12,2) NOT NULL,
	`basisWert` decimal(12,2) NOT NULL,
	`vertrauenProzent` int NOT NULL DEFAULT 70,
	`details` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `prognoseSnapshots_id` PRIMARY KEY(`id`)
);

CREATE TABLE IF NOT EXISTS `pushSubscriptions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`mitarbeiterId` int NOT NULL,
	`endpoint` text NOT NULL,
	`p256dh` text NOT NULL,
	`auth` varchar(256) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `pushSubscriptions_id` PRIMARY KEY(`id`)
);

CREATE TABLE IF NOT EXISTS `refreshTokens` (
	`id` int AUTO_INCREMENT NOT NULL,
	`mitarbeiterId` int NOT NULL,
	`token` varchar(128) NOT NULL,
	`expiresAt` timestamp NOT NULL,
	`used` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `refreshTokens_id` PRIMARY KEY(`id`),
	CONSTRAINT `refreshTokens_token_unique` UNIQUE(`token`)
);

CREATE TABLE IF NOT EXISTS `role_permissions` (
	`role_id` int NOT NULL,
	`permission_id` int NOT NULL
);

CREATE TABLE IF NOT EXISTS `roles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`key` varchar(50) NOT NULL,
	`label` varchar(100) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `roles_id` PRIMARY KEY(`id`),
	CONSTRAINT `roles_key_unique` UNIQUE(`key`)
);

CREATE TABLE IF NOT EXISTS `terminRueckmeldungen` (
	`id` int AUTO_INCREMENT NOT NULL,
	`einsatzId` int,
	`mitarbeiterId` int NOT NULL,
	`aktion` enum('bestaetigt','abgesagt','aenderung_angefragt') NOT NULL,
	`grund` text,
	`wunschDatum` date,
	`wunschZeit` time,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `terminRueckmeldungen_id` PRIMARY KEY(`id`)
);

CREATE TABLE IF NOT EXISTS `textbausteine` (
	`id` int AUTO_INCREMENT NOT NULL,
	`titel` varchar(200) NOT NULL,
	`inhalt` text NOT NULL,
	`kategorie` enum('bericht','gesundheit','aktivitaet','bemerkung','sonstiges') NOT NULL DEFAULT 'bericht',
	`paragraph` enum('45b','45a','39','alle') DEFAULT 'alle',
	`aktiv` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `textbausteine_id` PRIMARY KEY(`id`)
);

CREATE TABLE IF NOT EXISTS `tourEinsaetze` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tourId` int NOT NULL,
	`einsatzId` int,
	`reihenfolge` int NOT NULL DEFAULT 0,
	CONSTRAINT `tourEinsaetze_id` PRIMARY KEY(`id`)
);

CREATE TABLE IF NOT EXISTS `touren` (
	`id` int AUTO_INCREMENT NOT NULL,
	`mitarbeiterId` int NOT NULL,
	`datum` date NOT NULL,
	`status` enum('geplant','aktiv','abgeschlossen') NOT NULL DEFAULT 'geplant',
	`notizen` text,
	`titel` varchar(200),
	`startzeit` time,
	`endzeit` time,
	`angelegtVon` int,
	`reihenfolgeGeaendertVon` int,
	`reihenfolgeGeaendertAt` timestamp,
	`geloeschtAt` timestamp,
	`geloeschtVon` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `touren_id` PRIMARY KEY(`id`)
);

CREATE TABLE IF NOT EXISTS `urlaubsantraege` (
	`id` int AUTO_INCREMENT NOT NULL,
	`mitarbeiterId` int NOT NULL,
	`von` date NOT NULL,
	`bis` date NOT NULL,
	`tage` int NOT NULL,
	`notizen` text,
	`status` enum('beantragt','genehmigt','abgelehnt') NOT NULL DEFAULT 'beantragt',
	`adminNotiz` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`geloeschtAt` timestamp,
	`geloeschtVon` int,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `urlaubsantraege_id` PRIMARY KEY(`id`)
);

CREATE TABLE IF NOT EXISTS `users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`openId` varchar(64) NOT NULL,
	`name` text,
	`email` varchar(320),
	`loginMethod` varchar(64),
	`role` enum('user','admin') NOT NULL DEFAULT 'user',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`lastSignedIn` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_openId_unique` UNIQUE(`openId`)
);

CREATE TABLE IF NOT EXISTS `verfuegbarkeiten` (
	`id` int AUTO_INCREMENT NOT NULL,
	`mitarbeiterId` int NOT NULL,
	`wochentag` int NOT NULL,
	`vonZeit` time NOT NULL,
	`bisZeit` time NOT NULL,
	`gueltigVon` date,
	`gueltigBis` date,
	`status` enum('verfuegbar','nicht_verfuegbar','bevorzugt') NOT NULL DEFAULT 'verfuegbar',
	`notiz` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `verfuegbarkeiten_id` PRIMARY KEY(`id`)
);

CREATE TABLE IF NOT EXISTS `vertretungen` (
	`id` int AUTO_INCREMENT NOT NULL,
	`vertreterId` int NOT NULL,
	`vertretenId` int NOT NULL,
	`von` date NOT NULL,
	`bis` date NOT NULL,
	`grund` varchar(255),
	`freigegebenVon` int,
	`aktiv` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `vertretungen_id` PRIMARY KEY(`id`)
);

CREATE TABLE IF NOT EXISTS `vertretungsUebernahmen` (
	`id` int AUTO_INCREMENT NOT NULL,
	`urlaubsantragId` int NOT NULL,
	`kundenId` int NOT NULL,
	`vertreterId` int NOT NULL,
	`bestaetigtAt` timestamp NOT NULL DEFAULT (now()),
	`vollzugriffBis` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `vertretungsUebernahmen_id` PRIMARY KEY(`id`)
);

CREATE TABLE IF NOT EXISTS `zweiFaktorCodes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`mitarbeiterId` int NOT NULL,
	`codeHash` varchar(255) NOT NULL,
	`verwendet` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `zweiFaktorCodes_id` PRIMARY KEY(`id`)
);
