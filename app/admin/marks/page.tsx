import { cookies } from 'next/headers';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { env } from 'cloudflare:workers';
import { isAdminLogin } from '@/lib/admin';
import { CURRENT_COHORT, isKnownCohort } from '@/lib/cohort';
import { listMarkVotes, markVoteTotals } from '@/lib/db';
import type { AppEnv } from '@/lib/env';
import { markSrc } from '@/lib/marks';
import { rankMarks } from '@/lib/rank';
import { readSession } from '@/lib/session';

export const dynamic = 'force-dynamic';

export default async function AdminMarks({ searchParams }: { searchParams: Promise<{ cohort?: string }> }) {
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
  // Same answer as /admin gives a stranger: this page does not exist.
  if (!isAdminLogin((env as AppEnv).ADMIN_LOGINS, session.login)) notFound();

  const requested = (await searchParams).cohort;
  const cohort = requested && await isKnownCohort(env.DB, requested) ? requested : CURRENT_COHORT;
  const [votes, totals] = await Promise.all([listMarkVotes(env.DB, cohort), markVoteTotals(env.DB, cohort)]);
  const standings = rankMarks(votes);
  const perVoter = totals.voters > 0 ? totals.total / totals.voters : 0;

  return (
    <main className="site-shell">
      <header className="site-header">
        <Link className="wordmark" href="/" aria-label="SD5913 home">sd5913<span className="wordmark-x">x</span></Link>
        <div className="header-meta"><span className="status-dot" />INSTRUCTOR · @{session.login}</div>
      </header>

      <section className="admin-shell">
        <div className="admin-head">
          <h1 className="admin-title">The mark · {cohort}</h1>
          <p className="admin-count">
            <strong>{totals.total}</strong> {totals.total === 1 ? 'comparison' : 'comparisons'} from <strong>{totals.voters}</strong> {totals.voters === 1 ? 'voter' : 'voters'}
            <span className="admin-muted"> · {perVoter.toFixed(1)} each</span>
          </p>
          <div className="admin-actions">
            <Link className="admin-chip" href={`/admin?cohort=${cohort}`}>Registrations</Link>
            <a className="admin-chip" href={`/api/admin/marks?cohort=${cohort}&format=csv`}>Download CSV</a>
          </div>
        </div>

        {totals.total === 0 ? (
          <p className="admin-empty">Nobody has voted yet. The pairs are at <Link className="inline-link" href="/vote">/vote</Link>.</p>
        ) : (
          <table className="admin-table admin-marks">
            <thead><tr><th aria-label="Mark" /><th>Mark</th><th>Score</th><th>Won–lost</th><th>Comparisons</th></tr></thead>
            <tbody>
              {standings.map((row, index) => (
                <tr key={row.mark}>
                  <td>
                    <span className="admin-thumb">
                      <Image src={markSrc(row.mark)} alt={`Mark ${row.mark}`} fill sizes="44px" unoptimized />
                    </span>
                  </td>
                  <td className="admin-id">{index + 1} · {String(row.mark).padStart(2, '0')}</td>
                  <td>{row.score.toFixed(2)}</td>
                  <td className="admin-muted">{row.wins}–{row.losses}</td>
                  <td className="admin-muted">{row.comparisons}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <p className="admin-footnote">
          Strengths are Bradley–Terry, fitted by the MM iteration, with half a win and half a loss against a reference so a mark with
          two wins and no losses does not top the list on its own. A score of 1 is an average mark; 2 is twice as likely to beat one.
          Order is everyone’s votes, recomputed on every view.
        </p>
      </section>
    </main>
  );
}
