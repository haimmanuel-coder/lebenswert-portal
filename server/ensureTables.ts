/**
 * ════════════════════════════════════════════════════════════════════════════
 *  ENSURE TABLES – Zentrales Migrations-Absicherungs-Skript
 *  Wird beim Server-Start aufgerufen und erstellt alle Tabellen per
 *  CREATE TABLE IF NOT EXISTS, falls sie in der DB fehlen.
 *
 *  Die Schema-Tabellen sind aus drizzle/schema.ts generiert (drizzle-kit export),
 *  damit sie exakt mit dem Schema übereinstimmen. Zusätzliche, nur per Rohsql
 *  genutzte Tabellen sind manuell ergänzt.
 * ════════════════════════════════════════════════════════════════════════════
 */
import { getDb } from "./db";
import { sql } from "drizzle-orm";

const TABLE_DEFINITIONS: string[] = [
  `CREATE TABLE IF NOT EXISTS \`alleinarbeits_protokolle\` (
	\`id\` int AUTO_INCREMENT NOT NULL,
	\`mitarbeiterId\` int NOT NULL,
	\`kundenId\` int,
	\`einsatzId\` int,
	\`checkInZeit\` timestamp,
	\`checkOutZeit\` timestamp,
	\`checkInStatus\` enum('eingecheckt','ausgecheckt','ueberfaellig','notfall') NOT NULL DEFAULT 'eingecheckt',
	\`notfallKontakt\` varchar(255),
	\`bemerkung\` text,
	\`createdAt\` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT \`alleinarbeits_protokolle_id\` PRIMARY KEY(\`id\`)
)`,

  `CREATE TABLE IF NOT EXISTS \`analyseSnapshots\` (
	\`id\` int AUTO_INCREMENT NOT NULL,
	\`monat\` varchar(7) NOT NULL,
	\`typ\` varchar(50) NOT NULL,
	\`daten\` text NOT NULL,
	\`createdAt\` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT \`analyseSnapshots_id\` PRIMARY KEY(\`id\`)
)`,

  `CREATE TABLE IF NOT EXISTS \`arbeitsmed_vorsorgen\` (
	\`id\` int AUTO_INCREMENT NOT NULL,
	\`mitarbeiterId\` int NOT NULL,
	\`vorsorgeart\` enum('pflicht','angebot','wunsch') NOT NULL,
	\`anlass\` varchar(255) NOT NULL,
	\`faelligkeit\` date NOT NULL,
	\`durchgefuehrtAm\` date,
	\`arzt\` varchar(255),
	\`ergebnis\` enum('geeignet','bedingt_geeignet','nicht_geeignet','ausstehend') NOT NULL DEFAULT 'ausstehend',
	\`naechsteFaelligkeit\` date,
	\`notizen\` text,
	\`createdAt\` timestamp NOT NULL DEFAULT (now()),
	\`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT \`arbeitsmed_vorsorgen_id\` PRIMARY KEY(\`id\`)
)`,

  `CREATE TABLE IF NOT EXISTS \`arbeitssicherheit_audit_log\` (
	\`id\` int AUTO_INCREMENT NOT NULL,
	\`aktion\` varchar(100) NOT NULL,
	\`bereich\` enum('gefaehrdung','psa','vorsorge','alleinarbeit','unterweisung','allgemein') NOT NULL DEFAULT 'allgemein',
	\`referenzId\` int,
	\`adminId\` int,
	\`adminName\` varchar(200),
	\`details\` text,
	\`createdAt\` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT \`arbeitssicherheit_audit_log_id\` PRIMARY KEY(\`id\`)
)`,

  `CREATE TABLE IF NOT EXISTS \`arbeitssicherheit_unterweisungen\` (
	\`id\` int AUTO_INCREMENT NOT NULL,
	\`mitarbeiterId\` int NOT NULL,
	\`thema\` enum('notfall_erste_hilfe','hygiene_desinfektion','ergonomie_heben_tragen','deeskalation_demenz','verkehrssicherheit','psa_verwendung','alleinarbeit_schutz','biostoff_infektionsschutz','sonstiges') NOT NULL,
	\`unterweisungsDatum\` date NOT NULL,
	\`naechsteFaelligkeit\` date,
	\`bestaetigt\` boolean NOT NULL DEFAULT false,
	\`bestaetigtAm\` timestamp,
	\`durchgefuehrtVon\` int,
	\`inhalt\` text,
	\`createdAt\` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT \`arbeitssicherheit_unterweisungen_id\` PRIMARY KEY(\`id\`)
)`,

  `CREATE TABLE IF NOT EXISTS \`arbeitszeitKonten\` (
	\`id\` int AUTO_INCREMENT NOT NULL,
	\`mitarbeiterId\` int NOT NULL,
	\`monat\` varchar(7) NOT NULL,
	\`sollStunden\` decimal(7,2) NOT NULL DEFAULT '0',
	\`istStunden\` decimal(7,2) NOT NULL DEFAULT '0',
	\`ueberstunden\` decimal(7,2) NOT NULL DEFAULT '0',
	\`createdAt\` timestamp NOT NULL DEFAULT (now()),
	\`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT \`arbeitszeitKonten_id\` PRIMARY KEY(\`id\`)
)`,

  `CREATE TABLE IF NOT EXISTS \`auditLogs\` (
	\`id\` int AUTO_INCREMENT NOT NULL,
	\`mitarbeiterId\` int,
	\`action\` varchar(50) NOT NULL,
	\`ressource\` varchar(100),
	\`details\` text,
	\`status\` enum('success','failure','partial') NOT NULL DEFAULT 'success',
	\`ipAddress\` varchar(45),
	\`createdAt\` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT \`auditLogs_id\` PRIMARY KEY(\`id\`)
)`,

  `CREATE TABLE IF NOT EXISTS \`backupLaeufe\` (
	\`id\` int AUTO_INCREMENT NOT NULL,
	\`typ\` enum('datenbank','dokumente','vollbackup') NOT NULL,
	\`status\` enum('gestartet','erfolg','fehler') NOT NULL DEFAULT 'gestartet',
	\`speicherort\` varchar(255),
	\`pruefsumme\` varchar(128),
	\`meldung\` text,
	\`createdAt\` timestamp NOT NULL DEFAULT (now()),
	\`beendetAt\` timestamp,
	CONSTRAINT \`backupLaeufe_id\` PRIMARY KEY(\`id\`)
)`,

  `CREATE TABLE IF NOT EXISTS \`backupProtokolle\` (
	\`id\` int AUTO_INCREMENT NOT NULL,
	\`typ\` varchar(50) NOT NULL DEFAULT 'auto',
	\`status\` enum('erfolgreich','fehlgeschlagen','laufend') NOT NULL,
	\`fehlerMeldung\` text,
	\`datenbankGroesse\` varchar(50),
	\`createdAt\` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT \`backupProtokolle_id\` PRIMARY KEY(\`id\`)
)`,

  `CREATE TABLE IF NOT EXISTS \`besuchsberichtDateien\` (
	\`id\` int AUTO_INCREMENT NOT NULL,
	\`berichtId\` int NOT NULL,
	\`dateiKey\` varchar(500) NOT NULL,
	\`dateiUrl\` text NOT NULL,
	\`dateiname\` varchar(255),
	\`mimeType\` varchar(100),
	\`groesse\` int,
	\`kategorie\` enum('foto','dokument','unterschrift','sonstiges') DEFAULT 'foto',
	\`createdAt\` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT \`besuchsberichtDateien_id\` PRIMARY KEY(\`id\`)
)`,

  `CREATE TABLE IF NOT EXISTS \`besuchsberichte\` (
	\`id\` int AUTO_INCREMENT NOT NULL,
	\`einsatzId\` int,
	\`kundenId\` int NOT NULL,
	\`mitarbeiterId\` int NOT NULL,
	\`datum\` date NOT NULL,
	\`dauerMinuten\` int,
	\`pflegegradSnapshot\` varchar(20),
	\`fahrtKilometer\` decimal(6,1),
	\`fahrtVonOrt\` varchar(200),
	\`fahrtNachOrt\` varchar(200),
	\`taetigkeiten\` text NOT NULL,
	\`beobachtungen\` text,
	\`besonderheiten\` text,
	\`naechsteSchritte\` text,
	\`kiVorschlag\` text,
	\`anhangUrls\` text,
	\`status\` enum('entwurf','eingereicht','freigegeben','korrektur') NOT NULL DEFAULT 'entwurf',
	\`freigegebenVon\` int,
	\`freigegebenAt\` timestamp,
	\`createdAt\` timestamp NOT NULL DEFAULT (now()),
	\`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT \`besuchsberichte_id\` PRIMARY KEY(\`id\`)
)`,

  `CREATE TABLE IF NOT EXISTS \`budgetTransaktionen\` (
	\`id\` int AUTO_INCREMENT NOT NULL,
	\`kundenId\` int NOT NULL,
	\`leistungId\` int,
	\`mitarbeiterId\` int,
	\`typ\` enum('abbuchung','rueckerstattung','korrektur') NOT NULL,
	\`paragraph\` enum('45b','45a','39') NOT NULL,
	\`betrag\` decimal(10,2) NOT NULL,
	\`stunden\` decimal(5,2),
	\`monat\` varchar(7),
	\`beschreibung\` varchar(500),
	\`createdAt\` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT \`budgetTransaktionen_id\` PRIMARY KEY(\`id\`)
)`,

  `CREATE TABLE IF NOT EXISTS \`controllingSnapshots\` (
	\`id\` int AUTO_INCREMENT NOT NULL,
	\`monat\` varchar(7) NOT NULL,
	\`kundenId\` int NOT NULL,
	\`mitarbeiterId\` int,
	\`leistungsbereich\` varchar(10) NOT NULL,
	\`jahresbudgetCent\` int NOT NULL DEFAULT 0,
	\`monatsbudgetCent\` int NOT NULL DEFAULT 0,
	\`geplanteMinuten\` int NOT NULL DEFAULT 0,
	\`tatsaechlicheMinuten\` int NOT NULL DEFAULT 0,
	\`verbrauchtCent\` int NOT NULL DEFAULT 0,
	\`createdAt\` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT \`controllingSnapshots_id\` PRIMARY KEY(\`id\`)
)`,

  `CREATE TABLE IF NOT EXISTS \`datenschutz_audit_log\` (
	\`id\` int AUTO_INCREMENT NOT NULL,
	\`aktion\` varchar(80) NOT NULL,
	\`dokumentId\` int,
	\`dokumentTitel\` varchar(255),
	\`adminId\` int,
	\`adminName\` varchar(255),
	\`details\` text,
	\`createdAt\` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT \`datenschutz_audit_log_id\` PRIMARY KEY(\`id\`)
)`,

  `CREATE TABLE IF NOT EXISTS \`datenschutzDokumente\` (
	\`id\` int AUTO_INCREMENT NOT NULL,
	\`typ\` enum('datenschutzerklaerung','avv','einwilligung','loeschkonzept','verarbeitungsverzeichnis') NOT NULL,
	\`titel\` varchar(255) NOT NULL,
	\`version\` varchar(40) NOT NULL,
	\`inhalt\` text,
	\`dateiUrl\` text,
	\`aktiv\` boolean NOT NULL DEFAULT true,
	\`gueltigAb\` date,
	\`createdAt\` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT \`datenschutzDokumente_id\` PRIMARY KEY(\`id\`)
)`,

  `CREATE TABLE IF NOT EXISTS \`datenschutzZustimmungen\` (
	\`id\` int AUTO_INCREMENT NOT NULL,
	\`mitarbeiterId\` int NOT NULL,
	\`dokumentId\` int NOT NULL,
	\`dokumentVersion\` varchar(20) NOT NULL,
	\`ipHash\` varchar(64),
	\`zugestimmtAt\` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT \`datenschutzZustimmungen_id\` PRIMARY KEY(\`id\`),
	CONSTRAINT \`uq_datenschutz_mitarbeiter_dokument\` UNIQUE(\`mitarbeiterId\`,\`dokumentId\`)
)`,

  `CREATE TABLE IF NOT EXISTS \`ebriefLog\` (
	\`id\` int AUTO_INCREMENT NOT NULL,
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
	\`createdAt\` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT \`ebriefLog_id\` PRIMARY KEY(\`id\`)
)`,

  `CREATE TABLE IF NOT EXISTS \`einsaetze\` (
	\`id\` int AUTO_INCREMENT NOT NULL,
	\`mitarbeiterId\` int NOT NULL,
	\`kundenId\` int NOT NULL,
	\`datum\` date NOT NULL,
	\`startzeit\` time,
	\`dauerStunden\` decimal(4,2),
	\`paragraph\` enum('45b','45a','39') NOT NULL DEFAULT '45b',
	\`status\` enum('geplant','bestaetigt','aenderung_angefragt','abgeschlossen','abgesagt') NOT NULL DEFAULT 'geplant',
	\`bestaetigtAt\` timestamp,
	\`absagegrund\` text,
	\`aenderungswunsch\` text,
	\`tatsaechlicherStart\` timestamp,
	\`tatsaechlichesEnde\` timestamp,
	\`bericht\` text,
	\`gesundheit\` enum('gut','stabil','auffaellig','kritisch'),
	\`bemerkung\` text,
	\`unterschriftMitarbeiter\` text,
	\`unterschriftKunde\` text,
	\`unterschriftErsatzTyp\` enum('keine','vollmacht','mitarbeiter_vermerk') DEFAULT 'keine',
	\`unterschriftErsatzName\` varchar(200),
	\`unterschriftBegruendung\` text,
	\`unterschriftFreigabeStatus\` enum('nicht_erforderlich','ausstehend','freigegeben') DEFAULT 'nicht_erforderlich',
	\`unterschriftFreigegebenVon\` int,
	\`unterschriftFreigegebenAm\` timestamp,
	\`textbausteinIds\` text,
	\`createdAt\` timestamp NOT NULL DEFAULT (now()),
	\`anfahrtPauschale\` decimal(5,2) DEFAULT '6.00',
	\`unterschreitungEskaliert\` boolean DEFAULT false,
	\`wochenendeinsatz\` boolean NOT NULL DEFAULT false,
	\`endzeit\` time,
	\`paragraph2\` enum('45b','45a','39'),
	\`stunden1\` decimal(5,2),
	\`stunden2\` decimal(5,2),
	\`kosten1\` decimal(8,2),
	\`kosten2\` decimal(8,2),
	\`lohnkosten\` decimal(8,2),
	\`budgetGebucht\` boolean DEFAULT false,
	\`notizen\` text,
	\`geplantVon\` int,
	\`geloeschtAt\` timestamp,
	\`geloeschtVon\` int,
	\`loeschgrund\` text,
	\`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT \`einsaetze_id\` PRIMARY KEY(\`id\`)
)`,

  `CREATE TABLE IF NOT EXISTS \`einsatzAenderungen\` (
	\`id\` int AUTO_INCREMENT NOT NULL,
	\`einsatzId\` int,
	\`aenderungstyp\` enum('erstellt','geaendert','abgesagt','verschoben','bestaetigt','abgelehnt') NOT NULL,
	\`aenderungsgrund\` text,
	\`alteDaten\` text,
	\`neueDaten\` text,
	\`geaendertVonId\` int,
	\`benachrichtigtAt\` timestamp,
	\`createdAt\` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT \`einsatzAenderungen_id\` PRIMARY KEY(\`id\`)
)`,

  `CREATE TABLE IF NOT EXISTS \`einwilligungen\` (
	\`id\` int AUTO_INCREMENT NOT NULL,
	\`personTyp\` enum('mitarbeiter','kunde') NOT NULL,
	\`personId\` int NOT NULL,
	\`zweck\` enum('datev','optadata','pflegekasse','email','ki','allgemein') NOT NULL,
	\`erteilt\` boolean NOT NULL,
	\`dokumentVersion\` varchar(40),
	\`ipAddress\` varchar(45),
	\`createdAt\` timestamp NOT NULL DEFAULT (now()),
	\`widerrufenAt\` timestamp,
	CONSTRAINT \`einwilligungen_id\` PRIMARY KEY(\`id\`)
)`,

  `CREATE TABLE IF NOT EXISTS \`employee_roles\` (
	\`employee_id\` int NOT NULL,
	\`role_id\` int NOT NULL,
	\`assigned_at\` timestamp NOT NULL DEFAULT (now()),
	\`assigned_by\` int
)`,

  `CREATE TABLE IF NOT EXISTS \`erste_hilfe_kurse\` (
	\`id\` int AUTO_INCREMENT NOT NULL,
	\`mitarbeiterId\` int NOT NULL,
	\`kursName\` varchar(255) NOT NULL DEFAULT 'Erste-Hilfe-Kurs',
	\`kursAnbieter\` varchar(255),
	\`kursDatum\` date NOT NULL,
	\`ablaufDatum\` date,
	\`status\` enum('bestanden','angemeldet','abgelaufen') NOT NULL DEFAULT 'bestanden',
	\`fotoKey\` varchar(500),
	\`fotoUrl\` varchar(500),
	\`fotoBase64\` text,
	\`fotoMimeType\` varchar(100),
	\`bemerkung\` text,
	\`createdAt\` timestamp NOT NULL DEFAULT (now()),
	\`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT \`erste_hilfe_kurse_id\` PRIMARY KEY(\`id\`)
)`,

  `CREATE TABLE IF NOT EXISTS \`fahrten\` (
	\`id\` int AUTO_INCREMENT NOT NULL,
	\`mitarbeiterId\` int NOT NULL,
	\`kundenId\` int,
	\`datum\` date NOT NULL,
	\`vonOrt\` varchar(200) NOT NULL,
	\`nachOrt\` varchar(200) NOT NULL,
	\`kilometer\` decimal(6,1) NOT NULL,
	\`kilometerHin\` decimal(6,1),
	\`kilometerRueck\` decimal(6,1),
	\`typ\` enum('normal','sonder') NOT NULL DEFAULT 'normal',
	\`zweck\` varchar(255),
	\`verguetung\` decimal(7,2) DEFAULT '0',
	\`abrechnungsStatus\` enum('offen','eingereicht','erstattet') DEFAULT 'offen',
	\`monat\` varchar(7),
	\`einsatzId\` int,
	\`geloeschtAt\` timestamp,
	\`geloeschtVon\` int,
	\`createdAt\` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT \`fahrten_id\` PRIMARY KEY(\`id\`)
)`,

  `CREATE TABLE IF NOT EXISTS \`formularVorlagen\` (
	\`id\` int AUTO_INCREMENT NOT NULL,
	\`name\` varchar(200) NOT NULL,
	\`version\` varchar(20) NOT NULL,
	\`felder\` text NOT NULL,
	\`aktiv\` boolean NOT NULL DEFAULT true,
	\`createdAt\` timestamp NOT NULL DEFAULT (now()),
	\`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT \`formularVorlagen_id\` PRIMARY KEY(\`id\`)
)`,

  `CREATE TABLE IF NOT EXISTS \`gefaehrdungsbeurteilungen\` (
	\`id\` int AUTO_INCREMENT NOT NULL,
	\`titel\` varchar(255) NOT NULL,
	\`bereich\` enum('haushalt_senior','wegeunfall','ergonomie_physisch','psychisch','hygiene_infektion','sonstiges') NOT NULL,
	\`risikobeschreibung\` text NOT NULL,
	\`massnahmen\` text,
	\`verantwortlich\` varchar(255),
	\`status\` enum('offen','in_bearbeitung','erledigt') NOT NULL DEFAULT 'offen',
	\`risikoStufe\` enum('niedrig','mittel','hoch') NOT NULL DEFAULT 'mittel',
	\`naechstePruefung\` date,
	\`erstelltVon\` int,
	\`createdAt\` timestamp NOT NULL DEFAULT (now()),
	\`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT \`gefaehrdungsbeurteilungen_id\` PRIMARY KEY(\`id\`)
)`,

  `CREATE TABLE IF NOT EXISTS \`integrationen\` (
	\`id\` int AUTO_INCREMENT NOT NULL,
	\`anbieter\` enum('datev','optadata','pflegekassen','gehaltsprogramm','email','ebrief','redis','maps','ki') NOT NULL,
	\`bezeichnung\` varchar(200) NOT NULL,
	\`status\` enum('nicht_eingerichtet','testmodus','aktiv','fehler','pausiert') NOT NULL DEFAULT 'nicht_eingerichtet',
	\`basisUrl\` text,
	\`verschluesselteZugangsdaten\` text,
	\`zugangHinweis\` varchar(100),
	\`konfiguration\` text,
	\`letzterTestAt\` timestamp,
	\`letzterTestStatus\` enum('erfolg','fehler'),
	\`letzterFehler\` text,
	\`createdAt\` timestamp NOT NULL DEFAULT (now()),
	\`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT \`integrationen_id\` PRIMARY KEY(\`id\`)
)`,

  `CREATE TABLE IF NOT EXISTS \`integrationsLaeufe\` (
	\`id\` int AUTO_INCREMENT NOT NULL,
	\`integrationId\` int NOT NULL,
	\`gestartetVon\` int,
	\`typ\` enum('test','export','import','synchronisation','backup') NOT NULL,
	\`status\` enum('gestartet','erfolg','fehler','teilweise') NOT NULL DEFAULT 'gestartet',
	\`anzahlDatensaetze\` int DEFAULT 0,
	\`meldung\` text,
	\`createdAt\` timestamp NOT NULL DEFAULT (now()),
	\`beendetAt\` timestamp,
	CONSTRAINT \`integrationsLaeufe_id\` PRIMARY KEY(\`id\`)
)`,

  `CREATE TABLE IF NOT EXISTS \`jahresbudgets\` (
	\`id\` int AUTO_INCREMENT NOT NULL,
	\`kundenId\` int NOT NULL,
	\`leistungsbereich\` enum('45b','39','45a','privat','sonstige') NOT NULL,
	\`jahresbudgetCent\` int NOT NULL DEFAULT 0,
	\`verbrauchtCent\` int NOT NULL DEFAULT 0,
	\`gueltigAb\` date NOT NULL,
	\`gueltigBis\` date NOT NULL,
	\`stundensatzCent\` int NOT NULL DEFAULT 3500,
	\`notizen\` text,
	\`createdAt\` timestamp NOT NULL DEFAULT (now()),
	\`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT \`jahresbudgets_id\` PRIMARY KEY(\`id\`)
)`,

  `CREATE TABLE IF NOT EXISTS \`kostentraeger\` (
	\`id\` int AUTO_INCREMENT NOT NULL,
	\`name\` varchar(200) NOT NULL,
	\`ikNummer\` varchar(20),
	\`typ\` enum('pflegekasse','krankenkasse','beihilfe','privat','sonstige') NOT NULL DEFAULT 'pflegekasse',
	\`strasse\` varchar(200),
	\`plz\` varchar(10),
	\`ort\` varchar(100),
	\`telefon\` varchar(50),
	\`email\` varchar(320),
	\`fax\` varchar(50),
	\`abrechnungsart\` enum('dta','email','ebrief','post','manuell') DEFAULT 'email',
	\`abrechnungsstelleId\` int,
	\`notizen\` text,
	\`aktiv\` int NOT NULL DEFAULT 1,
	\`createdAt\` timestamp NOT NULL DEFAULT (now()),
	\`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT \`kostentraeger_id\` PRIMARY KEY(\`id\`)
)`,

  `CREATE TABLE IF NOT EXISTS \`krankmeldungen\` (
	\`id\` int AUTO_INCREMENT NOT NULL,
	\`mitarbeiterId\` int NOT NULL,
	\`von\` date NOT NULL,
	\`bis\` date,
	\`tage\` int,
	\`notizen\` text,
	\`auAttest\` boolean DEFAULT false,
	\`createdAt\` timestamp NOT NULL DEFAULT (now()),
	\`geloeschtAt\` timestamp,
	\`geloeschtVon\` int,
	\`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT \`krankmeldungen_id\` PRIMARY KEY(\`id\`)
)`,

  `CREATE TABLE IF NOT EXISTS \`kunden\` (
	\`id\` int AUTO_INCREMENT NOT NULL,
	\`vorname\` varchar(100) NOT NULL,
	\`nachname\` varchar(100) NOT NULL,
	\`geburtsdatum\` date,
	\`strasse\` varchar(200),
	\`plz\` varchar(10),
	\`ort\` varchar(100),
	\`telefon\` varchar(50),
	\`mobil\` varchar(50),
	\`email\` varchar(320),
	\`kostentraegerId\` int,
	\`kostentraeger\` varchar(200),
	\`versicherungsnummer\` varchar(50),
	\`pflegegrad\` int DEFAULT 2,
	\`pflegegradSeit\` date,
	\`paragraph\` enum('45b','45a','39','privat') DEFAULT '45b',
	\`paragraphen\` text,
	\`kostentraegerTyp\` varchar(100),
	\`beihilfeVorhanden\` boolean DEFAULT false,
	\`beihilfePflegekasseProzent\` decimal(5,2),
	\`beihilfeProzent\` decimal(5,2),
	\`beihilfeVersicherung\` varchar(200),
	\`beihilfeBemerkungen\` text,
	\`budget37\` decimal(10,2) DEFAULT '0',
	\`verbraucht37\` decimal(10,2) DEFAULT '0',
	\`letzteAbrechnung37\` varchar(10),
	\`budget45b\` decimal(10,2) DEFAULT '0',
	\`verbraucht45b\` decimal(10,2) DEFAULT '0',
	\`letzteAbrechnung45b\` varchar(10),
	\`budget45a\` decimal(10,2) DEFAULT '0',
	\`verbraucht45a\` decimal(10,2) DEFAULT '0',
	\`letzteAbrechnung45a\` varchar(10),
	\`budget39\` decimal(10,2) DEFAULT '0',
	\`verbraucht39\` decimal(10,2) DEFAULT '0',
	\`letzteAbrechnung39\` varchar(10),
	\`vollmachtErteilt\` boolean DEFAULT false,
	\`vollmachtDatum\` date,
	\`vollmachtSignatur\` text,
	\`wunschtag1\` enum('montag','dienstag','mittwoch','donnerstag','freitag','samstag'),
	\`wunschtag2\` enum('montag','dienstag','mittwoch','donnerstag','freitag','samstag'),
	\`aktiv\` int NOT NULL DEFAULT 1,
	\`geloeschtAt\` timestamp,
	\`geloeschtVon\` int,
	\`loeschgrund\` text,
	\`notizen\` text,
	\`createdAt\` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT \`kunden_id\` PRIMARY KEY(\`id\`)
)`,

  `CREATE TABLE IF NOT EXISTS \`kundenZuordnung\` (
	\`id\` int AUTO_INCREMENT NOT NULL,
	\`mitarbeiterId\` int NOT NULL,
	\`kundenId\` int NOT NULL,
	\`prioritaet\` int NOT NULL DEFAULT 1,
	\`rolle\` enum('hauptbetreuer','vertretung') NOT NULL DEFAULT 'hauptbetreuer',
	\`zugeordnetVon\` int,
	\`createdAt\` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT \`kundenZuordnung_id\` PRIMARY KEY(\`id\`)
)`,

  `CREATE TABLE IF NOT EXISTS \`leistungen\` (
	\`id\` int AUTO_INCREMENT NOT NULL,
	\`mitarbeiterId\` int NOT NULL,
	\`kundenId\` int NOT NULL,
	\`monat\` varchar(7) NOT NULL,
	\`paragraph\` enum('45b','45a','39') NOT NULL DEFAULT '45b',
	\`stunden\` decimal(5,2) DEFAULT '0',
	\`anzahlEinsaetze\` int DEFAULT 1,
	\`betrag\` decimal(8,2) DEFAULT '0',
	\`status\` enum('offen','pruefung','freigegeben','versendet') NOT NULL DEFAULT 'offen',
	\`bemerkung\` text,
	\`unterschriftLeister\` text,
	\`unterschriftKunde\` text,
	\`unterschriftErsatzTyp\` enum('keine','vollmacht','mitarbeiter_vermerk') DEFAULT 'keine',
	\`unterschriftErsatzName\` varchar(200),
	\`unterschriftBegruendung\` text,
	\`unterschriftFreigabeStatus\` enum('nicht_erforderlich','ausstehend','freigegeben') DEFAULT 'nicht_erforderlich',
	\`unterschriftFreigegebenVon\` int,
	\`unterschriftFreigegebenAm\` timestamp,
	\`createdAt\` timestamp NOT NULL DEFAULT (now()),
	\`geloeschtAt\` timestamp,
	\`geloeschtVon\` int,
	\`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT \`leistungen_id\` PRIMARY KEY(\`id\`)
)`,

  `CREATE TABLE IF NOT EXISTS \`loeschAnfragen\` (
	\`id\` int AUTO_INCREMENT NOT NULL,
	\`personTyp\` enum('mitarbeiter','kunde') NOT NULL,
	\`personId\` int NOT NULL,
	\`grund\` text,
	\`status\` enum('angefragt','geprueft','gesperrt','anonymisiert','abgelehnt') NOT NULL DEFAULT 'angefragt',
	\`bearbeitetVon\` int,
	\`createdAt\` timestamp NOT NULL DEFAULT (now()),
	\`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT \`loeschAnfragen_id\` PRIMARY KEY(\`id\`)
)`,

  `CREATE TABLE IF NOT EXISTS \`mitarbeiter\` (
	\`id\` int AUTO_INCREMENT NOT NULL,
	\`vorname\` varchar(100) NOT NULL,
	\`nachname\` varchar(100) NOT NULL,
	\`email\` varchar(320) NOT NULL,
	\`passwortHash\` varchar(255) NOT NULL,
	\`passwortWechselErforderlich\` boolean NOT NULL DEFAULT false,
	\`startPasswortErstelltAt\` timestamp,
	\`rolle\` enum('mitarbeiter','teamleitung','buchhaltung','admin') NOT NULL DEFAULT 'mitarbeiter',
	\`berechtigungen\` text,
	\`zweiFaktorAktiv\` boolean NOT NULL DEFAULT false,
	\`zweiFaktorSecret\` varchar(255),
	\`zweiFaktorBestaetigtAt\` timestamp,
	\`datevEinwilligung\` boolean NOT NULL DEFAULT false,
	\`datevEinwilligungAt\` timestamp,
	\`aktiv\` int NOT NULL DEFAULT 1,
	\`telefon\` varchar(50),
	\`mobil\` varchar(50),
	\`strasse\` varchar(200),
	\`plz\` varchar(10),
	\`ort\` varchar(100),
	\`geburtsdatum\` date,
	\`eintrittsdatum\` date,
	\`position\` varchar(100),
	\`beschaeftigungsart\` enum('minijob','teilzeit','vollzeit') DEFAULT 'minijob',
	\`zertifikatStatus\` enum('erhalten','angemeldet','nicht_angemeldet') DEFAULT 'nicht_angemeldet',
	\`zertifikatDatum\` date,
	\`zertifikatAblauf\` date,
	\`zertifikatBemerkung\` text,
	\`arbeitsvertragUrl\` text,
	\`arbeitsvertragDatum\` date,
	\`arbeitsvertragDateiname\` varchar(255),
	\`notizen\` text,
	\`urlaubstageJahr\` int NOT NULL DEFAULT 24,
	\`urlaubstageVerbraucht\` int NOT NULL DEFAULT 0,
	\`arbeitstageWoche\` text,
	\`hatDienstwagen\` boolean NOT NULL DEFAULT false,
	\`wochenstunden\` decimal(5,2) DEFAULT '0',
	\`monatslohn\` decimal(10,2) DEFAULT '0',
	\`stundenlohn\` decimal(8,2) DEFAULT '0',
	\`zuschlaege\` text,
	\`probezeit\` int DEFAULT 6,
	\`probeEnde\` date,
	\`kuendigungsfrist\` int DEFAULT 4,
	\`arbeitszeitmodell\` enum('flexibel','fest','schicht') DEFAULT 'flexibel',
	\`sozialversicherungsnummer\` varchar(20),
	\`steuerklasse\` int DEFAULT 1,
	\`steueridentnummer\` varchar(20),
	\`iban\` varchar(34),
	\`bic\` varchar(11),
	\`bankname\` varchar(100),
	\`krankenkasse\` varchar(100),
	\`krankenversicherungsart\` enum('gesetzlich','privat') DEFAULT 'gesetzlich',
	\`notfallkontaktName\` varchar(100),
	\`notfallkontaktTelefon\` varchar(50),
	\`notfallkontaktBeziehung\` varchar(50),
	\`createdAt\` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT \`mitarbeiter_id\` PRIMARY KEY(\`id\`),
	CONSTRAINT \`mitarbeiter_email_unique\` UNIQUE(\`email\`)
)`,

  `CREATE TABLE IF NOT EXISTS \`mitarbeiterArbeitsmuster\` (
	\`id\` int AUTO_INCREMENT NOT NULL,
	\`mitarbeiterId\` int NOT NULL,
	\`arbeitstageWoche\` text NOT NULL,
	\`gueltigAb\` date NOT NULL,
	\`gueltigBis\` date,
	\`geaendertVon\` int,
	\`createdAt\` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT \`mitarbeiterArbeitsmuster_id\` PRIMARY KEY(\`id\`)
)`,

  `CREATE TABLE IF NOT EXISTS \`mitarbeiterBerechtigungen\` (
	\`id\` int AUTO_INCREMENT NOT NULL,
	\`mitarbeiterId\` int NOT NULL,
	\`modul\` varchar(100) NOT NULL,
	\`zugriff\` enum('erlaubt','verweigert') NOT NULL,
	\`gesetztVonId\` int,
	\`createdAt\` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT \`mitarbeiterBerechtigungen_id\` PRIMARY KEY(\`id\`)
)`,

  `CREATE TABLE IF NOT EXISTS \`mitarbeiterDokumente\` (
	\`id\` int AUTO_INCREMENT NOT NULL,
	\`mitarbeiterId\` int NOT NULL,
	\`typ\` enum('zertifikat','arbeitsvertrag','krankmeldung','fuehrerschein','erstehilfe','sonstiges') NOT NULL,
	\`bezeichnung\` varchar(255) NOT NULL,
	\`dateiUrl\` text,
	\`dateiname\` varchar(255),
	\`ausstellungsdatum\` date,
	\`ablaufdatum\` date,
	\`notizen\` text,
	\`hochgeladenVon\` int,
	\`createdAt\` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT \`mitarbeiterDokumente_id\` PRIMARY KEY(\`id\`)
)`,

  `CREATE TABLE IF NOT EXISTS \`mitarbeiterZweiFaktor\` (
	\`id\` int AUTO_INCREMENT NOT NULL,
	\`mitarbeiterId\` int NOT NULL,
	\`twoFactorEnabled\` boolean NOT NULL DEFAULT false,
	\`twoFactorSecret\` varchar(255),
	\`twoFactorActivatedAt\` timestamp,
	\`createdAt\` timestamp NOT NULL DEFAULT (now()),
	\`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT \`mitarbeiterZweiFaktor_id\` PRIMARY KEY(\`id\`),
	CONSTRAINT \`mitarbeiterZweiFaktor_mitarbeiterId_unique\` UNIQUE(\`mitarbeiterId\`)
)`,

  `CREATE TABLE IF NOT EXISTS \`mitteilungen\` (
	\`id\` int AUTO_INCREMENT NOT NULL,
	\`titel\` varchar(255) NOT NULL,
	\`inhalt\` text NOT NULL,
	\`prioritaet\` enum('normal','wichtig','dringend') NOT NULL DEFAULT 'normal',
	\`erstelltVon\` int NOT NULL,
	\`gueltigBis\` timestamp,
	\`lesebestaetigung_pflicht\` boolean NOT NULL DEFAULT false,
	\`aktiv\` boolean NOT NULL DEFAULT true,
	\`createdAt\` timestamp NOT NULL DEFAULT (now()),
	\`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT \`mitteilungen_id\` PRIMARY KEY(\`id\`)
)`,

  `CREATE TABLE IF NOT EXISTS \`mitteilungen_lesebestaetigung\` (
	\`id\` int AUTO_INCREMENT NOT NULL,
	\`mitteilungId\` int NOT NULL,
	\`mitarbeiterId\` int NOT NULL,
	\`gelesenAt\` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT \`mitteilungen_lesebestaetigung_id\` PRIMARY KEY(\`id\`)
)`,

  `CREATE TABLE IF NOT EXISTS \`monatsabschluesse\` (
	\`id\` int AUTO_INCREMENT NOT NULL,
	\`monat\` varchar(7) NOT NULL,
	\`adminId\` int NOT NULL,
	\`gesamtStunden\` decimal(7,2) DEFAULT '0',
	\`gesamtEinsaetze\` int DEFAULT 0,
	\`gesamtKm\` decimal(8,1) DEFAULT '0',
	\`gesamtVerguetung\` decimal(10,2) DEFAULT '0',
	\`csvExport\` text,
	\`createdAt\` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT \`monatsabschluesse_id\` PRIMARY KEY(\`id\`)
)`,

  `CREATE TABLE IF NOT EXISTS \`neukundenPushBestaetigung\` (
	\`id\` int AUTO_INCREMENT NOT NULL,
	\`kundenId\` int NOT NULL,
	\`mitarbeiterId\` int NOT NULL,
	\`bestaetigtAt\` timestamp,
	\`eskalationsstufe\` int DEFAULT 0,
	\`createdAt\` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT \`neukundenPushBestaetigung_id\` PRIMARY KEY(\`id\`)
)`,

  `CREATE TABLE IF NOT EXISTS \`notifications\` (
	\`id\` int AUTO_INCREMENT NOT NULL,
	\`empfaengerId\` int NOT NULL,
	\`titel\` varchar(200) NOT NULL,
	\`nachricht\` text NOT NULL,
	\`typ\` enum('info','warnung','erfolg','fehler') NOT NULL DEFAULT 'info',
	\`gelesen\` boolean NOT NULL DEFAULT false,
	\`linkUrl\` varchar(500),
	\`createdAt\` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT \`notifications_id\` PRIMARY KEY(\`id\`)
)`,

  `CREATE TABLE IF NOT EXISTS \`paragraphSaetze\` (
	\`id\` int AUTO_INCREMENT NOT NULL,
	\`paragraph\` enum('45b','45a','39') NOT NULL,
	\`satzProStunde\` decimal(6,2) NOT NULL,
	\`lohnProStunde\` decimal(6,2) NOT NULL DEFAULT '16.00',
	\`anfahrtPauschale\` decimal(6,2) NOT NULL DEFAULT '6.00',
	\`gueltigAb\` date NOT NULL,
	\`aktiv\` boolean NOT NULL DEFAULT true,
	\`geaendertVon\` int,
	\`createdAt\` timestamp NOT NULL DEFAULT (now()),
	\`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT \`paragraphSaetze_id\` PRIMARY KEY(\`id\`)
)`,

  `CREATE TABLE IF NOT EXISTS \`passwordResets\` (
	\`id\` int AUTO_INCREMENT NOT NULL,
	\`mitarbeiterId\` int NOT NULL,
	\`token\` varchar(128) NOT NULL,
	\`expiresAt\` timestamp NOT NULL,
	\`used\` boolean NOT NULL DEFAULT false,
	\`createdAt\` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT \`passwordResets_id\` PRIMARY KEY(\`id\`),
	CONSTRAINT \`passwordResets_token_unique\` UNIQUE(\`token\`)
)`,

  `CREATE TABLE IF NOT EXISTS \`permissions\` (
	\`id\` int AUTO_INCREMENT NOT NULL,
	\`key\` varchar(100) NOT NULL,
	\`description\` varchar(255),
	CONSTRAINT \`permissions_id\` PRIMARY KEY(\`id\`),
	CONSTRAINT \`permissions_key_unique\` UNIQUE(\`key\`)
)`,

  `CREATE TABLE IF NOT EXISTS \`planungsWarnungen\` (
	\`id\` int AUTO_INCREMENT NOT NULL,
	\`code\` varchar(60) NOT NULL,
	\`schwere\` enum('blockierend','warnung','hinweis') NOT NULL DEFAULT 'warnung',
	\`titel\` varchar(200) NOT NULL,
	\`nachricht\` text NOT NULL,
	\`mitarbeiterId\` int,
	\`kundenId\` int,
	\`einsatzId\` int,
	\`monat\` varchar(7),
	\`bestaetigtAt\` timestamp,
	\`bestaetigtVon\` int,
	\`geloeschtAt\` timestamp,
	\`geloeschtVon\` int,
	\`createdAt\` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT \`planungsWarnungen_id\` PRIMARY KEY(\`id\`)
)`,

  `CREATE TABLE IF NOT EXISTS \`prognoseSnapshots\` (
	\`id\` int AUTO_INCREMENT NOT NULL,
	\`monat\` varchar(7) NOT NULL,
	\`typ\` enum('budget','personal','auslastung','umsatz') NOT NULL,
	\`prognoseWert\` decimal(12,2) NOT NULL,
	\`basisWert\` decimal(12,2) NOT NULL,
	\`vertrauenProzent\` int NOT NULL DEFAULT 70,
	\`details\` text,
	\`createdAt\` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT \`prognoseSnapshots_id\` PRIMARY KEY(\`id\`)
)`,

  `CREATE TABLE IF NOT EXISTS \`psa_ausgaben\` (
	\`id\` int AUTO_INCREMENT NOT NULL,
	\`mitarbeiterId\` int NOT NULL,
	\`psaTyp\` enum('einmalhandschuhe','ffp2_maske','mund_nasen_schutz','schutzkittel','schutzbrille','desinfektionsmittel','sonstiges') NOT NULL,
	\`groesse\` varchar(20),
	\`menge\` int NOT NULL DEFAULT 1,
	\`ausgabeDatum\` date NOT NULL,
	\`rueckgabeDatum\` date,
	\`zustand\` enum('neu','gut','beschaedigt','zurueckgegeben') NOT NULL DEFAULT 'neu',
	\`notizen\` text,
	\`ausgegebenVon\` int,
	\`createdAt\` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT \`psa_ausgaben_id\` PRIMARY KEY(\`id\`)
)`,

  `CREATE TABLE IF NOT EXISTS \`pushSubscriptions\` (
	\`id\` int AUTO_INCREMENT NOT NULL,
	\`mitarbeiterId\` int NOT NULL,
	\`endpoint\` text NOT NULL,
	\`p256dh\` text NOT NULL,
	\`auth\` varchar(256) NOT NULL,
	\`createdAt\` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT \`pushSubscriptions_id\` PRIMARY KEY(\`id\`)
)`,

  `CREATE TABLE IF NOT EXISTS \`refreshTokens\` (
	\`id\` int AUTO_INCREMENT NOT NULL,
	\`mitarbeiterId\` int NOT NULL,
	\`token\` varchar(128) NOT NULL,
	\`expiresAt\` timestamp NOT NULL,
	\`used\` boolean NOT NULL DEFAULT false,
	\`createdAt\` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT \`refreshTokens_id\` PRIMARY KEY(\`id\`),
	CONSTRAINT \`refreshTokens_token_unique\` UNIQUE(\`token\`)
)`,

  `CREATE TABLE IF NOT EXISTS \`role_permissions\` (
	\`role_id\` int NOT NULL,
	\`permission_id\` int NOT NULL
)`,

  `CREATE TABLE IF NOT EXISTS \`roles\` (
	\`id\` int AUTO_INCREMENT NOT NULL,
	\`key\` varchar(50) NOT NULL,
	\`label\` varchar(100) NOT NULL,
	\`createdAt\` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT \`roles_id\` PRIMARY KEY(\`id\`),
	CONSTRAINT \`roles_key_unique\` UNIQUE(\`key\`)
)`,

  `CREATE TABLE IF NOT EXISTS \`terminRueckmeldungen\` (
	\`id\` int AUTO_INCREMENT NOT NULL,
	\`einsatzId\` int,
	\`mitarbeiterId\` int NOT NULL,
	\`aktion\` enum('bestaetigt','abgesagt','aenderung_angefragt') NOT NULL,
	\`grund\` text,
	\`wunschDatum\` date,
	\`wunschZeit\` time,
	\`createdAt\` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT \`terminRueckmeldungen_id\` PRIMARY KEY(\`id\`)
)`,

  `CREATE TABLE IF NOT EXISTS \`textbausteine\` (
	\`id\` int AUTO_INCREMENT NOT NULL,
	\`titel\` varchar(200) NOT NULL,
	\`inhalt\` text NOT NULL,
	\`kategorie\` enum('bericht','gesundheit','aktivitaet','bemerkung','sonstiges') NOT NULL DEFAULT 'bericht',
	\`paragraph\` enum('45b','45a','39','alle') DEFAULT 'alle',
	\`aktiv\` int NOT NULL DEFAULT 1,
	\`createdAt\` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT \`textbausteine_id\` PRIMARY KEY(\`id\`)
)`,

  `CREATE TABLE IF NOT EXISTS \`tourEinsaetze\` (
	\`id\` int AUTO_INCREMENT NOT NULL,
	\`tourId\` int NOT NULL,
	\`einsatzId\` int,
	\`reihenfolge\` int NOT NULL DEFAULT 0,
	CONSTRAINT \`tourEinsaetze_id\` PRIMARY KEY(\`id\`)
)`,

  `CREATE TABLE IF NOT EXISTS \`touren\` (
	\`id\` int AUTO_INCREMENT NOT NULL,
	\`mitarbeiterId\` int NOT NULL,
	\`datum\` date NOT NULL,
	\`status\` enum('geplant','aktiv','abgeschlossen') NOT NULL DEFAULT 'geplant',
	\`notizen\` text,
	\`titel\` varchar(200),
	\`startzeit\` time,
	\`endzeit\` time,
	\`angelegtVon\` int,
	\`reihenfolgeGeaendertVon\` int,
	\`reihenfolgeGeaendertAt\` timestamp,
	\`geloeschtAt\` timestamp,
	\`geloeschtVon\` int,
	\`createdAt\` timestamp NOT NULL DEFAULT (now()),
	\`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT \`touren_id\` PRIMARY KEY(\`id\`)
)`,

  `CREATE TABLE IF NOT EXISTS \`as_unterweisung_nachweise\` (
	\`id\` int AUTO_INCREMENT NOT NULL,
	\`unterweisungId\` int NOT NULL,
	\`mitarbeiterId\` int NOT NULL,
	\`vorlagenId\` int,
	\`unterschriftKey\` varchar(500),
	\`unterschriftUrl\` varchar(500),
	\`pdfKey\` varchar(500),
	\`pdfUrl\` varchar(500),
	\`ipAdresse\` varchar(100),
	\`browserInfo\` varchar(500),
	\`bestaetigtAm\` timestamp NOT NULL DEFAULT (now()),
	\`inhaltSnapshot\` text,
	\`titelSnapshot\` varchar(255),
	\`versionSnapshot\` varchar(20),
	\`createdAt\` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT \`as_unterweisung_nachweise_id\` PRIMARY KEY(\`id\`)
)`,

  `CREATE TABLE IF NOT EXISTS \`as_unterweisung_vorlagen\` (
	\`id\` int AUTO_INCREMENT NOT NULL,
	\`titel\` varchar(255) NOT NULL,
	\`thema\` enum('notfall_erste_hilfe','hygiene_desinfektion','ergonomie_heben_tragen','deeskalation_demenz','verkehrssicherheit','psa_verwendung','alleinarbeit_schutz','biostoff_infektionsschutz','sonstiges') NOT NULL,
	\`inhalt\` text NOT NULL,
	\`version\` varchar(20) NOT NULL DEFAULT '1.0',
	\`pflicht\` boolean NOT NULL DEFAULT true,
	\`gueltigBis\` date,
	\`aktiv\` boolean NOT NULL DEFAULT true,
	\`erstelltVon\` int,
	\`createdAt\` timestamp NOT NULL DEFAULT (now()),
	\`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT \`as_unterweisung_vorlagen_id\` PRIMARY KEY(\`id\`)
)`,

  `CREATE TABLE IF NOT EXISTS \`urlaubsantraege\` (
	\`id\` int AUTO_INCREMENT NOT NULL,
	\`mitarbeiterId\` int NOT NULL,
	\`von\` date NOT NULL,
	\`bis\` date NOT NULL,
	\`tage\` int NOT NULL,
	\`notizen\` text,
	\`status\` enum('beantragt','genehmigt','abgelehnt') NOT NULL DEFAULT 'beantragt',
	\`adminNotiz\` text,
	\`keineVertretung\` int NOT NULL DEFAULT 0,
	\`createdAt\` timestamp NOT NULL DEFAULT (now()),
	\`geloeschtAt\` timestamp,
	\`geloeschtVon\` int,
	\`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT \`urlaubsantraege_id\` PRIMARY KEY(\`id\`)
)`,

  `CREATE TABLE IF NOT EXISTS \`users\` (
	\`id\` int AUTO_INCREMENT NOT NULL,
	\`openId\` varchar(64) NOT NULL,
	\`name\` text,
	\`email\` varchar(320),
	\`loginMethod\` varchar(64),
	\`role\` enum('user','admin') NOT NULL DEFAULT 'user',
	\`createdAt\` timestamp NOT NULL DEFAULT (now()),
	\`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	\`lastSignedIn\` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT \`users_id\` PRIMARY KEY(\`id\`),
	CONSTRAINT \`users_openId_unique\` UNIQUE(\`openId\`)
)`,

  `CREATE TABLE IF NOT EXISTS \`verfuegbarkeiten\` (
	\`id\` int AUTO_INCREMENT NOT NULL,
	\`mitarbeiterId\` int NOT NULL,
	\`wochentag\` int NOT NULL,
	\`vonZeit\` time NOT NULL,
	\`bisZeit\` time NOT NULL,
	\`gueltigVon\` date,
	\`gueltigBis\` date,
	\`status\` enum('verfuegbar','nicht_verfuegbar','bevorzugt') NOT NULL DEFAULT 'verfuegbar',
	\`notiz\` text,
	\`createdAt\` timestamp NOT NULL DEFAULT (now()),
	\`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT \`verfuegbarkeiten_id\` PRIMARY KEY(\`id\`)
)`,

  `CREATE TABLE IF NOT EXISTS \`vertretungen\` (
	\`id\` int AUTO_INCREMENT NOT NULL,
	\`vertreterId\` int NOT NULL,
	\`vertretenId\` int NOT NULL,
	\`von\` date NOT NULL,
	\`bis\` date NOT NULL,
	\`grund\` varchar(255),
	\`freigegebenVon\` int,
	\`aktiv\` boolean NOT NULL DEFAULT true,
	\`createdAt\` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT \`vertretungen_id\` PRIMARY KEY(\`id\`)
)`,

  `CREATE TABLE IF NOT EXISTS \`vertretungsUebernahmen\` (
	\`id\` int AUTO_INCREMENT NOT NULL,
	\`urlaubsantragId\` int NOT NULL,
	\`kundenId\` int NOT NULL,
	\`vertreterId\` int NOT NULL,
	\`bestaetigtAt\` timestamp NOT NULL DEFAULT (now()),
	\`vollzugriffBis\` timestamp,
	\`createdAt\` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT \`vertretungsUebernahmen_id\` PRIMARY KEY(\`id\`)
)`,

  `CREATE TABLE IF NOT EXISTS \`zweiFaktorCodes\` (
	\`id\` int AUTO_INCREMENT NOT NULL,
	\`mitarbeiterId\` int NOT NULL,
	\`codeHash\` varchar(255) NOT NULL,
	\`verwendet\` boolean NOT NULL DEFAULT false,
	\`createdAt\` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT \`zweiFaktorCodes_id\` PRIMARY KEY(\`id\`)
)`,

  `CREATE TABLE IF NOT EXISTS \`feedback\` (
    \`id\` int NOT NULL AUTO_INCREMENT,
    \`mitarbeiterId\` int NOT NULL,
    \`kategorie\` enum('fehler','verbesserung','frage','lob') NOT NULL DEFAULT 'verbesserung',
    \`nachricht\` text NOT NULL,
    \`seite\` varchar(100),
    \`createdAt\` datetime DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (\`id\`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

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

  `CREATE TABLE IF NOT EXISTS \`sichereExportpakete\` (
    \`id\` int NOT NULL AUTO_INCREMENT,
    \`typ\` varchar(50) NOT NULL,
    \`referenz\` varchar(120) NOT NULL,
    \`dateiKey\` varchar(500) NOT NULL,
    \`dateiname\` varchar(255) NOT NULL,
    \`empfaengerEmail\` varchar(255) NOT NULL,
    \`erstelltVon\` int NULL,
    \`bereitgestelltAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    \`versendetAt\` timestamp NULL,
    \`abgerufenAt\` timestamp NULL,
    PRIMARY KEY (\`id\`),
    KEY \`idx_sichere_exporte_referenz\` (\`typ\`, \`referenz\`)
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

  `CREATE TABLE IF NOT EXISTS \`kassenanfragen\` (
    \`id\` int NOT NULL AUTO_INCREMENT,
    \`mitarbeiterId\` int NOT NULL,
    \`kundenId\` int NOT NULL,
    \`kostentraegerId\` int DEFAULT NULL,
    \`anfrageTyp\` varchar(100) NOT NULL,
    \`vollmachtText\` text,
    \`unterschriftKunde\` text,
    \`unterschriftMitarbeiter\` text,
    \`notizen\` text,
    \`status\` enum('offen','gesendet','beantwortet','abgelehnt') NOT NULL DEFAULT 'offen',
    \`antwort\` text,
    \`antwortDatum\` datetime DEFAULT NULL,
    \`geloeschtAt\` datetime DEFAULT NULL,
    \`geloeschtVon\` int DEFAULT NULL,
    \`createdAt\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
    \`updatedAt\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (\`id\`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS \`leistungsnachweise\` (
    \`id\` int NOT NULL AUTO_INCREMENT,
    \`mitarbeiterId\` int NOT NULL,
    \`kundenId\` int NOT NULL,
    \`monat\` varchar(7) NOT NULL,
    \`paragraph\` varchar(10),
    \`stunden\` decimal(8,2) DEFAULT 0,
    \`betrag\` decimal(10,2) DEFAULT 0,
    \`status\` enum('entwurf','eingereicht','freigegeben','abgelehnt') NOT NULL DEFAULT 'entwurf',
    \`unterschriftMitarbeiter\` text,
    \`unterschriftKunde\` text,
    \`pdfUrl\` varchar(500),
    \`geloeschtAt\` timestamp NULL,
    \`geloeschtVon\` int,
    \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    \`updatedAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (\`id\`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS \`budget_45b\` (
    \`id\` int NOT NULL AUTO_INCREMENT,
    \`kundenId\` int NOT NULL,
    \`jahresbudget\` decimal(10,2) NOT NULL DEFAULT 0,
    \`verbraucht\` decimal(10,2) NOT NULL DEFAULT 0,
    \`letzteAbrechnung\` date DEFAULT NULL,
    \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    \`updatedAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (\`id\`),
    UNIQUE KEY \`kundenId\` (\`kundenId\`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS \`budget_39\` (
    \`id\` int NOT NULL AUTO_INCREMENT,
    \`kundenId\` int NOT NULL,
    \`monatlicheStunden\` decimal(8,2) NOT NULL DEFAULT 0,
    \`verbraucht\` decimal(8,2) NOT NULL DEFAULT 0,
    \`letzteAbrechnung\` date DEFAULT NULL,
    \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    \`updatedAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (\`id\`),
    UNIQUE KEY \`kundenId\` (\`kundenId\`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS \`kunden_zuordnung\` (
    \`id\` int NOT NULL AUTO_INCREMENT,
    \`kundenId\` int NOT NULL,
    \`mitarbeiterId\` int NOT NULL,
    \`aktiv\` tinyint(1) NOT NULL DEFAULT 1,
    \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (\`id\`),
    KEY \`idx_kz_kunde\` (\`kundenId\`),
    KEY \`idx_kz_ma\` (\`mitarbeiterId\`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  // ── 81. mitarbeiterArbeitsmuster ───────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS \`mitarbeiterArbeitsmuster\` (
    \`id\` int NOT NULL AUTO_INCREMENT,
    \`mitarbeiterId\` int NOT NULL,
    \`arbeitstageWoche\` text NOT NULL,
    \`gueltigAb\` date NOT NULL,
    \`gueltigBis\` date NULL,
    \`geaendertVon\` int NULL,
    \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (\`id\`),
    KEY \`idx_mamuster_ma_ab\` (\`mitarbeiterId\`, \`gueltigAb\`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  // ── 82. Pflichtmitteilungs-Erinnerungen ─────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS \`pflichtmitteilung_erinnerungen\` (
    \`id\` int NOT NULL AUTO_INCREMENT,
    \`mitteilungId\` int NOT NULL,
    \`mitarbeiterId\` int NOT NULL,
    \`erinnerungsDatum\` date NOT NULL,
    \`createdAt\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (\`id\`),
    UNIQUE KEY \`uq_pflichtmitteilung_ma_tag\` (\`mitteilungId\`, \`mitarbeiterId\`, \`erinnerungsDatum\`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
];

let ensureTablesRan = false;

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

  // Bestehende Installationen enthielten früher die Pflichtspalte `text` und
  // andere Kategorien. Die Anwendung verwendet inzwischen ausschließlich
  // `inhalt`; deshalb wird die Altdaten-Spalte behutsam optional gemacht und
  // ihr Inhalt einmalig übernommen, ohne vorhandene Textbausteine zu verlieren.
  try {
    const [legacyTextColumns] = await db.execute(sql.raw("SHOW COLUMNS FROM `textbausteine` LIKE 'text'")) as any;
    if (Array.isArray(legacyTextColumns) && legacyTextColumns.length > 0) {
      await db.execute(sql.raw("ALTER TABLE `textbausteine` MODIFY COLUMN `text` TEXT NULL"));
      await db.execute(sql.raw("UPDATE `textbausteine` SET `inhalt` = COALESCE(`inhalt`, `text`, '') WHERE `inhalt` IS NULL"));
    }
    await db.execute(sql.raw("ALTER TABLE `textbausteine` MODIFY COLUMN `inhalt` TEXT NOT NULL"));
    await db.execute(sql.raw("ALTER TABLE `textbausteine` MODIFY COLUMN `kategorie` ENUM('alltagsbegleitung','haushalt','mobilisierung','soziales','transport','bericht','gesundheit','aktivitaet','bemerkung','sonstiges') NOT NULL DEFAULT 'bericht'"));
  } catch (err: any) {
    console.error("[ensureTables] Textbaustein-Kompatibilitätsmigration fehlgeschlagen:", String(err?.message ?? "").substring(0, 160));
    failed++;
  }

  // Ältere Kassenanfragen-Tabellen wurden vor der Soft-Delete-Funktion
  // angelegt. Die Ergänzung verhindert Löschfehler und erhält die
  // Abrechnungs-Historie nachvollziehbar.
  try {
    const [deleteColumns] = await db.execute(sql.raw("SHOW COLUMNS FROM `kassenanfragen` LIKE 'geloeschtAt'")) as any;
    if (!Array.isArray(deleteColumns) || deleteColumns.length === 0) {
      await db.execute(sql.raw("ALTER TABLE `kassenanfragen` ADD COLUMN `geloeschtAt` DATETIME NULL, ADD COLUMN `geloeschtVon` INT NULL"));
    }
  } catch (err: any) {
    console.error("[ensureTables] Kassenanfrage-Kompatibilitätsmigration fehlgeschlagen:", String(err?.message ?? "").substring(0, 160));
    failed++;
  }

  // Die ursprüngliche Unterstrich-Tabelle der Kunden-Zuordnungen enthielt
  // noch keine Rollen- und Prioritätsfelder. Ohne diese Felder wäre eine
  // Mehrfachbetreuung weder eindeutig sortierbar noch im Planungsteam
  // sichtbar. Bestehende Zuordnungen erhalten den sicheren Standardwert
  // „Hauptbetreuer“ mit Priorität 1.
  try {
    const [prioritaetSpalte] = await db.execute(sql.raw("SHOW COLUMNS FROM `kunden_zuordnung` LIKE 'prioritaet'")) as any;
    if (!Array.isArray(prioritaetSpalte) || prioritaetSpalte.length === 0) {
      await db.execute(sql.raw("ALTER TABLE `kunden_zuordnung` ADD COLUMN `prioritaet` INT NOT NULL DEFAULT 1"));
    }
    const [rolleSpalte] = await db.execute(sql.raw("SHOW COLUMNS FROM `kunden_zuordnung` LIKE 'rolle'")) as any;
    if (!Array.isArray(rolleSpalte) || rolleSpalte.length === 0) {
      await db.execute(sql.raw("ALTER TABLE `kunden_zuordnung` ADD COLUMN `rolle` ENUM('hauptbetreuer','vertretung') NOT NULL DEFAULT 'hauptbetreuer'"));
    }
  } catch (err: any) {
    console.error("[ensureTables] Kunden-Zuordnung-Kompatibilitätsmigration fehlgeschlagen:", String(err?.message ?? "").substring(0, 160));
    failed++;
  }

  // Arbeitstagsmuster wurden nach der ersten Mitarbeiterakte eingeführt.
  // Vorhandene Urlaubskonten werden nicht verändert; die Muster sind lediglich
  // klar dokumentierte Startwerte und werden im Adminbereich individuell gepflegt.
  try {
    const [arbeitstageSpalte] = await db.execute(sql.raw("SHOW COLUMNS FROM `mitarbeiter` LIKE 'arbeitstageWoche'")) as any;
    if (!Array.isArray(arbeitstageSpalte) || arbeitstageSpalte.length === 0) {
      await db.execute(sql.raw("ALTER TABLE `mitarbeiter` ADD COLUMN `arbeitstageWoche` TEXT NULL"));
      await db.execute(sql.raw("UPDATE `mitarbeiter` SET `arbeitstageWoche` = CASE WHEN `urlaubstageJahr` <= 12 THEN '[\\\"Mo\\\",\\\"Mi\\\",\\\"Fr\\\"]' WHEN `urlaubstageJahr` <= 16 THEN '[\\\"Mo\\\",\\\"Di\\\",\\\"Do\\\",\\\"Fr\\\"]' ELSE '[\\\"Mo\\\",\\\"Di\\\",\\\"Mi\\\",\\\"Do\\\",\\\"Fr\\\"]' END WHERE `arbeitstageWoche` IS NULL OR `arbeitstageWoche` = ''"));
    }
    await db.execute(sql.raw("INSERT INTO `mitarbeiterArbeitsmuster` (`mitarbeiterId`,`arbeitstageWoche`,`gueltigAb`) SELECT m.id, m.arbeitstageWoche, COALESCE(m.eintrittsdatum, '2026-01-01') FROM `mitarbeiter` m LEFT JOIN `mitarbeiterArbeitsmuster` h ON h.mitarbeiterId = m.id WHERE h.id IS NULL AND m.arbeitstageWoche IS NOT NULL"));
  } catch (err: any) {
    console.error("[ensureTables] Arbeitstagsmuster-Migration fehlgeschlagen:", String(err?.message ?? "").substring(0, 160));
    failed++;
  }

  console.log(`[ensureTables] Abgeschlossen: ${ok} OK, ${failed} Fehler`);
}
