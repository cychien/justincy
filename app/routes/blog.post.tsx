import { format, parseISO } from 'date-fns';

import { DraftBadge } from '~/components/DraftBadge';
import { KindSeparator } from '~/components/KindSeparator';
import { SeriesNav } from '~/components/SeriesNav';
import { SeriesPager } from '~/components/SeriesPager';
import { YouTube } from '~/components/YouTube';
import {
  isVisible,
  seriesPartTitle,
  seriesParts,
  type BlogPost,
  type BlogPostFrontmatter,
} from '~/lib/blog';
import { slugFromModulePath } from '~/lib/content';
import { publicOrigin } from '~/lib/origin';

import type { Route } from './+types/blog.post';

interface PostModule {
  default: (props: { components?: Record<string, React.ComponentType<never>> }) => React.ReactNode;
  frontmatter: BlogPostFrontmatter;
}

const modules = import.meta.glob('../content/blog/*.mdx', {
  eager: true,
}) as Record<string, PostModule>;

const posts = new Map(
  Object.entries(modules).map(([modulePath, mod]) => [slugFromModulePath(modulePath), mod])
);

const COMPONENTS = { YouTube };

// Same voice as the design posts - muted body, underlined links - extended to the
// Markdown a written piece reaches for that a design breakdown does not.
// Top-level lists draw their own markers: native ones hug the text, so a bullet and a
// wider number would start at different x. The empty-string list style hides the native
// marker without `none`, which makes Safari drop list semantics.
// Plain-text fences hold quoted prose rather than code, so they wrap.
const PROSE = `
  mdx-lists text-muted-foreground space-y-6 text-base leading-relaxed tracking-wide
  [&>h2]:text-foreground [&>h2]:pt-4 [&>h2]:text-xl [&>h2]:font-semibold [&>h2]:tracking-normal
  [&>h3]:text-foreground [&>h3]:pt-2 [&>h3]:text-lg [&>h3]:font-semibold [&>h3]:tracking-normal
  [&>h4]:text-foreground [&>h4]:pt-1 [&>h4]:text-base [&>h4]:font-semibold [&>h4]:tracking-normal
  [&_strong]:text-foreground [&_strong]:font-semibold
  [&_a]:text-foreground [&_a]:underline [&_a]:decoration-border [&_a]:underline-offset-3
  [&_a]:transition-colors [&_a:hover]:decoration-muted-foreground
  [&>blockquote]:border-foreground [&>blockquote]:text-foreground [&>blockquote]:border-l-3
  [&>blockquote]:bg-muted/50 [&>blockquote]:rounded-r-md [&>blockquote]:py-3
  [&>blockquote]:pr-4 [&>blockquote]:pl-5 [&>blockquote>*+*]:mt-3
  [&>:is(ul,ol)]:bg-muted/50 [&>:is(ul,ol)]:rounded-xl [&>:is(ul,ol)]:py-4 [&>:is(ul,ol)]:pr-5
  [&>:is(ul,ol)]:pl-10! [&>:is(ul,ol)]:[list-style-type:'']! [&>ol]:[counter-reset:item]
  [&>:is(ul,ol)>li]:relative [&>:is(ul,ol)>li]:before:absolute [&>:is(ul,ol)>li]:before:-left-5
  [&>ul>li]:before:-left-4 [&>ul>li]:before:top-[calc(0.8125em-2.5px)] [&>ul>li]:before:size-[5px]
  [&>ul>li]:before:rounded-full [&>ul>li]:before:bg-current [&>ul>li]:before:content-['']
  [&>ol>li]:[counter-increment:item] [&>ol>li]:before:content-[counter(item)'.']
  [&>ol>li]:before:tabular-nums
  [&>hr]:border-border [&>hr]:mx-auto [&>hr]:w-24 [&>hr]:border-dashed
  [&_img]:border-border/80 [&_img]:rounded-xl [&_img]:border
  [&_:not(pre)>code]:bg-muted [&_:not(pre)>code]:text-foreground [&_:not(pre)>code]:rounded
  [&_:not(pre)>code]:px-1.5 [&_:not(pre)>code]:py-0.5 [&_:not(pre)>code]:text-[0.875em]
  [&_pre]:overflow-x-auto [&_pre]:rounded-[10px] [&_pre]:bg-[#1f2328]!
  [&_pre]:shadow-[inset_0_0_0_1px_rgb(255_255_255/0.06)] [&_pre]:font-mono [&_pre]:text-[13px]
  [&_pre]:leading-[21px] [&_pre]:tracking-normal [&_pre]:px-4 [&_pre]:py-3
  [&_pre[data-language=text]]:whitespace-pre-wrap [&_pre[data-language=text]]:break-words
  [&_table]:w-full [&_table]:text-sm [&_th]:text-foreground [&_th]:font-medium
  [&_:is(th,td)]:border-b [&_:is(th,td)]:py-2 [&_:is(th,td)]:pr-4 [&_:is(th,td)]:text-left
`;

export function loader({ params, request }: Route.LoaderArgs) {
  const post = posts.get(params.slug);
  if (!post || !isVisible(post.frontmatter)) {
    throw new Response('找不到這篇文章', { status: 404 });
  }

  const { series, title } = post.frontmatter;
  const parts = series ? seriesParts(visiblePosts(), series) : [];

  return {
    slug: params.slug,
    frontmatter: post.frontmatter,
    title: series ? seriesPartTitle(series, title) : title,
    series: series ? { name: series, parts } : undefined,
    origin: publicOrigin(request),
  };
}

function visiblePosts(): BlogPost[] {
  return [...posts]
    .filter(([, mod]) => isVisible(mod.frontmatter))
    .map(([slug, mod]) => ({ slug, frontmatter: mod.frontmatter }));
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

export default function BlogPost({ loaderData }: Route.ComponentProps) {
  const { slug, frontmatter, series } = loaderData;
  const { title, date, draft, kind } = frontmatter;
  const Content = posts.get(slug)!.default;

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

      {series && <SeriesNav name={series.name} parts={series.parts} currentSlug={slug} />}

      <div className={PROSE}>
        <Content components={COMPONENTS} />
      </div>

      {series && <SeriesPager name={series.name} parts={series.parts} currentSlug={slug} />}
    </article>
  );
}
