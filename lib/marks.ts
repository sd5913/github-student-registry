// The week-2 marks: 56 drawings, `public/marks/01.jpg` … `public/marks/56.jpg`.
// A mark is only ever a number here — the file names carry no author, and
// neither does a vote.
export const MARK_COUNT = 56;

/** Votes a student casts before the class standing is worth showing them. */
export const TOP_AFTER = 15;

/** How many marks the standing shows. */
export const TOP_SIZE = 8;

/** What the voting page needs to draw itself, from the server or from /api/vote. */
export type VoteState = {
  /** Pairs this student has judged. */
  count: number;
  /** The pair to show now, in the order to show it, or null if they judged them all. */
  pair: [number, number] | null;
  /** The class standing, once this student has voted enough to be shown it. */
  top: number[];
};

export function markSrc(mark: number): string {
  return `/marks/${String(mark).padStart(2, '0')}.jpg`;
}

export function isMark(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= MARK_COUNT;
}

/** Pairs are stored with the lower number first, so a pair has one identity. */
export function pairKey(a: number, b: number): string {
  return a < b ? `${a}:${b}` : `${b}:${a}`;
}

/**
 * Two distinct marks for this voter to compare. The marks the class has
 * compared least come first — with ties broken at random, which early on is
 * every mark — and any pair this voter has already judged is skipped. Returns
 * null only if they have judged every possible pair.
 */
export function choosePair(
  comparisons: ReadonlyMap<number, number>,
  seen: ReadonlySet<string>,
  random: () => number = Math.random,
  markCount: number = MARK_COUNT,
): [number, number] | null {
  const marks = Array.from({ length: markCount }, (_, index) => index + 1);
  for (let i = marks.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [marks[i], marks[j]] = [marks[j], marks[i]];
  }
  // Stable, so the shuffle above is what separates marks of equal standing.
  marks.sort((left, right) => (comparisons.get(left) ?? 0) - (comparisons.get(right) ?? 0));

  for (let i = 0; i < marks.length; i += 1) {
    for (let j = i + 1; j < marks.length; j += 1) {
      const [a, b] = marks[i] < marks[j] ? [marks[i], marks[j]] : [marks[j], marks[i]];
      if (!seen.has(pairKey(a, b))) return [a, b];
    }
  }
  return null;
}
