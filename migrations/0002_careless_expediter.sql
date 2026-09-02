CREATE TABLE `cohort_roster` (
	`cohort` text NOT NULL,
	`student_id` text NOT NULL,
	PRIMARY KEY(`cohort`, `student_id`)
);
