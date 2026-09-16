// What the voting page and /api/vote both answer with: where this student is,
// and the next question for them. Shared so the first pair rendered on the
// server and the pair that replaces it after a vote are chosen the same way.
import { listMarkVotes, listVoterPairs } from './db';
import { choosePair, TOP_AFTER, TOP_SIZE, type VoteState } from './marks';
import { comparisonCounts, rankMarks } from './rank';

export async function voteState(db: D1Database, cohort: string, githubId: string): Promise<VoteState> {
  const [votes, seen] = await Promise.all([listMarkVotes(db, cohort), listVoterPairs(db, cohort, githubId)]);
  const chosen = choosePair(comparisonCounts(votes), seen);
  return {
    count: seen.size,
    // Served in a random left-right order: pairs are stored with the lower
    // mark first, and showing them that way would put every low number on the
    // left all afternoon.
    pair: chosen && (Math.random() < 0.5 ? chosen : [chosen[1], chosen[0]]),
    // The standing is a distraction while a student is still forming an
    // opinion, and it is nobody's business until they have contributed to it.
    top: seen.size >= TOP_AFTER ? rankMarks(votes).slice(0, TOP_SIZE).map((row) => row.mark) : [],
  };
}
