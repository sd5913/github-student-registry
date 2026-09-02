import assert from 'node:assert/strict';
import { test } from 'node:test';
import { cleanAnswer, cleanGoal, GOAL_MAX, QUESTIONS } from './survey.ts';

test('accepts a value the question offers', () => {
  assert.equal(cleanAnswer('experience', 'little'), 'little');
  assert.equal(cleanAnswer('terminal', 'confident'), 'confident');
});

test('rejects anything the question does not offer', () => {
  // These answers group students, so a value that is not a real choice would
  // quietly skew the split rather than fail loudly.
  assert.equal(cleanAnswer('experience', 'expert'), null);
  assert.equal(cleanAnswer('experience', ''), null);
  assert.equal(cleanAnswer('experience', 42), null);
  assert.equal(cleanAnswer('experience', ['little']), null);
  assert.equal(cleanAnswer('nonsense' as never, 'little'), null);
});

test('multi-select stores a sorted, de-duplicated, filtered list', () => {
  assert.equal(
    cleanAnswer('agentTools', ['copilot', 'claude']),
    'claude,copilot',
  );
  assert.equal(cleanAnswer('agentTools', ['claude', 'claude']), 'claude');
  assert.equal(cleanAnswer('agentTools', ['claude', 'not-a-tool']), 'claude');
  assert.equal(cleanAnswer('agentTools', ['not-a-tool']), null);
  assert.equal(cleanAnswer('agentTools', []), null);
  assert.equal(cleanAnswer('agentTools', 'copilot'), null);
});

test('single-select refuses an array, multi-select refuses a bare string', () => {
  assert.equal(cleanAnswer('machine', ['mac']), null);
  assert.equal(cleanAnswer('agentTools', 'mac'), null);
});

test('goal is trimmed, collapsed and capped', () => {
  assert.equal(cleanGoal('  ship  my   game  '), 'ship my game');
  assert.equal(cleanGoal('\n\tmake things\n'), 'make things');
  assert.equal(cleanGoal('   '), null);
  assert.equal(cleanGoal(undefined), null);
  assert.equal(cleanGoal(123), null);
  assert.equal(cleanGoal('x'.repeat(GOAL_MAX + 50))?.length, GOAL_MAX);
});

test('every question has unique choice values', () => {
  for (const question of QUESTIONS) {
    const values = question.choices.map((choice) => choice.value);
    assert.equal(
      new Set(values).size,
      values.length,
      `${question.id} has duplicate values`,
    );
  }
});
