-- ═══════════════════════════════════════════════════════════════════════════
--  PHASE 31 – EINSATZPLANUNG, BUDGETSTUNDEN, LOHNKOSTEN, LÖSCHSTATUS
-- ═══════════════════════════════════════════════════════════════════════════
--
--  Diese Migration ist ADDITIV und RÜCKWÄRTSKOMPATIBEL:
--    • Es werden ausschließlich neue Spalten und Tabellen angelegt.
--    • Keine bestehende Spalte wird umbenannt, verkleinert oder gelöscht.
--    • Alle neuen Spalten sind NULL-fähig oder haben einen Standardwert,
--      damit vorhandene Datensätze unverändert gültig bleiben.
--    • Bestehende Auswertungen (dauerStunden, paragraph, …) laufen weiter.
--
--  Die Migration ist IDEMPOTENT: Sie kann mehrfach ausgeführt werden, ohne
--  Fehler zu erzeugen. Dazu prüfen die Hilfsprozeduren vor jedem ALTER, ob
--  die Spalte bzw. der Index bereits existiert (MySQL kennt kein
--  "ADD COLUMN IF NOT EXISTS").
-- ═══════════════════════════════════════════════════════════════════════════

-- ── Hilfsprozeduren ────────────────────────────────────────────────────────

DROP PROCEDURE IF EXISTS lw_add_column;
DROP PROCEDURE IF EXISTS lw_add_index;

CREATE PROCEDURE lw_add_column(
  IN p_table VARCHAR(64),
  IN p_column VARCHAR(64),
  IN p_definition TEXT
)
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = p_table
      AND COLUMN_NAME = p_column
  ) THEN
    SET @ddl = CONCAT('ALTER TABLE `', p_table, '` ADD COLUMN `', p_column, '` ', p_definition);
    PREPARE stmt FROM @ddl;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
  END IF;
END;

CREATE PROCEDURE lw_add_index(
  IN p_table VARCHAR(64),
  IN p_index VARCHAR(64),
  IN p_columns TEXT
)
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = p_table
      AND INDEX_NAME = p_index
  ) THEN
    SET @ddl = CONCAT('ALTER TABLE `', p_table, '` ADD INDEX `', p_index, '` (', p_columns, ')');
    PREPARE stmt FROM @ddl;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
  END IF;
END;

-- ── 1. Einsätze: Endzeit, zweiter Paragraph, Kosten, Löschstatus ──────────
--
--  endzeit    → Grundlage der automatischen Stundenberechnung
--               (dauerStunden wird daraus berechnet, nie manuell eingegeben)
--  paragraph2 → zweiter Abrechnungsparagraph im selben Termin,
--               getrennt gespeichert (stunden2 / kosten2)
--  lohnkosten → Gesamtstunden × Stundenlohn (interne Personalkosten)

CALL lw_add_column('einsaetze', 'endzeit',      'time NULL');
CALL lw_add_column('einsaetze', 'paragraph2',   "enum('45b','45a','39') NULL");
CALL lw_add_column('einsaetze', 'stunden1',     'decimal(5,2) NULL');
CALL lw_add_column('einsaetze', 'stunden2',     'decimal(5,2) NULL');
CALL lw_add_column('einsaetze', 'kosten1',      'decimal(8,2) NULL');
CALL lw_add_column('einsaetze', 'kosten2',      'decimal(8,2) NULL');
CALL lw_add_column('einsaetze', 'lohnkosten',   'decimal(8,2) NULL');
-- Verhindert doppelte Budgetabbuchung: über die Planung angelegte Termine
-- reservieren das Budget sofort, der spätere Abschluss darf nicht erneut buchen.
CALL lw_add_column('einsaetze', 'budgetGebucht', 'boolean NULL DEFAULT false');
CALL lw_add_column('einsaetze', 'notizen',      'text NULL');
CALL lw_add_column('einsaetze', 'geplantVon',   'int NULL');
CALL lw_add_column('einsaetze', 'geloeschtAt',  'timestamp NULL');
CALL lw_add_column('einsaetze', 'geloeschtVon', 'int NULL');
CALL lw_add_column('einsaetze', 'loeschgrund',  'text NULL');

CALL lw_add_index('einsaetze', 'idx_einsaetze_datum',        '`datum`');
CALL lw_add_index('einsaetze', 'idx_einsaetze_ma_datum',     '`mitarbeiterId`, `datum`');
CALL lw_add_index('einsaetze', 'idx_einsaetze_kunde_datum',  '`kundenId`, `datum`');
CALL lw_add_index('einsaetze', 'idx_einsaetze_geloescht',    '`geloeschtAt`');

-- ── 2. Löschstatus für weitere Stammdaten ─────────────────────────────────
--  Überall, wo Daten angelegt werden, muss der Administrator löschen können.
--  Gelöscht wird grundsätzlich per Soft-Delete (Nachvollziehbarkeit, DSGVO).

CALL lw_add_column('leistungen',      'geloeschtAt',  'timestamp NULL');
CALL lw_add_column('leistungen',      'geloeschtVon', 'int NULL');
CALL lw_add_column('fahrten',         'geloeschtAt',  'timestamp NULL');
CALL lw_add_column('fahrten',         'geloeschtVon', 'int NULL');
CALL lw_add_column('fahrten',         'einsatzId',    'int NULL');
CALL lw_add_column('urlaubsantraege', 'geloeschtAt',  'timestamp NULL');
CALL lw_add_column('urlaubsantraege', 'geloeschtVon', 'int NULL');
CALL lw_add_column('krankmeldungen',  'geloeschtAt',  'timestamp NULL');
CALL lw_add_column('krankmeldungen',  'geloeschtVon', 'int NULL');
CALL lw_add_column('touren',          'geloeschtAt',  'timestamp NULL');
CALL lw_add_column('touren',          'geloeschtVon', 'int NULL');
CALL lw_add_column('touren',          'reihenfolgeGeaendertVon', 'int NULL');
CALL lw_add_column('touren',          'reihenfolgeGeaendertAt',  'timestamp NULL');

CALL lw_add_index('leistungen',      'idx_leistungen_geloescht', '`geloeschtAt`');
CALL lw_add_index('fahrten',         'idx_fahrten_geloescht',    '`geloeschtAt`');
CALL lw_add_index('urlaubsantraege', 'idx_urlaub_zeitraum',      '`mitarbeiterId`, `von`, `bis`');
CALL lw_add_index('krankmeldungen',  'idx_krank_zeitraum',       '`mitarbeiterId`, `von`, `bis`');
CALL lw_add_index('touren',          'idx_touren_ma_datum',      '`mitarbeiterId`, `datum`');

-- ── 3. Verrechnungssätze je Paragraph ─────────────────────────────────────
--
--  Der Verrechnungssatz (36 €/Std.) bestimmt die aus dem Kundenbudget
--  finanzierbaren Betreuungsstunden. Der Stundenlohn (16 €/Std.) wird
--  ausschließlich für Lohn- und Minijob-Berechnungen verwendet.

CREATE TABLE IF NOT EXISTS `paragraphSaetze` (
  `id`               int AUTO_INCREMENT PRIMARY KEY,
  `paragraph`        enum('45b','45a','39') NOT NULL,
  `satzProStunde`    decimal(6,2) NOT NULL,
  `lohnProStunde`    decimal(6,2) NOT NULL DEFAULT 16.00,
  `anfahrtPauschale` decimal(6,2) NOT NULL DEFAULT 6.00,
  `gueltigAb`        date NOT NULL,
  `aktiv`            boolean NOT NULL DEFAULT true,
  `geaendertVon`     int,
  `createdAt`        timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt`        timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_paragraphsaetze_gueltig` (`paragraph`, `gueltigAb`, `aktiv`)
);

-- Standardsätze anlegen (nur beim ersten Lauf – danach ist die Tabelle gefüllt)
-- Sätze entsprechen shared/leistungssaetze.ts (§45a/§45b 36 €, §39 46 €)
INSERT INTO `paragraphSaetze` (`paragraph`, `satzProStunde`, `lohnProStunde`, `anfahrtPauschale`, `gueltigAb`, `aktiv`)
SELECT * FROM (
  SELECT '45b' AS p, 36.00 AS s, 16.00 AS l, 6.00 AS a, '2020-01-01' AS g, true AS ak
  UNION ALL SELECT '45a', 36.00, 16.00, 6.00, '2020-01-01', true
  UNION ALL SELECT '39',  46.00, 16.00, 6.00, '2020-01-01', true
) AS standard
WHERE NOT EXISTS (SELECT 1 FROM `paragraphSaetze`);

-- ── 4. Planungswarnungen ──────────────────────────────────────────────────
--
--  Minijob-Überschreitungen, Budgetüberschreitungen und Konflikte werden
--  protokolliert. Teamleitung/Admin bestätigen eine Meldung und können sie
--  anschließend löschen, damit sie den Arbeitsbereich nicht blockiert.

CREATE TABLE IF NOT EXISTS `planungsWarnungen` (
  `id`            int AUTO_INCREMENT PRIMARY KEY,
  `code`          varchar(60) NOT NULL,
  `schwere`       enum('blockierend','warnung','hinweis') NOT NULL DEFAULT 'warnung',
  `titel`         varchar(200) NOT NULL,
  `nachricht`     text NOT NULL,
  `mitarbeiterId` int,
  `kundenId`      int,
  `einsatzId`     int,
  `monat`         varchar(7),
  `bestaetigtAt`  timestamp NULL,
  `bestaetigtVon` int,
  `geloeschtAt`   timestamp NULL,
  `geloeschtVon`  int,
  `createdAt`     timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_warnungen_offen`       (`geloeschtAt`, `bestaetigtAt`),
  INDEX `idx_warnungen_mitarbeiter` (`mitarbeiterId`, `monat`),
  INDEX `idx_warnungen_code`        (`code`)
);

-- ── 5. Nachtrag fehlender Tabellen ────────────────────────────────────────
--
--  Die Module Kassenanfragen, Neukundenaufnahme und Führerschein-Kontrolle
--  greifen per SQL auf Tabellen zu, für die bisher keine Migration existierte.
--  Fehlt die Tabelle in der Zieldatenbank, schlagen sämtliche Abfragen dieser
--  Module fehl – unter anderem das Laden der Kassenanfragen-Seite.
--  Die Definitionen entsprechen exakt den in server/db.ts verwendeten Spalten.

CREATE TABLE IF NOT EXISTS `kassenanfragen` (
  `id`                      int AUTO_INCREMENT PRIMARY KEY,
  `mitarbeiterId`           int NOT NULL,
  `kundenId`                int NOT NULL,
  `kostentraegerId`         int,
  `anfrageTyp`              enum('budget_45b','budget_45a','budget_39','alle_budgets','pflegegrad','sonstiges') NOT NULL DEFAULT 'sonstiges',
  `vollmachtText`           text,
  `unterschriftKunde`       text,
  `unterschriftMitarbeiter` text,
  `notizen`                 text,
  `status`                  enum('offen','gesendet','beantwortet','abgelehnt') NOT NULL DEFAULT 'offen',
  `antwort`                 text,
  `antwortDatum`            timestamp NULL,
  `geloeschtAt`             timestamp NULL,
  `geloeschtVon`            int,
  `createdAt`               timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_kassenanfragen_kunde`       (`kundenId`),
  INDEX `idx_kassenanfragen_mitarbeiter` (`mitarbeiterId`),
  INDEX `idx_kassenanfragen_status`      (`status`)
);

CREATE TABLE IF NOT EXISTS `neukundenaufnahmen` (
  `id`                     int AUTO_INCREMENT PRIMARY KEY,
  `vorname`                varchar(100) NOT NULL,
  `nachname`               varchar(100) NOT NULL,
  `geburtsdatum`           date,
  `strasse`                varchar(200),
  `plz`                    varchar(10),
  `ort`                    varchar(100),
  `telefon`                varchar(50),
  `email`                  varchar(320),
  `pflegegrad`             int,
  `kostentraeger`          varchar(200),
  `versicherungsnummer`    varchar(50),
  `paragraph`              enum('45b','45a','39','privat') NOT NULL DEFAULT '45b',
  `vollmacht_unterschrift` text,
  `kunden_unterschrift`    text,
  `notizen`                text,
  `status`                 enum('aufgenommen','in_bearbeitung','abgeschlossen') NOT NULL DEFAULT 'aufgenommen',
  `erstellt_von`           int,
  `geloeschtAt`            timestamp NULL,
  `geloeschtVon`           int,
  `created_at`             timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_neukunden_status` (`status`)
);

CREATE TABLE IF NOT EXISTS `fuehrerschein_checks` (
  `id`                    int AUTO_INCREMENT PRIMARY KEY,
  `mitarbeiter_id`        int NOT NULL,
  `foto_key`              varchar(500),
  `foto_url`              text,
  `pruef_datum`           date NOT NULL,
  `naechstes_pruef_datum` date NOT NULL,
  `status`                enum('gueltig','faellig','ueberfaellig') NOT NULL DEFAULT 'gueltig',
  `bemerkung`             text,
  `geloeschtAt`           timestamp NULL,
  `geloeschtVon`          int,
  `created_at`            timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_fuehrerschein_mitarbeiter` (`mitarbeiter_id`),
  INDEX `idx_fuehrerschein_faellig`     (`naechstes_pruef_datum`)
);

-- Löschstatus auch für nachträglich angelegte Tabellen sicherstellen
CALL lw_add_column('kassenanfragen',       'geloeschtAt',  'timestamp NULL');
CALL lw_add_column('kassenanfragen',       'geloeschtVon', 'int NULL');
CALL lw_add_column('neukundenaufnahmen',   'geloeschtAt',  'timestamp NULL');
CALL lw_add_column('neukundenaufnahmen',   'geloeschtVon', 'int NULL');
CALL lw_add_column('fuehrerschein_checks', 'geloeschtAt',  'timestamp NULL');
CALL lw_add_column('fuehrerschein_checks', 'geloeschtVon', 'int NULL');

-- ── 6. Datenmigration: Bestandsdaten vervollständigen ─────────────────────
--
--  Bestehende Einsätze haben nur startzeit + dauerStunden. Daraus werden
--  endzeit, stunden1, lohnkosten und kosten1 nachgetragen, damit die neue
--  Planungsansicht auch historische Termine vollständig darstellt.
--  Datensätze ohne Zeitangaben bleiben unverändert (NULL).

UPDATE `einsaetze`
SET `endzeit` = ADDTIME(`startzeit`, SEC_TO_TIME(ROUND(`dauerStunden` * 3600)))
WHERE `endzeit` IS NULL
  AND `startzeit` IS NOT NULL
  AND `dauerStunden` IS NOT NULL
  AND `dauerStunden` > 0;

UPDATE `einsaetze`
SET `stunden1` = `dauerStunden`
WHERE `stunden1` IS NULL
  AND `dauerStunden` IS NOT NULL;

-- Lohnkosten = Gesamtstunden × 16 €
UPDATE `einsaetze`
SET `lohnkosten` = ROUND(`dauerStunden` * 16.00, 2)
WHERE `lohnkosten` IS NULL
  AND `dauerStunden` IS NOT NULL;

-- Budgetwirksame Kosten = Stunden × Verrechnungssatz + Anfahrtspauschale
-- Der Satz richtet sich nach dem Paragraphen (§45a/§45b 36 €, §39 46 €).
UPDATE `einsaetze`
SET `kosten1` = ROUND(
      `dauerStunden` * (CASE `paragraph` WHEN '39' THEN 46.00 ELSE 36.00 END)
      + COALESCE(`anfahrtPauschale`, 6.00), 2)
WHERE `kosten1` IS NULL
  AND `dauerStunden` IS NOT NULL;

-- Bereits abgeschlossene Einsätze wurden beim Abschluss gebucht.
UPDATE `einsaetze`
SET `budgetGebucht` = true
WHERE `budgetGebucht` IS NULL
  AND `status` = 'abgeschlossen';

UPDATE `einsaetze`
SET `budgetGebucht` = false
WHERE `budgetGebucht` IS NULL;

-- ── Aufräumen ─────────────────────────────────────────────────────────────

DROP PROCEDURE IF EXISTS lw_add_column;
DROP PROCEDURE IF EXISTS lw_add_index;
