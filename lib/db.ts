import type { Session } from './session';

export type Registration = {
  githubId: string;
  githubLogin: string;
  githubName: string | null;
  githubAvatarUrl: string;
  studentId: string;
  cohort: string;
  createdAt: string;
  updatedAt: string;
};

const COLUMNS = `github_id AS githubId, github_login AS githubLogin, github_name AS githubName, github_avatar_url AS githubAvatarUrl, student_id AS studentId, cohort, created_at AS createdAt, updated_at AS updatedAt`;

export async function getRegistration(db: D1Database, cohort: string, githubId: string): Promise<Registration | null> {
  const row = await db.prepare(`SELECT ${COLUMNS} FROM registrations WHERE cohort = ? AND github_id = ?`).bind(cohort, githubId).first<Registration>();
  return row ?? null;
}

export async function saveRegistration(db: D1Database, cohort: string, session: Session, studentId: string): Promise<void> {
  const now = new Date().toISOString();
  await db.prepare(`INSERT INTO registrations (github_id, github_login, github_name, github_avatar_url, student_id, cohort, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(cohort, github_id) DO UPDATE SET github_login = excluded.github_login, github_name = excluded.github_name, github_avatar_url = excluded.github_avatar_url, student_id = excluded.student_id, updated_at = excluded.updated_at`).bind(session.githubId, session.login, session.name, session.avatarUrl, studentId, cohort, now, now).run();
}

/** Pass `null` for every cohort, ordered oldest intake first. */
export async function listRegistrations(db: D1Database, cohort: string | null): Promise<Registration[]> {
  const statement = cohort === null
    ? db.prepare(`SELECT ${COLUMNS} FROM registrations ORDER BY cohort, student_id COLLATE NOCASE`)
    : db.prepare(`SELECT ${COLUMNS} FROM registrations WHERE cohort = ? ORDER BY student_id COLLATE NOCASE`).bind(cohort);
  const result = await statement.all<Registration>();
  return result.results;
}
