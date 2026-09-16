// The course, from one page. Public: a student who has not registered yet
// still needs to find the slides and the repository.
export type CourseLink = {
  label: string;
  href: string;
  note: string;
  /** A page of this site: navigated in place, not opened in a new tab. */
  internal?: boolean;
};

export const COURSE_LINKS: readonly CourseLink[] = [
  { label: 'Vote on the mark', href: '/vote', note: 'Fifty-six marks from week 2. Two at a time, pick the better one.', internal: true },
  { label: 'Slides', href: 'https://sd5913.github.io/teaching/', note: 'Every week, with the drills you can run in the browser.' },
  { label: 'Course repository', href: 'https://github.com/sd5913/pfad', note: 'Tutorials and assignment briefs. Clone it, pull it every week.' },
  { label: 'The sd5913 organisation', href: 'https://github.com/sd5913', note: 'Group project repos live here later. Accept the invitation when it arrives by email.' },
  { label: 'Lab machine setup', href: 'https://github.com/ait4x/v915-setup', note: 'One file to download and double-click, on a V915 machine or your own laptop.' },
];

// Assignments the dashboard reports on. Submission is on Canvas; this page
// only shows whether what Canvas received points at the registered account.
export const ASSIGNMENTS = [
  { id: '1', title: 'Why are we here?', due: 'Sun 13 Sep, 23:59', brief: 'https://github.com/sd5913/pfad/blob/2026/assignments/01-why-are-we-here.md' },
  { id: '2', title: 'Data visualisation', due: 'Sun 4 Oct, 23:59', brief: 'https://github.com/sd5913/pfad/blob/2026/assignments/02-data-visualisation.md' },
] as const;
