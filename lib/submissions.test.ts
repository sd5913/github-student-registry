import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseSubmissionList, submissionStatus } from './submissions.ts';

void test('student id and url are read from a pasted line in either order', () => {
  assert.deepEqual(parseSubmissionList('5066G https://github.com/alice/essay\nhttps://github.com/bob/why.git, 26117968G'), [
    { studentId: '5066G', url: 'https://github.com/alice/essay', owner: 'alice' },
    { studentId: '7968G', url: 'https://github.com/bob/why', owner: 'bob' },
  ]);
});

void test('four bare digits get the trailing letter', () => {
  assert.deepEqual(parseSubmissionList('8888\thttps://github.com/gio-polyu/test'), [{ studentId: '8888G', url: 'https://github.com/gio-polyu/test', owner: 'gio-polyu' }]);
});

void test('a non-repository url is kept but has no owner', () => {
  assert.deepEqual(parseSubmissionList('5066G https://github.com/alice'), [{ studentId: '5066G', url: 'https://github.com/alice', owner: null }]);
});

void test('lines missing a part, comments and blanks are skipped; later lines win', () => {
  assert.deepEqual(parseSubmissionList('# header\n\n5066G\nhttps://github.com/x/y\n5066G https://github.com/a/one\n5066G https://github.com/a/two'), [
    { studentId: '5066G', url: 'https://github.com/a/two', owner: 'a' },
  ]);
});

void test('status: match, mismatch, unregistered, invalid', () => {
  const none = () => null;
  assert.equal(submissionStatus({ owner: 'Alice', studentId: '5066G' }, 'alice', none).kind, 'match');
  assert.deepEqual(submissionStatus({ owner: 'bob', studentId: '5066G' }, 'alice', none), { kind: 'mismatch', owner: 'bob', registered: 'alice' });
  assert.deepEqual(submissionStatus({ owner: 'bob', studentId: '5066G' }, null, none), { kind: 'unregistered', owner: 'bob' });
  assert.deepEqual(submissionStatus({ owner: 'bob', studentId: '5066G' }, null, (l) => (l === 'bob' ? '7968G' : null)), { kind: 'mismatch', owner: 'bob', registered: '' });
  assert.equal(submissionStatus({ owner: null, studentId: '5066G' }, 'alice', none).kind, 'invalid');
});
