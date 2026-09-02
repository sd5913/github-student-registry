// The intake this deployment is registering. Bump it when next year's roster
// is seeded; nothing derives it from the calendar. Registrations are scoped to
// this value, so last year's rows stay untouched.
export const CURRENT_COHORT = '2026';

// Rosters live in D1, not in this repository: the enrolled IDs are student
// data and a public roster would let anyone claim an ID before its owner
// registers. Load one with `npm run roster:seed -- 2026 --remote`.
export async function isOnRoster(db: D1Database, cohort: string, studentId: string): Promise<boolean> {
  const row = await db.prepare('SELECT 1 AS ok FROM cohort_roster WHERE cohort = ? AND student_id = ?').bind(cohort, studentId).first<{ ok: number }>();
  return row !== null;
}

export async function isKnownCohort(db: D1Database, cohort: string): Promise<boolean> {
  const row = await db.prepare('SELECT 1 AS ok FROM cohort_roster WHERE cohort = ? LIMIT 1').bind(cohort).first<{ ok: number }>();
  return row !== null;
}
