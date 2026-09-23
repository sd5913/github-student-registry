// The course, from one page. Public: a student who has not registered yet
// still needs to find the slides and the repository.

// ── Bump this on the morning of each lecture. It is the only place the home
//    page's "this week" comes from: the week number, its title, the day it is
//    taught, and the direct link to that week's slides. ──
export const CURRENT_WEEK = { n: 4, title: 'Interfaces', date: 'Thu 24 Sep', href: 'https://sd5913.github.io/teaching/week04/' } as const;

/** Every week, for when this week is not the one being looked for. */
export const ALL_WEEKS = 'https://sd5913.github.io/teaching/';

export type CourseLink = {
  label: string;
  href: string;
  note: string;
  /** A second line under the note, for what to do about the link. */
  aside?: string;
  /** A page of this site: navigated in place, not opened in a new tab. */
  internal?: boolean;
};

// This week's slides are not in here — they lead the band on their own card,
// above these. The repository comes first of the rest: it is the other thing
// worth a bookmark.
export const COURSE_LINKS: readonly CourseLink[] = [
  { label: 'Course repository', href: 'https://github.com/sd5913/pfad', note: 'Tutorials and assignment briefs. Clone it, pull it every week.' },
  {
    label: 'Next week’s slides, as they are written',
    href: 'https://github.com/sd5913/teaching/pulls',
    note: 'Next week opens as a draft pull request and fills up over the week. Say in its comments what you want more of.',
    aside: 'Press Watch on sd5913/teaching and GitHub tells you when it moves — it notifies on pull requests and comments, not on every push.',
  },
  { label: 'Vote on the mark', href: '/vote', note: 'Fifty-six marks from week 2. Two at a time, pick the better one.', internal: true },
  { label: 'The sd5913 organisation', href: 'https://github.com/sd5913', note: 'Group project repos live here later. Accept the invitation when it arrives by email.' },
  { label: 'Lab machine setup', href: 'https://github.com/ait4x/v915-setup', note: 'One file to download and double-click, on a V915 machine or your own laptop.' },
];

// Assignments the dashboard reports on. Submission is on Canvas; this page
// only shows whether what Canvas received points at the registered account.
export const ASSIGNMENTS = [
  { id: '1', title: 'Why are we here?', due: 'Sun 13 Sep, 23:59', brief: 'https://github.com/sd5913/pfad/blob/2026/assignments/01-why-are-we-here.md' },
  { id: '2', title: 'Data visualisation', due: 'Sun 4 Oct, 23:59', brief: 'https://github.com/sd5913/pfad/blob/2026/assignments/02-data-visualisation.md' },
] as const;
