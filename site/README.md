# CPSC 420 lecture site

Slides and notes for CPSC 420, built with
[`@eu-cpsc/lecture-slides`](https://github.com/eu-cpsc/lecture-slides)
(see its README for the authoring format, options and themes).

Each lecture is one Markdown file in `src/content/lectures/`. On the site you
can read slides with notes, press <kbd>P</kbd> to present, <kbd>S</kbd> for
the presenter view, or print the page for a handout.

## Running locally

Requires Node 22+.

```bash
cd site
npm install
npm run dev        # http://localhost:4321/cpsc420/  (drafts are visible)
npm run build      # static site in site/dist/
```

## Adding a lecture

1. Copy the [lecture template](https://github.com/eu-cpsc/lecture-slides/blob/main/templates/lecture.md)
   to `src/content/lectures/NN-short-name.md`.
2. Edit the frontmatter (title, number, date, description).
3. Write slides. Leave `draft: true` until it should be public.

`00-using-these-slides.md` is a demo of every feature; delete it or set
`draft: true` when you no longer need it.

## Files

| File | Purpose |
|---|---|
| `astro.config.mjs` | Course details, theme, logo, base path |
| `src/content.config.ts` | Registers the lectures collection (no changes needed) |
| `src/content/lectures/` | Lectures and their images |
| `public/` | Favicon and other static files |

**Logo:** the EU shield comes with the package's Evangel theme. To use
different files, put them in `public/` and set `logo` / `logoOnDark` in
`astro.config.mjs`.

## Updating the slide system

The package comes from npm. To update to the newest release:

```bash
cd site
npm install @eu-cpsc/lecture-slides@latest
```

## Deploying

`.github/workflows/pages.yml` (repo root) deploys to
<https://eu-cpsc420.github.io/cpsc420/> on every push to `main` that touches
`site/`.
