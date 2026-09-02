import { integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

export const registrations = sqliteTable(
  'registrations',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    githubId: text('github_id').notNull(),
    githubLogin: text('github_login').notNull(),
    githubName: text('github_name'),
    githubAvatarUrl: text('github_avatar_url').notNull(),
    studentId: text('student_id').notNull(),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => [
    uniqueIndex('idx_registrations_github_id').on(table.githubId),
    uniqueIndex('idx_registrations_student_id').on(table.studentId),
  ],
);
