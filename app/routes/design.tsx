import { PostCard, PostCardGrid } from '~/components/PostCard';
import { slugFromModulePath } from '~/lib/content';
import type { DesignPostFrontmatter } from '~/lib/design';

import type { Route } from './+types/design';

// The glob lives inside the loader on purpose. It has to be a glob rather than a
// filesystem read because the deployed image ships only build/, without app/content.
// Keeping it server-only lets the client bundle drop every post's compiled body,
// which a shared chunk would otherwise pull into this route alongside the post page.
export function loader() {
  const frontmatters = import.meta.glob('../content/design/*.mdx', {
    eager: true,
    import: 'frontmatter',
  }) as Record<string, DesignPostFrontmatter>;

  const posts = Object.entries(frontmatters)
    .map(([modulePath, frontmatter]) => ({ slug: slugFromModulePath(modulePath), frontmatter }))
    .sort((a, b) => b.frontmatter.date.localeCompare(a.frontmatter.date));

  return { posts };
}

export function meta() {
  return [
    { title: 'Design - justincy' },
    { name: 'description', content: 'UI 作品、設計方法與筆記。' },
  ];
}

export default function Design({ loaderData }: Route.ComponentProps) {
  const { posts } = loaderData;

  return (
    <section className="mx-auto w-full max-w-5xl px-6 pb-24">
      <header className="mx-auto max-w-md space-y-2 pt-10 pb-12 text-center">
        <h1 className="text-foreground text-2xl font-semibold tracking-normal">Design</h1>
        <p className="text-[15px] leading-relaxed tracking-wide text-zinc-500">
          UI 作品、設計方法與筆記
        </p>
      </header>

      {posts.length === 0 ? (
        <p className="text-muted-foreground text-sm tracking-wide">還沒有文章。</p>
      ) : (
        <PostCardGrid>
          {posts.map(({ slug, frontmatter }) => (
            <PostCard
              key={slug}
              to={`/design/${slug}`}
              title={frontmatter.title}
              date={frontmatter.date}
              thumb={{ src: frontmatter.thumb, alt: frontmatter.imageAlt }}
            />
          ))}
        </PostCardGrid>
      )}
    </section>
  );
}
