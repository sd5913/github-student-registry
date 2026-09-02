import { cookies } from 'next/headers';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { env } from 'cloudflare:workers';
import { isAdminLogin } from '@/lib/admin';
import { CURRENT_COHORT, isKnownCohort } from '@/lib/cohort';
import { listRegistrations, listRoster, listSurveys } from '@/lib/db';
import type { AppEnv } from '@/lib/env';
import { readSession } from '@/lib/session';
import { summarise } from '@/lib/survey-summary';
import { LiveBoard } from '../live-board';

export const dynamic = 'force-dynamic';

export default async function LiveAdmin({ searchParams }: { searchParams: Promise<{ cohort?: string }> }) {
  const cookieStore = await cookies();
  const session = await readSession(cookieStore.get('sd5913_session')?.value);
  if (!session) {
    return (
      <main className="site-shell"><section className="admin-shell">
        <h1 className="admin-title">Instructor sign-in</h1>
        {/* OAuth must start with a top-level browser navigation. */}
        {/* oxlint-disable-next-line next/no-html-link-for-pages */}
        <a className="github-button" href="/api/auth/github">Continue with GitHub</a>
      </section></main>
    );
  }
  // Same answer as /admin gives a stranger: this page does not exist.
  if (!isAdminLogin((env as AppEnv).ADMIN_LOGINS, session.login)) notFound();

  const requested = (await searchParams).cohort;
  const cohort = requested && await isKnownCohort(env.DB, requested) ? requested : CURRENT_COHORT;
  const [surveys, registrations, roster] = await Promise.all([
    listSurveys(env.DB, cohort), listRegistrations(env.DB, cohort), listRoster(env.DB, cohort),
  ]);
  // Rendered server-side first so the projector never shows an empty frame.
  const initial = summarise([...surveys.values()], { cohort, rosterTotal: roster.length, registered: registrations.length, now: new Date().toISOString() });

  return (
    <main className="board-shell">
      <LiveBoard initial={initial} />
      <p className="board__foot"><Link href="/admin">← Back to the roster</Link></p>
    </main>
  );
}
