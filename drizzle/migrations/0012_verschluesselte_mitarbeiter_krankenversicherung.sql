-- Die Art der Krankenversicherung wird verschlüsselt abgelegt. Die bestehende
-- Enum-Spalte bleibt während der kontrollierten Datenüberführung als Fallback.
ALTER TABLE `mitarbeiter`
  ADD COLUMN `krankenversicherungsartVerschluesselt` TEXT NULL AFTER `krankenversicherungsart`;
