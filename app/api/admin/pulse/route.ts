import { cookies } from 'next/headers';
import { env } from 'cloudflare:workers';
import { isAdminLogin } from '@/lib/admin';
import { CURRENT_COHORT, isKnownCohort } from '@/lib/cohort';
import { listRegistrations, listRoster, listSurveys } from '@/lib/db';
import type { AppEnv } from '@/lib/env';
import { readSession } from '@/lib/session';
import { summarise } from '@/lib/survey-summary';

/** Counts only — no student IDs, no logins, no avatars. This is the payload a
 *  projector polls every few seconds in a room full of people. */
export async function GET(request: Request) {
  const cookieStore = await cookies();
  const session = await readSession(cookieStore.get('sd5913_session')?.value);
  const header = request.headers.get('authorization');
  const byToken = header?.startsWith('Bearer ') === true && header.slice(7) === (env as AppEnv).ADMIN_TOKEN;
  const bySession = session !== null && isAdminLogin((env as AppEnv).ADMIN_LOGINS, session.login);
  if (!byToken && !bySession) return new Response('Unauthorized', { status: 401, headers: { 'www-authenticate': 'Bearer' } });

  const requested = new URL(request.url).searchParams.get('cohort') ?? CURRENT_COHORT;
  if (!await isKnownCohort(env.DB, requested)) return Response.json({ error: `Unknown cohort: ${requested}` }, { status: 400 });

  const [surveys, registrations, roster] = await Promise.all([
    listSurveys(env.DB, requested),
    listRegistrations(env.DB, requested),
    listRoster(env.DB, requested),
  ]);

  const pulse = summarise([...surveys.values()], {
    cohort: requested,
    rosterTotal: roster.length,
    registered: registrations.length,
    now: new Date().toISOString(),
  });
  return Response.json(pulse, { headers: { 'cache-control': 'no-store' } });
}
