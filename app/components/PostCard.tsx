import { format, parseISO } from 'date-fns';
import { Link } from 'react-router';

import { DraftBadge } from '~/components/DraftBadge';
import { SeriesBadge } from '~/components/SeriesBadge';
import { cn } from '~/lib/utils';

// Every card image is generated at this size, so the ratio is a property of the
// collection rather than of any one post.
const THUMB_WIDTH = 720;
const THUMB_HEIGHT = 540;

const COVER_STYLE =
  'border-foreground/8 group-hover:border-muted-foreground/30 aspect-4/3 w-full rounded-xl border bg-clip-padding transition-colors';

export function PostCardGrid({ children }: { children: React.ReactNode }) {
  return <ul className="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">{children}</ul>;
}

interface PostCardProps {
  to: string;
  title: string;
  date: string;
  /** Top-cropped 4:3 image; `color` tints a series stack. Without one, the card falls back to a text cover. */
  thumb?: { src: string; alt: string; color?: string };
  /** Shown on the text cover in place of the title. */
  excerpt?: string;
  draft?: boolean;
  /** Part count of a series. Draws the cover as the top of a stack, one card per part up to three. */
  seriesLength?: number;
}

export function PostCard({ to, title, date, thumb, excerpt, draft, seriesLength }: PostCardProps) {
  const cover = <PostCardCover title={title} thumb={thumb} excerpt={excerpt} />;

  return (
    <li>
      <Link
        to={to}
        className="focus-visible:ring-ring group block rounded-xl focus-visible:ring-2 focus-visible:outline-hidden"
      >
        {seriesLength !== undefined ? (
          <CardStack size={seriesLength} color={thumb?.color}>
            {cover}
          </CardStack>
        ) : (
          cover
        )}
        <h2 className="text-foreground mt-4 text-[15px] font-medium">
          {title}
          {draft && (
            <>
              {' '}
              <DraftBadge />
            </>
          )}
        </h2>
        <div className="mt-1 flex items-center gap-2">
          <time dateTime={date} className="text-muted-foreground/70 text-xs tracking-wide">
            {format(parseISO(date), 'yyyy.MM.dd')}
          </time>
          {seriesLength !== undefined && <SeriesBadge />}
        </div>
      </Link>
    </li>
  );
}

const STACK_LAYER_STYLE =
  'ring-background absolute bottom-0 -z-10 rounded-xl ring-2 transition-[translate] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none';

// Nearest first; a two-part series uses only the first. Each card peeks out above the
// one in front, narrower and fainter, parted from it by a background-colored ring.
const STACK_LAYERS = [
  {
    shape: 'inset-x-2.5 -top-1.5 group-hover:-translate-y-0.5 group-focus-visible:-translate-y-0.5',
    tone: (base: string) => base,
  },
  {
    shape:
      'inset-x-5 -top-3 group-hover:-translate-y-1 group-hover:delay-50 group-focus-visible:-translate-y-1 group-focus-visible:delay-50',
    tone: (base: string) => `color-mix(in oklab, ${base} 50%, var(--background))`,
  },
];

function CardStack({
  size,
  color,
  children,
}: {
  size: number;
  color?: string;
  children: React.ReactNode;
}) {
  const layers = STACK_LAYERS.slice(0, size - 1).reverse();

  return (
    <div className="relative isolate">
      {layers.map(({ shape, tone }) => (
        <div
          key={shape}
          aria-hidden="true"
          className={cn(STACK_LAYER_STYLE, shape)}
          style={{ backgroundColor: tone(color ?? 'var(--border)') }}
        />
      ))}
      <div className="ring-background rounded-xl ring-2">{children}</div>
    </div>
  );
}

function PostCardCover({
  title,
  thumb,
  excerpt,
}: Pick<PostCardProps, 'title' | 'thumb' | 'excerpt'>) {
  return thumb ? (
    <img
      src={thumb.src}
      alt={thumb.alt}
      width={THUMB_WIDTH}
      height={THUMB_HEIGHT}
      loading="lazy"
      className={cn(COVER_STYLE, 'bg-muted object-cover object-top')}
    />
  ) : (
    <div aria-hidden="true" className={cn(COVER_STYLE, 'bg-surface flex items-end p-6')}>
      {excerpt ? (
        <p className="text-muted-foreground line-clamp-4 text-[15px] leading-relaxed tracking-wide">
          {excerpt}
        </p>
      ) : (
        <p className="text-foreground line-clamp-3 text-lg leading-snug font-semibold tracking-normal">
          {title}
        </p>
      )}
    </div>
  );
}
