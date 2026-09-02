import { cookies } from 'next/headers';
import Link from 'next/link';
import { env } from 'cloudflare:workers';
import { ArrowRight, Check, LockKeyhole } from 'lucide-react';
import { getRegistration } from '@/lib/db';
import { readSession } from '@/lib/session';
import { RegistrationForm } from './registration-form';

export const dynamic = 'force-dynamic';

function GitHubMark() {
  return <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 .7a11.5 11.5 0 0 0-3.64 22.4c.58.1.79-.25.79-.56v-2.22c-3.23.7-3.91-1.37-3.91-1.37-.53-1.34-1.29-1.7-1.29-1.7-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.04 1.77 2.72 1.26 3.38.96.1-.75.4-1.26.74-1.55-2.58-.3-5.29-1.29-5.29-5.69 0-1.26.45-2.28 1.19-3.08-.12-.29-.52-1.46.11-3.04 0 0 .97-.31 3.16 1.18a10.9 10.9 0 0 1 5.76 0c2.2-1.49 3.16-1.18 3.16-1.18.63 1.58.23 2.75.11 3.04.74.8 1.19 1.82 1.19 3.08 0 4.42-2.72 5.39-5.3 5.68.42.36.79 1.07.79 2.16v3.21c0 .31.21.67.8.56A11.5 11.5 0 0 0 12 .7Z" /></svg>;
}

export default async function Home() {
  const cookieStore = await cookies();
  const session = await readSession(cookieStore.get('sd5913_session')?.value);
  const registration = session ? await getRegistration(env.DB, session.githubId) : null;

  return (
    <main className="site-shell">
      <header className="site-header">
        <Link className="wordmark" href="/" aria-label="SD5913 home">
          sd5913<span className="wordmark-x">x</span>
        </Link>
        <div className="header-meta"><span className="status-dot" />GITHUB · STUDENT REGISTRY</div>
      </header>

      <section className="registration-section">
        <div className="marginalia" aria-hidden="true">CONNECT · IDENTIFY · SUBMIT · CONNECT · IDENTIFY · SUBMIT</div>
        <div className="intro-column">
          <p className="eyebrow">POLYU SCHOOL OF DESIGN · SD5913</p>
          <h1>Match your <span>work</span>.</h1>
          <p className="lede">Connect the GitHub account you use for coursework to your student ID. One quick check now means every submission lands with the right name later.</p>
          <ol className="steps" aria-label="Registration steps">
            <li className={session ? 'done' : 'active'}>
              <span>{session ? <Check size={16} /> : '01'}</span>
              <div><strong>Connect GitHub</strong><small>We read your public GitHub profile only.</small></div>
            </li>
            <li className={registration ? 'done' : session ? 'active' : ''}>
              <span>{registration ? <Check size={16} /> : '02'}</span>
              <div><strong>Add student ID</strong><small>Use the ID shown on your PolyU record.</small></div>
            </li>
            <li className={registration ? 'active' : ''}>
              <span>03</span>
              <div><strong>You’re matched</strong><small>You can return any time to update the ID.</small></div>
            </li>
          </ol>
        </div>

        <div className="form-column">
          <div className="card-accent" />
          <section className="registration-card" aria-labelledby="card-title">
            {!session ? (
              <>
                <p className="eyebrow">STEP 01 · AUTHENTICATE</p>
                <h2 id="card-title">Start with GitHub.</h2>
                <p className="card-copy">Use the same account where you push your homework. We never receive your password or request access to private repos.</p>
                {/* OAuth must start with a top-level browser navigation. */}
                {/* oxlint-disable-next-line next/no-html-link-for-pages */}
                <a className="github-button" href="/api/auth/github"><GitHubMark />Continue with GitHub<ArrowRight className="button-arrow" aria-hidden="true" size={18} /></a>
                <div className="privacy-note"><LockKeyhole size={15} aria-hidden="true" />Public profile access only · no repository permissions</div>
              </>
            ) : registration ? (
              <>
                <p className="eyebrow success-label">MATCH COMPLETE</p>
                <div className="success-mark"><Check size={30} /></div>
                <h2 id="card-title">You’re on the list.</h2>
                <p className="card-copy"><strong>@{session.login}</strong> is matched to student ID <strong>{registration.studentId}</strong>.</p>
                <RegistrationForm login={session.login} avatarUrl={session.avatarUrl} initialStudentId={registration.studentId} isUpdate />
                {/* oxlint-disable-next-line next/no-html-link-for-pages */}
                <a className="text-link" href="/api/auth/logout">Use a different GitHub account</a>
              </>
            ) : (
              <>
                <p className="eyebrow">STEP 02 · IDENTIFY</p>
                <h2 id="card-title">Now, your student ID.</h2>
                <p className="card-copy">You’re signed in as <strong>@{session.login}</strong>. Enter your ID exactly as it appears in university records.</p>
                <RegistrationForm login={session.login} avatarUrl={session.avatarUrl} initialStudentId="" />
                {/* oxlint-disable-next-line next/no-html-link-for-pages */}
                <a className="text-link" href="/api/auth/logout">Not your GitHub account?</a>
              </>
            )}
          </section>
          <p className="support-copy">Something not right? Contact your course instructor.</p>
        </div>
      </section>
      <footer><span>SD5913 · 2026</span><span>POLYU SCHOOL OF DESIGN</span></footer>
    </main>
  );
}
