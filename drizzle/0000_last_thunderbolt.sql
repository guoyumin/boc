CREATE TABLE `achievement_claims` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`achievement_id` integer NOT NULL,
	`player_id` integer NOT NULL,
	`event_id` integer,
	`game_id` integer,
	`note` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`reviewed_by` integer,
	`reviewed_at` text,
	`review_note` text,
	`unlocked_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	FOREIGN KEY (`achievement_id`) REFERENCES `achievements`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`player_id`) REFERENCES `players`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `achievement_claims_unique` ON `achievement_claims` (`achievement_id`,`player_id`);--> statement-breakpoint
CREATE INDEX `achievement_claims_status` ON `achievement_claims` (`achievement_id`,`status`);--> statement-breakpoint
CREATE INDEX `achievement_claims_player` ON `achievement_claims` (`player_id`);--> statement-breakpoint
CREATE TABLE `achievements` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`description` text NOT NULL,
	`icon` text DEFAULT '🏆' NOT NULL,
	`category` text DEFAULT 'other' NOT NULL,
	`rarity` text DEFAULT 'common' NOT NULL,
	`hidden` integer DEFAULT 0 NOT NULL,
	`sort_order` integer DEFAULT 100 NOT NULL,
	`active` integer DEFAULT 1 NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `achievements_name_unique` ON `achievements` (`name`);--> statement-breakpoint
CREATE TABLE `admin_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`admin_id` integer NOT NULL,
	`expires_at` text NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	FOREIGN KEY (`admin_id`) REFERENCES `admins`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `admin_sessions_expires` ON `admin_sessions` (`expires_at`);--> statement-breakpoint
CREATE TABLE `admins` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`username` text NOT NULL,
	`password_hash` text NOT NULL,
	`role` text DEFAULT 'admin' NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`note` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `admins_username_unique` ON `admins` (`username`);--> statement-breakpoint
CREATE TABLE `audit_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`admin_id` integer,
	`action` text NOT NULL,
	`target_type` text,
	`target_id` integer,
	`detail` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `event_files` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`event_id` integer NOT NULL,
	`game_id` integer,
	`kind` text NOT NULL,
	`session` text,
	`original_name` text NOT NULL,
	`storage_path` text NOT NULL,
	`thumb_path` text,
	`mime` text NOT NULL,
	`size` integer NOT NULL,
	`script_name` text,
	`script_author` text,
	`role_count` integer,
	`uploaded_by` integer,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `event_files_event` ON `event_files` (`event_id`);--> statement-breakpoint
CREATE TABLE `event_signups` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`event_id` integer NOT NULL,
	`player_id` integer NOT NULL,
	`signup` text DEFAULT 'none' NOT NULL,
	`signup_note` text,
	`seq` integer,
	`source` text DEFAULT 'self' NOT NULL,
	`attended` text DEFAULT 'none' NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`player_id`) REFERENCES `players`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `event_signups_unique` ON `event_signups` (`event_id`,`player_id`);--> statement-breakpoint
CREATE INDEX `event_signups_event` ON `event_signups` (`event_id`);--> statement-breakpoint
CREATE INDEX `event_signups_player` ON `event_signups` (`player_id`);--> statement-breakpoint
CREATE TABLE `events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`date` text NOT NULL,
	`title` text NOT NULL,
	`location` text,
	`start_time` text,
	`note` text,
	`has_afternoon` integer DEFAULT 1 NOT NULL,
	`has_evening` integer DEFAULT 1 NOT NULL,
	`status` text DEFAULT 'planned' NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `events_date` ON `events` (`date`);--> statement-breakpoint
CREATE TABLE `game_players` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`game_id` integer NOT NULL,
	`player_id` integer NOT NULL,
	`seat` integer,
	`role_id` text,
	`role_name` text DEFAULT '' NOT NULL,
	`note` text,
	FOREIGN KEY (`game_id`) REFERENCES `games`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`player_id`) REFERENCES `players`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `game_players_unique` ON `game_players` (`game_id`,`player_id`);--> statement-breakpoint
CREATE INDEX `game_players_player` ON `game_players` (`player_id`);--> statement-breakpoint
CREATE TABLE `game_storytellers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`game_id` integer NOT NULL,
	`player_id` integer NOT NULL,
	FOREIGN KEY (`game_id`) REFERENCES `games`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`player_id`) REFERENCES `players`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `game_storytellers_unique` ON `game_storytellers` (`game_id`,`player_id`);--> statement-breakpoint
CREATE TABLE `games` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`event_id` integer NOT NULL,
	`session` text DEFAULT 'afternoon' NOT NULL,
	`seq` integer DEFAULT 1 NOT NULL,
	`script_name` text NOT NULL,
	`script_file_id` integer,
	`result` text DEFAULT 'unknown' NOT NULL,
	`note` text,
	`recorded_by` integer,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`recorded_by`) REFERENCES `players`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `games_event` ON `games` (`event_id`);--> statement-breakpoint
CREATE TABLE `players` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`aliases` text DEFAULT '[]' NOT NULL,
	`archived` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `players_name_unique` ON `players` (`name`);--> statement-breakpoint
CREATE TABLE `poll_responses` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`poll_id` integer NOT NULL,
	`player_id` integer NOT NULL,
	`slots` text DEFAULT '[]' NOT NULL,
	`note` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	FOREIGN KEY (`poll_id`) REFERENCES `polls`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`player_id`) REFERENCES `players`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `poll_responses_unique` ON `poll_responses` (`poll_id`,`player_id`);--> statement-breakpoint
CREATE INDEX `poll_responses_poll` ON `poll_responses` (`poll_id`);--> statement-breakpoint
CREATE TABLE `polls` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`saturday` text NOT NULL,
	`title` text NOT NULL,
	`slots` text DEFAULT '["sat_pm","sat_eve","sun_pm","sun_eve"]' NOT NULL,
	`note` text,
	`status` text DEFAULT 'open' NOT NULL,
	`event_id` integer,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
