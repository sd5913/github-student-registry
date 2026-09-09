'use client';

import { useState } from 'react';
import { Check, Copy, ShieldCheck } from 'lucide-react';
import type { Registration, Submission } from '@/lib/db';
import { describe, submissionStatus, type SubmissionStatus } from '@/lib/submissions';

type Props = { cohort: string; registrations: Registration[]; missing: string[]; submissions: Submission[] };

function repoName(url: string): string {
  return url.replace(/^https:\/\/github\.com\//, '');
}

const LABEL: Record<SubmissionStatus['kind'], string> = { match: 'match', mismatch: 'MISMATCH', unregistered: 'owner unregistered', invalid: 'not a repo' };

export function AdminTable({ cohort, registrations, missing, submissions }: Props) {
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [editing, setEditing] = useState('');
  const [digits, setDigits] = useState('');
  const [copied, setCopied] = useState(false);
  const [list, setList] = useState('');
  const [assignment, setAssignment] = useState('1');
  const [rosterId, setRosterId] = useState('');
  // The result of an import outlives the reload that shows it; read once on mount.
  const [report] = useState(() => {
    if (typeof sessionStorage === 'undefined') return '';
    const stored = sessionStorage.getItem('admin-report') ?? '';
    sessionStorage.removeItem('admin-report');
    return stored;
  });

  const byStudent = new Map(registrations.map((row) => [row.studentId, row]));
  const byLogin = new Map(registrations.map((row) => [row.githubLogin.toLowerCase(), row.studentId]));
  const studentFor = (login: string) => byLogin.get(login.toLowerCase()) ?? null;
  const current = submissions.filter((sub) => sub.assignment === assignment);
  const verdicts = new Map(current.map((sub) => [sub.studentId, submissionStatus(sub, byStudent.get(sub.studentId)?.githubLogin ?? null, studentFor)]));
  const flagged = current.filter((sub) => verdicts.get(sub.studentId)?.kind !== 'match');
  const matched = registrations.filter((row) => row.verifiedAt !== null || verdicts.get(row.studentId)?.kind === 'match');
  const notSubmitted = registrations.filter((row) => !verdicts.has(row.studentId));

  async function post(body: Record<string, string>): Promise<Record<string, unknown>> {
    const response = await fetch('/api/admin/registrations', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ cohort, ...body }) });
    const result = (await response.json()) as Record<string, unknown> & { error?: string };
    if (!response.ok) throw new Error(result.error || 'That did not work.');
    return result;
  }

  async function act(key: string, body: Record<string, string>, summary?: (result: Record<string, unknown>) => string) {
    setBusy(key); setError('');
    try {
      const result = await post(body);
      if (summary) sessionStorage.setItem('admin-report', summary(result));
      window.location.reload();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'That did not work.'); setBusy('');
    }
  }

  async function copyLogins() {
    try {
      await navigator.clipboard.writeText(matched.map((row) => row.githubLogin).join(', '));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('Could not copy to the clipboard.');
    }
  }

  return (
    <>
      {error && <p className="form-error" role="alert">{error}</p>}
      {report && <output className="admin-report">{report}</output>}

      {current.length > 0 && (
        <section className="admin-flags">
          <h2 className="admin-section">Assignment {assignment} · {current.length} on Canvas · {flagged.length} flagged · {notSubmitted.length} registered without a submission</h2>
          {flagged.length > 0 && (
            <ul>
              {flagged.map((sub) => {
                const status = verdicts.get(sub.studentId)!;
                return (
                  <li key={sub.studentId}>
                    <span className="admin-id">{sub.studentId}</span>
                    <a href={sub.url} target="_blank" rel="noreferrer">{repoName(sub.url)}</a>
                    <em>{describe(status)}</em>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}

      <h2 className="admin-section">Registered ({registrations.length}) · {matched.length} with a matching submission</h2>
      {registrations.length === 0 ? (
        <p className="admin-empty">Nobody has registered for {cohort} yet.</p>
      ) : (
        <table className="admin-table">
          <thead><tr><th>Student ID</th><th>GitHub</th><th>Name</th><th>Assignment {assignment}</th><th aria-label="Actions" /></tr></thead>
          <tbody>
            {registrations.map((row) => {
              const sub = current.find((s) => s.studentId === row.studentId);
              const status = sub ? verdicts.get(row.studentId) : undefined;
              return (
                <tr key={row.githubId}>
                  <td className="admin-id">
                    {editing === row.githubId ? (
                      <input
                        className="admin-edit"
                        value={digits}
                        onChange={(event) => setDigits(event.target.value.replace(/\D/g, '').slice(0, 4))}
                        placeholder="0000"
                        inputMode="numeric"
                        aria-label={`New student ID for @${row.githubLogin}`}
                        ref={(element) => { element?.focus(); }}
                      />
                    ) : row.studentId}
                  </td>
                  <td><a href={`https://github.com/${row.githubLogin}`} target="_blank" rel="noreferrer">@{row.githubLogin}</a></td>
                  <td className="admin-muted">{row.githubName ?? '—'}</td>
                  <td className="admin-muted">
                    {sub && status ? (
                      <span className={`admin-status ${status.kind}`} title={describe(status)}>
                        {status.kind === 'match' && <Check size={13} aria-hidden="true" />}
                        <a href={sub.url} target="_blank" rel="noreferrer">{repoName(sub.url)}</a>
                        {status.kind !== 'match' && <b>{LABEL[status.kind]}</b>}
                      </span>
                    ) : row.verifiedAt ? (
                      <span className="admin-status match" title="Verified by hand"><ShieldCheck size={13} aria-hidden="true" />verified</span>
                    ) : '—'}
                  </td>
                  <td className="admin-row-actions">
                    {editing === row.githubId ? (
                      <>
                        <button type="button" disabled={digits.length !== 4 || busy === row.githubId} onClick={() => act(row.githubId, { action: 'update', githubId: row.githubId, studentId: digits })}>Save</button>
                        <button type="button" className="quiet" onClick={() => { setEditing(''); setError(''); }}>Cancel</button>
                      </>
                    ) : (
                      <>
                        {row.verifiedAt ? (
                          <button type="button" className="quiet" disabled={busy === row.githubId} onClick={() => act(row.githubId, { action: 'unverify', githubId: row.githubId })}>Unverify</button>
                        ) : (
                          <button type="button" className="quiet" disabled={busy === row.githubId} title="Count this account as proven without a matching submission" onClick={() => act(row.githubId, { action: 'verify', githubId: row.githubId })}>Verify</button>
                        )}
                        <button type="button" className="quiet" onClick={() => { setEditing(row.githubId); setDigits(row.studentId.replace(/\D/g, '')); setError(''); }}>Edit ID</button>
                        <button type="button" className="quiet danger" disabled={busy === row.githubId} onClick={() => act(row.githubId, { action: 'release', githubId: row.githubId })}>Release</button>
                      </>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {matched.length > 0 && (
        <button type="button" className="admin-copy" onClick={copyLogins}>
          {copied ? <Check size={15} aria-hidden="true" /> : <Copy size={15} aria-hidden="true" />}
          {copied ? 'Copied' : `Copy ${matched.length} matched logins for org invite`}
        </button>
      )}

      <h2 className="admin-section">Import submissions from Canvas</h2>
      <p className="admin-empty">
        One line per student: the student ID, then the URL they posted. IDs not on the roster are reported back and skipped. Importing again replaces earlier lines for the same students.
      </p>
      <div className="admin-import">
        <label>Assignment <input className="admin-edit" value={assignment} onChange={(event) => setAssignment(event.target.value.replace(/\D/g, '').slice(0, 2) || '1')} inputMode="numeric" aria-label="Assignment number" /></label>
        <textarea
          className="admin-list"
          value={list}
          onChange={(event) => setList(event.target.value)}
          rows={5}
          placeholder={'5066G https://github.com/alice/why-are-we-here\n26117968G https://github.com/bob/essay'}
          aria-label="Submissions to import"
        />
        <div className="admin-row-actions admin-list-actions">
          <button type="button" disabled={busy === 'import' || !list.trim()} onClick={() => act('import', { action: 'import-submissions', assignment, list }, (r) => `Imported ${String(r.imported)} submission(s) for assignment ${assignment}.` + (Array.isArray(r.unknown) && r.unknown.length ? ` Not on the roster: ${r.unknown.join(', ')}.` : ''))}>Import</button>
        </div>
      </div>

      <h2 className="admin-section">Not yet registered ({missing.length})</h2>
      {missing.length === 0 ? (
        <p className="admin-empty">Everyone on the {cohort} roster has registered.</p>
      ) : (
        <p className="admin-missing">{missing.map((id) => <span key={id}>{id}</span>)}</p>
      )}
      <div className="admin-import admin-roster-add">
        <label>Add an ID to the roster <input className="admin-edit" value={rosterId} onChange={(event) => setRosterId(event.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="0000" inputMode="numeric" aria-label="Student ID to add to the roster" /></label>
        <button type="button" disabled={rosterId.length !== 4 || busy === 'roster'} onClick={() => act('roster', { action: 'roster-add', studentId: rosterId }, (r) => (r.added ? `Added ${rosterId}G to the ${cohort} roster.` : `${rosterId}G was already on the roster.`))}>Add</button>
      </div>
    </>
  );
}
