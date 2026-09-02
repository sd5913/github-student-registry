import { env } from 'cloudflare:workers';
import { required, type AppEnv } from './env';

export type Session = {
  githubId: string;
  login: string;
  name: string | null;
  avatarUrl: string;
  exp: number;
};

const encoder = new TextEncoder();

function encodeBase64Url(input: Uint8Array | string): string {
  const bytes = typeof input === 'string' ? encoder.encode(input) : input;
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
}

async function signature(payload: string): Promise<string> {
  const secret = required((env as AppEnv).SESSION_SECRET, 'SESSION_SECRET');
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const signed = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
  return encodeBase64Url(new Uint8Array(signed));
}

export async function createSession(input: Omit<Session, 'exp'>): Promise<string> {
  const data: Session = { ...input, exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30 };
  const payload = encodeBase64Url(JSON.stringify(data));
  return `${payload}.${await signature(payload)}`;
}

export async function readSession(value?: string): Promise<Session | null> {
  if (!value) return null;
  try {
    const [payload, provided, extra] = value.split('.');
    if (!payload || !provided || extra || provided !== await signature(payload)) return null;
    const padded = payload.replaceAll('-', '+').replaceAll('_', '/') + '='.repeat((4 - payload.length % 4) % 4);
    const data = JSON.parse(atob(padded)) as Session;
    if (!data.githubId || !data.login || !data.avatarUrl || data.exp < Date.now() / 1000) return null;
    return data;
  } catch {
    return null;
  }
}

export const sessionCookie = { httpOnly: true, secure: true, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 30 } as const;
