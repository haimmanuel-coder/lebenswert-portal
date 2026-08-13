-- Einheitlicher Mitarbeiterablauf: fachlicher Besuchsbericht und automatische Fahrt.
-- IF NOT EXISTS macht die Migration sicher, falls die Produktionsdatenbank die
-- Spalten bereits durch die Notfallmigration erhalten hat.
ALTER TABLE `besuchsberichte`
  ADD COLUMN IF NOT EXISTS `datum` date NULL,
  ADD COLUMN IF NOT EXISTS `taetigkeiten` text NULL,
  ADD COLUMN IF NOT EXISTS `status` varchar(20) NOT NULL DEFAULT 'entwurf',
  ADD COLUMN IF NOT EXISTS `pflegegradSnapshot` varchar(20) NULL,
  ADD COLUMN IF NOT EXISTS `fahrtKilometer` decimal(6,1) NULL,
  ADD COLUMN IF NOT EXISTS `fahrtVonOrt` varchar(200) NULL,
  ADD COLUMN IF NOT EXISTS `fahrtNachOrt` varchar(200) NULL;

ALTER TABLE `fahrten`
  ADD COLUMN IF NOT EXISTS `einsatzId` int NULL;

CREATE INDEX IF NOT EXISTS `idx_besuchsberichte_einsatz` ON `besuchsberichte` (`einsatzId`);
CREATE INDEX IF NOT EXISTS `idx_fahrten_einsatz` ON `fahrten` (`einsatzId`);
