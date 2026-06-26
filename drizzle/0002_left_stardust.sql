CREATE TABLE `auditLogs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`mitarbeiterId` int,
	`action` varchar(50) NOT NULL,
	`ressource` varchar(100),
	`details` text,
	`status` enum('success','failure','partial') NOT NULL DEFAULT 'success',
	`ipAddress` varchar(45),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `auditLogs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `kundenZuordnung` (
	`id` int AUTO_INCREMENT NOT NULL,
	`mitarbeiterId` int NOT NULL,
	`kundenId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `kundenZuordnung_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `monatsabschluesse` (
	`id` int AUTO_INCREMENT NOT NULL,
	`monat` varchar(7) NOT NULL,
	`adminId` int NOT NULL,
	`gesamtStunden` decimal(7,2) DEFAULT '0',
	`gesamtEinsaetze` int DEFAULT 0,
	`gesamtKm` decimal(8,1) DEFAULT '0',
	`gesamtVerguetung` decimal(10,2) DEFAULT '0',
	`csvExport` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `monatsabschluesse_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `kunden` ADD `pflegegrad` int DEFAULT 2;--> statement-breakpoint
ALTER TABLE `kunden` ADD `paragraph` enum('45b','45a','39','privat') DEFAULT '45b';--> statement-breakpoint
ALTER TABLE `mitarbeiter` ADD `telefon` varchar(50);--> statement-breakpoint
ALTER TABLE `mitarbeiter` ADD `adresse` text;