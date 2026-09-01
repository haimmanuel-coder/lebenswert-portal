CREATE TABLE IF NOT EXISTS `zugangskartenPdfAusgaben` (
  `id` int AUTO_INCREMENT NOT NULL,
  `storageKey` varchar(500) NOT NULL,
  `dateiname` varchar(255) NOT NULL,
  `kartenAnzahl` int NOT NULL,
  `erstelltVon` int,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `zugangskartenPdfAusgaben_id` PRIMARY KEY(`id`),
  INDEX `zugangskartenPdfAusgaben_createdAt_idx` (`createdAt`)
);
