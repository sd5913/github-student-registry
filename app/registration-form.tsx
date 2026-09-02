'use client';

import { useState, type ComponentProps } from 'react';
import Image from 'next/image';
import { ArrowRight } from 'lucide-react';

type Props = { login: string; avatarUrl: string; initialStudentId: string; isUpdate?: boolean };

export function RegistrationForm({ login, avatarUrl, initialStudentId, isUpdate }: Props) {
  const [studentId, setStudentId] = useState(initialStudentId);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function submit(event: Parameters<NonNullable<ComponentProps<'form'>['onSubmit']>>[0]) {
    event.preventDefault(); setSaving(true); setError('');
    try {
      const response = await fetch('/api/registration', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ studentId }) });
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
      <input id="student-id" name="studentId" value={studentId} onChange={(event) => setStudentId(event.target.value.toUpperCase())} placeholder="e.g. 24001234G" minLength={5} maxLength={20} pattern="[A-Za-z0-9-]+" autoComplete="off" required aria-describedby={error ? 'form-error' : 'id-help'} />
      <small id="id-help" className="field-help">Letters, numbers, and hyphens only.</small>
      {error && <p id="form-error" className="form-error" role="alert">{error}</p>}
      <button type="submit" disabled={saving}>{saving ? 'Saving…' : isUpdate ? 'Update match' : 'Match my account'}{!saving && <ArrowRight size={18} aria-hidden="true" />}</button>
    </form>
  );
}
