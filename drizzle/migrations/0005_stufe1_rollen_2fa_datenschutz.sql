-- Phase 27 Stufe 1: Rollen, 2FA, Berechtigungen, Datenschutz, Backup, Verfügbarkeiten, Einsatzänderungen, Besuchsberichte, Formulare, Integrationen, Analysen

-- 1. Mitarbeiter-Rolle um teamleitung und buchhaltung erweitern
ALTER TABLE mitarbeiter MODIFY COLUMN rolle ENUM('mitarbeiter', 'admin', 'teamleitung', 'buchhaltung') NOT NULL DEFAULT 'mitarbeiter';

-- 2. Zwei-Faktor-Authentifizierung
CREATE TABLE IF NOT EXISTS mitarbeiterZweiFaktor (
  id INT AUTO_INCREMENT PRIMARY KEY,
  mitarbeiterId INT NOT NULL UNIQUE,
  twoFactorEnabled BOOLEAN NOT NULL DEFAULT FALSE,
  twoFactorSecret VARCHAR(255),
  twoFactorActivatedAt TIMESTAMP NULL,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS zweiFaktorCodes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  mitarbeiterId INT NOT NULL,
  codeHash VARCHAR(255) NOT NULL,
  verwendet BOOLEAN NOT NULL DEFAULT FALSE,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 3. Mitarbeiter-Berechtigungen (optionale Ausnahmen)
CREATE TABLE IF NOT EXISTS mitarbeiterBerechtigungen (
  id INT AUTO_INCREMENT PRIMARY KEY,
  mitarbeiterId INT NOT NULL,
  modul VARCHAR(100) NOT NULL,
  zugriff ENUM('erlaubt', 'verweigert') NOT NULL,
  gesetztVonId INT,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 4. Datenschutz-Vereinbarungen
CREATE TABLE IF NOT EXISTS datenschutzDokumente (
  id INT AUTO_INCREMENT PRIMARY KEY,
  version VARCHAR(20) NOT NULL,
  titel VARCHAR(200) NOT NULL,
  inhalt TEXT NOT NULL,
  aktiv BOOLEAN NOT NULL DEFAULT TRUE,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS datenschutzZustimmungen (
  id INT AUTO_INCREMENT PRIMARY KEY,
  mitarbeiterId INT NOT NULL,
  dokumentId INT NOT NULL,
  dokumentVersion VARCHAR(20) NOT NULL,
  ipHash VARCHAR(64),
  zugestimmtAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 5. Backup-Protokolle
CREATE TABLE IF NOT EXISTS backupProtokolle (
  id INT AUTO_INCREMENT PRIMARY KEY,
  typ VARCHAR(50) NOT NULL DEFAULT 'auto',
  status ENUM('erfolgreich', 'fehlgeschlagen', 'laufend') NOT NULL,
  fehlerMeldung TEXT,
  datenbankGroesse VARCHAR(50),
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 6. Verfügbarkeiten
CREATE TABLE IF NOT EXISTS verfuegbarkeiten (
  id INT AUTO_INCREMENT PRIMARY KEY,
  mitarbeiterId INT NOT NULL,
  wochentag ENUM('mo', 'di', 'mi', 'do', 'fr', 'sa', 'so') NOT NULL,
  zeitVon TIME NOT NULL,
  zeitBis TIME NOT NULL,
  sollstunden DECIMAL(4,2) DEFAULT 0.00,
  gueltigVon DATE,
  gueltigBis DATE,
  aktiv BOOLEAN NOT NULL DEFAULT TRUE,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 7. Einsatz-Änderungshistorie
CREATE TABLE IF NOT EXISTS einsatzAenderungen (
  id INT AUTO_INCREMENT PRIMARY KEY,
  einsatzId INT NOT NULL,
  aenderungstyp ENUM('erstellt', 'geaendert', 'abgesagt', 'verschoben', 'bestaetigt', 'abgelehnt') NOT NULL,
  aenderungsgrund TEXT,
  alteDaten TEXT,
  neueDaten TEXT,
  geaendertVonId INT,
  benachrichtigtAt TIMESTAMP NULL,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 8. Besuchsberichte
CREATE TABLE IF NOT EXISTS besuchsberichte (
  id INT AUTO_INCREMENT PRIMARY KEY,
  einsatzId INT NOT NULL,
  kundenId INT NOT NULL,
  mitarbeiterId INT NOT NULL,
  formularVersionId INT,
  inhalt TEXT,
  zustand ENUM('entwurf', 'eingereicht', 'freigegeben', 'abgelehnt') NOT NULL DEFAULT 'entwurf',
  unterschriftMitarbeiter TEXT,
  unterschriftKunde TEXT,
  freigegebenVonId INT,
  freigegebenAt TIMESTAMP NULL,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS besuchsberichtDateien (
  id INT AUTO_INCREMENT PRIMARY KEY,
  berichtId INT NOT NULL,
  dateiKey VARCHAR(500) NOT NULL,
  dateiUrl TEXT NOT NULL,
  dateiname VARCHAR(255),
  mimeType VARCHAR(100),
  groesse INT,
  kategorie ENUM('foto', 'dokument', 'unterschrift', 'sonstiges') DEFAULT 'foto',
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 9. Formularvorlagen
CREATE TABLE IF NOT EXISTS formularVorlagen (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  version VARCHAR(20) NOT NULL,
  felder TEXT NOT NULL,
  aktiv BOOLEAN NOT NULL DEFAULT TRUE,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 10. Integrationen
CREATE TABLE IF NOT EXISTS integrationen (
  id INT AUTO_INCREMENT PRIMARY KEY,
  anbieter VARCHAR(100) NOT NULL,
  name VARCHAR(200) NOT NULL,
  modus ENUM('vorbereitet', 'aktiv', 'deaktiviert', 'fehler') NOT NULL DEFAULT 'vorbereitet',
  endpoint VARCHAR(500),
  konfiguration TEXT,
  letzterTest TIMESTAMP NULL,
  letzterTestStatus ENUM('ok', 'fehler', 'unbekannt') DEFAULT 'unbekannt',
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS integrationsLaeufe (
  id INT AUTO_INCREMENT PRIMARY KEY,
  integrationId INT NOT NULL,
  status ENUM('gestartet', 'erfolgreich', 'fehlgeschlagen', 'wiederholt') NOT NULL,
  datensaetze INT DEFAULT 0,
  fehlerCode VARCHAR(50),
  fehlerMeldung TEXT,
  fachlicheReferenz VARCHAR(200),
  wiederholungen INT DEFAULT 0,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 11. Analyse-Snapshots
CREATE TABLE IF NOT EXISTS analyseSnapshots (
  id INT AUTO_INCREMENT PRIMARY KEY,
  monat VARCHAR(7) NOT NULL,
  typ VARCHAR(50) NOT NULL,
  daten TEXT NOT NULL,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
