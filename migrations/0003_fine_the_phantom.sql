CREATE TABLE `survey_responses` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`cohort` text NOT NULL,
	`github_id` text NOT NULL,
	`experience` text,
	`terminal` text,
	`agent_use` text,
	`agent_tools` text,
	`machine` text,
	`interest` text,
	`goal` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_survey_cohort_github_id` ON `survey_responses` (`cohort`,`github_id`);