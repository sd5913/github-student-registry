import assert from 'node:assert/strict';
import { test } from 'node:test';
import { summarise } from './survey-summary.ts';

const META = { cohort: '2026', rosterTotal: 112, registered: 3, now: '2026-09-03T01:00:00Z' };

void test('counts single-select answers and leaves unpicked choices at zero', () => {
  const pulse = summarise([{ experience: 'none' }, { experience: 'none' }, { experience: 'regular' }], META);
  const question = pulse.questions.find((q) => q.id === 'experience');
  assert.equal(question?.tallies.find((t) => t.value === 'none')?.count, 2);
  assert.equal(question?.tallies.find((t) => t.value === 'regular')?.count, 1);
  assert.equal(question?.tallies.find((t) => t.value === 'built')?.count, 0);
  assert.equal(pulse.responded, 3);
});

void test('multi-select counts each pick once per respondent', () => {
  const pulse = summarise([{ agentTools: 'claude,copilot' }, { agentTools: 'claude' }], META);
  const question = pulse.questions.find((q) => q.id === 'agentTools');
  assert.equal(question?.multiple, true);
  assert.equal(question?.tallies.find((t) => t.value === 'claude')?.count, 2);
  assert.equal(question?.tallies.find((t) => t.value === 'copilot')?.count, 1);
});

void test('ignores stored values that are not real choices', () => {
  const pulse = summarise([{ experience: 'wizard' }, { agentTools: 'claude,nonsense' }], META);
  const experience = pulse.questions.find((q) => q.id === 'experience');
  assert.equal(experience?.tallies.reduce((sum, t) => sum + t.count, 0), 0);
  const tools = pulse.questions.find((q) => q.id === 'agentTools');
  assert.equal(tools?.tallies.reduce((sum, t) => sum + t.count, 0), 1);
});

void test('goals come back newest first, skipping blanks', () => {
  const pulse = summarise([
    { goal: 'older', updatedAt: '2026-09-01T00:00:00Z' },
    { goal: '   ', updatedAt: '2026-09-02T00:00:00Z' },
    { goal: 'newest', updatedAt: '2026-09-03T00:00:00Z' },
    { goal: null, updatedAt: '2026-09-04T00:00:00Z' },
  ], META);
  assert.deepEqual(pulse.goals, ['newest', 'older']);
});

void test('an empty room summarises without dividing by zero', () => {
  const pulse = summarise([], META);
  assert.equal(pulse.responded, 0);
  assert.deepEqual(pulse.goals, []);
  assert.equal(pulse.questions.every((q) => q.tallies.every((t) => t.count === 0)), true);
});
