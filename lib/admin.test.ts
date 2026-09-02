import assert from 'node:assert/strict';
import { test } from 'node:test';
import { isAdminLogin, parseAdminLogins } from './admin.ts';

void test('logins are parsed from a comma-separated list', () => {
  assert.deepEqual([...parseAdminLogins('venetanji')], ['venetanji']);
  assert.deepEqual([...parseAdminLogins('venetanji,ta-one')], ['venetanji', 'ta-one']);
});

void test('surrounding whitespace and case are tolerated', () => {
  assert.deepEqual([...parseAdminLogins('  Venetanji , TA-One  ')], ['venetanji', 'ta-one']);
});

void test('empty entries are dropped rather than matching an empty login', () => {
  assert.deepEqual([...parseAdminLogins('venetanji,,')], ['venetanji']);
  assert.ok(!isAdminLogin('venetanji,,', ''), 'an empty login is never an admin');
});

void test('an unset or blank secret denies everyone', () => {
  assert.equal(parseAdminLogins(undefined).size, 0);
  assert.equal(parseAdminLogins('   ').size, 0);
  assert.ok(!isAdminLogin(undefined, 'venetanji'), 'no secret means no admins');
  assert.ok(!isAdminLogin('', 'venetanji'));
});

void test('a listed login matches regardless of case', () => {
  assert.ok(isAdminLogin('venetanji', 'venetanji'));
  assert.ok(isAdminLogin('venetanji', 'Venetanji'), 'GitHub logins are case-insensitive');
  assert.ok(isAdminLogin('venetanji,ta-one', 'ta-one'));
});

void test('an unlisted login is refused', () => {
  assert.ok(!isAdminLogin('venetanji', 'alice'));
  assert.ok(!isAdminLogin('venetanji', 'venetanji2'), 'no prefix or partial matching');
  assert.ok(!isAdminLogin('venetanji', 'venetanj'));
});
