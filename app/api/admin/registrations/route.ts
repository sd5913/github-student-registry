import { env } from 'cloudflare:workers';
import { CURRENT_COHORT, isKnownCohort } from '@/lib/cohort';
import { listRegistrations } from '@/lib/db';
import { required, type AppEnv } from '@/lib/env';

function authorized(request: Request): boolean {
  const header = request.headers.get('authorization');
  return header?.startsWith('Bearer ') === true && header.slice(7) === required((env as AppEnv).ADMIN_TOKEN, 'ADMIN_TOKEN');
}

function csvCell(value: string | null): string {
  const safe = value && /^[=+@]/.test(value) ? `'${value}` : value ?? '';
  return `"${safe.replaceAll('"', '""')}"`;
}

export async function GET(request: Request) {
  if (!authorized(request)) return new Response('Unauthorized', { status: 401, headers: { 'www-authenticate': 'Bearer' } });
  // Defaults to the intake being registered now; `?cohort=all` returns every
  // year, and a past year can be named directly.
  const requested = new URL(request.url).searchParams.get('cohort') ?? CURRENT_COHORT;
  if (requested !== 'all' && !await isKnownCohort(env.DB, requested)) return Response.json({ error: `Unknown cohort: ${requested}` }, { status: 400 });
  const cohort = requested === 'all' ? null : requested;
  const registrations = await listRegistrations(env.DB, cohort);

  if (new URL(request.url).searchParams.get('format') === 'csv') {
    const header = ['cohort', 'student_id', 'github_login', 'github_id', 'github_name', 'github_url', 'created_at', 'updated_at'];
    const rows = registrations.map((row) => [row.cohort, row.studentId, row.githubLogin, row.githubId, row.githubName, `https://github.com/${row.githubLogin}`, row.createdAt, row.updatedAt].map(csvCell).join(','));
    const filename = `sd5913-${cohort ?? 'all'}-github-students.csv`;
    return new Response([header.join(','), ...rows].join('\n'), { headers: { 'content-type': 'text/csv; charset=utf-8', 'content-disposition': `attachment; filename="${filename}"`, 'cache-control': 'no-store' } });
  }
  return Response.json({ cohort: requested, count: registrations.length, registrations }, { headers: { 'cache-control': 'no-store' } });
}
