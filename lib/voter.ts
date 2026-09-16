// Who is allowed to vote on the marks. A matched student, because the vote is
// the class's — and whoever already passes the /admin gate, because the person
// running the class has to be able to open the page and see what the room sees.
// The admin test is `isAdminLogin` against the ADMIN_LOGINS secret, exactly the
// check /admin itself makes; an instructor gets in without a registration being
// invented for them, and their votes are keyed on their github id like anyone's.
import { isAdminLogin } from './admin';
import { getRegistration } from './db';
import type { Session } from './session';

export async function mayVote(db: D1Database, cohort: string, session: Session, adminLogins: string | undefined): Promise<boolean> {
  const registration = await getRegistration(db, cohort, session.githubId);
  if (registration) return true;
  return isAdminLogin(adminLogins, session.login);
}
