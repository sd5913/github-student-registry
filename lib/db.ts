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
  /** When an instructor confirmed work handed in from this account; null until then. */
  verifiedAt: string | null;
  /** The submitted repository that proved the match. */
  verifiedRepo: string | null;
};

const COLUMNS = `github_id AS githubId, github_login AS githubLogin, github_name AS githubName, github_avatar_url AS githubAvatarUrl, student_id AS studentId, cohort, created_at AS createdAt, updated_at AS updatedAt, verified_at AS verifiedAt, verified_repo AS verifiedRepo`;

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

/**
 * Mark a registration as proven by a submission, or clear it. Verification is
 * an instructor's statement about the account, so it survives the student
 * re-saving their ID; only `releaseRegistration` removes it.
 */
export async function setVerification(db: D1Database, cohort: string, githubId: string, repo: string | null, verified: boolean): Promise<boolean> {
  const result = verified
    ? await db.prepare('UPDATE registrations SET verified_at = ?, verified_repo = ? WHERE cohort = ? AND github_id = ?').bind(new Date().toISOString(), repo, cohort, githubId).run()
    : await db.prepare('UPDATE registrations SET verified_at = NULL, verified_repo = NULL WHERE cohort = ? AND github_id = ?').bind(cohort, githubId).run();
  return (result.meta.changes ?? 0) > 0;
}

/**
 * Verify by login, the form the submission checker prints. Returns the logins
 * that matched a registration; anything else was never registered, which is
 * itself the finding — a student handing in from an account they did not match.
 */
export async function verifyByLogin(db: D1Database, cohort: string, entries: { login: string; repo: string | null }[]): Promise<string[]> {
  const now = new Date().toISOString();
  const done: string[] = [];
  for (const entry of entries) {
    const result = await db.prepare('UPDATE registrations SET verified_at = ?, verified_repo = COALESCE(?, verified_repo) WHERE cohort = ? AND github_login = ? COLLATE NOCASE').bind(now, entry.repo, cohort, entry.login).run();
    if ((result.meta.changes ?? 0) > 0) done.push(entry.login);
  }
  return done;
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

export type Submission = { assignment: string; studentId: string; url: string; owner: string | null; importedAt: string };

const SUBMISSION_COLUMNS = `assignment, student_id AS studentId, url, owner, imported_at AS importedAt`;

/** Replace what Canvas has for these students on one assignment. Later imports win. */
export async function upsertSubmissions(db: D1Database, cohort: string, assignment: string, entries: { studentId: string; url: string; owner: string | null }[]): Promise<number> {
  const now = new Date().toISOString();
  let n = 0;
  for (const entry of entries) {
    await db.prepare(
      `INSERT INTO submissions (cohort, assignment, student_id, url, owner, imported_at) VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(cohort, assignment, student_id) DO UPDATE SET url = excluded.url, owner = excluded.owner, imported_at = excluded.imported_at`,
    ).bind(cohort, assignment, entry.studentId, entry.url, entry.owner, now).run();
    n += 1;
  }
  return n;
}

export async function listSubmissions(db: D1Database, cohort: string): Promise<Submission[]> {
  const result = await db.prepare(`SELECT ${SUBMISSION_COLUMNS} FROM submissions WHERE cohort = ? ORDER BY assignment, student_id`).bind(cohort).all<Submission>();
  return result.results;
}

export async function listSubmissionsForStudent(db: D1Database, cohort: string, studentId: string): Promise<Submission[]> {
  const result = await db.prepare(`SELECT ${SUBMISSION_COLUMNS} FROM submissions WHERE cohort = ? AND student_id = ? ORDER BY assignment`).bind(cohort, studentId).all<Submission>();
  return result.results;
}

/** Add one ID to a cohort's roster — a late enrolment, or a test account. */
export async function addRosterId(db: D1Database, cohort: string, studentId: string): Promise<boolean> {
  const result = await db.prepare('INSERT OR IGNORE INTO cohort_roster (cohort, student_id) VALUES (?, ?)').bind(cohort, studentId).run();
  return (result.meta.changes ?? 0) > 0;
}
