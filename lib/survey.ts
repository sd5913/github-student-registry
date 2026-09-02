// The week-1 intake survey. One definition drives the form, the server-side
// validation and the CSV export, so they cannot drift apart.
//
// It is deliberately short: it runs after a student has already matched their
// ID, and registration has to stay a one-minute job. Every question is
// optional — a half-answered survey is still useful, and nothing here should
// ever stand between a student and being on the roster.

export type Choice = { value: string; label: string; hint?: string };
export type Question = {
  id: SurveyField;
  prompt: string;
  help?: string;
  choices: Choice[];
  multiple?: boolean;
};

export const SURVEY_FIELDS = [
  'experience',
  'terminal',
  'agentUse',
  'agentTools',
  'machine',
  'interest',
] as const;
export type SurveyField = (typeof SURVEY_FIELDS)[number];

export const GOAL_MAX = 280;

export const QUESTIONS: Question[] = [
  {
    id: 'experience',
    prompt: 'How much programming have you done before this course?',
    help: 'There is no wrong answer. This is how we pitch the tutorials.',
    choices: [
      { value: 'none', label: 'None at all' },
      {
        value: 'little',
        label: 'A little',
        hint: 'Followed tutorials, edited someone else’s code',
      },
      { value: 'built', label: 'I’ve built something that worked' },
      { value: 'regular', label: 'I code regularly' },
    ],
  },
  {
    id: 'terminal',
    prompt: 'How do you feel about the terminal?',
    help: 'The black window where you type commands.',
    choices: [
      { value: 'never', label: 'Never used one' },
      { value: 'copy', label: 'I can copy and paste commands' },
      {
        value: 'confident',
        label: 'I can find my way around and fix my own typos',
      },
    ],
  },
  {
    id: 'agentUse',
    prompt: 'Do you use an AI coding assistant?',
    choices: [
      { value: 'never', label: 'Never' },
      { value: 'tried', label: 'Tried it once or twice' },
      { value: 'weekly', label: 'Most weeks' },
      { value: 'daily', label: 'Every day' },
    ],
  },
  {
    id: 'agentTools',
    prompt: 'Which ones? Pick any.',
    choices: [
      { value: 'copilot', label: 'GitHub Copilot' },
      { value: 'chatgpt', label: 'ChatGPT' },
      { value: 'claude', label: 'Claude' },
      { value: 'gemini', label: 'Gemini' },
      { value: 'cursor', label: 'Cursor' },
      { value: 'other', label: 'Something else' },
    ],
    multiple: true,
  },
  {
    id: 'machine',
    prompt: 'What will you work on?',
    help: 'The lab PCs have good graphics cards; your own laptop lets you install things.',
    choices: [
      { value: 'mac', label: 'My own Mac' },
      { value: 'windows', label: 'My own Windows laptop' },
      { value: 'lab', label: 'The lab computers' },
      { value: 'both', label: 'Both, depending on the day' },
    ],
  },
  {
    id: 'interest',
    prompt: 'What would you most like to make this semester?',
    choices: [
      { value: 'game', label: 'A game' },
      { value: 'app', label: 'An app people can install' },
      { value: 'installation', label: 'An interactive installation' },
      { value: 'visual', label: 'Something visual, driven by data' },
      { value: 'unsure', label: 'No idea yet' },
    ],
  },
];

const BY_ID = new Map(QUESTIONS.map((question) => [question.id, question]));

/** Keeps unknown values out of D1 — the answers are used to group students, so
 *  a typo'd value would quietly skew the split. Returns null for anything the
 *  question does not offer. */
export function cleanAnswer(field: SurveyField, raw: unknown): string | null {
  const question = BY_ID.get(field);
  if (!question) return null;
  const allowed = new Set(question.choices.map((choice) => choice.value));

  if (question.multiple) {
    if (!Array.isArray(raw)) return null;
    const picked = raw.filter(
      (value): value is string =>
        typeof value === 'string' && allowed.has(value),
    );
    // Stored comma-joined in one column: it is only ever read back as a set,
    // and a join table for six checkboxes would be ceremony.
    return picked.length > 0 ? [...new Set(picked)].sort().join(',') : null;
  }

  return typeof raw === 'string' && allowed.has(raw) ? raw : null;
}

export function cleanGoal(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim().replace(/\s+/g, ' ');
  return trimmed ? trimmed.slice(0, GOAL_MAX) : null;
}
