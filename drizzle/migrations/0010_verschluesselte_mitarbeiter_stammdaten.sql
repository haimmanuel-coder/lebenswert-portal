-- AES-GCM verschlüsselte Werte benötigen mehr Platz als die ursprünglichen
-- Klartextformate. Diese Änderung vergrößert nur die Spalten und verändert
-- keinerlei Inhalte. Die kontrollierte Datenumwandlung folgt serverseitig.
ALTER TABLE `mitarbeiter`
  MODIFY COLUMN `sozialversicherungsnummer` VARCHAR(255) NULL,
  MODIFY COLUMN `steueridentnummer` VARCHAR(255) NULL,
  MODIFY COLUMN `iban` VARCHAR(255) NULL;
