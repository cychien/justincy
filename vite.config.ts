import path from 'node:path';

import { reactRouter } from '@react-router/dev/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';
import mdx from '@mdx-js/rollup';
import remarkFrontmatter from 'remark-frontmatter';
import remarkMdxFrontmatter from 'remark-mdx-frontmatter';
import remarkGfm from 'remark-gfm';
import rehypePrettyCode from 'rehype-pretty-code';
import rehypeSlug from 'rehype-slug';

import { AGENT_MARKDOWN_SECTIONS } from './app/lib/articles';
import { agentMarkdown } from './plugins/agent-markdown';
import { rehypeImageDimensions } from './plugins/rehype-image-dimensions';
import { remarkThumbColor } from './plugins/remark-thumb-color';
import { slashCommands } from './plugins/shiki-slash-commands';

const publicDir = path.resolve(import.meta.dirname, 'public');
const contentDir = path.resolve(import.meta.dirname, 'app/content');

export default defineConfig({
  server: {
    // Vite's default 5173 and the ports it falls back to are ones other local dev tools
    // remember and keep calling; a fixed, strict port keeps their traffic off this site.
    port: 4300,
    strictPort: true,
    allowedHosts: true,
  },
  plugins: [
    tailwindcss(),
    mdx({
      remarkPlugins: [
        remarkFrontmatter,
        [remarkThumbColor, { publicDir }],
        remarkMdxFrontmatter,
        remarkGfm,
      ],
      rehypePlugins: [
        rehypeSlug,
        [rehypeImageDimensions, { publicDir }],
        [
          rehypePrettyCode,
          {
            theme: 'github-dark',
            keepBackground: true,
            defaultLang: { block: 'text' },
            transformers: [slashCommands({ color: '#79c0ff' })],
          },
        ],
      ],
    }),
    agentMarkdown({ contentDir, sections: AGENT_MARKDOWN_SECTIONS }),
    reactRouter(),
    tsconfigPaths(),
  ],
});
