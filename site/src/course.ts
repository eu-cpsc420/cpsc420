// Course-wide settings used by every page. Edit these first.
export const course = {
  code: 'CPSC 420',
  title: 'Course Title',
  term: 'Term YYYY',
  instructor: 'Instructor Name',
  /** Short text on the home page. Markdown is not processed here. */
  blurb: 'Lecture slides and notes. Open any lecture to read it, or press P to present.',
  /** Extra links shown in the site header (syllabus, LMS, repo, ...). */
  links: [] as { label: string; href: string }[],
};
