CREATE TABLE `assignments` (
	`id` text PRIMARY KEY NOT NULL,
	`submission_id` text NOT NULL,
	`reviewer_id` text NOT NULL,
	`status` text DEFAULT 'assigned' NOT NULL,
	`score` integer,
	`recommendation` text,
	`comments` text,
	`confidential` text,
	`conflict` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`completed_at` integer,
	FOREIGN KEY (`submission_id`) REFERENCES `submissions`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`reviewer_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `assignment_pair` ON `assignments` (`submission_id`,`reviewer_id`);--> statement-breakpoint
CREATE INDEX `assignments_reviewer` ON `assignments` (`reviewer_id`);--> statement-breakpoint
CREATE TABLE `events` (
	`id` text PRIMARY KEY NOT NULL,
	`submission_id` text NOT NULL,
	`actor_id` text NOT NULL,
	`action` text NOT NULL,
	`at` integer NOT NULL,
	FOREIGN KEY (`submission_id`) REFERENCES `submissions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `events_submission` ON `events` (`submission_id`);--> statement-breakpoint
CREATE TABLE `invitations` (
	`email` text PRIMARY KEY NOT NULL,
	`role` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `submissions` (
	`id` text PRIMARY KEY NOT NULL,
	`author_id` text NOT NULL,
	`title` text NOT NULL,
	`abstract` text NOT NULL,
	`keywords` text NOT NULL,
	`authors` text NOT NULL,
	`track` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`file_key` text,
	`file_name` text,
	`file_type` text,
	`decision_note` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`submitted_at` integer,
	FOREIGN KEY (`author_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `submissions_author` ON `submissions` (`author_id`);--> statement-breakpoint
CREATE INDEX `submissions_status` ON `submissions` (`status`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`name` text NOT NULL,
	`role` text DEFAULT 'author' NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email` ON `users` (`email`);