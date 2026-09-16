CREATE TABLE `mark_votes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`cohort` text NOT NULL,
	`github_id` text NOT NULL,
	`a` integer NOT NULL,
	`b` integer NOT NULL,
	`winner` integer NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_mark_votes_cohort_voter_pair` ON `mark_votes` (`cohort`,`github_id`,`a`,`b`);