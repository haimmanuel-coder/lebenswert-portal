-- Entscheidung 15: Vollmacht-Ersatzunterschrift bei fehlender Unterschriftsfähigkeit
-- des Kunden, inkl. obligatorischer Teamleitung-Freigabe bei fehlender Vollmacht.
--
-- HINWEIS: Diese Migration wurde manuell erstellt, da `drizzle-kit generate`
-- im Sandbox-Environment einen interaktiven TTY-Prompt zur Konflikt-
-- auflösung benötigt (Spalten-Umbenennung vs. Neuanlage), der hier nicht
-- verfügbar war. Bitte vor dem Anwenden prüfen, ob `pnpm db:push` (interaktiv,
-- lokal) stattdessen ein äquivalentes, kanonisches Migrationsskript erzeugen
-- soll -- in dem Fall diese Datei durch das generierte Ergebnis ersetzen.

ALTER TABLE `einsaetze`
  ADD COLUMN `unterschriftErsatzTyp` ENUM('keine','vollmacht','mitarbeiter_vermerk') DEFAULT 'keine',
  ADD COLUMN `unterschriftErsatzName` VARCHAR(200),
  ADD COLUMN `unterschriftBegruendung` TEXT,
  ADD COLUMN `unterschriftFreigabeStatus` ENUM('nicht_erforderlich','ausstehend','freigegeben') DEFAULT 'nicht_erforderlich',
  ADD COLUMN `unterschriftFreigegebenVon` INT,
  ADD COLUMN `unterschriftFreigegebenAm` TIMESTAMP;

ALTER TABLE `leistungen`
  ADD COLUMN `unterschriftErsatzTyp` ENUM('keine','vollmacht','mitarbeiter_vermerk') DEFAULT 'keine',
  ADD COLUMN `unterschriftErsatzName` VARCHAR(200),
  ADD COLUMN `unterschriftBegruendung` TEXT,
  ADD COLUMN `unterschriftFreigabeStatus` ENUM('nicht_erforderlich','ausstehend','freigegeben') DEFAULT 'nicht_erforderlich',
  ADD COLUMN `unterschriftFreigegebenVon` INT,
  ADD COLUMN `unterschriftFreigegebenAm` TIMESTAMP;
