CREATE TABLE `submissions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`cohort` text NOT NULL,
	`assignment` text NOT NULL,
	`student_id` text NOT NULL,
	`url` text NOT NULL,
	`owner` text,
	`imported_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_submissions_cohort_assignment_student` ON `submissions` (`cohort`,`assignment`,`student_id`);