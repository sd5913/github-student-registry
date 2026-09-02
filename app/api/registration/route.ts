import { cookies } from 'next/headers';
import { env } from 'cloudflare:workers';
import { getRegistration, saveRegistration } from '@/lib/db';
import { readSession } from '@/lib/session';

const STUDENT_ID = /^[A-Z0-9][A-Z0-9-]{4,19}$/;

export async function POST(request: Request) {
  const origin = request.headers.get('origin');
  if (!origin || origin !== new URL(request.url).origin) return Response.json({ error: 'Invalid request origin.' }, { status: 403 });
  const cookieStore = await cookies();
  const session = await readSession(cookieStore.get('sd5913_session')?.value);
  if (!session) return Response.json({ error: 'Your session expired. Please sign in again.' }, { status: 401 });

  let body: { studentId?: unknown };
  try { body = await request.json() as { studentId?: unknown }; }
  catch { return Response.json({ error: 'Invalid request.' }, { status: 400 }); }
  const studentId = typeof body.studentId === 'string' ? body.studentId.trim().toUpperCase() : '';
  if (!STUDENT_ID.test(studentId)) return Response.json({ error: 'Enter a valid student ID using 5–20 letters, numbers, or hyphens.' }, { status: 400 });

  const existing = await env.DB.prepare('SELECT github_id AS githubId FROM registrations WHERE student_id = ?').bind(studentId).first<{ githubId: string }>();
  if (existing && existing.githubId !== session.githubId) return Response.json({ error: 'That student ID is already matched. Contact your instructor if this is yours.' }, { status: 409 });
  try { await saveRegistration(env.DB, session, studentId); }
  catch { return Response.json({ error: 'Could not save the match. Please try again.' }, { status: 500 }); }
  return Response.json({ ok: true, registration: await getRegistration(env.DB, session.githubId) });
}
