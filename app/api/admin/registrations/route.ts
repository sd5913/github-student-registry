import { cookies } from 'next/headers';
import { env } from 'cloudflare:workers';
import { isAdminLogin } from '@/lib/admin';
import { CURRENT_COHORT, isKnownCohort, isOnRoster } from '@/lib/cohort';
import { addRosterId, listRegistrations, listSubmissions, listSurveys, releaseRegistration, setVerification, updateRegistrationStudentId, upsertSubmissions, verifyByLogin } from '@/lib/db';
import { required, type AppEnv } from '@/lib/env';
import { readSession } from '@/lib/session';
import { normalizeStudentId, STUDENT_ID } from '@/lib/student-id';
import { normalizeRepo, parseVerifyList } from '@/lib/verify';
import { parseSubmissionList, submissionStatus } from '@/lib/submissions';

/**
 * Either credential works: the bearer token for scripts and `curl`, or an
 * admin's signed-in session for links followed from /admin in a browser.
 */
async function authorized(request: Request): Promise<boolean> {
  const header = request.headers.get('authorization');
  if (header?.startsWith('Bearer ') === true && header.slice(7) === required((env as AppEnv).ADMIN_TOKEN, 'ADMIN_TOKEN')) return true;
  const cookieStore = await cookies();
  const session = await readSession(cookieStore.get('sd5913_session')?.value);
  return session !== null && isAdminLogin((env as AppEnv).ADMIN_LOGINS, session.login);
}

function csvCell(value: string | null): string {
  const safe = value && /^[=+@]/.test(value) ? `'${value}` : value ?? '';
  return `"${safe.replaceAll('"', '""')}"`;
}

export async function GET(request: Request) {
  if (!await authorized(request)) return new Response('Unauthorized', { status: 401, headers: { 'www-authenticate': 'Bearer' } });
  // Defaults to the intake being registered now; `?cohort=all` returns every
  // year, and a past year can be named directly.
  const requested = new URL(request.url).searchParams.get('cohort') ?? CURRENT_COHORT;
  if (requested !== 'all' && !await isKnownCohort(env.DB, requested)) return Response.json({ error: `Unknown cohort: ${requested}` }, { status: 400 });
  const cohort = requested === 'all' ? null : requested;
  const registrations = await listRegistrations(env.DB, cohort);

  // Joined in the export rather than the query: the survey is optional, so a
  // LEFT JOIN would only move the null handling into SQL.
  const surveys = await listSurveys(env.DB, cohort);
  // Assignment 1 as Canvas has it, against the registration: one url and one verdict per row.
  const submissions = cohort === null ? [] : await listSubmissions(env.DB, cohort);
  const byLogin = new Map(registrations.map((row) => [row.githubLogin.toLowerCase(), row.studentId]));
  const a1For = (row: { studentId: string; githubLogin: string }) => {
    const sub = submissions.find((s) => s.assignment === '1' && s.studentId === row.studentId);
    if (!sub) return { url: null, status: null };
    return { url: sub.url, status: submissionStatus(sub, row.githubLogin, (login) => byLogin.get(login.toLowerCase()) ?? null).kind };
  };
  const surveyFor = (row: { cohort: string; githubId: string }) => surveys.get(cohort === null ? `${row.cohort}:${row.githubId}` : row.githubId);

  if (new URL(request.url).searchParams.get('format') === 'csv') {
    const header = ['cohort', 'student_id', 'github_login', 'github_id', 'github_name', 'github_url', 'created_at', 'updated_at', 'verified_at', 'verified_repo', 'a1_url', 'a1_status', 'experience', 'terminal', 'agent_use', 'agent_tools', 'machine', 'interest', 'goal'];
    const rows = registrations.map((row) => {
      const survey = surveyFor(row);
      return [row.cohort, row.studentId, row.githubLogin, row.githubId, row.githubName, `https://github.com/${row.githubLogin}`, row.createdAt, row.updatedAt, row.verifiedAt, row.verifiedRepo, a1For(row).url, a1For(row).status, survey?.experience ?? null, survey?.terminal ?? null, survey?.agentUse ?? null, survey?.agentTools ?? null, survey?.machine ?? null, survey?.interest ?? null, survey?.goal ?? null].map(csvCell).join(',');
    });
    const filename = `sd5913-${cohort ?? 'all'}-github-students.csv`;
    return new Response([header.join(','), ...rows].join('\n'), { headers: { 'content-type': 'text/csv; charset=utf-8', 'content-disposition': `attachment; filename="${filename}"`, 'cache-control': 'no-store' } });
  }
  return Response.json({
    cohort: requested,
    count: registrations.length,
    surveyCount: surveys.size,
    registrations: registrations.map((row) => ({ ...row, assignment1: a1For(row), survey: surveyFor(row) ?? null })),
  }, { headers: { 'cache-control': 'no-store' } });
}

type Action = { action?: unknown; cohort?: unknown; githubId?: unknown; studentId?: unknown; repo?: unknown; list?: unknown; assignment?: unknown };

/** Instructor corrections: free a wrongly claimed ID, or fix one in place. */
export async function POST(request: Request) {
  const origin = request.headers.get('origin');
  if (!origin || origin !== new URL(request.url).origin) return Response.json({ error: 'Invalid request origin.' }, { status: 403 });
  if (!await authorized(request)) return Response.json({ error: 'Unauthorized.' }, { status: 401 });

  let body: Action;
  try { body = await request.json() as Action; }
  catch { return Response.json({ error: 'Invalid request.' }, { status: 400 }); }
  const cohort = typeof body.cohort === 'string' && body.cohort ? body.cohort : CURRENT_COHORT;

  // Bulk verification: the pasted output of check_submissions.py. Reports
  // what did not match so an unregistered submitter is noticed, not lost.
  if (body.action === 'verify-many') {
    const entries = parseVerifyList(typeof body.list === 'string' ? body.list : '');
    if (entries.length === 0) return Response.json({ error: 'Paste one GitHub login per line, with the submitted repository after it.' }, { status: 400 });
    const verified = await verifyByLogin(env.DB, cohort, entries);
    const done = new Set(verified.map((login) => login.toLowerCase()));
    const unmatched = entries.map((entry) => entry.login).filter((login) => !done.has(login.toLowerCase()));
    return Response.json({ ok: true, verified, unmatched });
  }

  // What Canvas received: `student_id url` lines. Stored as given; the verdict
  // is computed against the registrations whenever it is shown.
  if (body.action === 'import-submissions') {
    const assignment = typeof body.assignment === 'string' && /^\d{1,2}$/.test(body.assignment) ? body.assignment : '';
    if (!assignment) return Response.json({ error: 'Which assignment?' }, { status: 400 });
    const entries = parseSubmissionList(typeof body.list === 'string' ? body.list : '');
    if (entries.length === 0) return Response.json({ error: 'Paste one line per student: the student ID, then the submitted URL.' }, { status: 400 });
    const unknown: string[] = [];
    for (const entry of entries) if (!await isOnRoster(env.DB, cohort, entry.studentId)) unknown.push(entry.studentId);
    const imported = await upsertSubmissions(env.DB, cohort, assignment, entries.filter((entry) => !unknown.includes(entry.studentId)));
    return Response.json({ ok: true, imported, unknown });
  }

  // A late enrolment or a test account. Held to the same ID shape as the roster file.
  if (body.action === 'roster-add') {
    const studentId = typeof body.studentId === 'string' ? normalizeStudentId(body.studentId) : '';
    if (!STUDENT_ID.test(studentId)) return Response.json({ error: 'Enter the last four digits of the student ID.' }, { status: 400 });
    const added = await addRosterId(env.DB, cohort, studentId);
    return Response.json({ ok: true, added });
  }

  const githubId = typeof body.githubId === 'string' ? body.githubId : '';
  if (!githubId) return Response.json({ error: 'Which registration?' }, { status: 400 });

  if (body.action === 'verify' || body.action === 'unverify') {
    const raw = typeof body.repo === 'string' ? body.repo.trim() : '';
    const repo = raw ? normalizeRepo(raw) : null;
    if (raw && !repo) return Response.json({ error: 'That is not a GitHub repository URL.' }, { status: 400 });
    const changed = await setVerification(env.DB, cohort, githubId, repo, body.action === 'verify');
    if (!changed) return Response.json({ error: 'That registration no longer exists.' }, { status: 404 });
    return Response.json({ ok: true });
  }

  if (body.action === 'release') {
    const released = await releaseRegistration(env.DB, cohort, githubId);
    if (!released) return Response.json({ error: 'That registration no longer exists.' }, { status: 404 });
    return Response.json({ ok: true });
  }

  if (body.action === 'update') {
    const studentId = typeof body.studentId === 'string' ? normalizeStudentId(body.studentId) : '';
    if (!STUDENT_ID.test(studentId)) return Response.json({ error: 'Enter the last four digits of the student ID.' }, { status: 400 });
    // Held to the same roster as a student's own submission: if an ID is
    // genuinely enrolled, the fix belongs in the roster, not in one row.
    if (!await isOnRoster(env.DB, cohort, studentId)) return Response.json({ error: `${studentId} is not on the ${cohort} roster.` }, { status: 400 });
    const taken = await env.DB.prepare('SELECT github_id AS githubId FROM registrations WHERE cohort = ? AND student_id = ?').bind(cohort, studentId).first<{ githubId: string }>();
    if (taken && taken.githubId !== githubId) return Response.json({ error: `${studentId} is already matched to another account.` }, { status: 409 });
    const updated = await updateRegistrationStudentId(env.DB, cohort, githubId, studentId);
    if (!updated) return Response.json({ error: 'That registration no longer exists.' }, { status: 404 });
    return Response.json({ ok: true });
  }

  return Response.json({ error: 'Unknown action.' }, { status: 400 });
}
