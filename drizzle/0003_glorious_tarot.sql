CREATE TABLE `site_content` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE `submissions` ADD `final_file_key` text;--> statement-breakpoint
ALTER TABLE `submissions` ADD `final_file_name` text;--> statement-breakpoint
ALTER TABLE `submissions` ADD `volume` text;--> statement-breakpoint
ALTER TABLE `submissions` ADD `issue` text;--> statement-breakpoint
ALTER TABLE `submissions` ADD `doi` text;--> statement-breakpoint
ALTER TABLE `submissions` ADD `pages` text;--> statement-breakpoint
ALTER TABLE `submissions` ADD `rights_confirmed` integer DEFAULT 0 NOT NULL;