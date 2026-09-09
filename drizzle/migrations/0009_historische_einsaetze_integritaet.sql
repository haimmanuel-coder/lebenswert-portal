-- Historische Einsätze mit nicht mehr existierenden Kunden- oder Mitarbeiter-
-- stämmen werden vollständig und unverändert in eine getrennte Archivkopie
-- übernommen. Die aktive Tabelle bleibt für neue und laufende Einsätze strikt
-- referenziell geschützt.
CREATE TABLE `historischeEinsaetze` LIKE `einsaetze`;

ALTER TABLE `historischeEinsaetze`
  ADD COLUMN `historischArchiviertAt` TIMESTAMP NULL,
  ADD COLUMN `historischArchivHinweis` VARCHAR(255) NULL;

INSERT INTO `historischeEinsaetze`
SELECT e.*, NOW(), 'Historischer Einsatz: fehlende Stammdatenreferenz archiviert'
FROM `einsaetze` e
LEFT JOIN `mitarbeiter` m ON m.id = e.mitarbeiterId
LEFT JOIN `kunden` k ON k.id = e.kundenId
WHERE (e.mitarbeiterId IS NOT NULL AND m.id IS NULL) OR (e.kundenId IS NOT NULL AND k.id IS NULL);

DELETE e FROM `einsaetze` e
LEFT JOIN `mitarbeiter` m ON m.id = e.mitarbeiterId
LEFT JOIN `kunden` k ON k.id = e.kundenId
WHERE (e.mitarbeiterId IS NOT NULL AND m.id IS NULL) OR (e.kundenId IS NOT NULL AND k.id IS NULL);

ALTER TABLE `einsaetze`
  ADD CONSTRAINT `fk_einsaetze_mitarbeiter` FOREIGN KEY (`mitarbeiterId`) REFERENCES `mitarbeiter` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  ADD CONSTRAINT `fk_einsaetze_kunde` FOREIGN KEY (`kundenId`) REFERENCES `kunden` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

ALTER TABLE `leistungen`
  ADD CONSTRAINT `fk_leistungen_mitarbeiter` FOREIGN KEY (`mitarbeiterId`) REFERENCES `mitarbeiter` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  ADD CONSTRAINT `fk_leistungen_kunde` FOREIGN KEY (`kundenId`) REFERENCES `kunden` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

ALTER TABLE `fahrten`
  ADD CONSTRAINT `fk_fahrten_mitarbeiter` FOREIGN KEY (`mitarbeiterId`) REFERENCES `mitarbeiter` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  ADD CONSTRAINT `fk_fahrten_kunde` FOREIGN KEY (`kundenId`) REFERENCES `kunden` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  ADD CONSTRAINT `fk_fahrten_einsatz` FOREIGN KEY (`einsatzId`) REFERENCES `einsaetze` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

ALTER TABLE `kundenZuordnung`
  ADD CONSTRAINT `fk_kunden_zuordnung_mitarbeiter` FOREIGN KEY (`mitarbeiterId`) REFERENCES `mitarbeiter` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  ADD CONSTRAINT `fk_kunden_zuordnung_kunde` FOREIGN KEY (`kundenId`) REFERENCES `kunden` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
