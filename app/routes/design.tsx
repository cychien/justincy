import { format, parseISO } from 'date-fns';
import { Link } from 'react-router';

import { slugFromModulePath, type DesignPostFrontmatter } from '~/lib/design';

import type { Route } from './+types/design';

// Every card image is generated at this size, so the ratio is a property of the
// collection rather than of any one post.
const THUMB_WIDTH = 720;
const THUMB_HEIGHT = 540;

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
      <header className="mx-auto max-w-md space-y-3 py-10 text-center sm:py-10">
        <h1 className="text-foreground text-2xl font-semibold tracking-normal">Design</h1>
        <p className="text-[15px] leading-relaxed tracking-wide text-zinc-500">
          紀錄我的 Design 學習與我的 Design 作品
        </p>
      </header>

      {posts.length === 0 ? (
        <p className="text-muted-foreground text-sm tracking-wide">還沒有文章。</p>
      ) : (
        <ul className="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map(({ slug, frontmatter }) => (
            <li key={slug}>
              <Link
                to={`/design/${slug}`}
                className="focus-visible:ring-ring group block rounded-xl focus-visible:ring-2 focus-visible:outline-hidden"
              >
                <img
                  src={frontmatter.thumb}
                  alt={frontmatter.imageAlt}
                  width={THUMB_WIDTH}
                  height={THUMB_HEIGHT}
                  loading="lazy"
                  className="bg-muted border-border/80 group-hover:border-muted-foreground/30 aspect-4/3 w-full rounded-xl border object-cover object-top transition-colors"
                />
                <h2 className="text-foreground mt-4 text-[15px] font-medium group-hover:underline">
                  {frontmatter.title}
                </h2>
                <time
                  dateTime={frontmatter.date}
                  className="text-muted-foreground/70 mt-1 block text-xs tracking-wide"
                >
                  {format(parseISO(frontmatter.date), 'yyyy.MM.dd')}
                </time>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
