import { cookies } from 'next/headers';
import Link from 'next/link';
import { env } from 'cloudflare:workers';
import { ArrowRight } from 'lucide-react';
import { CURRENT_COHORT } from '@/lib/cohort';
import { getRegistration } from '@/lib/db';
import { readSession } from '@/lib/session';
import { voteState } from '@/lib/vote-state';
import { VotePane } from './vote-pane';

export const dynamic = 'force-dynamic';

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="site-shell">
      <header className="site-header">
        <Link className="wordmark" href="/" aria-label="SD5913 home">sd5913<span className="wordmark-x">x</span></Link>
        <div className="header-meta"><span className="status-dot" />WEEK 2 · THE MARK</div>
      </header>
      {children}
      <footer><span>SD5913 · {CURRENT_COHORT}</span><span>POLYU SCHOOL OF DESIGN</span></footer>
    </main>
  );
}

export default async function Vote() {
  const cookieStore = await cookies();
  const session = await readSession(cookieStore.get('sd5913_session')?.value);
  const registration = session ? await getRegistration(env.DB, CURRENT_COHORT, session.githubId) : null;

  // Signed out, or signed in but not matched: the same short card either way,
  // with the one link that fixes it.
  if (!registration) {
    return (
      <Shell>
        <section className="vote-shell">
          <div className="vote-gate">
            <p className="eyebrow">THE REGISTERED CLASS ONLY</p>
            <h1 className="vote-title">One step first.</h1>
            <p className="card-copy">
              {session
                ? 'You are signed in, but your student ID is not matched yet. Add it on the home page and the vote opens.'
                : 'The vote is for the class. Sign in with GitHub on the home page, match your student ID, then come back here.'}
            </p>
            <Link className="github-button" href="/">Go to the home page<ArrowRight className="button-arrow" aria-hidden="true" size={18} /></Link>
          </div>
        </section>
      </Shell>
    );
  }

  // The same state the API answers with after a vote, so the first pair is in
  // the HTML that arrives.
  const initial = await voteState(env.DB, CURRENT_COHORT, registration.githubId);

  return (
    <Shell>
      <section className="vote-shell">
        <p className="eyebrow">WEEK 2 · FIFTY-SIX MARKS</p>
        <h1 className="vote-title">Which is the better mark for the course?</h1>
        <p className="vote-lede">Two at a time. Pick the one you would put on the front of this course — no rules about why. Keep going as long as you like; every pair sharpens the order.</p>
        <VotePane initial={initial} />
      </section>
    </Shell>
  );
}
