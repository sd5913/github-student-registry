import { cookies } from 'next/headers';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { env } from 'cloudflare:workers';
import { isAdminLogin } from '@/lib/admin';
import { CURRENT_COHORT } from '@/lib/cohort';
import { listCohorts, listRegistrations, listRoster } from '@/lib/db';
import type { AppEnv } from '@/lib/env';
import { readSession } from '@/lib/session';
import { AdminTable } from './admin-table';

export const dynamic = 'force-dynamic';

export default async function Admin({ searchParams }: { searchParams: Promise<{ cohort?: string }> }) {
  const cookieStore = await cookies();
  const session = await readSession(cookieStore.get('sd5913_session')?.value);

  if (!session) {
    return (
      <main className="site-shell">
        <section className="admin-shell">
          <h1 className="admin-title">Instructor sign-in</h1>
          {/* OAuth must start with a top-level browser navigation. */}
          {/* oxlint-disable-next-line next/no-html-link-for-pages */}
          <a className="github-button" href="/api/auth/github">Continue with GitHub</a>
        </section>
      </main>
    );
  }
  // A signed-in student gets the same answer as a stranger: this page does not
  // exist. Nothing hints that an instructor view is here to be found.
  if (!isAdminLogin((env as AppEnv).ADMIN_LOGINS, session.login)) notFound();

  const cohorts = await listCohorts(env.DB);
  const requested = (await searchParams).cohort;
  const cohort = requested && cohorts.includes(requested) ? requested : CURRENT_COHORT;
  const [registrations, roster] = await Promise.all([listRegistrations(env.DB, cohort), listRoster(env.DB, cohort)]);
  const claimed = new Set(registrations.map((row) => row.studentId));
  const missing = roster.filter((id) => !claimed.has(id));

  return (
    <main className="site-shell">
      <header className="site-header">
        <Link className="wordmark" href="/" aria-label="SD5913 home">sd5913<span className="wordmark-x">x</span></Link>
        <div className="header-meta"><span className="status-dot" />INSTRUCTOR · @{session.login}</div>
      </header>

      <section className="admin-shell">
        <div className="admin-head">
          <h1 className="admin-title">SD5913 · {cohort}</h1>
          <p className="admin-count">
            <strong>{registrations.length}</strong> of {roster.length} registered
            {roster.length > 0 && <span className="admin-muted"> · {missing.length} outstanding</span>}
          </p>
          <div className="admin-actions">
            {cohorts.length > 1 && cohorts.map((year) => (
              <Link key={year} href={`/admin?cohort=${year}`} className={year === cohort ? 'admin-chip current' : 'admin-chip'}>{year}</Link>
            ))}
            <a className="admin-chip" href={`/api/admin/registrations?cohort=${cohort}&format=csv`}>Download CSV</a>
          </div>
        </div>

        <AdminTable cohort={cohort} registrations={registrations} missing={missing} />

        <p className="admin-footnote">
          Releasing a registration frees the ID so its owner can claim it. Editing checks the new ID against the {cohort} roster.
          {/* oxlint-disable-next-line next/no-html-link-for-pages */}
          {' '}<a href="/api/auth/logout">Sign out</a>
        </p>
      </section>
    </main>
  );
}
