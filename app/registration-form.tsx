'use client';

import { useState, type ComponentProps } from 'react';
import Image from 'next/image';
import { ArrowRight } from 'lucide-react';

type Props = { login: string; avatarUrl: string; initialStudentId: string; isUpdate?: boolean };

// Students type only the four digits between the masked prefix and the fixed
// trailing letter, so `5668G` reaches the API as the digits `5668`.
const DIGITS = 4;

export function RegistrationForm({ login, avatarUrl, initialStudentId, isUpdate }: Props) {
  const [digits, setDigits] = useState(initialStudentId.replace(/\D/g, '').slice(-DIGITS));
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const complete = digits.length === DIGITS;

  async function submit(event: Parameters<NonNullable<ComponentProps<'form'>['onSubmit']>>[0]) {
    event.preventDefault(); setSaving(true); setError('');
    try {
      const response = await fetch('/api/registration', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ studentId: digits }) });
      const body = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(body.error || 'Could not save your student ID.');
      window.location.reload();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not save your student ID.'); setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="student-form">
      <div className="github-identity">
        <Image src={avatarUrl} alt="" width={42} height={42} unoptimized />
        <div><small>CONNECTED GITHUB</small><strong>@{login}</strong></div><span>VERIFIED</span>
      </div>
      <label htmlFor="student-id">Student ID</label>
      <div className="student-id-field">
        <span className="id-affix" aria-hidden="true">XXXX</span>
        <input
          id="student-id"
          name="studentId"
          value={digits}
          onChange={(event) => setDigits(event.target.value.replace(/\D/g, '').slice(0, DIGITS))}
          placeholder="0000"
          inputMode="numeric"
          autoComplete="off"
          required
          aria-label="Last four digits of your student ID"
          aria-describedby={error ? 'form-error' : 'id-help'}
        />
        <span className="id-affix" aria-hidden="true">G</span>
      </div>
      <small id="id-help" className="field-help">Enter the last four digits only — the rest is filled in for you.</small>
      {error && <p id="form-error" className="form-error" role="alert">{error}</p>}
      <button type="submit" disabled={saving || !complete}>{saving ? 'Saving…' : isUpdate ? 'Update match' : 'Match my account'}{!saving && <ArrowRight size={18} aria-hidden="true" />}</button>
    </form>
  );
}
