ALTER TABLE `achievement_claims` ADD `unlocked_at_text` text;--> statement-breakpoint
ALTER TABLE `achievements` ADD `role` text DEFAULT '通用' NOT NULL;--> statement-breakpoint
ALTER TABLE `achievements` ADD `stars` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `achievements` ADD `script_name` text;--> statement-breakpoint
ALTER TABLE `achievements` DROP COLUMN `category`;--> statement-breakpoint
ALTER TABLE `achievements` DROP COLUMN `rarity`;