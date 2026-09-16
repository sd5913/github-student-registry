import { cookies } from 'next/headers';
import { env } from 'cloudflare:workers';
import { isAdminLogin } from '@/lib/admin';
import { CURRENT_COHORT, isKnownCohort } from '@/lib/cohort';
import { listMarkVotes, markVoteTotals } from '@/lib/db';
import { required, type AppEnv } from '@/lib/env';
import { rankMarks } from '@/lib/rank';
import { readSession } from '@/lib/session';

/** Either credential, as for the registrations export: bearer token, or an
 *  admin's signed-in session for a link followed from /admin in a browser. */
async function authorized(request: Request): Promise<boolean> {
  const header = request.headers.get('authorization');
  if (header?.startsWith('Bearer ') === true && header.slice(7) === required((env as AppEnv).ADMIN_TOKEN, 'ADMIN_TOKEN')) return true;
  const cookieStore = await cookies();
  const session = await readSession(cookieStore.get('sd5913_session')?.value);
  return session !== null && isAdminLogin((env as AppEnv).ADMIN_LOGINS, session.login);
}

export async function GET(request: Request) {
  if (!await authorized(request)) return new Response('Unauthorized', { status: 401, headers: { 'www-authenticate': 'Bearer' } });
  const url = new URL(request.url);
  const cohort = url.searchParams.get('cohort') ?? CURRENT_COHORT;
  if (!await isKnownCohort(env.DB, cohort)) return Response.json({ error: `Unknown cohort: ${cohort}` }, { status: 400 });

  const [votes, totals] = await Promise.all([listMarkVotes(env.DB, cohort), markVoteTotals(env.DB, cohort)]);
  const standings = rankMarks(votes);

  if (url.searchParams.get('format') === 'csv') {
    const header = ['rank', 'mark', 'file', 'score', 'wins', 'losses', 'comparisons'];
    const rows = standings.map((row, index) => [index + 1, row.mark, `${String(row.mark).padStart(2, '0')}.jpg`, row.score.toFixed(4), row.wins, row.losses, row.comparisons].join(','));
    return new Response([header.join(','), ...rows].join('\n'), {
      headers: { 'content-type': 'text/csv; charset=utf-8', 'content-disposition': `attachment; filename="sd5913-${cohort}-marks.csv"`, 'cache-control': 'no-store' },
    });
  }
  return Response.json({ cohort, ...totals, standings }, { headers: { 'cache-control': 'no-store' } });
}
