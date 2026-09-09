-- Gesundheitsdaten werden separat verschlüsselt gespeichert. Die bisherigen
-- Felder bleiben temporär bestehen, damit die Migration vollständig reversibel
-- und ohne Informationsverlust verläuft.
ALTER TABLE `kunden`
  ADD COLUMN `pflegegradVerschluesselt` TEXT NULL AFTER `pflegegradSeit`,
  ADD COLUMN `pflegegradSeitVerschluesselt` TEXT NULL AFTER `pflegegradSeit`;
