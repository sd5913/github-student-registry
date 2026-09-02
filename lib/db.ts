import type { Session } from './session';
import type { SurveyField } from './survey';

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

/** Every enrolled ID for a cohort, whether or not it has been claimed. */
export async function listRoster(db: D1Database, cohort: string): Promise<string[]> {
  const result = await db.prepare('SELECT student_id AS studentId FROM cohort_roster WHERE cohort = ? ORDER BY student_id').bind(cohort).all<{ studentId: string }>();
  return result.results.map((row) => row.studentId);
}

/** Cohorts that have a roster loaded, newest intake first. */
export async function listCohorts(db: D1Database): Promise<string[]> {
  const result = await db.prepare('SELECT DISTINCT cohort FROM cohort_roster ORDER BY cohort DESC').all<{ cohort: string }>();
  return result.results.map((row) => row.cohort);
}

/** Frees a claimed ID so its owner can register. Returns false if it was already gone. */
export async function releaseRegistration(db: D1Database, cohort: string, githubId: string): Promise<boolean> {
  const result = await db.prepare('DELETE FROM registrations WHERE cohort = ? AND github_id = ?').bind(cohort, githubId).run();
  return (result.meta.changes ?? 0) > 0;
}

export async function updateRegistrationStudentId(db: D1Database, cohort: string, githubId: string, studentId: string): Promise<boolean> {
  const result = await db.prepare('UPDATE registrations SET student_id = ?, updated_at = ? WHERE cohort = ? AND github_id = ?').bind(studentId, new Date().toISOString(), cohort, githubId).run();
  return (result.meta.changes ?? 0) > 0;
}

export type SurveyAnswers = Partial<Record<SurveyField, string | null>> & { goal?: string | null };

export type SurveyRow = SurveyAnswers & { githubId: string; createdAt: string; updatedAt: string };

const SURVEY_COLUMNS = `github_id AS githubId, experience, terminal, agent_use AS agentUse, agent_tools AS agentTools, machine, interest, goal, created_at AS createdAt, updated_at AS updatedAt`;

export async function getSurvey(db: D1Database, cohort: string, githubId: string): Promise<SurveyRow | null> {
  const row = await db.prepare(`SELECT ${SURVEY_COLUMNS} FROM survey_responses WHERE cohort = ? AND github_id = ?`).bind(cohort, githubId).first<SurveyRow>();
  return row ?? null;
}

/** Upsert, so a student can reopen the survey and change an answer. */
export async function saveSurvey(db: D1Database, cohort: string, githubId: string, answers: SurveyAnswers): Promise<void> {
  const now = new Date().toISOString();
  await db.prepare(
    `INSERT INTO survey_responses (cohort, github_id, experience, terminal, agent_use, agent_tools, machine, interest, goal, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(cohort, github_id) DO UPDATE SET
       experience = excluded.experience, terminal = excluded.terminal, agent_use = excluded.agent_use,
       agent_tools = excluded.agent_tools, machine = excluded.machine, interest = excluded.interest,
       goal = excluded.goal, updated_at = excluded.updated_at`,
  ).bind(
    // Bound by name rather than by iterating SURVEY_FIELDS: reordering that
    // array must not be able to silently shuffle these columns.
    cohort,
    githubId,
    answers.experience ?? null,
    answers.terminal ?? null,
    answers.agentUse ?? null,
    answers.agentTools ?? null,
    answers.machine ?? null,
    answers.interest ?? null,
    answers.goal ?? null,
    now,
    now,
  ).run();
}

/** Every survey row for a cohort, keyed by github id for joining onto registrations. */
export async function listSurveys(db: D1Database, cohort: string | null): Promise<Map<string, SurveyRow>> {
  const statement = cohort === null
    ? db.prepare(`SELECT ${SURVEY_COLUMNS}, cohort FROM survey_responses`)
    : db.prepare(`SELECT ${SURVEY_COLUMNS} FROM survey_responses WHERE cohort = ?`).bind(cohort);
  const result = await statement.all<SurveyRow & { cohort?: string }>();
  return new Map(result.results.map((row) => [cohort === null ? `${row.cohort}:${row.githubId}` : row.githubId, row]));
}
