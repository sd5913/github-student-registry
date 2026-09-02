// Aggregation for the live board. Pure and separate from the route so it can
// be tested without a database, and so the shape the projector renders is
// stated in one place.

import { QUESTIONS, SURVEY_FIELDS, type SurveyField } from './survey.ts';

export type Tally = { value: string; label: string; count: number };

export type Pulse = {
  cohort: string;
  rosterTotal: number;
  registered: number;
  responded: number;
  questions: { id: SurveyField; prompt: string; multiple: boolean; tallies: Tally[] }[];
  goals: string[];
  updatedAt: string;
};

type Row = Partial<Record<SurveyField, string | null>> & { goal?: string | null; updatedAt?: string };

export function summarise(
  rows: Row[],
  meta: { cohort: string; rosterTotal: number; registered: number; now: string },
): Pulse {
  const questions = QUESTIONS.map((question) => {
    const counts = new Map(question.choices.map((choice) => [choice.value, 0]));
    for (const row of rows) {
      const stored = row[question.id];
      if (!stored) continue;
      // Multi-select is stored comma-joined, so each pick counts once and the
      // percentages are of respondents, not of picks.
      for (const value of question.multiple ? stored.split(',') : [stored]) {
        const current = counts.get(value);
        if (current !== undefined) counts.set(value, current + 1);
      }
    }
    return {
      id: question.id,
      prompt: question.prompt,
      multiple: question.multiple === true,
      tallies: question.choices.map((choice) => ({
        value: choice.value,
        label: choice.label,
        count: counts.get(choice.value) ?? 0,
      })),
    };
  });

  // Newest first: the room watches these arrive, and the interesting ones are
  // the ones that just landed. No names attached — this goes on a projector.
  const goals = rows
    .filter((row) => typeof row.goal === 'string' && row.goal.trim() !== '')
    .sort((a, b) => (b.updatedAt ?? '').localeCompare(a.updatedAt ?? ''))
    .map((row) => row.goal as string);

  return { cohort: meta.cohort, rosterTotal: meta.rosterTotal, registered: meta.registered, responded: rows.length, questions, goals, updatedAt: meta.now };
}

export { SURVEY_FIELDS };
