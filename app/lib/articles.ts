export const ARTICLE_SECTIONS = {
  software: { title: '軟體白話文', description: '用白話講清楚軟體與技術' },
  blog: { title: 'Blog', description: '人生感悟及日常分享' },
} as const;

export type ArticleSection = keyof typeof ARTICLE_SECTIONS;

export function isArticleSection(value: string): value is ArticleSection {
  return Object.hasOwn(ARTICLE_SECTIONS, value);
}

/** The frontmatter contract for every app/content/<section> - read by both the index and the post. */
export interface ArticleFrontmatter {
  /** For a series part, the part's own title; the series name sits above it and is prepended in the page title. */
  title: string;
  date: string;
  /** One line for the index and the meta description. */
  description?: string;
  /** Genre label shown in the header separator, e.g. AI 工作流. */
  kind?: string;
  /** 4:3 card image; the blog-cover skill writes it at 1440x1080. Full path, extension included. */
  thumb?: string;
  thumbAlt?: string;
  /** Dominant color of `thumb`, added at build time by plugins/remark-thumb-color. */
  thumbColor?: string;
  /** 1200x630 social preview, rendered from the cover by the blog-cover skill. */
  ogImage?: string;
  /** Left out of production builds; `pnpm dev` still lists it, marked as a draft. */
  draft?: boolean;
  /** Series name, spelled identically in every part. Parts are ordered by date. */
  series?: string;
}

export interface Article {
  slug: string;
  frontmatter: ArticleFrontmatter;
}

export type ArticleIndexEntry =
  | { kind: 'post'; post: Article }
  | { kind: 'series'; name: string; parts: Article[] };

export function isVisible(frontmatter: ArticleFrontmatter): boolean {
  return import.meta.env.DEV || !frontmatter.draft;
}

function byDateAscending(a: Article, b: Article): number {
  return (
    a.frontmatter.date.localeCompare(b.frontmatter.date) ||
    a.slug.localeCompare(b.slug, undefined, { numeric: true })
  );
}

export function seriesParts(posts: Article[], name: string): Article[] {
  return posts.filter(({ frontmatter }) => frontmatter.series === name).sort(byDateAscending);
}

export function seriesPartTitle(series: string, title: string): string {
  return `${series} - ${title}`;
}

/** Newest first; a series takes one slot, dated by its latest part. */
export function buildArticleIndex(posts: Article[]): ArticleIndexEntry[] {
  const seriesNames = new Set(posts.flatMap(({ frontmatter }) => frontmatter.series ?? []));

  const entries: ArticleIndexEntry[] = [
    ...posts
      .filter(({ frontmatter }) => !frontmatter.series)
      .map((post) => ({ kind: 'post' as const, post })),
    ...[...seriesNames].map((name) => ({
      kind: 'series' as const,
      name,
      parts: seriesParts(posts, name),
    })),
  ];

  return entries.sort((a, b) => latestDate(b).localeCompare(latestDate(a)));
}

function latestDate(entry: ArticleIndexEntry): string {
  return entry.kind === 'post' ? entry.post.frontmatter.date : entry.parts.at(-1)!.frontmatter.date;
}
