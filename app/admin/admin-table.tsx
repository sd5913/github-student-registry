'use client';

import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import type { Registration } from '@/lib/db';

type Props = { cohort: string; registrations: Registration[]; missing: string[] };

export function AdminTable({ cohort, registrations, missing }: Props) {
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [editing, setEditing] = useState('');
  const [digits, setDigits] = useState('');
  const [copied, setCopied] = useState(false);

  async function act(githubId: string, body: Record<string, string>) {
    setBusy(githubId); setError('');
    try {
      const response = await fetch('/api/admin/registrations', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ cohort, githubId, ...body }) });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error || 'That did not work.');
      window.location.reload();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'That did not work.'); setBusy('');
    }
  }

  async function copyLogins() {
    try {
      await navigator.clipboard.writeText(registrations.map((row) => row.githubLogin).join(', '));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('Could not copy to the clipboard.');
    }
  }

  return (
    <>
      {error && <p className="form-error" role="alert">{error}</p>}

      <h2 className="admin-section">Registered ({registrations.length})</h2>
      {registrations.length === 0 ? (
        <p className="admin-empty">Nobody has registered for {cohort} yet.</p>
      ) : (
        <table className="admin-table">
          <thead><tr><th>Student ID</th><th>GitHub</th><th>Name</th><th>Updated</th><th aria-label="Actions" /></tr></thead>
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
                <td className="admin-muted">{row.updatedAt.slice(0, 16).replace('T', ' ')}</td>
                <td className="admin-row-actions">
                  {editing === row.githubId ? (
                    <>
                      <button type="button" disabled={digits.length !== 4 || busy === row.githubId} onClick={() => act(row.githubId, { action: 'update', studentId: digits })}>Save</button>
                      <button type="button" className="quiet" onClick={() => { setEditing(''); setError(''); }}>Cancel</button>
                    </>
                  ) : (
                    <>
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

      {registrations.length > 0 && (
        <button type="button" className="admin-copy" onClick={copyLogins}>
          {copied ? <Check size={15} aria-hidden="true" /> : <Copy size={15} aria-hidden="true" />}
          {copied ? 'Copied' : `Copy ${registrations.length} logins for org invite`}
        </button>
      )}

      <h2 className="admin-section">Not yet registered ({missing.length})</h2>
      {missing.length === 0 ? (
        <p className="admin-empty">Everyone on the {cohort} roster has registered.</p>
      ) : (
        <p className="admin-missing">{missing.map((id) => <span key={id}>{id}</span>)}</p>
      )}
    </>
  );
}
