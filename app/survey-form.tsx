'use client';

import { useState, type ComponentProps } from 'react';
import { ArrowRight, Check } from 'lucide-react';
import { GOAL_MAX, QUESTIONS, type SurveyField } from '@/lib/survey';

type Answers = Partial<Record<SurveyField, string | string[]>>;
type Props = {
  initial: Partial<Record<SurveyField, string | null>>;
  initialGoal: string;
  answered: boolean;
};

export function SurveyForm({ initial, initialGoal, answered }: Props) {
  const [open, setOpen] = useState(!answered);
  const [answers, setAnswers] = useState<Answers>(() => {
    const start: Answers = {};
    for (const question of QUESTIONS) {
      const stored = initial[question.id];
      if (!stored) continue;
      start[question.id] = question.multiple ? stored.split(',') : stored;
    }
    return start;
  });
  const [goal, setGoal] = useState(initialGoal);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(answered);
  const [error, setError] = useState('');

  function pick(question: (typeof QUESTIONS)[number], value: string) {
    setSaved(false);
    setAnswers((current) => {
      if (!question.multiple) return { ...current, [question.id]: value };
      const chosen = new Set(
        Array.isArray(current[question.id])
          ? (current[question.id] as string[])
          : [],
      );
      if (chosen.has(value)) chosen.delete(value);
      else chosen.add(value);
      return { ...current, [question.id]: [...chosen] };
    });
  }

  function isPicked(question: (typeof QUESTIONS)[number], value: string) {
    const current = answers[question.id];
    return question.multiple
      ? Array.isArray(current) && current.includes(value)
      : current === value;
  }

  async function submit(
    event: Parameters<NonNullable<ComponentProps<'form'>['onSubmit']>>[0],
  ) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const response = await fetch('/api/survey', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ...answers, goal }),
      });
      const body = (await response.json()) as { error?: string };
      if (!response.ok)
        throw new Error(body.error || 'Could not save your answers.');
      setSaved(true);
      setOpen(false);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : 'Could not save your answers.',
      );
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <div className="survey-done">
        {saved && (
          <p className="survey-thanks">
            <Check size={15} aria-hidden="true" />
            Thanks — that helps us pitch the tutorials.
          </p>
        )}
        <button
          type="button"
          className="text-link"
          onClick={() => setOpen(true)}
        >
          {saved
            ? 'Change my answers'
            : 'Answer a few questions about your background'}
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="survey-form">
      <p className="eyebrow">OPTIONAL · ABOUT ONE MINUTE</p>
      <h3>Help us pitch this right.</h3>
      <p className="card-copy">
        This class runs from “never written a line” to “I ship apps”. Knowing
        where you are stops us boring you or losing you. Nothing here is graded,
        and you can skip any question.
      </p>

      {QUESTIONS.map((question) => (
        <fieldset key={question.id} className="survey-question">
          <legend>{question.prompt}</legend>
          {question.help && (
            <small className="field-help">{question.help}</small>
          )}
          <div className="survey-choices">
            {question.choices.map((choice) => (
              <button
                key={choice.value}
                type="button"
                className={
                  isPicked(question, choice.value)
                    ? 'survey-choice picked'
                    : 'survey-choice'
                }
                aria-pressed={isPicked(question, choice.value)}
                onClick={() => pick(question, choice.value)}
              >
                <strong>{choice.label}</strong>
                {choice.hint && <small>{choice.hint}</small>}
              </button>
            ))}
          </div>
        </fieldset>
      ))}

      <fieldset className="survey-question">
        <legend>
          <label htmlFor="survey-goal">
            What would make this course worth it for you?
          </label>
        </legend>
        <small className="field-help">
          One sentence. We read every one of these.
        </small>
        <textarea
          id="survey-goal"
          value={goal}
          maxLength={GOAL_MAX}
          rows={3}
          placeholder="I want to finally build the thing I keep sketching."
          onChange={(event) => {
            setGoal(event.target.value);
            setSaved(false);
          }}
        />
        <small className="field-help char-count">
          {goal.length}/{GOAL_MAX}
        </small>
      </fieldset>

      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <div className="survey-actions">
        <button type="submit" disabled={saving}>
          {saving ? 'Saving…' : 'Send answers'}
          {!saving && <ArrowRight size={18} aria-hidden="true" />}
        </button>
        <button
          type="button"
          className="text-link"
          onClick={() => setOpen(false)}
        >
          Skip for now
        </button>
      </div>
    </form>
  );
}
