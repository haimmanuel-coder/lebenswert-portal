CREATE TABLE `einsaetze` (
	`id` int AUTO_INCREMENT NOT NULL,
	`mitarbeiterId` int NOT NULL,
	`kundenId` int NOT NULL,
	`datum` date NOT NULL,
	`startzeit` time,
	`dauerStunden` decimal(4,2),
	`paragraph` enum('45b','45a','39') NOT NULL DEFAULT '45b',
	`status` enum('geplant','abgeschlossen','abgesagt') NOT NULL DEFAULT 'geplant',
	`bericht` text,
	`gesundheit` enum('gut','stabil','auffaellig','kritisch'),
	`bemerkung` text,
	`unterschriftMitarbeiter` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `einsaetze_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `fahrten` (
	`id` int AUTO_INCREMENT NOT NULL,
	`mitarbeiterId` int NOT NULL,
	`kundenId` int,
	`datum` date NOT NULL,
	`vonOrt` varchar(200) NOT NULL,
	`nachOrt` varchar(200) NOT NULL,
	`kilometer` decimal(6,1) NOT NULL,
	`typ` enum('normal','sonder') NOT NULL DEFAULT 'normal',
	`zweck` varchar(255),
	`verguetung` decimal(7,2) DEFAULT '0',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `fahrten_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `kunden` (
	`id` int AUTO_INCREMENT NOT NULL,
	`vorname` varchar(100) NOT NULL,
	`nachname` varchar(100) NOT NULL,
	`adresse` text,
	`telefon` varchar(50),
	`aktiv` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `kunden_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `leistungen` (
	`id` int AUTO_INCREMENT NOT NULL,
	`mitarbeiterId` int NOT NULL,
	`kundenId` int NOT NULL,
	`monat` varchar(7) NOT NULL,
	`paragraph` enum('45b','45a','39') NOT NULL DEFAULT '45b',
	`stunden` decimal(5,2) DEFAULT '0',
	`anzahlEinsaetze` int DEFAULT 1,
	`betrag` decimal(8,2) DEFAULT '0',
	`status` enum('offen','pruefung','freigegeben','versendet') NOT NULL DEFAULT 'offen',
	`bemerkung` text,
	`unterschriftLeister` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `leistungen_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `mitarbeiter` (
	`id` int AUTO_INCREMENT NOT NULL,
	`vorname` varchar(100) NOT NULL,
	`nachname` varchar(100) NOT NULL,
	`email` varchar(320) NOT NULL,
	`passwortHash` varchar(255) NOT NULL,
	`rolle` enum('mitarbeiter','admin') NOT NULL DEFAULT 'mitarbeiter',
	`aktiv` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `mitarbeiter_id` PRIMARY KEY(`id`),
	CONSTRAINT `mitarbeiter_email_unique` UNIQUE(`email`)
);
