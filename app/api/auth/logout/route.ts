import { cookies } from 'next/headers';

export async function GET(request: Request) {
  const cookieStore = await cookies();
  cookieStore.delete('sd5913_session');
  cookieStore.delete('github_oauth_state');
  return Response.redirect(new URL('/', request.url), 302);
}
