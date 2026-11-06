import { getCollection, type CollectionEntry } from 'astro:content';

export type Lecture = CollectionEntry<'lectures'>;

/** All lectures, in order. Drafts are included only in `astro dev`. */
export async function getLectures(): Promise<Lecture[]> {
  const all = await getCollection('lectures', ({ data }) => import.meta.env.DEV || !data.draft);
  return all.sort((a, b) => {
    const an = a.data.number ?? Number.MAX_SAFE_INTEGER;
    const bn = b.data.number ?? Number.MAX_SAFE_INTEGER;
    if (an !== bn) return an - bn;
    return a.id.localeCompare(b.id);
  });
}

export function formatDate(d?: Date): string {
  if (!d) return '';
  // Dates in frontmatter are parsed as UTC midnight; format in UTC so they don't shift a day.
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
}

export function lectureLabel(l: Lecture): string {
  return l.data.number !== undefined ? `Lecture ${l.data.number}` : 'Lecture';
}
