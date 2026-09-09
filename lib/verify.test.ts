import assert from 'node:assert/strict';
import { test } from 'node:test';
import { normalizeRepo, parseVerifyList, repoOwner } from './verify.ts';

void test('a repository URL is reduced to its canonical form', () => {
  assert.equal(normalizeRepo('https://github.com/alice/why-are-we-here'), 'https://github.com/alice/why-are-we-here');
  assert.equal(normalizeRepo('https://github.com/alice/why-are-we-here.git'), 'https://github.com/alice/why-are-we-here');
  assert.equal(normalizeRepo('https://github.com/alice/why-are-we-here/'), 'https://github.com/alice/why-are-we-here');
  assert.equal(normalizeRepo('https://github.com/alice/why-are-we-here/tree/main'), 'https://github.com/alice/why-are-we-here');
  assert.equal(normalizeRepo('github.com/alice/Essay.2026'), 'https://github.com/alice/Essay.2026');
});

void test('anything that is not a GitHub repository is refused', () => {
  assert.equal(normalizeRepo('https://gitlab.com/alice/repo'), null);
  assert.equal(normalizeRepo('https://github.com/alice'), null);
  assert.equal(normalizeRepo('alice'), null);
  assert.equal(normalizeRepo(''), null);
});

void test('the owner comes back lowercased', () => {
  assert.equal(repoOwner('https://github.com/Alice-B/repo'), 'alice-b');
});

void test('pasted lines become login and repository pairs', () => {
  const entries = parseVerifyList('alice https://github.com/alice/essay\nbob\n@carol\thttps://github.com/carol/why.git\n');
  assert.deepEqual(entries, [
    { login: 'alice', repo: 'https://github.com/alice/essay' },
    { login: 'bob', repo: null },
    { login: 'carol', repo: 'https://github.com/carol/why' },
  ]);
});

void test('a bare repository URL verifies its owner', () => {
  assert.deepEqual(parseVerifyList('https://github.com/dave/essay'), [{ login: 'dave', repo: 'https://github.com/dave/essay' }]);
});

void test('comments, blank lines, commas and duplicates are tolerated', () => {
  const entries = parseVerifyList('# from check_submissions\n\nalice, https://github.com/alice/essay\nALICE https://github.com/alice/other\n  bob  \n');
  assert.deepEqual(entries, [
    { login: 'alice', repo: 'https://github.com/alice/essay' },
    { login: 'bob', repo: null },
  ]);
});

void test('a duplicate supplies the repository the first line lacked', () => {
  assert.deepEqual(parseVerifyList('alice\nalice https://github.com/alice/essay'), [{ login: 'alice', repo: 'https://github.com/alice/essay' }]);
});

void test('lines with no usable login are skipped', () => {
  assert.deepEqual(parseVerifyList('-- --\n?? \n'), []);
});
