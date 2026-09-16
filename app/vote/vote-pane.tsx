'use client';

import { useState } from 'react';
import Image from 'next/image';
import { markSrc, type VoteState } from '@/lib/marks';

// One pair at a time, swapped in place: this is done on a phone, in a lecture
// theatre, on the room's wifi. A full page load per vote would end the vote.
export function VotePane({ initial }: { initial: VoteState }) {
  const [state, setState] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function send(body: { a?: number; b?: number; winner?: number }) {
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/vote', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
      const payload = (await response.json()) as VoteState & { error?: string };
      if (!response.ok) throw new Error(payload.error || 'Could not record that vote.');
      setState({ count: payload.count, pair: payload.pair, top: payload.top });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not record that vote.');
    } finally {
      setBusy(false);
    }
  }

  const pair = state.pair;

  return (
    <>
      {pair ? (
        <div className="vote-pair" aria-busy={busy}>
          {pair.map((mark) => (
            <button
              key={mark}
              type="button"
              className="vote-choice"
              disabled={busy}
              aria-label={`Choose mark ${mark}`}
              onClick={() => send({ a: pair[0], b: pair[1], winner: mark })}
            >
              <span className="vote-frame">
                <Image src={markSrc(mark)} alt="" fill sizes="(max-width:720px) 86vw, 42vw" unoptimized priority />
              </span>
            </button>
          ))}
        </div>
      ) : (
        <p className="vote-done">You have judged every pair there is. That is the whole set — thank you.</p>
      )}

      {error && <p className="form-error" role="alert">{error}</p>}

      <div className="vote-actions">
        <p className="vote-count" aria-live="polite">You have compared {state.count} {state.count === 1 ? 'pair' : 'pairs'}.</p>
        {pair && (
          <button type="button" className="text-link" disabled={busy} onClick={() => send({})}>
            Neither — show me another pair
          </button>
        )}
      </div>

      {state.top.length > 0 && (
        <section className="vote-top" aria-labelledby="vote-top-title">
          <h2 id="vote-top-title" className="admin-section">Current top 8</h2>
          <ul>
            {state.top.map((mark) => (
              <li key={mark}>
                <span className="vote-thumb">
                  <Image src={markSrc(mark)} alt={`Mark ${mark}`} fill sizes="120px" unoptimized />
                </span>
              </li>
            ))}
          </ul>
          <p className="vote-note">Everyone’s votes so far, best first. It moves as the class votes.</p>
        </section>
      )}
    </>
  );
}
