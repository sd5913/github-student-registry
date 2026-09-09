import { integer, primaryKey, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

// The enrolled IDs for each intake, seeded from a local `.cohort` file that is
// deliberately not in this repository: it is student data, and a public roster
// would let anyone claim an ID before its owner registers. See README.
export const cohortRoster = sqliteTable(
  'cohort_roster',
  {
    cohort: text('cohort').notNull(),
    studentId: text('student_id').notNull(),
  },
  (table) => [primaryKey({ columns: [table.cohort, table.studentId] })],
);

export const registrations = sqliteTable(
  'registrations',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    githubId: text('github_id').notNull(),
    githubLogin: text('github_login').notNull(),
    githubName: text('github_name'),
    githubAvatarUrl: text('github_avatar_url').notNull(),
    studentId: text('student_id').notNull(),
    cohort: text('cohort').notNull(),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
    // Set by an instructor once the student has handed in work from this
    // account, so the match is proven rather than claimed. The repo is the
    // submission that proved it. Unlocks the course links on the home page.
    verifiedAt: text('verified_at'),
    verifiedRepo: text('verified_repo'),
  },
  // Scoped to the cohort: a student who takes the unit again next year gets a
  // second row, and this year's records stay as they were.
  (table) => [
    uniqueIndex('idx_registrations_cohort_github_id').on(table.cohort, table.githubId),
    uniqueIndex('idx_registrations_cohort_student_id').on(table.cohort, table.studentId),
  ],
);

// Week-1 intake survey. Kept in its own table rather than as columns on
// `registrations` for two reasons: a student who skips it still registers
// cleanly, and the answers are pitching data with a shelf life of one
// semester, whereas a registration is the record of who someone is.
export const surveyResponses = sqliteTable(
  'survey_responses',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    cohort: text('cohort').notNull(),
    // Joins to `registrations`, so the survey never stores a student ID itself.
    githubId: text('github_id').notNull(),
    experience: text('experience'),
    terminal: text('terminal'),
    agentUse: text('agent_use'),
    // Comma-joined slugs; the question is multi-select.
    agentTools: text('agent_tools'),
    machine: text('machine'),
    interest: text('interest'),
    goal: text('goal'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => [uniqueIndex('idx_survey_cohort_github_id').on(table.cohort, table.githubId)],
);

// What Canvas received for each assignment, imported by an instructor from the
// submission list. Keyed by student ID because that is what Canvas knows; the
// repository owner is parsed from the URL so it can be compared with the GitHub
// login the student registered. A mismatch is the finding this table exists for.
export const submissions = sqliteTable(
  'submissions',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    cohort: text('cohort').notNull(),
    assignment: text('assignment').notNull(),
    studentId: text('student_id').notNull(),
    url: text('url').notNull(),
    owner: text('owner'),
    importedAt: text('imported_at').notNull(),
  },
  (table) => [uniqueIndex('idx_submissions_cohort_assignment_student').on(table.cohort, table.assignment, table.studentId)],
);
