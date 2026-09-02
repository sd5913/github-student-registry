'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Pulse } from '@/lib/survey-summary';

// Polling, not SSE or a socket: 112 students answering over ten minutes is a
// handful of rows, and a five-second poll against D1 is both cheaper and far
// harder to break than a streaming connection held open on a projector.
const POLL_MS = 5000;

export function LiveBoard({ initial }: { initial: Pulse }) {
  const [pulse, setPulse] = useState(initial);
  const [stale, setStale] = useState(false);
  const [flash, setFlash] = useState(false);
  const previousResponded = useRef(initial.responded);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch(`/api/admin/pulse?cohort=${encodeURIComponent(initial.cohort)}`, { cache: 'no-store' });
      if (!response.ok) { setStale(true); return; }
      const next = (await response.json()) as Pulse;
      setStale(false);
      setPulse(next);
      if (next.responded > previousResponded.current) {
        setFlash(true);
        window.setTimeout(() => setFlash(false), 900);
      }
      previousResponded.current = next.responded;
    } catch { setStale(true); }
  }, [initial.cohort]);

  useEffect(() => {
    // Don't poll a tab nobody is looking at, and catch up the moment it comes back.
    const tick = () => { if (document.visibilityState === 'visible') void refresh(); };
    const timer = window.setInterval(tick, POLL_MS);
    document.addEventListener('visibilitychange', tick);
    return () => { window.clearInterval(timer); document.removeEventListener('visibilitychange', tick); };
  }, [refresh]);

  const pct = (n: number) => (pulse.responded === 0 ? 0 : Math.round((n / pulse.responded) * 100));

  return (
    <div className="board">
      <header className="board__head">
        <div>
          <p className="eyebrow">SD5913 · {pulse.cohort} · LIVE</p>
          <h1 className="board__title">Who’s in the room.</h1>
        </div>
        <div className="board__stats">
          <div className="stat"><span className="stat__n">{pulse.registered}</span><span className="stat__l">registered<small>of {pulse.rosterTotal}</small></span></div>
          <div className={flash ? 'stat stat--flash' : 'stat'}><span className="stat__n">{pulse.responded}</span><span className="stat__l">answered<small>{stale ? 'reconnecting…' : 'updating live'}</small></span></div>
        </div>
      </header>

      {pulse.responded === 0 ? (
        <p className="board__empty">Nothing yet. This updates on its own as people answer.</p>
      ) : (
        <div className="board__grid">
          {pulse.questions.map((question) => {
            const top = Math.max(...question.tallies.map((tally) => tally.count), 1);
            return (
              <section key={question.id} className="qcard">
                <h2>{question.prompt}{question.multiple && <em> (pick any)</em>}</h2>
                <ul>
                  {question.tallies.map((tally) => (
                    <li key={tally.value}>
                      <div className="bar__row">
                        <span className="bar__label">{tally.label}</span>
                        <span className="bar__n">{tally.count}<small>{pct(tally.count)}%</small></span>
                      </div>
                      <div className="bar__track">
                        <div className="bar__fill" style={{ width: `${(tally.count / top) * 100}%` }} />
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}

      {pulse.goals.length > 0 && (
        <section className="goals">
          <h2>What would make this course worth it — in their words</h2>
          <ul>{pulse.goals.map((goal, index) => <li key={`${index}-${goal.slice(0, 24)}`}>{goal}</li>)}</ul>
        </section>
      )}
    </div>
  );
}
