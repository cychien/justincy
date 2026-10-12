import { PostCard, PostCardGrid } from '~/components/PostCard';
import { buildBlogIndex, isVisible, type BlogPostFrontmatter } from '~/lib/blog';
import { slugFromModulePath } from '~/lib/content';

import type { Route } from './+types/blog';

// Server-only for the same reason as the design index: the client bundle should not
// carry every post's compiled body just to render a list of titles.
export function loader() {
  const frontmatters = import.meta.glob('../content/blog/*.mdx', {
    eager: true,
    import: 'frontmatter',
  }) as Record<string, BlogPostFrontmatter>;

  const posts = Object.entries(frontmatters)
    .filter(([, frontmatter]) => isVisible(frontmatter))
    .map(([modulePath, frontmatter]) => ({ slug: slugFromModulePath(modulePath), frontmatter }));

  return { entries: buildBlogIndex(posts) };
}

export function meta() {
  return [{ title: 'Blog - justincy' }, { name: 'description', content: '人生感悟及日常分享。' }];
}

export default function Blog({ loaderData }: Route.ComponentProps) {
  const { entries } = loaderData;

  return (
    <section className="mx-auto w-full max-w-5xl px-6 pb-24">
      <header className="mx-auto max-w-md space-y-2 pt-10 pb-12 text-center">
        <h1 className="text-foreground text-2xl font-semibold tracking-normal">Blog</h1>
        <p className="text-[15px] leading-relaxed tracking-wide text-zinc-500">
          人生感悟及日常分享
        </p>
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
                  to={`/blog/${slug}`}
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
                to={`/blog/${first.slug}`}
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

function cardThumb({ thumb, thumbAlt, thumbColor }: BlogPostFrontmatter) {
  return thumb ? { src: thumb, alt: thumbAlt ?? '', color: thumbColor } : undefined;
}
