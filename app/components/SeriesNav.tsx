import { Link } from 'react-router';

import { DraftBadge } from '~/components/DraftBadge';
import type { BlogPost } from '~/lib/blog';
import { cn } from '~/lib/utils';

interface SeriesNavProps {
  name: string;
  parts: BlogPost[];
  currentSlug: string;
}

export function SeriesNav({ name, parts, currentSlug }: SeriesNavProps) {
  return (
    <nav
      aria-label={`${name} 系列文章`}
      className="border-border/80 mb-10 overflow-hidden rounded-xl border"
    >
      <p className="border-border/80 bg-surface text-foreground border-b px-5 py-3.5 text-[15px] font-semibold tracking-normal">
        {name}
      </p>
      <ol className="divide-border/60 divide-y">
        {parts.map(({ slug, frontmatter }, index) => {
          const current = slug === currentSlug;
          return (
            <li key={slug}>
              <Link
                to={`/blog/${slug}`}
                aria-current={current ? 'page' : undefined}
                className={cn(
                  'focus-visible:ring-ring flex items-center gap-3.5 px-5 py-3 transition-colors focus-visible:ring-2 focus-visible:outline-hidden focus-visible:ring-inset',
                  current ? 'bg-muted/40' : 'hover:bg-muted/40 group'
                )}
              >
                <span
                  className={cn(
                    'flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-medium tabular-nums',
                    current
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                  )}
                >
                  {index + 1}
                </span>
                <span
                  className={cn(
                    'min-w-0 flex-1 truncate text-[15px] tracking-wide',
                    current
                      ? 'text-foreground font-medium'
                      : 'text-muted-foreground group-hover:text-foreground transition-colors'
                  )}
                >
                  {frontmatter.title}
                </span>
                {frontmatter.draft && <DraftBadge />}
              </Link>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
