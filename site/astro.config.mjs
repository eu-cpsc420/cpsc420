// @ts-check
import { defineConfig } from 'astro/config';
import remarkDirective from 'remark-directive';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import remarkSlides from './src/plugins/remark-slides.mjs';

// GitHub Pages serves a project site at https://<owner>.github.io/<repo>/.
// SITE_URL / BASE_PATH can be overridden (e.g. for a custom domain, BASE_PATH=/).
const site = process.env.SITE_URL ?? 'https://eu-cpsc420.github.io';
const base = process.env.BASE_PATH ?? '/cpsc420';

export default defineConfig({
  site,
  base,
  trailingSlash: 'always',
  markdown: {
    remarkPlugins: [remarkDirective, remarkMath, remarkSlides],
    rehypePlugins: [rehypeKatex],
    shikiConfig: {
      themes: { light: 'github-light', dark: 'github-dark' },
      wrap: false,
    },
  },
});
