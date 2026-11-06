/**
 * remark-slides: turns a lecture Markdown file into a sequence of
 * slide + notes "units".
 *
 * Authoring format (see README.md for the full guide):
 *
 *   # Slide content            <- everything up to the next `---` is one unit
 *
 *   :::notes                   <- student-facing notes (reading view + presenter view)
 *   Prose shown under/beside the slide.
 *   :::
 *
 *   :::speaker                 <- presenter-only reminders (presenter view only)
 *   Remember to ask about X.
 *   :::
 *
 *   ---                        <- next unit
 *
 *   ::slide{.section}          <- per-slide options (classes, data-*)
 *
 * A unit whose only content is `:::notes` becomes a notes-only section:
 * it appears in the reading view but is skipped while presenting.
 *
 * Any other container directive `:::name` becomes `<div class="name">`,
 * so `:::columns` / `:::column`, `:::steps`, `:::callout`, `:::center`, ...
 * are just CSS classes (styled in src/styles/slides.css).
 *
 * Only active for files under src/content/lectures/ (unless frontmatter
 * sets `slides: false`). Exposes `slides` (titles) on the remark frontmatter.
 */
import { visit, SKIP } from 'unist-util-visit';

const NOTE_KINDS = new Set(['notes', 'speaker']);
const TEXT_DIRECTIVES = { kbd: 'kbd', mark: 'mark', small: 'small' };

function attrsToProps(attributes = {}) {
  const props = {};
  for (const [key, value] of Object.entries(attributes)) {
    if (key === 'class') props.className = String(value).split(/\s+/).filter(Boolean);
    else props[key] = value;
  }
  return props;
}

function el(tagName, props, children) {
  return { type: 'mdBlock', data: { hName: tagName, hProperties: props }, children };
}

function toText(node) {
  if (!node) return '';
  if (node.type === 'text' || node.type === 'inlineCode') return node.value;
  if (node.type === 'inlineMath') return node.value;
  return (node.children ?? []).map(toText).join('');
}

/** Turn directives that aren't slide structure into plain HTML elements. */
function lowerDirectives(tree) {
  visit(tree, (node, index, parent) => {
    if (node.type === 'textDirective') {
      const tag = TEXT_DIRECTIVES[node.name];
      if (tag) {
        node.data = { hName: tag, hProperties: attrsToProps(node.attributes) };
        return;
      }
      // Not one of ours (e.g. "ratio 3:1" or "see:here"): restore the literal text.
      const label = node.children?.length ? node.children : [];
      const replacement = [{ type: 'text', value: ':' + node.name }];
      if (label.length) replacement.push({ type: 'text', value: '[' }, ...label, { type: 'text', value: ']' });
      parent.children.splice(index, 1, ...replacement);
      return [SKIP, index + replacement.length];
    }
    if (node.type === 'containerDirective' || node.type === 'leafDirective') {
      if (node.type === 'containerDirective' && NOTE_KINDS.has(node.name)) return; // handled in split
      if (node.type === 'leafDirective' && node.name === 'slide') return; // handled in split
      const props = attrsToProps(node.attributes);
      props.className = [node.name, ...(props.className ?? [])];
      // `:::callout[Heads up]` -> label becomes a title element
      const labelIdx = node.children?.findIndex((c) => c.data?.directiveLabel);
      if (labelIdx !== undefined && labelIdx >= 0) {
        const label = node.children[labelIdx];
        node.children[labelIdx] = el('div', { className: ['directive-label'] }, label.children);
      }
      node.data = { hName: 'div', hProperties: props };
    }
  });
}

export default function remarkSlides() {
  return (tree, file) => {
    const path = (file.path ?? file.history?.[0] ?? '').replace(/\\/g, '/');
    const frontmatter = (file.data.astro ??= {}).frontmatter ??= {};
    if (!path.includes('/content/lectures/') || frontmatter.slides === false) {
      lowerDirectives(tree);
      return;
    }

    lowerDirectives(tree);

    // Split top-level nodes into groups at `---`.
    const groups = [[]];
    for (const node of tree.children) {
      if (node.type === 'thematicBreak') groups.push([]);
      else groups[groups.length - 1].push(node);
    }

    const units = [];
    const slides = [];
    let slideNumber = 0;

    groups.forEach((group) => {
      const slideNodes = [];
      const notes = [];
      const speaker = [];
      let slideProps = {};

      for (const node of group) {
        if (node.type === 'containerDirective' && node.name === 'notes') notes.push(...node.children);
        else if (node.type === 'containerDirective' && node.name === 'speaker') speaker.push(...node.children);
        else if (node.type === 'leafDirective' && node.name === 'slide') slideProps = attrsToProps(node.attributes);
        else slideNodes.push(node);
      }

      const meaningful = slideNodes.filter((n) => !(n.type === 'html' && /^\s*<!--[\s\S]*-->\s*$/.test(n.value)));
      if (meaningful.length === 0 && notes.length === 0 && speaker.length === 0) return;

      const children = [];
      const unitIndex = units.length;

      if (meaningful.length > 0) {
        slideNumber += 1;
        const heading = slideNodes.find((n) => n.type === 'heading');
        let title = heading ? toText(heading).trim() : '';
        if (!title) {
          const firstText = meaningful.map(toText).find((t) => t.trim()) ?? '';
          const clean = firstText.replace(/\s+/g, ' ').trim();
          title = clean ? (clean.length > 48 ? clean.slice(0, 46).trimEnd() + '…' : clean) : `Slide ${slideNumber}`;
        }
        slides.push({ n: slideNumber, title, unit: unitIndex, level: heading?.depth ?? 2 });

        const className = ['slide', ...(slideProps.className ?? [])];
        const { className: _ignored, ...rest } = slideProps;
        children.push(
          el('div', { className: ['slide-frame'] }, [
            el('div', { ...rest, className, dataN: String(slideNumber), dataTitle: title }, [
              el('div', { className: ['slide-body'] }, slideNodes),
            ]),
          ]),
        );
      }

      if (notes.length) children.push(el('div', { className: ['notes'] }, notes));
      if (speaker.length) {
        children.push(
          el('aside', { className: ['speaker-notes'] }, [
            el('div', { className: ['speaker-label'] }, [{ type: 'text', value: 'Speaker notes' }]),
            ...speaker,
          ]),
        );
      }

      const unitClasses = ['unit', meaningful.length ? 'has-slide' : 'notes-only', notes.length ? 'has-notes' : 'no-notes'];
      const id = meaningful.length ? `s${slideNumber}` : `n${unitIndex}`;
      units.push(el('section', { className: unitClasses, id }, children));
    });

    tree.children = units;
    frontmatter.slides = slides;
  };
}
