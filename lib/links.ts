// The course, from one page. Shown on the home page once a registration is
// verified, so the only students who see the invitation and the repos are the
// ones whose GitHub account has been proven by handing something in from it.
export const COURSE_LINKS = [
  { label: 'Accept the organisation invitation', href: 'https://github.com/orgs/sd5913/invitation', note: 'It arrives by email after verification and expires after seven days.' },
  { label: 'Course repository', href: 'https://github.com/sd5913/pfad', note: 'Tutorials and assignment briefs. Clone it, pull it every week.' },
  { label: 'Slides', href: 'https://sd5913.github.io/teaching/', note: 'Every week, with the drills you can run in the browser.' },
  { label: 'Lab machine setup', href: 'https://github.com/ait4x/v915-setup', note: 'One file to download and double-click on a V915 machine or your own laptop.' },
] as const;
