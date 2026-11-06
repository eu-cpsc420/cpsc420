import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const lectures = defineCollection({
  // Files starting with "_" are ignored (handy for scratch decks).
  loader: glob({ pattern: '**/[^_]*.md', base: './src/content/lectures' }),
  schema: z.object({
    title: z.string(),
    subtitle: z.string().optional(),
    /** Lecture number shown in listings and on the title bar. */
    number: z.number().optional(),
    date: z.coerce.date().optional(),
    /** One-line summary for the lecture list. */
    description: z.string().optional(),
    /** Optional grouping on the home page, e.g. "Unit 1: Foundations". */
    unit: z.string().optional(),
    /** Drafts show up in `npm run dev` but are left out of the built site. */
    draft: z.boolean().default(false),
    /** Slide colour scheme, independent of the site's light/dark mode. */
    theme: z.enum(['light', 'dark']).default('light'),
    aspect: z.enum(['16:9', '4:3']).default('16:9'),
  }),
});

export const collections = { lectures };
