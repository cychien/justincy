import { ArrowLeftIcon, ArrowRightIcon } from '@heroicons/react/16/solid';
import { Link } from 'react-router';

import type { Article, ArticleSection } from '~/lib/articles';
import { cn } from '~/lib/utils';

interface SeriesPagerProps {
  name: string;
  section: ArticleSection;
  parts: Article[];
  currentSlug: string;
}

export function SeriesPager({ name, section, parts, currentSlug }: SeriesPagerProps) {
  const index = parts.findIndex(({ slug }) => slug === currentSlug);
  const previous = parts[index - 1];
  const next = parts[index + 1];
  if (!previous && !next) return null;

  return (
    <nav aria-label={`${name} 上下篇`} className="mt-16 grid gap-3 sm:grid-cols-2">
      {previous && <PagerLink section={section} post={previous} direction="previous" />}
      {next && <PagerLink section={section} post={next} direction="next" />}
    </nav>
  );
}

interface PagerLinkProps {
  section: ArticleSection;
  post: Article;
  direction: 'previous' | 'next';
}

function PagerLink({ section, post, direction }: PagerLinkProps) {
  const isNext = direction === 'next';
  const Arrow = isNext ? ArrowRightIcon : ArrowLeftIcon;

  return (
    <Link
      to={`/${section}/${post.slug}`}
      rel={isNext ? 'next' : 'prev'}
      className={cn(
        'border-border/80 hover:bg-muted/40 focus-visible:ring-ring group flex flex-col gap-1.5 rounded-xl border px-5 py-4 transition-colors focus-visible:ring-2 focus-visible:outline-hidden',
        isNext && 'items-end text-right sm:col-start-2'
      )}
    >
      <span className="text-muted-foreground/70 flex items-center gap-1.5 text-xs tracking-wide">
        {!isNext && (
          <Arrow className="size-3.5 transition-transform group-hover:-translate-x-0.5" />
        )}
        {isNext ? '下一篇' : '上一篇'}
        {isNext && <Arrow className="size-3.5 transition-transform group-hover:translate-x-0.5" />}
      </span>
      <span className="text-foreground text-[15px] font-medium tracking-wide">
        {post.frontmatter.title}
      </span>
    </Link>
  );
}
