import type { Session } from './session';

export type Registration = {
  githubId: string;
  githubLogin: string;
  githubName: string | null;
  githubAvatarUrl: string;
  studentId: string;
  createdAt: string;
  updatedAt: string;
};

export async function getRegistration(db: D1Database, githubId: string): Promise<Registration | null> {
  const row = await db.prepare(`SELECT github_id AS githubId, github_login AS githubLogin, github_name AS githubName, github_avatar_url AS githubAvatarUrl, student_id AS studentId, created_at AS createdAt, updated_at AS updatedAt FROM registrations WHERE github_id = ?`).bind(githubId).first<Registration>();
  return row ?? null;
}

export async function saveRegistration(db: D1Database, session: Session, studentId: string): Promise<void> {
  const now = new Date().toISOString();
  await db.prepare(`INSERT INTO registrations (github_id, github_login, github_name, github_avatar_url, student_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT(github_id) DO UPDATE SET github_login = excluded.github_login, github_name = excluded.github_name, github_avatar_url = excluded.github_avatar_url, student_id = excluded.student_id, updated_at = excluded.updated_at`).bind(session.githubId, session.login, session.name, session.avatarUrl, studentId, now, now).run();
}

export async function listRegistrations(db: D1Database): Promise<Registration[]> {
  const result = await db.prepare(`SELECT github_id AS githubId, github_login AS githubLogin, github_name AS githubName, github_avatar_url AS githubAvatarUrl, student_id AS studentId, created_at AS createdAt, updated_at AS updatedAt FROM registrations ORDER BY student_id COLLATE NOCASE`).all<Registration>();
  return result.results;
}
