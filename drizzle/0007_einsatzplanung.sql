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
--  Fehler zu erzeugen. Jede Spalten- und Indexanlage prüft vorher, ob das
--  Objekt bereits existiert (MySQL kennt kein "ADD COLUMN IF NOT EXISTS").
--
--  Gegengeprüft am 28.07.2026 gegen eine leere Datenbank mit allen
--  vorherigen Migrationen sowie in einem zweiten Lauf (Idempotenz).
-- ═══════════════════════════════════════════════════════════════════════════

-- ── Idempotenz ohne Stored Procedures ─────────────────────────────────────
--
--  MySQL kennt kein "ADD COLUMN IF NOT EXISTS". Eine Hilfsprozedur wäre der
--  naheliegende Weg, scheitert aber daran, dass die Semikolons im
--  Prozedurkörper das Statement vorzeitig beenden – das erfordert den
--  Client-Befehl DELIMITER, den nur die MySQL-Kommandozeile versteht.
--  Wird die Migration über ein Skript, einen Migrationsrunner oder einen
--  Datenbank-Client eingespielt, bricht sie dann ab.
--
--  Stattdessen wird jede Änderung als bedingtes Prepared Statement
--  ausgeführt: Existiert die Spalte bzw. der Index bereits, wird ein
--  wirkungsloses SELECT ausgeführt. Das ist reines SQL, kommt ohne
--  DELIMITER aus und läuft in MySQL 8 wie in MariaDB.
--
--  Zusätzlich wird geprüft, ob die Zieltabelle überhaupt existiert. Ein Teil
--  der Tabellen dieses Projekts wurde historisch per "drizzle-kit push"
--  direkt aus dem Schema erzeugt und besitzt keine Migrationsdatei. Fehlt
--  eine solche Tabelle in der Zieldatenbank, überspringt die Migration die
--  betroffene Änderung, statt mit einem Fehler abzubrechen.

-- ── 1. Einsätze: Endzeit, zweiter Paragraph, Kosten, Löschstatus ──────────
--
--  endzeit    → Grundlage der automatischen Stundenberechnung
--               (dauerStunden wird daraus berechnet, nie manuell eingegeben)
--  paragraph2 → zweiter Abrechnungsparagraph im selben Termin,
--               getrennt gespeichert (stunden2 / kosten2)
--  lohnkosten → Gesamtstunden × Stundenlohn (interne Personalkosten)

-- Die Spalten anfahrtPauschale und unterschreitungEskaliert stammen aus einer
-- früheren Ausbaustufe, die ohne Migrationsdatei per "drizzle-kit push"
-- eingespielt wurde. Sie werden hier nachgezogen, da die Datenmigration
-- weiter unten auf anfahrtPauschale zugreift.
SET @s0a := (SELECT IF(
  NOT EXISTS(SELECT 1 FROM information_schema.TABLES
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'einsaetze')
  OR EXISTS(SELECT 1 FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'einsaetze' AND COLUMN_NAME = 'anfahrtPauschale')
, 'DO 1', 'ALTER TABLE `einsaetze` ADD COLUMN `anfahrtPauschale` decimal(5,2) NULL DEFAULT 6.00'));
PREPARE st0a FROM @s0a; EXECUTE st0a; DEALLOCATE PREPARE st0a;

SET @s0b := (SELECT IF(
  NOT EXISTS(SELECT 1 FROM information_schema.TABLES
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'einsaetze')
  OR EXISTS(SELECT 1 FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'einsaetze' AND COLUMN_NAME = 'unterschreitungEskaliert')
, 'DO 1', 'ALTER TABLE `einsaetze` ADD COLUMN `unterschreitungEskaliert` boolean NULL DEFAULT false'));
PREPARE st0b FROM @s0b; EXECUTE st0b; DEALLOCATE PREPARE st0b;

SET @s1 := (SELECT IF(
  NOT EXISTS(SELECT 1 FROM information_schema.TABLES
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'einsaetze')
  OR EXISTS(SELECT 1 FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'einsaetze' AND COLUMN_NAME = 'endzeit')
, 'DO 1', 'ALTER TABLE `einsaetze` ADD COLUMN `endzeit` time NULL'));
PREPARE st1 FROM @s1; EXECUTE st1; DEALLOCATE PREPARE st1;
-- Die einfachen Anführungszeichen der Enum-Werte werden für das Prepared
-- Statement verdoppelt.
SET @sp2 := (SELECT IF(
  NOT EXISTS(SELECT 1 FROM information_schema.TABLES
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'einsaetze')
  OR EXISTS(SELECT 1 FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'einsaetze' AND COLUMN_NAME = 'paragraph2')
, 'DO 1', 'ALTER TABLE `einsaetze` ADD COLUMN `paragraph2` enum(''45b'',''45a'',''39'') NULL'));
PREPARE stp2 FROM @sp2; EXECUTE stp2; DEALLOCATE PREPARE stp2;
SET @s2 := (SELECT IF(
  NOT EXISTS(SELECT 1 FROM information_schema.TABLES
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'einsaetze')
  OR EXISTS(SELECT 1 FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'einsaetze' AND COLUMN_NAME = 'stunden1')
, 'DO 1', 'ALTER TABLE `einsaetze` ADD COLUMN `stunden1` decimal(5,2) NULL'));
PREPARE st2 FROM @s2; EXECUTE st2; DEALLOCATE PREPARE st2;
SET @s3 := (SELECT IF(
  NOT EXISTS(SELECT 1 FROM information_schema.TABLES
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'einsaetze')
  OR EXISTS(SELECT 1 FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'einsaetze' AND COLUMN_NAME = 'stunden2')
, 'DO 1', 'ALTER TABLE `einsaetze` ADD COLUMN `stunden2` decimal(5,2) NULL'));
PREPARE st3 FROM @s3; EXECUTE st3; DEALLOCATE PREPARE st3;
SET @s4 := (SELECT IF(
  NOT EXISTS(SELECT 1 FROM information_schema.TABLES
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'einsaetze')
  OR EXISTS(SELECT 1 FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'einsaetze' AND COLUMN_NAME = 'kosten1')
, 'DO 1', 'ALTER TABLE `einsaetze` ADD COLUMN `kosten1` decimal(8,2) NULL'));
PREPARE st4 FROM @s4; EXECUTE st4; DEALLOCATE PREPARE st4;
SET @s5 := (SELECT IF(
  NOT EXISTS(SELECT 1 FROM information_schema.TABLES
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'einsaetze')
  OR EXISTS(SELECT 1 FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'einsaetze' AND COLUMN_NAME = 'kosten2')
, 'DO 1', 'ALTER TABLE `einsaetze` ADD COLUMN `kosten2` decimal(8,2) NULL'));
PREPARE st5 FROM @s5; EXECUTE st5; DEALLOCATE PREPARE st5;
SET @s6 := (SELECT IF(
  NOT EXISTS(SELECT 1 FROM information_schema.TABLES
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'einsaetze')
  OR EXISTS(SELECT 1 FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'einsaetze' AND COLUMN_NAME = 'lohnkosten')
, 'DO 1', 'ALTER TABLE `einsaetze` ADD COLUMN `lohnkosten` decimal(8,2) NULL'));
PREPARE st6 FROM @s6; EXECUTE st6; DEALLOCATE PREPARE st6;
-- Verhindert doppelte Budgetabbuchung: über die Planung angelegte Termine
-- reservieren das Budget sofort, der spätere Abschluss darf nicht erneut buchen.
SET @s7 := (SELECT IF(
  NOT EXISTS(SELECT 1 FROM information_schema.TABLES
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'einsaetze')
  OR EXISTS(SELECT 1 FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'einsaetze' AND COLUMN_NAME = 'budgetGebucht')
, 'DO 1', 'ALTER TABLE `einsaetze` ADD COLUMN `budgetGebucht` boolean NULL DEFAULT false'));
PREPARE st7 FROM @s7; EXECUTE st7; DEALLOCATE PREPARE st7;
SET @s8 := (SELECT IF(
  NOT EXISTS(SELECT 1 FROM information_schema.TABLES
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'einsaetze')
  OR EXISTS(SELECT 1 FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'einsaetze' AND COLUMN_NAME = 'notizen')
, 'DO 1', 'ALTER TABLE `einsaetze` ADD COLUMN `notizen` text NULL'));
PREPARE st8 FROM @s8; EXECUTE st8; DEALLOCATE PREPARE st8;
SET @s9 := (SELECT IF(
  NOT EXISTS(SELECT 1 FROM information_schema.TABLES
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'einsaetze')
  OR EXISTS(SELECT 1 FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'einsaetze' AND COLUMN_NAME = 'geplantVon')
, 'DO 1', 'ALTER TABLE `einsaetze` ADD COLUMN `geplantVon` int NULL'));
PREPARE st9 FROM @s9; EXECUTE st9; DEALLOCATE PREPARE st9;
SET @s10 := (SELECT IF(
  NOT EXISTS(SELECT 1 FROM information_schema.TABLES
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'einsaetze')
  OR EXISTS(SELECT 1 FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'einsaetze' AND COLUMN_NAME = 'geloeschtAt')
, 'DO 1', 'ALTER TABLE `einsaetze` ADD COLUMN `geloeschtAt` timestamp NULL'));
PREPARE st10 FROM @s10; EXECUTE st10; DEALLOCATE PREPARE st10;
SET @s11 := (SELECT IF(
  NOT EXISTS(SELECT 1 FROM information_schema.TABLES
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'einsaetze')
  OR EXISTS(SELECT 1 FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'einsaetze' AND COLUMN_NAME = 'geloeschtVon')
, 'DO 1', 'ALTER TABLE `einsaetze` ADD COLUMN `geloeschtVon` int NULL'));
PREPARE st11 FROM @s11; EXECUTE st11; DEALLOCATE PREPARE st11;
SET @s12 := (SELECT IF(
  NOT EXISTS(SELECT 1 FROM information_schema.TABLES
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'einsaetze')
  OR EXISTS(SELECT 1 FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'einsaetze' AND COLUMN_NAME = 'loeschgrund')
, 'DO 1', 'ALTER TABLE `einsaetze` ADD COLUMN `loeschgrund` text NULL'));
PREPARE st12 FROM @s12; EXECUTE st12; DEALLOCATE PREPARE st12;

SET @s32 := (SELECT IF(
  NOT EXISTS(SELECT 1 FROM information_schema.TABLES
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'einsaetze')
  OR EXISTS(SELECT 1 FROM information_schema.STATISTICS
            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'einsaetze' AND INDEX_NAME = 'idx_einsaetze_datum')
, 'DO 1', 'ALTER TABLE `einsaetze` ADD INDEX `idx_einsaetze_datum` (`datum`)'));
PREPARE st32 FROM @s32; EXECUTE st32; DEALLOCATE PREPARE st32;
SET @s33 := (SELECT IF(
  NOT EXISTS(SELECT 1 FROM information_schema.TABLES
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'einsaetze')
  OR EXISTS(SELECT 1 FROM information_schema.STATISTICS
            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'einsaetze' AND INDEX_NAME = 'idx_einsaetze_ma_datum')
, 'DO 1', 'ALTER TABLE `einsaetze` ADD INDEX `idx_einsaetze_ma_datum` (`mitarbeiterId`, `datum`)'));
PREPARE st33 FROM @s33; EXECUTE st33; DEALLOCATE PREPARE st33;
SET @s34 := (SELECT IF(
  NOT EXISTS(SELECT 1 FROM information_schema.TABLES
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'einsaetze')
  OR EXISTS(SELECT 1 FROM information_schema.STATISTICS
            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'einsaetze' AND INDEX_NAME = 'idx_einsaetze_kunde_datum')
, 'DO 1', 'ALTER TABLE `einsaetze` ADD INDEX `idx_einsaetze_kunde_datum` (`kundenId`, `datum`)'));
PREPARE st34 FROM @s34; EXECUTE st34; DEALLOCATE PREPARE st34;
SET @s35 := (SELECT IF(
  NOT EXISTS(SELECT 1 FROM information_schema.TABLES
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'einsaetze')
  OR EXISTS(SELECT 1 FROM information_schema.STATISTICS
            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'einsaetze' AND INDEX_NAME = 'idx_einsaetze_geloescht')
, 'DO 1', 'ALTER TABLE `einsaetze` ADD INDEX `idx_einsaetze_geloescht` (`geloeschtAt`)'));
PREPARE st35 FROM @s35; EXECUTE st35; DEALLOCATE PREPARE st35;

-- ── 2. Löschstatus für weitere Stammdaten ─────────────────────────────────
--  Überall, wo Daten angelegt werden, muss der Administrator löschen können.
--  Gelöscht wird grundsätzlich per Soft-Delete (Nachvollziehbarkeit, DSGVO).

SET @s13 := (SELECT IF(
  NOT EXISTS(SELECT 1 FROM information_schema.TABLES
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'leistungen')
  OR EXISTS(SELECT 1 FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'leistungen' AND COLUMN_NAME = 'geloeschtAt')
, 'DO 1', 'ALTER TABLE `leistungen` ADD COLUMN `geloeschtAt` timestamp NULL'));
PREPARE st13 FROM @s13; EXECUTE st13; DEALLOCATE PREPARE st13;
SET @s14 := (SELECT IF(
  NOT EXISTS(SELECT 1 FROM information_schema.TABLES
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'leistungen')
  OR EXISTS(SELECT 1 FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'leistungen' AND COLUMN_NAME = 'geloeschtVon')
, 'DO 1', 'ALTER TABLE `leistungen` ADD COLUMN `geloeschtVon` int NULL'));
PREPARE st14 FROM @s14; EXECUTE st14; DEALLOCATE PREPARE st14;
SET @s15 := (SELECT IF(
  NOT EXISTS(SELECT 1 FROM information_schema.TABLES
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'fahrten')
  OR EXISTS(SELECT 1 FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'fahrten' AND COLUMN_NAME = 'geloeschtAt')
, 'DO 1', 'ALTER TABLE `fahrten` ADD COLUMN `geloeschtAt` timestamp NULL'));
PREPARE st15 FROM @s15; EXECUTE st15; DEALLOCATE PREPARE st15;
SET @s16 := (SELECT IF(
  NOT EXISTS(SELECT 1 FROM information_schema.TABLES
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'fahrten')
  OR EXISTS(SELECT 1 FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'fahrten' AND COLUMN_NAME = 'geloeschtVon')
, 'DO 1', 'ALTER TABLE `fahrten` ADD COLUMN `geloeschtVon` int NULL'));
PREPARE st16 FROM @s16; EXECUTE st16; DEALLOCATE PREPARE st16;
SET @s17 := (SELECT IF(
  NOT EXISTS(SELECT 1 FROM information_schema.TABLES
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'fahrten')
  OR EXISTS(SELECT 1 FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'fahrten' AND COLUMN_NAME = 'einsatzId')
, 'DO 1', 'ALTER TABLE `fahrten` ADD COLUMN `einsatzId` int NULL'));
PREPARE st17 FROM @s17; EXECUTE st17; DEALLOCATE PREPARE st17;
SET @s18 := (SELECT IF(
  NOT EXISTS(SELECT 1 FROM information_schema.TABLES
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'urlaubsantraege')
  OR EXISTS(SELECT 1 FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'urlaubsantraege' AND COLUMN_NAME = 'geloeschtAt')
, 'DO 1', 'ALTER TABLE `urlaubsantraege` ADD COLUMN `geloeschtAt` timestamp NULL'));
PREPARE st18 FROM @s18; EXECUTE st18; DEALLOCATE PREPARE st18;
SET @s19 := (SELECT IF(
  NOT EXISTS(SELECT 1 FROM information_schema.TABLES
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'urlaubsantraege')
  OR EXISTS(SELECT 1 FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'urlaubsantraege' AND COLUMN_NAME = 'geloeschtVon')
, 'DO 1', 'ALTER TABLE `urlaubsantraege` ADD COLUMN `geloeschtVon` int NULL'));
PREPARE st19 FROM @s19; EXECUTE st19; DEALLOCATE PREPARE st19;
SET @s20 := (SELECT IF(
  NOT EXISTS(SELECT 1 FROM information_schema.TABLES
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'krankmeldungen')
  OR EXISTS(SELECT 1 FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'krankmeldungen' AND COLUMN_NAME = 'geloeschtAt')
, 'DO 1', 'ALTER TABLE `krankmeldungen` ADD COLUMN `geloeschtAt` timestamp NULL'));
PREPARE st20 FROM @s20; EXECUTE st20; DEALLOCATE PREPARE st20;
SET @s21 := (SELECT IF(
  NOT EXISTS(SELECT 1 FROM information_schema.TABLES
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'krankmeldungen')
  OR EXISTS(SELECT 1 FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'krankmeldungen' AND COLUMN_NAME = 'geloeschtVon')
, 'DO 1', 'ALTER TABLE `krankmeldungen` ADD COLUMN `geloeschtVon` int NULL'));
PREPARE st21 FROM @s21; EXECUTE st21; DEALLOCATE PREPARE st21;
SET @s22 := (SELECT IF(
  NOT EXISTS(SELECT 1 FROM information_schema.TABLES
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'touren')
  OR EXISTS(SELECT 1 FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'touren' AND COLUMN_NAME = 'geloeschtAt')
, 'DO 1', 'ALTER TABLE `touren` ADD COLUMN `geloeschtAt` timestamp NULL'));
PREPARE st22 FROM @s22; EXECUTE st22; DEALLOCATE PREPARE st22;
SET @s23 := (SELECT IF(
  NOT EXISTS(SELECT 1 FROM information_schema.TABLES
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'touren')
  OR EXISTS(SELECT 1 FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'touren' AND COLUMN_NAME = 'geloeschtVon')
, 'DO 1', 'ALTER TABLE `touren` ADD COLUMN `geloeschtVon` int NULL'));
PREPARE st23 FROM @s23; EXECUTE st23; DEALLOCATE PREPARE st23;
SET @s24 := (SELECT IF(
  NOT EXISTS(SELECT 1 FROM information_schema.TABLES
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'touren')
  OR EXISTS(SELECT 1 FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'touren' AND COLUMN_NAME = 'reihenfolgeGeaendertVon')
, 'DO 1', 'ALTER TABLE `touren` ADD COLUMN `reihenfolgeGeaendertVon` int NULL'));
PREPARE st24 FROM @s24; EXECUTE st24; DEALLOCATE PREPARE st24;
SET @s25 := (SELECT IF(
  NOT EXISTS(SELECT 1 FROM information_schema.TABLES
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'touren')
  OR EXISTS(SELECT 1 FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'touren' AND COLUMN_NAME = 'reihenfolgeGeaendertAt')
, 'DO 1', 'ALTER TABLE `touren` ADD COLUMN `reihenfolgeGeaendertAt` timestamp NULL'));
PREPARE st25 FROM @s25; EXECUTE st25; DEALLOCATE PREPARE st25;

SET @s36 := (SELECT IF(
  NOT EXISTS(SELECT 1 FROM information_schema.TABLES
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'leistungen')
  OR EXISTS(SELECT 1 FROM information_schema.STATISTICS
            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'leistungen' AND INDEX_NAME = 'idx_leistungen_geloescht')
, 'DO 1', 'ALTER TABLE `leistungen` ADD INDEX `idx_leistungen_geloescht` (`geloeschtAt`)'));
PREPARE st36 FROM @s36; EXECUTE st36; DEALLOCATE PREPARE st36;
SET @s37 := (SELECT IF(
  NOT EXISTS(SELECT 1 FROM information_schema.TABLES
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'fahrten')
  OR EXISTS(SELECT 1 FROM information_schema.STATISTICS
            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'fahrten' AND INDEX_NAME = 'idx_fahrten_geloescht')
, 'DO 1', 'ALTER TABLE `fahrten` ADD INDEX `idx_fahrten_geloescht` (`geloeschtAt`)'));
PREPARE st37 FROM @s37; EXECUTE st37; DEALLOCATE PREPARE st37;
SET @s38 := (SELECT IF(
  NOT EXISTS(SELECT 1 FROM information_schema.TABLES
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'urlaubsantraege')
  OR EXISTS(SELECT 1 FROM information_schema.STATISTICS
            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'urlaubsantraege' AND INDEX_NAME = 'idx_urlaub_zeitraum')
, 'DO 1', 'ALTER TABLE `urlaubsantraege` ADD INDEX `idx_urlaub_zeitraum` (`mitarbeiterId`, `von`, `bis`)'));
PREPARE st38 FROM @s38; EXECUTE st38; DEALLOCATE PREPARE st38;
SET @s39 := (SELECT IF(
  NOT EXISTS(SELECT 1 FROM information_schema.TABLES
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'krankmeldungen')
  OR EXISTS(SELECT 1 FROM information_schema.STATISTICS
            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'krankmeldungen' AND INDEX_NAME = 'idx_krank_zeitraum')
, 'DO 1', 'ALTER TABLE `krankmeldungen` ADD INDEX `idx_krank_zeitraum` (`mitarbeiterId`, `von`, `bis`)'));
PREPARE st39 FROM @s39; EXECUTE st39; DEALLOCATE PREPARE st39;
SET @s40 := (SELECT IF(
  NOT EXISTS(SELECT 1 FROM information_schema.TABLES
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'touren')
  OR EXISTS(SELECT 1 FROM information_schema.STATISTICS
            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'touren' AND INDEX_NAME = 'idx_touren_ma_datum')
, 'DO 1', 'ALTER TABLE `touren` ADD INDEX `idx_touren_ma_datum` (`mitarbeiterId`, `datum`)'));
PREPARE st40 FROM @s40; EXECUTE st40; DEALLOCATE PREPARE st40;

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
SET @s26 := (SELECT IF(
  NOT EXISTS(SELECT 1 FROM information_schema.TABLES
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'kassenanfragen')
  OR EXISTS(SELECT 1 FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'kassenanfragen' AND COLUMN_NAME = 'geloeschtAt')
, 'DO 1', 'ALTER TABLE `kassenanfragen` ADD COLUMN `geloeschtAt` timestamp NULL'));
PREPARE st26 FROM @s26; EXECUTE st26; DEALLOCATE PREPARE st26;
SET @s27 := (SELECT IF(
  NOT EXISTS(SELECT 1 FROM information_schema.TABLES
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'kassenanfragen')
  OR EXISTS(SELECT 1 FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'kassenanfragen' AND COLUMN_NAME = 'geloeschtVon')
, 'DO 1', 'ALTER TABLE `kassenanfragen` ADD COLUMN `geloeschtVon` int NULL'));
PREPARE st27 FROM @s27; EXECUTE st27; DEALLOCATE PREPARE st27;
SET @s28 := (SELECT IF(
  NOT EXISTS(SELECT 1 FROM information_schema.TABLES
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'neukundenaufnahmen')
  OR EXISTS(SELECT 1 FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'neukundenaufnahmen' AND COLUMN_NAME = 'geloeschtAt')
, 'DO 1', 'ALTER TABLE `neukundenaufnahmen` ADD COLUMN `geloeschtAt` timestamp NULL'));
PREPARE st28 FROM @s28; EXECUTE st28; DEALLOCATE PREPARE st28;
SET @s29 := (SELECT IF(
  NOT EXISTS(SELECT 1 FROM information_schema.TABLES
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'neukundenaufnahmen')
  OR EXISTS(SELECT 1 FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'neukundenaufnahmen' AND COLUMN_NAME = 'geloeschtVon')
, 'DO 1', 'ALTER TABLE `neukundenaufnahmen` ADD COLUMN `geloeschtVon` int NULL'));
PREPARE st29 FROM @s29; EXECUTE st29; DEALLOCATE PREPARE st29;
SET @s30 := (SELECT IF(
  NOT EXISTS(SELECT 1 FROM information_schema.TABLES
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'fuehrerschein_checks')
  OR EXISTS(SELECT 1 FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'fuehrerschein_checks' AND COLUMN_NAME = 'geloeschtAt')
, 'DO 1', 'ALTER TABLE `fuehrerschein_checks` ADD COLUMN `geloeschtAt` timestamp NULL'));
PREPARE st30 FROM @s30; EXECUTE st30; DEALLOCATE PREPARE st30;
SET @s31 := (SELECT IF(
  NOT EXISTS(SELECT 1 FROM information_schema.TABLES
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'fuehrerschein_checks')
  OR EXISTS(SELECT 1 FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'fuehrerschein_checks' AND COLUMN_NAME = 'geloeschtVon')
, 'DO 1', 'ALTER TABLE `fuehrerschein_checks` ADD COLUMN `geloeschtVon` int NULL'));
PREPARE st31 FROM @s31; EXECUTE st31; DEALLOCATE PREPARE st31;

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

