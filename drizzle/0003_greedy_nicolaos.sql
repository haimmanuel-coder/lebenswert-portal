CREATE TABLE `passwordResets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`mitarbeiterId` int NOT NULL,
	`token` varchar(128) NOT NULL,
	`expiresAt` timestamp NOT NULL,
	`used` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `passwordResets_id` PRIMARY KEY(`id`),
	CONSTRAINT `passwordResets_token_unique` UNIQUE(`token`)
);
