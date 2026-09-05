CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` integer NOT NULL,
	`expires_at` text NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `sessions_expires` ON `sessions` (`expires_at`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`username` text NOT NULL,
	`password_hash` text NOT NULL,
	`role` text DEFAULT 'member' NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`player_id` integer,
	`note` text,
	`admin_request` text,
	`admin_requested_at` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	FOREIGN KEY (`player_id`) REFERENCES `players`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_username_unique` ON `users` (`username`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_player_unique` ON `users` (`player_id`);--> statement-breakpoint
INSERT INTO `users` (`id`, `username`, `password_hash`, `role`, `status`, `note`, `created_at`, `updated_at`)
  SELECT `id`, `username`, `password_hash`, `role`, `status`, `note`, `created_at`, `updated_at` FROM `admins`;--> statement-breakpoint
INSERT INTO `sessions` (`id`, `user_id`, `expires_at`, `created_at`)
  SELECT `id`, `admin_id`, `expires_at`, `created_at` FROM `admin_sessions`;--> statement-breakpoint
DROP TABLE `admin_sessions`;--> statement-breakpoint
DROP TABLE `admins`;--> statement-breakpoint
ALTER TABLE `achievements` ADD `rarity` text DEFAULT 'common' NOT NULL;--> statement-breakpoint
UPDATE `achievements` SET `rarity` = CASE
    WHEN `stars` >= 5 THEN 'legendary'
    WHEN `stars` = 4 THEN 'epic'
    WHEN `stars` = 3 THEN 'rare'
    ELSE 'common' END;--> statement-breakpoint
ALTER TABLE `achievements` DROP COLUMN `stars`;--> statement-breakpoint
ALTER TABLE `audit_logs` ADD `user_id` integer;--> statement-breakpoint
UPDATE `audit_logs` SET `user_id` = `admin_id`;--> statement-breakpoint
ALTER TABLE `audit_logs` DROP COLUMN `admin_id`;--> statement-breakpoint
ALTER TABLE `event_signups` ADD `status` text DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE `event_signups` ADD `cancelled_at` text;--> statement-breakpoint
ALTER TABLE `event_signups` ADD `no_show_waived` integer DEFAULT 0 NOT NULL;