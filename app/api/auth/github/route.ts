import { cookies } from 'next/headers';
import { env } from 'cloudflare:workers';
import { required, type AppEnv } from '@/lib/env';

export async function GET(request: Request) {
  const clientId = required((env as AppEnv).GITHUB_CLIENT_ID, 'GITHUB_CLIENT_ID');
  const state = crypto.randomUUID();
  const cookieStore = await cookies();
  cookieStore.set('github_oauth_state', state, { httpOnly: true, secure: true, sameSite: 'lax', path: '/', maxAge: 600 });
  const callback = new URL('/api/auth/github/callback', request.url).toString();
  const authorize = new URL('https://github.com/login/oauth/authorize');
  authorize.searchParams.set('client_id', clientId);
  authorize.searchParams.set('redirect_uri', callback);
  authorize.searchParams.set('scope', 'read:user');
  authorize.searchParams.set('state', state);
  return Response.redirect(authorize, 302);
}
