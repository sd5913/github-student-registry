import { cookies } from 'next/headers';
import { env } from 'cloudflare:workers';
import { CURRENT_COHORT } from '@/lib/cohort';
import { getRegistration, saveSurvey, type SurveyAnswers } from '@/lib/db';
import { readSession } from '@/lib/session';
import { cleanAnswer, cleanGoal, SURVEY_FIELDS } from '@/lib/survey';

export async function POST(request: Request) {
  const origin = request.headers.get('origin');
  if (!origin || origin !== new URL(request.url).origin)
    return Response.json({ error: 'Invalid request origin.' }, { status: 403 });
  const cookieStore = await cookies();
  const session = await readSession(cookieStore.get('sd5913_session')?.value);
  if (!session)
    return Response.json(
      { error: 'Your session expired. Please sign in again.' },
      { status: 401 },
    );

  // The survey belongs to a matched student, not to any signed-in GitHub user.
  const registration = await getRegistration(
    env.DB,
    CURRENT_COHORT,
    session.githubId,
  );
  if (!registration)
    return Response.json(
      { error: 'Match your student ID first.' },
      { status: 409 },
    );

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ error: 'Invalid request.' }, { status: 400 });
  }

  // Anything the question does not offer becomes null rather than an error:
  // this is pitching data, and a half-answered survey still tells us something.
  const answers: SurveyAnswers = { goal: cleanGoal(body.goal) };
  for (const field of SURVEY_FIELDS)
    answers[field] = cleanAnswer(field, body[field]);

  try {
    await saveSurvey(env.DB, CURRENT_COHORT, session.githubId, answers);
  } catch {
    return Response.json(
      { error: 'Could not save your answers. Please try again.' },
      { status: 500 },
    );
  }
  return Response.json({ ok: true });
}
