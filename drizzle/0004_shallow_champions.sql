ALTER TABLE `poll_responses` ADD `status` text DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE `poll_responses` ADD `withdrawn_at` text;