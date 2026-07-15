-- Pflichtenheft 2026: neue Rollen, Sicherheit und Fachmodule
-- Absichtlich eng begrenzt: keine historischen Kunden-Stammdatenfelder werden verändert.

ALTER TABLE `mitarbeiter`
  MODIFY COLUMN `rolle` enum('mitarbeiter','teamleitung','buchhaltung','admin') NOT NULL DEFAULT 'mitarbeiter',
  ADD COLUMN `berechtigungen` text,
  ADD COLUMN `zweiFaktorAktiv` boolean NOT NULL DEFAULT false,
  ADD COLUMN `zweiFaktorSecret` varchar(255),
  ADD COLUMN `zweiFaktorBestaetigtAt` timestamp NULL,
  ADD COLUMN `datevEinwilligung` boolean NOT NULL DEFAULT false,
  ADD COLUMN `datevEinwilligungAt` timestamp NULL;

ALTER TABLE `kunden`
  ADD COLUMN `geloeschtAt` timestamp NULL,
  ADD COLUMN `geloeschtVon` int,
  ADD COLUMN `loeschgrund` text;

ALTER TABLE `einsaetze`
  MODIFY COLUMN `status` enum('geplant','bestaetigt','aenderung_angefragt','abgeschlossen','abgesagt') NOT NULL DEFAULT 'geplant',
  ADD COLUMN `bestaetigtAt` timestamp NULL,
  ADD COLUMN `absagegrund` text,
  ADD COLUMN `aenderungswunsch` text,
  ADD COLUMN `tatsaechlicherStart` timestamp NULL,
  ADD COLUMN `tatsaechlichesEnde` timestamp NULL;

CREATE TABLE `verfuegbarkeiten` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `mitarbeiterId` int NOT NULL,
  `wochentag` int NOT NULL,
  `vonZeit` time NOT NULL,
  `bisZeit` time NOT NULL,
  `gueltigVon` date,
  `gueltigBis` date,
  `status` enum('verfuegbar','nicht_verfuegbar','bevorzugt') NOT NULL DEFAULT 'verfuegbar',
  `notiz` text,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_verfuegbarkeiten_mitarbeiter` (`mitarbeiterId`),
  INDEX `idx_verfuegbarkeiten_zeitraum` (`gueltigVon`, `gueltigBis`)
);

CREATE TABLE `arbeitszeitKonten` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `mitarbeiterId` int NOT NULL,
  `monat` varchar(7) NOT NULL,
  `sollStunden` decimal(7,2) NOT NULL DEFAULT 0,
  `istStunden` decimal(7,2) NOT NULL DEFAULT 0,
  `ueberstunden` decimal(7,2) NOT NULL DEFAULT 0,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uq_arbeitszeit_mitarbeiter_monat` (`mitarbeiterId`, `monat`)
);

CREATE TABLE `terminRueckmeldungen` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `einsatzId` int NOT NULL,
  `mitarbeiterId` int NOT NULL,
  `aktion` enum('bestaetigt','abgesagt','aenderung_angefragt') NOT NULL,
  `grund` text,
  `wunschDatum` date,
  `wunschZeit` time,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_terminRueckmeldung_einsatz` (`einsatzId`),
  INDEX `idx_terminRueckmeldung_mitarbeiter` (`mitarbeiterId`)
);

CREATE TABLE `besuchsberichte` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
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
  `freigegebenAt` timestamp NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_besuchsberichte_kunde_datum` (`kundenId`, `datum`),
  INDEX `idx_besuchsberichte_mitarbeiter` (`mitarbeiterId`),
  INDEX `idx_besuchsberichte_status` (`status`)
);

CREATE TABLE `integrationen` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `anbieter` enum('datev','optadata','pflegekassen','gehaltsprogramm','email','ebrief','redis','maps','ki') NOT NULL,
  `bezeichnung` varchar(200) NOT NULL,
  `status` enum('nicht_eingerichtet','testmodus','aktiv','fehler','pausiert') NOT NULL DEFAULT 'nicht_eingerichtet',
  `basisUrl` text,
  `verschluesselteZugangsdaten` text,
  `zugangHinweis` varchar(100),
  `konfiguration` text,
  `letzterTestAt` timestamp NULL,
  `letzterTestStatus` enum('erfolg','fehler'),
  `letzterFehler` text,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_integrationen_anbieter` (`anbieter`)
);

CREATE TABLE `integrationsLaeufe` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `integrationId` int NOT NULL,
  `gestartetVon` int,
  `typ` enum('test','export','import','synchronisation','backup') NOT NULL,
  `status` enum('gestartet','erfolg','fehler','teilweise') NOT NULL DEFAULT 'gestartet',
  `anzahlDatensaetze` int DEFAULT 0,
  `meldung` text,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `beendetAt` timestamp NULL,
  INDEX `idx_integrationsLaeufe_integration` (`integrationId`),
  INDEX `idx_integrationsLaeufe_created` (`createdAt`)
);

CREATE TABLE `datenschutzDokumente` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `typ` enum('datenschutzerklaerung','avv','einwilligung','loeschkonzept','verarbeitungsverzeichnis') NOT NULL,
  `titel` varchar(255) NOT NULL,
  `version` varchar(40) NOT NULL,
  `inhalt` text,
  `dateiUrl` text,
  `aktiv` boolean NOT NULL DEFAULT true,
  `gueltigAb` date,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_datenschutz_typ_aktiv` (`typ`, `aktiv`)
);

CREATE TABLE `einwilligungen` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `personTyp` enum('mitarbeiter','kunde') NOT NULL,
  `personId` int NOT NULL,
  `zweck` enum('datev','optadata','pflegekasse','email','ki','allgemein') NOT NULL,
  `erteilt` boolean NOT NULL,
  `dokumentVersion` varchar(40),
  `ipAddress` varchar(45),
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `widerrufenAt` timestamp NULL,
  INDEX `idx_einwilligungen_person_zweck` (`personTyp`, `personId`, `zweck`),
  INDEX `idx_einwilligungen_created` (`createdAt`)
);

CREATE TABLE `loeschAnfragen` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `personTyp` enum('mitarbeiter','kunde') NOT NULL,
  `personId` int NOT NULL,
  `grund` text,
  `status` enum('angefragt','geprueft','gesperrt','anonymisiert','abgelehnt') NOT NULL DEFAULT 'angefragt',
  `bearbeitetVon` int,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_loeschAnfragen_status` (`status`),
  INDEX `idx_loeschAnfragen_person` (`personTyp`, `personId`)
);

CREATE TABLE `backupLaeufe` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `typ` enum('datenbank','dokumente','vollbackup') NOT NULL,
  `status` enum('gestartet','erfolg','fehler') NOT NULL DEFAULT 'gestartet',
  `speicherort` varchar(255),
  `pruefsumme` varchar(128),
  `meldung` text,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `beendetAt` timestamp NULL,
  INDEX `idx_backupLaeufe_created` (`createdAt`),
  INDEX `idx_backupLaeufe_status` (`status`)
);

CREATE TABLE `prognoseSnapshots` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `monat` varchar(7) NOT NULL,
  `typ` enum('budget','personal','auslastung','umsatz') NOT NULL,
  `prognoseWert` decimal(12,2) NOT NULL,
  `basisWert` decimal(12,2) NOT NULL,
  `vertrauenProzent` int NOT NULL DEFAULT 70,
  `details` text,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_prognoseSnapshots_monat_typ` (`monat`, `typ`)
);
