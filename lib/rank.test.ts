import assert from 'node:assert/strict';
import { test } from 'node:test';
import { comparisonCounts, rankMarks } from './rank.ts';

const chain = [
  { a: 1, b: 2, winner: 1 },
  { a: 1, b: 2, winner: 1 },
  { a: 1, b: 2, winner: 1 },
  { a: 2, b: 3, winner: 2 },
  { a: 2, b: 3, winner: 2 },
  { a: 2, b: 3, winner: 2 },
  { a: 3, b: 4, winner: 3 },
  { a: 3, b: 4, winner: 3 },
  { a: 3, b: 4, winner: 3 },
];

void test('a transitive chain ranks in order', () => {
  const standings = rankMarks(chain, 4);
  assert.deepEqual(standings.map((row) => row.mark), [1, 2, 3, 4]);
  // Strictly decreasing, not merely sorted: 2 and 3 have the same record and
  // are told apart by who they beat.
  for (let i = 1; i < standings.length; i += 1) assert.ok(standings[i - 1].score > standings[i].score);
  assert.deepEqual(standings.find((row) => row.mark === 2), { mark: 2, score: standings[1].score, wins: 3, losses: 3, comparisons: 6 });
});

void test('a symmetric two-mark tie gives equal scores', () => {
  const standings = rankMarks([{ a: 1, b: 2, winner: 1 }, { a: 1, b: 2, winner: 2 }], 2);
  assert.equal(standings[0].score, standings[1].score);
  assert.equal(standings[0].score, 1);
  assert.deepEqual(standings.map((row) => row.comparisons), [2, 2]);
});

void test('no votes at all: every mark comes back at the mean, with nothing behind it', () => {
  const standings = rankMarks([], 5);
  assert.deepEqual(standings, [1, 2, 3, 4, 5].map((mark) => ({ mark, score: 1, wins: 0, losses: 0, comparisons: 0 })));
});

void test('a mark nobody has been shown is still ranked', () => {
  const standings = rankMarks([{ a: 1, b: 2, winner: 1 }], 4);
  const unseen = standings.filter((row) => row.comparisons === 0);
  assert.deepEqual(unseen.map((row) => row.mark), [3, 4]);
  // It sits between the mark that won and the mark that lost.
  const [top] = standings;
  const bottom = standings[standings.length - 1];
  assert.equal(top.mark, 1);
  assert.equal(bottom.mark, 2);
  for (const row of unseen) assert.ok(row.score < top.score && row.score > bottom.score);
});

void test('a vote that names a mark twice, or a winner in neither place, is not counted', () => {
  assert.deepEqual(rankMarks([{ a: 1, b: 1, winner: 1 }, { a: 1, b: 2, winner: 3 }], 3).map((row) => row.comparisons), [0, 0, 0]);
});

void test('comparison counts add up both sides of every pair', () => {
  assert.deepEqual([...comparisonCounts(chain).entries()].sort((left, right) => left[0] - right[0]), [[1, 3], [2, 6], [3, 6], [4, 3]]);
});
