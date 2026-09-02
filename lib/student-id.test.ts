import assert from 'node:assert/strict';
import { test } from 'node:test';
import { normalizeStudentId, parseRoster, STUDENT_ID } from './student-id.ts';

// Real rosters are git-ignored student data, so this fixture stands in for the
// shape of one: CRLF endings and no trailing newline, as exported.
const ROSTER = ['5668G', '4605G', '5066G', '1057G'].join('\r\n');

void test('normalize accepts the four digits on their own and adds the trailing letter', () => {
  assert.equal(normalizeStudentId('5668'), '5668G');
  assert.equal(normalizeStudentId(' 5668 '), '5668G');
});

void test('normalize keeps a typed trailing letter and uppercases it', () => {
  assert.equal(normalizeStudentId('5668g'), '5668G');
  assert.equal(normalizeStudentId('5668-G'), '5668G');
});

void test('only four digits plus G is a valid student ID', () => {
  assert.ok(STUDENT_ID.test('5668G'));
  assert.ok(!STUDENT_ID.test('5668'), 'bare digits are not a stored ID');
  assert.ok(!STUDENT_ID.test('566G'), 'three digits is too short');
  assert.ok(!STUDENT_ID.test('56681G'), 'five digits is too long');
  assert.ok(!STUDENT_ID.test('5668D'), 'only the G suffix is used');
});

void test('a roster file parses to a lookup set', () => {
  const roster = parseRoster(ROSTER);
  assert.equal(roster.size, 4);
  assert.ok(roster.has('5668G'), 'first entry in the file');
  assert.ok(roster.has('1057G'), 'last entry, which has no trailing newline');
  assert.ok(!roster.has('9999G'), 'an ID nobody was issued');
});

void test('lowercase and padded roster lines are normalized', () => {
  assert.deepEqual([...parseRoster('  5668g  \n4605G\n')], ['5668G', '4605G']);
});

void test('a roster with a duplicate is rejected rather than silently deduplicated', () => {
  assert.throws(() => parseRoster('1234G\r\n5678G\r\n1234G\r\n'), /duplicate/i);
});

void test('a roster with a malformed entry is rejected', () => {
  assert.throws(() => parseRoster('1234G\n12X\n'), /12X/);
});
