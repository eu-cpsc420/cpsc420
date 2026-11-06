# CPSC 420 lecture site

Slides and notes for CPSC 420, built with [Astro](https://astro.build) as a
static site. Each lecture is **one Markdown file** that gives you:

- a **reading view**: scroll through slides with notes, in three layouts
  (stacked, side by side, grid);
- a **presentation**: press <kbd>P</kbd> to present from the slide in view
  and <kbd>Esc</kbd> to return to the same spot;
- a **presenter view**: press <kbd>S</kbd> for a second window with the
  current and next slide, notes, speaker notes and a timer. All windows of a
  lecture stay in sync, so the projector window can be full screen while you
  drive from the laptop;
- a **handout**: print the page (or save as PDF) for slides next to notes.

Everything is rendered at build time (code highlighting, math), so the site
works offline and loads fast on classroom Wi-Fi.

## Running locally

Requires Node 22+.

```bash
cd site
npm install
npm run dev        # http://localhost:4321/cpsc420/  (drafts are visible)
npm run build      # static site in site/dist/
npm run preview    # serve the built site
```

## Adding a lecture

1. Copy `templates/lecture.md` to `src/content/lectures/NN-short-name.md`.
2. Edit the frontmatter (title, number, date, description).
3. Write slides. Leave `draft: true` until it should be public.

Course-wide settings (course title, term, instructor, header links) are in
`src/course.ts`. The demo lecture `00-using-these-slides.md` shows every
feature; delete it or set `draft: true` when you no longer need it.

## Authoring format

```md
## Slide title            <- first heading = title in the slide list

- Regular Markdown: lists, **bold**, `code`, links, tables, images
- Math: $O(n \log n)$ inline, $$...$$ for display

:::notes
Student-facing notes. Shown below/beside the slide when reading,
and in the presenter view.
:::

:::speaker
Notes only you see (presenter view, or press N while reading).
:::

---                       <- a line with only --- starts the next slide
```

| You write | You get |
|---|---|
| `---` | New slide |
| `:::notes` … `:::` | Notes for the slide |
| `:::speaker` … `:::` | Presenter-only notes |
| a `---` section containing only `:::notes` | Notes-only section: in the reading view, skipped when presenting |
| `::slide{.title}` (first line of slide) | Slide layout: `title`, `section`, `center`, `statement`, `dense`, `xdense`, `big-text`, `image`, `no-footer` (combine freely) |
| `:::steps` … `:::` | Items appear one at a time while presenting |
| `:::callout{.step}` | Any block can be a single step |
| `::::columns` + `:::column` … | Columns: each block inside is one column (`.wide-left`, `.wide-right`, `.middle`) |
| `:::callout[Label]` | Callout box (`:::callout[Label]{.warn}` for a yellow one; label goes before `{…}`) |
| `:::fill` | Fill remaining space (good for a diagram) |
| `:kbd[Ctrl]`, `:mark[text]` | Key cap, highlight |

Nested blocks need **more colons on the outside** (`::::columns` around
`:::column`). Any other `:::name` becomes `<div class="name">`, so a new
building block is just CSS in `src/styles/slides.css`.

Put images in `src/content/lectures/images/` and reference them relatively:
`![alt text](./images/diagram.svg)`.

## How it fits together

| File | Purpose |
|---|---|
| `src/plugins/remark-slides.mjs` | Splits a lecture's Markdown at `---` into slide + notes sections |
| `src/pages/lectures/[...slug].astro` | Lecture page: toolbar, slide list, deck, presenter view |
| `src/scripts/deck.ts` | Presenting, steps, scroll tracking, presenter-window sync, shortcuts |
| `src/styles/tokens.css` | Colours and fonts (change `--accent` / `--slide-accent` to re-brand) |
| `src/styles/slides.css` | Slide theme and building blocks |
| `src/styles/site.css` | Site chrome and reading layouts |
| `src/styles/print.css` | Handout printing |

Slides are sized with container query units, so a slide looks the same as a
thumbnail, in the reading column and full screen. Text sizes inside slides
are in `em`.

## Deploying

`.github/workflows/pages.yml` (at the repository root) builds `site/` and
deploys it to GitHub Pages on every push to `main` that touches `site/`.
One-time setup: **Settings → Pages → Build and deployment → Source: GitHub
Actions**. The site is then at <https://eu-cpsc420.github.io/cpsc420/>. The
workflow picks up the right base path automatically, including for a custom
domain.
