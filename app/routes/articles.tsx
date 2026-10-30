import { PostCard, PostCardGrid } from '~/components/PostCard';
import {
  ARTICLE_SECTIONS,
  buildArticleIndex,
  isArticleSection,
  isVisible,
  type ArticleFrontmatter,
} from '~/lib/articles';
import { sectionFromModulePath, slugFromModulePath } from '~/lib/content';

import type { Route } from './+types/articles';

// Server-only for the same reason as the design index: the client bundle should not
// carry every post's compiled body just to render a list of titles.
// The glob is a literal, so it has to name every key of ARTICLE_SECTIONS.
export function loader({ params }: Route.LoaderArgs) {
  const { section } = params;
  if (!isArticleSection(section)) {
    throw new Response('找不到這個頁面', { status: 404 });
  }

  const frontmatters = import.meta.glob('../content/{software,blog}/*.mdx', {
    eager: true,
    import: 'frontmatter',
  }) as Record<string, ArticleFrontmatter>;

  const posts = Object.entries(frontmatters)
    .filter(
      ([modulePath, frontmatter]) =>
        sectionFromModulePath(modulePath) === section && isVisible(frontmatter)
    )
    .map(([modulePath, frontmatter]) => ({ slug: slugFromModulePath(modulePath), frontmatter }));

  return { section, entries: buildArticleIndex(posts) };
}

export function meta({ loaderData }: Route.MetaArgs) {
  if (!loaderData) return [{ title: 'justincy' }];
  const { title, description } = ARTICLE_SECTIONS[loaderData.section];
  return [{ title: `${title} - justincy` }, { name: 'description', content: `${description}。` }];
}

export default function Articles({ loaderData }: Route.ComponentProps) {
  const { section, entries } = loaderData;
  const { title, description } = ARTICLE_SECTIONS[section];

  return (
    <section className="mx-auto w-full max-w-5xl px-6 pb-24">
      <header className="mx-auto max-w-md space-y-2 pt-10 pb-12 text-center">
        <h1 className="text-foreground text-2xl font-semibold tracking-normal">{title}</h1>
        <p className="text-[15px] leading-relaxed tracking-wide text-zinc-500">{description}</p>
      </header>

      {entries.length === 0 ? (
        <p className="text-muted-foreground text-center text-sm tracking-wide">還沒有文章。</p>
      ) : (
        <PostCardGrid>
          {entries.map((entry) => {
            if (entry.kind === 'post') {
              const { slug, frontmatter } = entry.post;
              return (
                <PostCard
                  key={slug}
                  to={`/${section}/${slug}`}
                  title={frontmatter.title}
                  date={frontmatter.date}
                  thumb={cardThumb(frontmatter)}
                  excerpt={frontmatter.description}
                  draft={frontmatter.draft}
                />
              );
            }

            // A series opens on its first part; the card shows when it last grew.
            const first = entry.parts[0]!;
            return (
              <PostCard
                key={entry.name}
                to={`/${section}/${first.slug}`}
                title={entry.name}
                date={entry.parts.at(-1)!.frontmatter.date}
                thumb={cardThumb(first.frontmatter)}
                draft={entry.parts.every(({ frontmatter }) => frontmatter.draft)}
                seriesLength={entry.parts.length}
              />
            );
          })}
        </PostCardGrid>
      )}
    </section>
  );
}

function cardThumb({ thumb, thumbAlt, thumbColor }: ArticleFrontmatter) {
  return thumb ? { src: thumb, alt: thumbAlt ?? '', color: thumbColor } : undefined;
}
