import { cookies } from 'next/headers';
import { env } from 'cloudflare:workers';
import { required, type AppEnv } from '@/lib/env';
import { createSession, sessionCookie } from '@/lib/session';

type GitHubUser = { id: number; login: string; name: string | null; avatar_url: string };

export async function GET(request: Request) {
  const url = new URL(request.url);
  const cookieStore = await cookies();
  const state = url.searchParams.get('state');
  const expectedState = cookieStore.get('github_oauth_state')?.value;
  const code = url.searchParams.get('code');
  if (!state || !expectedState || state !== expectedState || !code) return new Response('Invalid or expired GitHub sign-in. Please try again.', { status: 400 });
  cookieStore.delete('github_oauth_state');

  const appEnv = env as AppEnv;
  const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST', headers: { accept: 'application/json', 'content-type': 'application/json' },
    body: JSON.stringify({ client_id: required(appEnv.GITHUB_CLIENT_ID, 'GITHUB_CLIENT_ID'), client_secret: required(appEnv.GITHUB_CLIENT_SECRET, 'GITHUB_CLIENT_SECRET'), code }),
  });
  const tokenBody = await tokenResponse.json() as { access_token?: string; error_description?: string };
  if (!tokenResponse.ok || !tokenBody.access_token) return new Response(tokenBody.error_description || 'GitHub sign-in failed.', { status: 502 });

  const profileResponse = await fetch('https://api.github.com/user', { headers: { accept: 'application/vnd.github+json', authorization: `Bearer ${tokenBody.access_token}`, 'user-agent': 'sd5913-student-registry', 'x-github-api-version': '2022-11-28' } });
  if (!profileResponse.ok) return new Response('Could not read your GitHub profile.', { status: 502 });
  const profile = await profileResponse.json() as GitHubUser;
  if (!profile.id || !profile.login || !profile.avatar_url) return new Response('GitHub returned an incomplete profile.', { status: 502 });

  cookieStore.set('sd5913_session', await createSession({ githubId: String(profile.id), login: profile.login, name: profile.name, avatarUrl: profile.avatar_url }), sessionCookie);
  return Response.redirect(new URL('/', request.url), 302);
}
