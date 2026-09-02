// Who may open /admin, held in the `ADMIN_LOGINS` Worker secret as a
// comma-separated list of GitHub logins. Adding a teaching assistant is a
// `wrangler secret put` with no redeploy. An unset secret admits nobody.
export function parseAdminLogins(value: string | undefined): Set<string> {
  return new Set((value ?? '').split(',').map((login) => login.trim().toLowerCase()).filter(Boolean));
}

export function isAdminLogin(value: string | undefined, login: string): boolean {
  if (!login) return false;
  return parseAdminLogins(value).has(login.toLowerCase());
}
