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

  /**
   * Visual theme: a file in src/styles/themes/ (without .css), or 'default'.
   * The theme sets colours and fonts for both the site and the slides.
   */
  brand: 'evangel' as 'evangel' | 'default',
  /**
   * Optional logo files in public/, e.g. 'logo.svg'. Use official files from
   * University Marketing. `logo` is shown on light backgrounds (site header);
   * `logoOnDark` (white version) on title slides and the dark-mode header.
   */
  logo: undefined as string | undefined,
  logoOnDark: undefined as string | undefined,
};
