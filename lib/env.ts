export type AppEnv = {
  DB: D1Database;
  GITHUB_CLIENT_ID?: string;
  GITHUB_CLIENT_SECRET?: string;
  SESSION_SECRET?: string;
  ADMIN_TOKEN?: string;
};

export function required(value: string | undefined, name: string): string {
  if (!value) throw new Error(`${name} is not configured.`);
  return value;
}
