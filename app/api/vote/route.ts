import { cookies } from 'next/headers';
import { env } from 'cloudflare:workers';
import { CURRENT_COHORT } from '@/lib/cohort';
import { saveMarkVote } from '@/lib/db';
import type { AppEnv } from '@/lib/env';
import { isMark } from '@/lib/marks';
import { readSession } from '@/lib/session';
import { mayVote } from '@/lib/voter';
import { voteState } from '@/lib/vote-state';

/**
 * The vote belongs to the matched class, not to any signed-in GitHub user —
 * the same rule the survey follows, and the reason a vote can be counted once
 * per person without ever storing who they are beyond their github id. An
 * instructor is let in by the /admin check rather than by a registration.
 */
async function voter(): Promise<{ githubId: string } | Response> {
  const cookieStore = await cookies();
  const session = await readSession(cookieStore.get('sd5913_session')?.value);
  if (!session) return Response.json({ error: 'Sign in with GitHub on the home page first.' }, { status: 401 });
  if (!await mayVote(env.DB, CURRENT_COHORT, session, (env as AppEnv).ADMIN_LOGINS)) {
    return Response.json({ error: 'Match your student ID on the home page first.' }, { status: 403 });
  }
  return { githubId: session.githubId };
}

export async function GET() {
  const who = await voter();
  if (who instanceof Response) return who;
  return Response.json(await voteState(env.DB, CURRENT_COHORT, who.githubId), { headers: { 'cache-control': 'no-store' } });
}

/**
 * One comparison, and the next one to make. A body without a winner is the
 * "neither" link: it records nothing and just asks for another pair, so a
 * student is never forced into a verdict to move on.
 */
export async function POST(request: Request) {
  const origin = request.headers.get('origin');
  if (!origin || origin !== new URL(request.url).origin) return Response.json({ error: 'Invalid request origin.' }, { status: 403 });
  const who = await voter();
  if (who instanceof Response) return who;

  let body: { a?: unknown; b?: unknown; winner?: unknown };
  try { body = await request.json() as { a?: unknown; b?: unknown; winner?: unknown }; }
  catch { return Response.json({ error: 'Invalid request.' }, { status: 400 }); }

  if (body.winner !== undefined) {
    const { a, b, winner } = body;
    if (!isMark(a) || !isMark(b) || a === b || !isMark(winner) || (winner !== a && winner !== b)) {
      return Response.json({ error: 'That is not one of the two marks you were shown.' }, { status: 400 });
    }
    // Re-voting on a pair replaces the earlier verdict rather than adding one,
    // so a double tap or a back button cannot weight one student twice.
    await saveMarkVote(env.DB, CURRENT_COHORT, who.githubId, a, b, winner);
  }

  return Response.json(await voteState(env.DB, CURRENT_COHORT, who.githubId), { headers: { 'cache-control': 'no-store' } });
}
