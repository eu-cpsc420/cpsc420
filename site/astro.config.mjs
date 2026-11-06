// @ts-check
import { defineConfig } from 'astro/config';
import lectureSlides from '@eu-cpsc/lecture-slides';

// GitHub Pages serves a project site at https://<owner>.github.io/<repo>/.
// The Pages workflow sets SITE_URL / BASE_PATH; these defaults are for local builds.
export default defineConfig({
  site: process.env.SITE_URL ?? 'https://eu-cpsc420.github.io',
  base: process.env.BASE_PATH ?? '/cpsc420',
  trailingSlash: 'always',
  integrations: [
    lectureSlides({
      course: {
        code: 'CPSC 420',
        title: 'Course Title',
        term: 'Term YYYY',
        instructor: 'Instructor Name',
        blurb: 'Lecture slides and notes. Open any lecture to read it, or press P to present.',
        links: [],
      },
      brand: 'evangel',
      // Official EU logo files go in public/ (get them from University Marketing):
      // logo: 'logo.svg',            // maroon, for light backgrounds
      // logoOnDark: 'logo-white.svg', // white, for title slides and dark mode
      favicon: 'favicon.svg',
    }),
  ],
});
