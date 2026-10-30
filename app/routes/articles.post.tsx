import { format, parseISO } from 'date-fns';

import { DraftBadge } from '~/components/DraftBadge';
import { KindSeparator } from '~/components/KindSeparator';
import { SeriesNav } from '~/components/SeriesNav';
import { SeriesPager } from '~/components/SeriesPager';
import { YouTube } from '~/components/YouTube';
import {
  isArticleSection,
  isVisible,
  seriesPartTitle,
  seriesParts,
  type Article,
  type ArticleFrontmatter,
  type ArticleSection,
} from '~/lib/articles';
import { sectionFromModulePath, slugFromModulePath } from '~/lib/content';
import { publicOrigin } from '~/lib/origin';

import type { Route } from './+types/articles.post';

interface PostModule {
  default: (props: { components?: Record<string, React.ComponentType<never>> }) => React.ReactNode;
  frontmatter: ArticleFrontmatter;
}

// The glob is a literal, so it has to name every key of ARTICLE_SECTIONS.
const modules = import.meta.glob('../content/{software,blog}/*.mdx', {
  eager: true,
}) as Record<string, PostModule>;

const posts = new Map(
  Object.entries(modules).map(([modulePath, mod]) => [
    postKey(sectionFromModulePath(modulePath), slugFromModulePath(modulePath)),
    mod,
  ])
);

function postKey(section: string, slug: string): string {
  return `${section}/${slug}`;
}

// A wide table scrolls inside its own box rather than crushing its columns to a
// character each or pushing the page sideways on a phone.
function ScrollableTable(props: React.ComponentProps<'table'>) {
  return (
    <div className="overflow-x-auto">
      <table {...props} />
    </div>
  );
}

const COMPONENTS = { YouTube, table: ScrollableTable };

// Same voice as the design posts - muted body, underlined links - extended to the
// Markdown a written piece reaches for that a design breakdown does not.
// Top-level lists draw their own markers: native ones hug the text, so a bullet and a
// wider number would start at different x. The empty-string list style hides the native
// marker without `none`, which makes Safari drop list semantics.
// Plain-text fences hold quoted prose rather than code, so they wrap.
// Size alone barely separates three heading levels, so each also carries its own mark: a
// rule opens an h2 section, a bar leads an h3, and an h4 has neither. Headings sit closer
// to the text they introduce than to the text above.
const PROSE = `
  mdx-lists text-muted-foreground space-y-6 text-base leading-relaxed tracking-wide
  [&>:is(h2,h3,h4)]:text-foreground [&>:is(h2,h3,h4)]:font-semibold
  [&>:is(h2,h3,h4)]:leading-snug [&>:is(h2,h3,h4)]:tracking-normal
  [&>h2]:pt-8 [&>h2]:mb-4 [&>h2]:text-[1.375rem]
  [&>h2:not(:first-child)]:border-border [&>h2:not(:first-child)]:mt-6
  [&>h2:not(:first-child)]:border-t [&>h2:not(:first-child)]:pt-10
  [&>h3]:pt-4 [&>h3]:mb-3 [&>h3]:text-[1.1875rem]
  [&>h3]:before:bg-foreground [&>h3]:before:mr-2.5 [&>h3]:before:inline-block
  [&>h3]:before:h-[0.9em] [&>h3]:before:w-1 [&>h3]:before:rounded-full
  [&>h3]:before:align-[-0.1em] [&>h3]:before:content-['']
  [&>h4]:pt-2 [&>h4]:mb-2 [&>h4]:text-[1.0625rem]
  [&_strong]:text-foreground [&_strong]:font-medium
  [&_a]:text-foreground [&_a]:underline [&_a]:decoration-border [&_a]:underline-offset-3
  [&_a]:transition-colors [&_a:hover]:decoration-muted-foreground
  [&>blockquote]:text-foreground [&>blockquote]:border-border/80 [&>blockquote]:bg-surface
  [&>blockquote]:relative [&>blockquote]:rounded-xl [&>blockquote]:border
  [&>blockquote]:py-4 [&>blockquote]:pr-5 [&>blockquote]:pl-12 [&>blockquote>*+*]:mt-3
  [&>blockquote]:before:text-muted-foreground/45 [&>blockquote]:before:absolute
  [&>blockquote]:before:top-2.5 [&>blockquote]:before:left-4 [&>blockquote]:before:font-serif
  [&>blockquote]:before:text-[3.25rem] [&>blockquote]:before:leading-none
  [&>blockquote]:before:content-['“']
  [&>:is(ul,ol)]:bg-muted [&>:is(ul,ol)]:rounded-xl [&>:is(ul,ol)]:py-4 [&>:is(ul,ol)]:pr-5
  [&>:is(ul,ol)]:pl-10! [&>:is(ul,ol)]:[list-style-type:'']! [&>ol]:[counter-reset:item]
  [&>:is(ul,ol)>li]:relative [&>:is(ul,ol)>li]:before:absolute [&>:is(ul,ol)>li]:before:-left-5
  [&>ul>li]:before:-left-4 [&>ul>li]:before:top-[calc(0.8125em-2.5px)] [&>ul>li]:before:size-[5px]
  [&>ul>li]:before:rounded-full [&>ul>li]:before:bg-current [&>ul>li]:before:content-['']
  [&>ol>li]:[counter-increment:item] [&>ol>li]:before:content-[counter(item)'.']
  [&>ol>li]:before:tabular-nums
  [&>hr]:border-border [&>hr]:mx-auto [&>hr]:w-24 [&>hr]:border-dashed
  [&_img]:border-border/80 [&_img]:rounded-xl [&_img]:border [&_img]:mx-auto [&_img]:block
  [&_picture>img]:w-full
  [&_:not(pre)>code]:bg-muted [&_:not(pre)>code]:text-foreground [&_:not(pre)>code]:rounded
  [&_:not(pre)>code]:px-1.5 [&_:not(pre)>code]:py-0.5 [&_:not(pre)>code]:text-[0.875em]
  [&>:is(ul,ol)_:not(pre)>code]:bg-background
  [&_pre]:overflow-x-auto [&_pre]:rounded-[10px] [&_pre]:bg-[#1f2328]!
  [&_pre]:shadow-[inset_0_0_0_1px_rgb(255_255_255/0.06)] [&_pre]:font-mono [&_pre]:text-[13px]
  [&_pre]:leading-[21px] [&_pre]:tracking-normal [&_pre]:px-4 [&_pre]:py-3
  [&_pre[data-language=text]]:whitespace-pre-wrap [&_pre[data-language=text]]:break-words
  [&_table]:w-full [&_table]:text-sm [&_th]:text-foreground [&_th]:font-medium
  [&_:is(th,td)]:border-b [&_:is(th,td)]:py-2 [&_:is(th,td)]:pr-4 [&_:is(th,td)]:text-left
  [&_:is(th,td)]:min-w-28 [&_:is(th,td):first-child]:min-w-auto
  [&_:is(th,td):first-child]:whitespace-nowrap [&_td]:align-top
  [&_td:first-child]:text-foreground [&_td:first-child]:font-medium
  [&_tbody>tr:last-child>td]:border-b-0
`;

export function loader({ params, request }: Route.LoaderArgs) {
  const { section, slug } = params;
  const post = posts.get(postKey(section, slug));
  if (!post || !isArticleSection(section) || !isVisible(post.frontmatter)) {
    throw new Response('找不到這篇文章', { status: 404 });
  }

  const { series, title } = post.frontmatter;
  const parts = series ? seriesParts(visiblePosts(section), series) : [];

  return {
    section,
    slug,
    frontmatter: post.frontmatter,
    title: series ? seriesPartTitle(series, title) : title,
    series: series ? { name: series, parts } : undefined,
    origin: publicOrigin(request),
  };
}

function visiblePosts(section: ArticleSection): Article[] {
  return Object.entries(modules)
    .filter(
      ([modulePath, mod]) =>
        sectionFromModulePath(modulePath) === section && isVisible(mod.frontmatter)
    )
    .map(([modulePath, mod]) => ({
      slug: slugFromModulePath(modulePath),
      frontmatter: mod.frontmatter,
    }));
}

export function meta({ loaderData }: Route.MetaArgs) {
  if (!loaderData) return [{ title: 'justincy' }];
  const { title } = loaderData;
  const { description, ogImage } = loaderData.frontmatter;
  return [
    { title: `${title} - justincy` },
    { property: 'og:title', content: title },
    { property: 'og:type', content: 'article' },
    ...(description
      ? [
          { name: 'description', content: description },
          { property: 'og:description', content: description },
        ]
      : []),
    ...(ogImage
      ? [
          { property: 'og:image', content: `${loaderData.origin}${ogImage}` },
          { property: 'og:image:width', content: '1200' },
          { property: 'og:image:height', content: '630' },
          { name: 'twitter:card', content: 'summary_large_image' },
        ]
      : []),
  ];
}

export default function ArticlePost({ loaderData }: Route.ComponentProps) {
  const { section, slug, frontmatter, series } = loaderData;
  const { title, date, draft, kind } = frontmatter;
  const Content = posts.get(postKey(section, slug))!.default;

  return (
    <article className="mx-auto w-full max-w-2xl px-6 pb-24">
      <header className="flex flex-col items-center gap-2 py-4 text-center sm:py-10">
        {series && (
          <p className="border-border bg-surface text-muted-foreground mb-1.5 inline-flex h-7 items-center overflow-hidden rounded-full border text-[13px] tracking-wide">
            <span className="border-border bg-background text-foreground flex h-full items-center border-r px-2.5 font-medium tabular-nums">
              {series.parts.findIndex((part) => part.slug === slug) + 1}
              <span className="text-muted-foreground/55 font-normal">
                &nbsp;/ {series.parts.length}
              </span>
            </span>
            <span className="px-3 font-medium">{series.name}</span>
          </p>
        )}
        <h1 className="text-foreground text-2xl font-semibold tracking-normal text-balance">
          {title}
        </h1>
        <div className="flex items-center gap-2">
          <time dateTime={date} className="text-muted-foreground/60 text-sm tracking-wide">
            {format(parseISO(date), 'yyyy.MM.dd')}
          </time>
          {draft && <DraftBadge />}
        </div>
        {kind && <KindSeparator kind={kind} className="mt-6 mb-5 sm:mt-7 sm:mb-0" />}
      </header>

      {series && (
        <SeriesNav section={section} name={series.name} parts={series.parts} currentSlug={slug} />
      )}

      <div className={PROSE}>
        <Content components={COMPONENTS} />
      </div>

      {series && (
        <SeriesPager section={section} name={series.name} parts={series.parts} currentSlug={slug} />
      )}
    </article>
  );
}
