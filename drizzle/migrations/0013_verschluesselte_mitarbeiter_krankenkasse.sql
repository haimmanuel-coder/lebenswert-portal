-- Die Krankenkasse ist ein Gesundheitsdatum und wird deshalb getrennt
-- verschlüsselt gespeichert; die Klartextspalte dient nur der Überführung.
ALTER TABLE `mitarbeiter`
  ADD COLUMN `krankenkasseVerschluesselt` TEXT NULL AFTER `krankenkasse`;
