-- Zugangskarten: temporäres Startpasswort wird ausschließlich als Hash gespeichert.
ALTER TABLE `mitarbeiter`
  ADD COLUMN IF NOT EXISTS `passwortWechselErforderlich` tinyint(1) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS `startPasswortErstelltAt` timestamp NULL;
