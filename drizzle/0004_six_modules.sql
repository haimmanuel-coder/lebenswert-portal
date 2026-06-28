-- Migration: Alle 6 Integrationsmodule
-- Modul 1: Kostenträger-System
CREATE TABLE IF NOT EXISTS `kostentraeger` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
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
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Modul 1: Kostenträger-Verknüpfung in kunden
ALTER TABLE `kunden`
  ADD COLUMN IF NOT EXISTS `kostentraegerId` int,
  ADD COLUMN IF NOT EXISTS `vollmachtErteilt` boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS `vollmachtDatum` date,
  ADD COLUMN IF NOT EXISTS `vollmachtSignatur` text;

-- Modul 3: Textbausteine
CREATE TABLE IF NOT EXISTS `textbausteine` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `titel` varchar(200) NOT NULL,
  `inhalt` text NOT NULL,
  `kategorie` enum('bericht','gesundheit','aktivitaet','bemerkung','sonstiges') NOT NULL DEFAULT 'bericht',
  `paragraph` enum('45b','45a','39','alle') DEFAULT 'alle',
  `aktiv` int NOT NULL DEFAULT 1,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Modul 3: Kunden-Unterschrift in einsaetze
ALTER TABLE `einsaetze`
  ADD COLUMN IF NOT EXISTS `unterschriftKunde` text,
  ADD COLUMN IF NOT EXISTS `textbausteinIds` text;

-- Modul 3: Kunden-Unterschrift in leistungen
ALTER TABLE `leistungen`
  ADD COLUMN IF NOT EXISTS `unterschriftKunde` text;

-- Modul 4: Erweiterte Fahrtkosten-Felder
ALTER TABLE `fahrten`
  ADD COLUMN IF NOT EXISTS `kilometerHin` decimal(6,1),
  ADD COLUMN IF NOT EXISTS `kilometerRueck` decimal(6,1),
  ADD COLUMN IF NOT EXISTS `abrechnungsStatus` enum('offen','eingereicht','erstattet') DEFAULT 'offen',
  ADD COLUMN IF NOT EXISTS `monat` varchar(7);

-- Modul 5: E-Brief Log
CREATE TABLE IF NOT EXISTS `ebriefLog` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
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
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Standarddaten: Häufige Kostenträger (Modul 1)
INSERT IGNORE INTO `kostentraeger` (`name`, `ikNummer`, `typ`, `plz`, `ort`, `abrechnungsart`) VALUES
('AOK Bayern', '108310400', 'pflegekasse', '80335', 'München', 'dta'),
('AOK Baden-Württemberg', '108310400', 'pflegekasse', '70173', 'Stuttgart', 'dta'),
('AOK Nordost', '102310400', 'pflegekasse', '10117', 'Berlin', 'dta'),
('AOK Rheinland/Hamburg', '105310400', 'pflegekasse', '40212', 'Düsseldorf', 'dta'),
('AOK Hessen', '105910400', 'pflegekasse', '60329', 'Frankfurt', 'dta'),
('TK Techniker Krankenkasse', '201590013', 'pflegekasse', '22305', 'Hamburg', 'dta'),
('Barmer', '104940005', 'pflegekasse', '42285', 'Wuppertal', 'dta'),
('DAK Gesundheit', '201590014', 'pflegekasse', '20354', 'Hamburg', 'dta'),
('IKK classic', '107310505', 'pflegekasse', '01067', 'Dresden', 'dta'),
('BKK VBU', '102310504', 'pflegekasse', '10117', 'Berlin', 'dta'),
('Knappschaft', '109905003', 'pflegekasse', '44789', 'Bochum', 'dta'),
('Privat / Selbstzahler', NULL, 'privat', NULL, NULL, 'manuell');

-- Standarddaten: Textbausteine (Modul 3)
INSERT IGNORE INTO `textbausteine` (`titel`, `inhalt`, `kategorie`, `paragraph`) VALUES
('Alltagsbegleitung durchgeführt', 'Die Alltagsbegleitung wurde planmäßig durchgeführt. Der Klient war kooperativ und die vereinbarten Leistungen wurden vollständig erbracht.', 'bericht', 'alle'),
('Spaziergang unternommen', 'Gemeinsamer Spaziergang wurde unternommen. Der Klient zeigte Freude an der Bewegung und frischen Luft.', 'aktivitaet', '45b'),
('Gesellschaft geleistet', 'Gesellschaft geleistet und Gespräche geführt. Der Klient wirkte aufgeschlossen und kommunikativ.', 'aktivitaet', '45b'),
('Haushaltsunterstützung', 'Unterstützung bei leichten Haushaltstätigkeiten wurde geleistet. Der Klient war dabei anwesend und hat nach Möglichkeit mitgewirkt.', 'bericht', '45b'),
('Gesundheitszustand stabil', 'Der Gesundheitszustand des Klienten war stabil. Keine besonderen Auffälligkeiten festgestellt.', 'gesundheit', 'alle'),
('Klient wirkte müde', 'Der Klient wirkte heute etwas müde, war aber kooperativ. Auf eine ruhigere Gestaltung des Einsatzes wurde geachtet.', 'gesundheit', 'alle'),
('Gedächtnisübungen durchgeführt', 'Gedächtnis- und Konzentrationsübungen wurden durchgeführt. Der Klient hat aktiv teilgenommen.', 'aktivitaet', '45b'),
('Vorlesen / Medien', 'Vorlesen oder gemeinsames Anschauen von Medien. Der Klient zeigte Interesse und war aufmerksam.', 'aktivitaet', '45b'),
('Einkauf begleitet', 'Begleitung beim Einkauf. Der Klient konnte selbstständig Entscheidungen treffen und wurde nur bei Bedarf unterstützt.', 'aktivitaet', '45b'),
('Arztbegleitung', 'Begleitung zum Arzttermin. Der Klient wurde sicher transportiert und beim Gespräch mit dem Arzt unterstützt.', 'bericht', '39');
