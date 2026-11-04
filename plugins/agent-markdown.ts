import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

import type { Plugin } from 'vite';
import { parse as parseYaml } from 'yaml';

import {
  ARTICLE_SECTIONS,
  seriesPartTitle,
  type ArticleFrontmatter,
  type ArticleSection,
} from '../app/lib/articles';

interface SourceArticle {
  section: ArticleSection;
  slug: string;
  frontmatter: ArticleFrontmatter;
  body: string;
}

const FRONTMATTER = /^---\n([\s\S]*?)\n---\n/;
const YOUTUBE = /<YouTube\s+id="([^"]+)"\s+title="([^"]+)"(?:\s+start=\{(\d+)\})?\s*\/>/g;

interface Options {
  contentDir: string;
  sections: ArticleSection[];
}

function readArticles({ contentDir, sections }: Options, includeDrafts: boolean): SourceArticle[] {
  return sections.flatMap((section) => {
    const dir = path.join(contentDir, section);
    return readdirSync(dir)
      .filter((file) => file.endsWith('.mdx'))
      .map((file) => {
        const source = readFileSync(path.join(dir, file), 'utf-8');
        const match = source.match(FRONTMATTER);
        if (!match) throw new Error(`${section}/${file} has no frontmatter`);
        return {
          section,
          slug: file.replace(/\.mdx$/, ''),
          frontmatter: parseYaml(match[1]) as ArticleFrontmatter,
          body: source.slice(match[0].length),
        };
      })
      .filter(({ frontmatter }) => includeDrafts || !frontmatter.draft);
  });
}

function displayTitle({ title, series }: ArticleFrontmatter): string {
  return series ? seriesPartTitle(series, title) : title;
}

function toMarkdown({ frontmatter, body }: SourceArticle): string {
  const { description, date } = frontmatter;
  const header = [
    `# ${displayTitle(frontmatter)}`,
    description && `> ${description}`,
    `日期：${date}`,
  ];
  const content = body.replace(YOUTUBE, (_, id: string, title: string, start?: string) => {
    const url = `https://www.youtube.com/watch?v=${id}${start ? `&t=${start}s` : ''}`;
    return `[YouTube：${title}](${url})`;
  });
  return `${header.filter(Boolean).join('\n\n')}\n\n${content.trim()}\n`;
}

function markdownPath({ section, slug }: SourceArticle): string {
  return `${section}/${slug}.md`;
}

function toLlmsTxt(articles: SourceArticle[], sections: ArticleSection[]): string {
  const blocks = sections.map((section) => {
    const lines = articles
      .filter((article) => article.section === section)
      .sort((a, b) => b.frontmatter.date.localeCompare(a.frontmatter.date))
      .map((article) => {
        const { description } = article.frontmatter;
        const link = `[${displayTitle(article.frontmatter)}](/${markdownPath(article)})`;
        return `- ${link}${description ? `: ${description}` : ''}`;
      });
    return `## ${ARTICLE_SECTIONS[section].title}\n\n${ARTICLE_SECTIONS[section].description}\n\n${lines.join('\n')}`;
  });
  const intro = [
    '# justincy',
    '> Justin 的個人網站。下面每篇文章都有 Markdown 版本：文章網址加上 .md。',
  ];
  return `${[...intro, ...blocks].join('\n\n')}\n`;
}

/**
 * Serves the chosen sections' articles as raw Markdown at /<section>/<slug>.md and lists them in
 * /llms.txt, so an agent can read the index first and fetch only the posts it needs.
 * Build emits static files, which react-router-serve answers before the router does;
 * dev answers from source on each request.
 */
export function agentMarkdown(options: Options): Plugin {
  return {
    name: 'agent-markdown',

    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url?.split('?')[0];
        if (url !== '/llms.txt' && !url?.endsWith('.md')) return next();

        const articles = readArticles(options, true);
        const article = articles.find((candidate) => `/${markdownPath(candidate)}` === url);
        if (url !== '/llms.txt' && !article) return next();

        res.setHeader(
          'Content-Type',
          article ? 'text/markdown; charset=utf-8' : 'text/plain; charset=utf-8'
        );
        res.end(article ? toMarkdown(article) : toLlmsTxt(articles, options.sections));
      });
    },

    generateBundle() {
      if (this.environment.config.consumer !== 'client') return;
      const articles = readArticles(options, false);
      for (const article of articles) {
        this.emitFile({
          type: 'asset',
          fileName: markdownPath(article),
          source: toMarkdown(article),
        });
      }
      this.emitFile({
        type: 'asset',
        fileName: 'llms.txt',
        source: toLlmsTxt(articles, options.sections),
      });
    },
  };
}
