'use client';

import { useState } from 'react';
import { Check, Copy, ShieldCheck } from 'lucide-react';
import type { Registration } from '@/lib/db';

type Props = { cohort: string; registrations: Registration[]; missing: string[] };

function repoName(url: string): string {
  return url.replace(/^https:\/\/github\.com\//, '');
}

export function AdminTable({ cohort, registrations, missing }: Props) {
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [editing, setEditing] = useState('');
  const [digits, setDigits] = useState('');
  const [copied, setCopied] = useState(false);
  const [list, setList] = useState('');
  // The result of a bulk verify outlives the reload that shows it; it is
  // read once, on the client, when the table first mounts.
  const [report] = useState(() => {
    if (typeof sessionStorage === 'undefined') return '';
    const stored = sessionStorage.getItem('verify-report') ?? '';
    sessionStorage.removeItem('verify-report');
    return stored;
  });

  const verified = registrations.filter((row) => row.verifiedAt !== null);

  async function post(body: Record<string, string>): Promise<{ verified?: string[]; unmatched?: string[] }> {
    const response = await fetch('/api/admin/registrations', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ cohort, ...body }) });
    const result = (await response.json()) as { error?: string; verified?: string[]; unmatched?: string[] };
    if (!response.ok) throw new Error(result.error || 'That did not work.');
    return result;
  }

  async function act(githubId: string, body: Record<string, string>) {
    setBusy(githubId); setError('');
    try {
      await post({ githubId, ...body });
      window.location.reload();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'That did not work.'); setBusy('');
    }
  }

  async function verifyMany() {
    setBusy('list'); setError('');
    try {
      const result = await post({ action: 'verify-many', list });
      const unmatched = result.unmatched ?? [];
      // Survives the reload: an unmatched login is a student who handed in
      // from an account they never registered, and it needs chasing.
      sessionStorage.setItem('verify-report', `Verified ${result.verified?.length ?? 0}.` + (unmatched.length ? ` Not registered: ${unmatched.join(', ')}.` : ''));
      window.location.reload();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'That did not work.'); setBusy('');
    }
  }

  async function copyLogins() {
    try {
      await navigator.clipboard.writeText(verified.map((row) => row.githubLogin).join(', '));
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

      <h2 className="admin-section">Registered ({registrations.length}) · verified {verified.length}</h2>
      {registrations.length === 0 ? (
        <p className="admin-empty">Nobody has registered for {cohort} yet.</p>
      ) : (
        <table className="admin-table">
          <thead><tr><th>Student ID</th><th>GitHub</th><th>Name</th><th>Verified</th><th aria-label="Actions" /></tr></thead>
          <tbody>
            {registrations.map((row) => (
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
                  {row.verifiedAt ? (
                    <span className="admin-verified" title={row.verifiedAt.slice(0, 16).replace('T', ' ')}>
                      <ShieldCheck size={13} aria-hidden="true" />
                      {row.verifiedRepo ? <a href={row.verifiedRepo} target="_blank" rel="noreferrer">{repoName(row.verifiedRepo)}</a> : row.verifiedAt.slice(0, 10)}
                    </span>
                  ) : '—'}
                </td>
                <td className="admin-row-actions">
                  {editing === row.githubId ? (
                    <>
                      <button type="button" disabled={digits.length !== 4 || busy === row.githubId} onClick={() => act(row.githubId, { action: 'update', studentId: digits })}>Save</button>
                      <button type="button" className="quiet" onClick={() => { setEditing(''); setError(''); }}>Cancel</button>
                    </>
                  ) : (
                    <>
                      {row.verifiedAt ? (
                        <button type="button" className="quiet" disabled={busy === row.githubId} onClick={() => act(row.githubId, { action: 'unverify' })}>Unverify</button>
                      ) : (
                        <button type="button" className="quiet" disabled={busy === row.githubId} onClick={() => act(row.githubId, { action: 'verify' })}>Verify</button>
                      )}
                      <button type="button" className="quiet" onClick={() => { setEditing(row.githubId); setDigits(row.studentId.replace(/\D/g, '')); setError(''); }}>Edit ID</button>
                      <button type="button" className="quiet danger" disabled={busy === row.githubId} onClick={() => act(row.githubId, { action: 'release' })}>Release</button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {verified.length > 0 && (
        <button type="button" className="admin-copy" onClick={copyLogins}>
          {copied ? <Check size={15} aria-hidden="true" /> : <Copy size={15} aria-hidden="true" />}
          {copied ? 'Copied' : `Copy ${verified.length} verified logins for org invite`}
        </button>
      )}

      <h2 className="admin-section">Verify from a submission list</h2>
      <p className="admin-empty">
        One GitHub login per line, with the submitted repository after it. Paste the block that <code>scripts/check_submissions.py</code> prints.
        A login that is not registered is reported back rather than created.
      </p>
      <textarea
        className="admin-list"
        value={list}
        onChange={(event) => setList(event.target.value)}
        rows={5}
        placeholder={'alice https://github.com/alice/why-are-we-here\nbob https://github.com/bob/essay'}
        aria-label="Logins and repositories to verify"
      />
      <div className="admin-row-actions admin-list-actions">
        <button type="button" disabled={busy === 'list' || !list.trim()} onClick={verifyMany}>Verify these</button>
      </div>

      <h2 className="admin-section">Not yet registered ({missing.length})</h2>
      {missing.length === 0 ? (
        <p className="admin-empty">Everyone on the {cohort} roster has registered.</p>
      ) : (
        <p className="admin-missing">{missing.map((id) => <span key={id}>{id}</span>)}</p>
      )}
    </>
  );
}
