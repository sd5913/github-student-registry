// Canvas submissions against registrations. Canvas knows the student ID; the
// registry knows the GitHub login; the submitted URL names a repository owner.
// The three agree, or they do not, and disagreement is the thing to show.
import { normalizeStudentId, STUDENT_ID } from './student-id.ts';
import { normalizeRepo, repoOwner } from './verify.ts';

export type SubmissionEntry = { studentId: string; url: string; owner: string | null };

export type SubmissionStatus =
  | { kind: 'match'; owner: string }
  | { kind: 'mismatch'; owner: string; registered: string }
  | { kind: 'unregistered'; owner: string }
  | { kind: 'invalid'; owner: null };

/**
 * Parse pasted `student_id  url` lines, one per student. Separators can be
 * spaces, tabs or commas; a full PolyU ID (`26117968G`) is reduced to its tail.
 * A line without both parts is skipped. Later lines win, as Canvas keeps the
 * latest attempt.
 */
export function parseSubmissionList(text: string): SubmissionEntry[] {
  const out = new Map<string, SubmissionEntry>();
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const parts = line.split(/[\s,]+/).filter(Boolean);
    let studentId: string | null = null;
    let url: string | null = null;
    for (const part of parts) {
      if (!url && /github\.com\//i.test(part)) { url = part.replace(/^<|>$/g, ''); continue; }
      if (!studentId) {
        const tail = part.match(/^\d{4}(\d{4})([A-Za-z])$/);
        const candidate = normalizeStudentId(tail ? `${tail[1]}${tail[2]}` : part);
        if (STUDENT_ID.test(candidate)) studentId = candidate;
      }
    }
    if (!studentId || !url) continue;
    const repo = normalizeRepo(url);
    out.set(studentId, { studentId, url: repo ?? url, owner: repo ? repoOwner(repo) : null });
  }
  return [...out.values()];
}

/** Compare one submission with what the registry knows. Logins compare case-insensitively. */
export function submissionStatus(
  entry: { owner: string | null; studentId: string },
  loginForStudent: string | null,
  studentForLogin: (login: string) => string | null,
): SubmissionStatus {
  if (!entry.owner) return { kind: 'invalid', owner: null };
  if (loginForStudent && loginForStudent.toLowerCase() === entry.owner.toLowerCase()) return { kind: 'match', owner: entry.owner };
  if (loginForStudent) return { kind: 'mismatch', owner: entry.owner, registered: loginForStudent };
  // The submitting student never registered; the owner may be someone else's account.
  return studentForLogin(entry.owner) ? { kind: 'mismatch', owner: entry.owner, registered: '' } : { kind: 'unregistered', owner: entry.owner };
}

export function describe(status: SubmissionStatus): string {
  switch (status.kind) {
    case 'match': return `Repository owner @${status.owner} is the registered account.`;
    case 'mismatch': return status.registered
      ? `The repository belongs to @${status.owner}, but this student registered as @${status.registered}.`
      : `The repository belongs to @${status.owner}, which is registered to a different student ID.`;
    case 'unregistered': return `The repository owner @${status.owner} has not registered at all.`;
    case 'invalid': return 'The submitted URL is not a GitHub repository.';
  }
}
