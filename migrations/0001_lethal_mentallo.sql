CREATE TABLE `__new_registrations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`github_id` text NOT NULL,
	`github_login` text NOT NULL,
	`github_name` text,
	`github_avatar_url` text NOT NULL,
	`student_id` text NOT NULL,
	`cohort` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);--> statement-breakpoint
INSERT INTO `__new_registrations` (`id`, `github_id`, `github_login`, `github_name`, `github_avatar_url`, `student_id`, `cohort`, `created_at`, `updated_at`) SELECT `id`, `github_id`, `github_login`, `github_name`, `github_avatar_url`, `student_id`, '2026', `created_at`, `updated_at` FROM `registrations`;--> statement-breakpoint
DROP TABLE `registrations`;--> statement-breakpoint
ALTER TABLE `__new_registrations` RENAME TO `registrations`;--> statement-breakpoint
CREATE UNIQUE INDEX `idx_registrations_cohort_github_id` ON `registrations` (`cohort`,`github_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_registrations_cohort_student_id` ON `registrations` (`cohort`,`student_id`);
