// Turning "this one is better" into an order. Bradley–Terry gives every mark a
// strength p, and says the chance i beats j is p_i / (p_i + p_j); the strengths
// that best explain the votes are found by the MM iteration of Hunter (2004),
// p_i <- W_i / sum_j N_ij / (p_i + p_j).
//
// Unregularised, a mark that has never lost runs away to infinity and a mark
// that has never won collapses to zero — with a handful of votes each, that is
// most of them. So every mark also carries half a win and half a loss against a
// reference of strength 1: an opinion worth one comparison, which pulls a mark
// with no evidence towards the middle of the class and leaves a mark with
// plenty of evidence where the votes put it.
import { MARK_COUNT } from './marks.ts';

export type Comparison = { a: number; b: number; winner: number };

export type MarkStanding = {
  mark: number;
  /** Strength, normalised so the mean of every mark is 1. */
  score: number;
  wins: number;
  losses: number;
  comparisons: number;
};

/** Half a win and half a loss, i.e. one comparison, against the reference. */
const PRIOR = 0.5;
const REFERENCE = 1;
const MAX_ROUNDS = 500;
const TOLERANCE = 1e-12;

/**
 * Rank every mark from 1 to `markCount`, best first. Pure: the same votes
 * always give the same order, and a mark nobody has compared still comes back.
 */
export function rankMarks(votes: readonly Comparison[], markCount: number = MARK_COUNT): MarkStanding[] {
  const wins = new Map<number, number>();
  const losses = new Map<number, number>();
  // How many times each unordered pair met, held from both sides for the sum.
  const met = new Map<number, Map<number, number>>();
  const bump = (map: Map<number, number>, key: number) => map.set(key, (map.get(key) ?? 0) + 1);
  const inRange = (mark: number) => Number.isInteger(mark) && mark >= 1 && mark <= markCount;

  for (const vote of votes) {
    if (!inRange(vote.a) || !inRange(vote.b) || vote.a === vote.b) continue;
    if (vote.winner !== vote.a && vote.winner !== vote.b) continue;
    const loser = vote.winner === vote.a ? vote.b : vote.a;
    bump(wins, vote.winner);
    bump(losses, loser);
    for (const [one, other] of [[vote.a, vote.b], [vote.b, vote.a]]) {
      const row = met.get(one) ?? new Map<number, number>();
      row.set(other, (row.get(other) ?? 0) + 1);
      met.set(one, row);
    }
  }

  const strength = new Map<number, number>();
  for (let mark = 1; mark <= markCount; mark += 1) strength.set(mark, 1);

  for (let round = 0; round < MAX_ROUNDS; round += 1) {
    const next = new Map<number, number>();
    let moved = 0;
    for (let mark = 1; mark <= markCount; mark += 1) {
      const own = strength.get(mark) ?? 1;
      // The reference sits in the same sum as every real opponent: one
      // comparison at strength 1.
      let expected = 1 / (own + REFERENCE);
      for (const [other, times] of met.get(mark) ?? []) expected += times / (own + (strength.get(other) ?? 1));
      const updated = ((wins.get(mark) ?? 0) + PRIOR) / expected;
      next.set(mark, updated);
      moved = Math.max(moved, Math.abs(updated - own) / own);
    }
    for (const [mark, value] of next) strength.set(mark, value);
    if (moved < TOLERANCE) break;
  }

  // A strength is only meaningful next to the others, so report it against the
  // class: 1 is an average mark, 2 is twice as likely to beat one.
  let total = 0;
  for (const value of strength.values()) total += value;
  const mean = markCount > 0 ? total / markCount : 1;

  const standings: MarkStanding[] = [];
  for (let mark = 1; mark <= markCount; mark += 1) {
    const won = wins.get(mark) ?? 0;
    const lost = losses.get(mark) ?? 0;
    standings.push({ mark, score: (strength.get(mark) ?? 1) / mean, wins: won, losses: lost, comparisons: won + lost });
  }
  return standings.sort((left, right) => right.score - left.score || left.mark - right.mark);
}

/** How many comparisons each mark has been in, for choosing the next pair. */
export function comparisonCounts(votes: readonly Comparison[]): Map<number, number> {
  const counts = new Map<number, number>();
  for (const vote of votes) {
    counts.set(vote.a, (counts.get(vote.a) ?? 0) + 1);
    counts.set(vote.b, (counts.get(vote.b) ?? 0) + 1);
  }
  return counts;
}
