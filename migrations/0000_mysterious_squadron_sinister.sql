CREATE TABLE `registrations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`github_id` text NOT NULL,
	`github_login` text NOT NULL,
	`github_name` text,
	`github_avatar_url` text NOT NULL,
	`student_id` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_registrations_github_id` ON `registrations` (`github_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_registrations_student_id` ON `registrations` (`student_id`);