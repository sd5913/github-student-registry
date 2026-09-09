// Verifying a registration: an instructor has seen work handed in from this
// GitHub account, so the student-ID match is proven rather than claimed. The
// proof is the repository the student submitted, and it is stored so the home
// page can link back to it.
//
// The bulk form on /admin takes the output of the admin workspace's
// `scripts/check_submissions.py` pasted straight in: one login per line, with
// the submitted repository after it. Anything that is not a login is ignored,
// so a copied table with headings or notes still parses.

export type VerifyEntry = { login: string; repo: string | null };

const LOGIN = /^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i;
const REPO = /^(?:https?:\/\/)?(?:www\.)?github\.com\/([A-Za-z\d-]+)\/([\w.-]+?)(?:\.git)?\/?(?:[?#].*)?$/;

/**
 * A submitted repository, reduced to `https://github.com/owner/name`. Returns
 * null for anything that is not a GitHub repository URL — a tree or blob link
 * inside one still counts, since Canvas passes through whatever was pasted.
 */
export function normalizeRepo(input: string): string | null {
  const trimmed = input.trim();
  const tree = trimmed.match(/^(?:https?:\/\/)?(?:www\.)?github\.com\/([A-Za-z\d-]+)\/([\w.-]+?)(?:\.git)?\/(?:tree|blob)\/.*$/);
  const match = tree ?? trimmed.match(REPO);
  if (!match) return null;
  return `https://github.com/${match[1]}/${match[2]}`;
}

/** The account a normalized repository belongs to, lowercased. */
export function repoOwner(repo: string): string | null {
  const match = repo.match(/^https:\/\/github\.com\/([A-Za-z\d-]+)\//);
  return match ? match[1].toLowerCase() : null;
}

/**
 * Parse pasted text into logins and repos. Each line is a login optionally
 * followed by a repository; separators can be spaces, tabs or commas. A line
 * holding only a repository URL verifies its owner. Duplicate logins keep the
 * first repository given.
 */
export function parseVerifyList(text: string): VerifyEntry[] {
  const seen = new Map<string, VerifyEntry>();
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const parts = line.split(/[\s,]+/).filter(Boolean);
    let login: string | null = null;
    let repo: string | null = null;
    for (const part of parts) {
      const asRepo = normalizeRepo(part);
      if (asRepo) { repo ??= asRepo; continue; }
      const bare = part.replace(/^@/, '');
      if (!login && LOGIN.test(bare)) login = bare;
    }
    if (!login && repo) login = repoOwner(repo);
    if (!login) continue;
    const key = login.toLowerCase();
    if (!seen.has(key)) seen.set(key, { login, repo });
    else if (repo && !seen.get(key)?.repo) seen.set(key, { login: seen.get(key)!.login, repo });
  }
  return [...seen.values()];
}
